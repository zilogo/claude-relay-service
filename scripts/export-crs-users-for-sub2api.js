#!/usr/bin/env node

/**
 * Export CRS (old system) users from Redis into a Sub2API-importable CSV/JSONL file.
 *
 * Output columns (minimal set):
 * - email
 * - usernames              (all CRS usernames under this email, joined by "|", for reconciliation only)
 * - username               (chosen CRS username for this email, for reconciliation only)
 * - password_hash          (bcrypt string, e.g. $2b$...)
 * - available_balance      (USD, 8 decimals)
 *
 * Behavior for duplicate emails:
 * - Create ONLY ONE output row per email.
 * - Merge (SUM) available_balance across all CRS users with the same email.
 * - password_hash resolution:
 *   - If all hashes are equal -> keep it.
 *   - If hashes differ -> DEFAULT: pick the hash from the LAST-CREATED CRS account (newest createdAt).
 *     - If createdAt is missing, fallback: updatedAt, lastLoginAt.
 *     - Optional strict mode: --fail-on-password-conflicts (exit code 2).
 *
 * Available balance calculation:
 * - available_balance = user.balance - SUM(usage:cost:total:<apiKeyId>) across user_apikeys:<userId>
 * - By default, clamp negative available_balance to 0 (safe for systems with non-negative constraint).
 *
 * Usage examples:
 *   # Export full dataset to a file (recommended; contains password hashes!)
 *   node scripts/export-crs-users-for-sub2api.js --out /tmp/sub2api-users.csv
 *
 *   # Faster scan sampling
 *   node scripts/export-crs-users-for-sub2api.js --limit 100 --out /tmp/sample.csv
 *
 *   # Allow conflicting password hashes for same email (not recommended)
 *   # Default already resolves by last-created account; strict mode is optional:
 *   node scripts/export-crs-users-for-sub2api.js --fail-on-password-conflicts --out /tmp/sub2api-users.csv
 *
 * Notes:
 * - This export contains bcrypt hashes. Treat the file as sensitive credential material.
 * - Do NOT print to stdout in production terminals; use --out <file>.
 */

const fs = require('fs')
const path = require('path')

const redis = require('../src/models/redis')
const logger = require('../src/utils/logger')

function parseArgs(argv) {
  const opts = {
    out: '',
    format: 'csv', // csv|jsonl
    pattern: 'user:*',
    scanCount: 1000,
    limit: 0,
    noHeader: false,
    clampNegative: true,
    failOnPasswordConflicts: false,
    conflictsReport: '' // optional file path
  }

  for (let i = 0; i < argv.length; i++) {
    const t = argv[i]
    if (t === '--out' && typeof argv[i + 1] === 'string') {
      opts.out = argv[++i]
      continue
    }
    if (t === '--format' && typeof argv[i + 1] === 'string') {
      opts.format = String(argv[++i]).trim().toLowerCase()
      continue
    }
    if (t === '--pattern' && typeof argv[i + 1] === 'string') {
      opts.pattern = argv[++i]
      continue
    }
    if (t === '--scan-count' && typeof argv[i + 1] === 'string') {
      opts.scanCount = Math.max(1, parseInt(argv[++i], 10) || 1000)
      continue
    }
    if (t === '--limit' && typeof argv[i + 1] === 'string') {
      opts.limit = Math.max(0, parseInt(argv[++i], 10) || 0)
      continue
    }
    if (t === '--no-header') {
      opts.noHeader = true
      continue
    }
    if (t === '--no-clamp-negative') {
      opts.clampNegative = false
      continue
    }
    if (t === '--fail-on-password-conflicts') {
      opts.failOnPasswordConflicts = true
      continue
    }
    if (t === '--conflicts-report' && typeof argv[i + 1] === 'string') {
      opts.conflictsReport = argv[++i]
      continue
    }
  }

  return opts
}

function isBcryptHash(value) {
  return (
    typeof value === 'string' &&
    (value.startsWith('$2a$') || value.startsWith('$2b$') || value.startsWith('$2y$'))
  )
}

function normalizeEmail(value) {
  if (typeof value !== 'string') return ''
  return value.trim().toLowerCase()
}

function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function toFixed8(value) {
  const n = toNumber(value)
  return n.toFixed(8)
}

function csvEscape(value) {
  if (value === null || value === undefined) return '""'
  return `"${String(value).replace(/"/g, '""')}"`
}

function ensureParentDir(filePath) {
  const dir = path.dirname(filePath)
  if (!dir || dir === '.' || dir === '/') return
  fs.mkdirSync(dir, { recursive: true })
}

function parseTimestamp(value) {
  if (!value) return 0
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return 0
  const t = Date.parse(value)
  return Number.isFinite(t) ? t : 0
}

function pickPreferredHash(current, incoming) {
  // Prefer LAST created user (newest createdAt).
  // If createdAt is missing, fallback to updatedAt, then lastLoginAt.
  const currentScore = Math.max(
    parseTimestamp(current.createdAt),
    parseTimestamp(current.updatedAt),
    parseTimestamp(current.lastLoginAt)
  )
  const incomingScore = Math.max(
    parseTimestamp(incoming.createdAt),
    parseTimestamp(incoming.updatedAt),
    parseTimestamp(incoming.lastLoginAt)
  )

  if (incomingScore > currentScore) return incoming
  return current
}

function addUsernameToSet(container, username) {
  if (!container) return
  if (!(container instanceof Set)) return
  if (typeof username !== 'string') return
  const u = username.trim()
  if (!u) return
  container.add(u)
}

function usernamesSetToListString(usernames) {
  if (!(usernames instanceof Set)) return ''
  const items = Array.from(usernames).map((v) => String(v)).filter(Boolean)
  items.sort((a, b) => a.localeCompare(b))
  // Username validation in CRS only allows [a-zA-Z0-9_-], so "|" is safe delimiter.
  return items.join('|')
}

async function getUserTotalCostUsd(client, userId) {
  // Fast path: total cost per API key is stored in `usage:cost:total:<keyId>`
  // and user->apiKey mapping is `user_apikeys:<userId>`.
  const keyIds = await client.smembers(`user_apikeys:${userId}`)
  if (!Array.isArray(keyIds) || keyIds.length === 0) {
    return 0
  }

  const pipeline = client.pipeline()
  for (const keyId of keyIds) {
    pipeline.get(`usage:cost:total:${keyId}`)
  }
  const results = await pipeline.exec()

  let sum = 0
  for (const [err, val] of results) {
    if (err) continue
    sum += toNumber(val)
  }
  return sum
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))

  if (!opts.out || typeof opts.out !== 'string') {
    throw new Error('Missing --out <file>. Refuse to print password hashes to stdout.')
  }
  if (!['csv', 'jsonl'].includes(opts.format)) {
    throw new Error(`Invalid --format ${opts.format} (expected csv|jsonl)`)
  }

  logger.warn(
    '⚠️ Export includes bcrypt password_hash. Treat output file as sensitive credential material.'
  )

  ensureParentDir(opts.out)
  const outStream = fs.createWriteStream(opts.out, { encoding: 'utf8', flags: 'w', mode: 0o600 })

  const conflicts = []
  const byEmail = new Map()
  const stats = {
    scannedUserKeys: 0,
    scannedKeys: 0,
    usersParsed: 0,
    usersSkippedMissingEmail: 0,
    usersSkippedNonLocal: 0,
    usersSkippedNonBcrypt: 0,
    usersSkippedInvalidJson: 0,
    emailsDistinct: 0,
    emailsWithMultipleUsers: 0,
    emailsWithPasswordConflicts: 0
  }

  try {
    await redis.connect()
    const client = redis.getClientSafe()

    const stream = client.scanStream({ match: opts.pattern, count: opts.scanCount })
    let stopEarly = false

    const handleBatch = async (keys) => {
      if (stopEarly) return
      if (!Array.isArray(keys) || keys.length === 0) return

      stats.scannedKeys += keys.length

      const userKeys = keys.filter((k) => {
        if (typeof k !== 'string') return false
        const parts = k.split(':')
        return parts.length === 2 && parts[0] === 'user' && parts[1]
      })

      if (userKeys.length === 0) return

      const pipeline = client.pipeline()
      for (const k of userKeys) pipeline.get(k)
      const values = await pipeline.exec()

      for (let i = 0; i < values.length; i++) {
        if (stopEarly) break

        const [err, raw] = values[i] || []
        if (err) continue

        stats.scannedUserKeys++
        if (opts.limit > 0 && stats.scannedUserKeys > opts.limit) {
          stopEarly = true
          break
        }

        if (typeof raw !== 'string' || raw.trim() === '') {
          continue
        }

        let user
        try {
          user = JSON.parse(raw)
        } catch {
          stats.usersSkippedInvalidJson++
          continue
        }

        stats.usersParsed++

        const email = normalizeEmail(user?.email)
        if (!email) {
          stats.usersSkippedMissingEmail++
          continue
        }

        const authType = typeof user?.authType === 'string' ? user.authType.trim().toLowerCase() : ''
        if (authType && authType !== 'local') {
          stats.usersSkippedNonLocal++
          continue
        }

        const passwordHash = typeof user?.passwordHash === 'string' ? user.passwordHash : ''
        if (!isBcryptHash(passwordHash)) {
          stats.usersSkippedNonBcrypt++
          continue
        }

        const userId = user?.id
        if (!userId || typeof userId !== 'string') {
          continue
        }

        const balance = toNumber(user?.balance)
        const totalCost = await getUserTotalCostUsd(client, userId)
        // Important: do NOT clamp per-user before merging (it can distort totals).
        // We clamp only once after merging by email.
        const available = balance - totalCost

        const incoming = {
          email,
          passwordHash,
          availableBalance: available,
          passwordChangedAt: user?.passwordChangedAt,
          updatedAt: user?.updatedAt,
          createdAt: user?.createdAt,
          lastLoginAt: user?.lastLoginAt,
          sourceUserId: user?.id,
          sourceUsername: user?.username,
          usernames: new Set()
        }
        addUsernameToSet(incoming.usernames, incoming.sourceUsername)

        const existing = byEmail.get(email)
        if (!existing) {
          byEmail.set(email, { ...incoming, sources: 1 })
          continue
        }

        existing.sources = (existing.sources || 1) + 1
        existing.availableBalance = toNumber(existing.availableBalance) + incoming.availableBalance
        if (!(existing.usernames instanceof Set)) {
          existing.usernames = new Set()
        }
        addUsernameToSet(existing.usernames, incoming.sourceUsername)

        if (existing.passwordHash !== incoming.passwordHash) {
          // record a conflict (do not print email to stdout; store in report file if requested)
          if (!existing._hasConflict) {
            existing._hasConflict = true
            stats.emailsWithPasswordConflicts++
          }
          const preferred = pickPreferredHash(existing, incoming)
          existing.passwordHash = preferred.passwordHash
          existing.passwordChangedAt = preferred.passwordChangedAt
          existing.updatedAt = preferred.updatedAt
          existing.createdAt = preferred.createdAt
          existing.lastLoginAt = preferred.lastLoginAt
          existing.sourceUserId = preferred.sourceUserId
          existing.sourceUsername = preferred.sourceUsername
        }
      }
    }

    await new Promise((resolve, reject) => {
      stream.on('data', async (keys) => {
        stream.pause()
        try {
          await handleBatch(keys)
          if (stopEarly) {
            stream.destroy()
            resolve()
            return
          }
          stream.resume()
        } catch (e) {
          reject(e)
        }
      })
      stream.on('error', reject)
      stream.on('end', resolve)
      stream.on('close', resolve)
    })

    stats.emailsDistinct = byEmail.size
    for (const v of byEmail.values()) {
      if ((v.sources || 1) > 1) stats.emailsWithMultipleUsers++
      if (v._hasConflict) {
        conflicts.push({
          email: v.email,
          sources: v.sources,
          chosen_source_user_id: v.sourceUserId,
          chosen_source_username: v.sourceUsername
        })
      }
    }

    if (conflicts.length > 0 && opts.conflictsReport) {
      ensureParentDir(opts.conflictsReport)
      fs.writeFileSync(opts.conflictsReport, JSON.stringify(conflicts, null, 2), {
        encoding: 'utf8',
        mode: 0o600
      })
    }

    if (conflicts.length > 0 && opts.failOnPasswordConflicts) {
      logger.error(
        `❌ Found ${conflicts.length} email(s) with conflicting password hashes. Refusing to export (strict mode). ` +
          `Re-run without --fail-on-password-conflicts to proceed, and consider using --conflicts-report to review.`
      )
      process.exitCode = 2
      return
    }

    const columns = ['email', 'usernames', 'username', 'password_hash', 'available_balance']
    if (opts.format === 'csv' && !opts.noHeader) {
      outStream.write(columns.map(csvEscape).join(',') + '\n')
    }

    const records = Array.from(byEmail.values()).sort((a, b) => a.email.localeCompare(b.email))
    for (const r of records) {
      const mergedAvailable = opts.clampNegative && toNumber(r.availableBalance) < 0 ? 0 : r.availableBalance
      const row = {
        email: r.email,
        usernames: usernamesSetToListString(r.usernames),
        username: typeof r.sourceUsername === 'string' ? r.sourceUsername : '',
        password_hash: r.passwordHash,
        available_balance: toFixed8(mergedAvailable)
      }
      if (opts.format === 'jsonl') {
        outStream.write(JSON.stringify(row) + '\n')
      } else {
        outStream.write(columns.map((c) => csvEscape(row[c])).join(',') + '\n')
      }
    }

    logger.info('✅ Export completed', {
      out: opts.out,
      format: opts.format,
      clampNegative: opts.clampNegative,
      failOnPasswordConflicts: opts.failOnPasswordConflicts,
      scannedUserKeys: stats.scannedUserKeys,
      emailsDistinct: stats.emailsDistinct,
      emailsWithMultipleUsers: stats.emailsWithMultipleUsers,
      emailsWithPasswordConflicts: stats.emailsWithPasswordConflicts
    })
  } finally {
    try {
      await redis.disconnect()
    } catch {
      // ignore
    }
    await new Promise((resolve) => outStream.end(resolve))
  }
}

main().catch((err) => {
  logger.error('💥 Export failed:', err)
  process.exitCode = 1
})

