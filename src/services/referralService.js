const crypto = require('crypto')
const redis = require('../models/redis')
const config = require('../../config/config')
const logger = require('../utils/logger')

class ReferralService {
  constructor() {
    this.codeKeyPrefix = 'referral:code:'
    this.userCodeKeyPrefix = 'referral:user:'
    this.inviteKeyPrefix = 'referral:invite:'
    this.userInviteListPrefix = 'referral:user:'
    this.userStatsPrefix = 'referral:stats:'
    this.rewardLockPrefix = 'referral:reward-lock:'
  }

  isEnabled() {
    return !!(config.referralProgram && config.referralProgram.enabled)
  }

  getProgramConfig() {
    return config.referralProgram || {}
  }

  getRewardAmountUsd() {
    const reward = parseFloat(this.getProgramConfig().rewardUsd)
    return Number.isFinite(reward) && reward > 0 ? reward : 10
  }

  getQualifiedRechargeUsd() {
    const program = this.getProgramConfig()
    const explicitUsd = parseFloat(program.qualifiedRechargeUsd)
    if (Number.isFinite(explicitUsd) && explicitUsd > 0) {
      return explicitUsd
    }

    const cny = parseFloat(program.qualifiedRechargeCny) || 20
    const exchangeRate = parseFloat(config.payment?.exchangeRate) || 7.2
    const usd = cny / exchangeRate
    return parseFloat(usd.toFixed(4))
  }

  getQualifiedRechargeCny() {
    const program = this.getProgramConfig()
    const explicitCny = parseFloat(program.qualifiedRechargeCny)
    if (Number.isFinite(explicitCny) && explicitCny > 0) {
      return explicitCny
    }
    const usd = this.getQualifiedRechargeUsd()
    const exchangeRate = parseFloat(config.payment?.exchangeRate) || 7.2
    return parseFloat((usd * exchangeRate).toFixed(2))
  }

  getRulesDescription() {
    return this.getProgramConfig().rulesDescription || ''
  }

  getReferralLinkBase() {
    const program = this.getProgramConfig()
    if (program.linkBaseUrl) {
      return program.linkBaseUrl
    }
    const baseUrl = process.env.BASE_URL || config.server?.baseUrl
    return baseUrl ? `${baseUrl.replace(/\/$/, '')}/user-register` : '/user-register'
  }

  codeKey(code) {
    return `${this.codeKeyPrefix}${code}`
  }

  userCodeKey(userId) {
    return `${this.userCodeKeyPrefix}${userId}:code`
  }

  inviteKey(inviteeId) {
    return `${this.inviteKeyPrefix}${inviteeId}`
  }

  userInviteListKey(userId) {
    return `${this.userInviteListPrefix}${userId}:invitees`
  }

  userStatsKey(userId) {
    return `${this.userStatsPrefix}${userId}`
  }

  rewardLockKey(inviteeId) {
    return `${this.rewardLockPrefix}${inviteeId}`
  }

  defaultStats() {
    return {
      totalInvites: 0,
      qualifiedInvites: 0,
      totalRewardUsd: 0,
      lastInviteAt: null,
      lastQualifiedAt: null,
      lastRewardAt: null
    }
  }

  normalizeInviteRecord(record) {
    if (!record) {
      return null
    }

    return {
      inviteeId: record.inviteeId,
      inviteeUsername: record.inviteeUsername,
      referrerId: record.referrerId,
      referrerUsername: record.referrerUsername,
      createdAt: record.createdAt,
      qualifiedAt: record.qualifiedAt || null,
      rewardedAt: record.rewardedAt || null,
      rewardAmountUsd: record.rewardAmountUsd || this.getRewardAmountUsd(),
      rewardIssued: record.rewardIssued === true,
      rewardsIssued: record.rewardsIssued || 0,
      totalRechargeUsd: record.totalRechargeUsd || 0,
      lastRechargeAt: record.lastRechargeAt || null,
      lastRechargeAmountUsd: record.lastRechargeAmountUsd || 0,
      status: record.rewardIssued
        ? 'rewarded'
        : record.qualifiedAt
          ? 'qualified'
          : 'pending'
    }
  }

  async getUserStats(userId) {
    const client = redis.getClientSafe()
    const raw = await client.get(this.userStatsKey(userId))
    if (!raw) {
      return this.defaultStats()
    }
    try {
      const parsed = JSON.parse(raw)
      const stats = {
        ...this.defaultStats(),
        ...parsed
      }
      // Ensure numeric fields are numbers
      stats.totalInvites = parseInt(stats.totalInvites) || 0
      stats.qualifiedInvites = parseInt(stats.qualifiedInvites) || 0
      stats.totalRewardUsd = parseFloat(stats.totalRewardUsd) || 0
      return stats
    } catch (error) {
      logger.warn('Failed to parse referral stats', { userId, error: error.message })
      return this.defaultStats()
    }
  }

  async updateStats(userId, { inc = {}, set = {} }) {
    const client = redis.getClientSafe()
    const current = await this.getUserStats(userId)

    Object.entries(inc).forEach(([field, value]) => {
      const numericValue = Number(value) || 0
      current[field] = (Number(current[field]) || 0) + numericValue
    })

    Object.entries(set).forEach(([field, value]) => {
      current[field] = value
    })

    await client.set(this.userStatsKey(userId), JSON.stringify(current))
    return current
  }

  async getOrCreateReferralCode(userId) {
    if (!this.isEnabled()) {
      return null
    }

    const client = redis.getClientSafe()
    const existing = await client.get(this.userCodeKey(userId))
    if (existing) {
      return existing
    }

    const code = await this.generateUniqueCode(userId)
    return code
  }

  async generateUniqueCode(userId) {
    const client = redis.getClientSafe()
    const program = this.getProgramConfig()
    const length = Math.max(4, parseInt(program.codeLength) || 8)

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const code = this.createCodeCandidate(length)
      const key = this.codeKey(code)

      const result = await client.set(key, userId, 'NX')
      if (result === 'OK') {
        await client.set(this.userCodeKey(userId), code)
        logger.info(`Generated referral code for user ${userId}: ${code}`)
        return code
      }
    }

    throw new Error('Failed to generate referral code')
  }

  createCodeCandidate(length) {
    const random = crypto.randomBytes(16).toString('base64url').toUpperCase()
    const sanitized = random.replace(/[^A-Z0-9]/g, '')
    if (sanitized.length >= length) {
      return sanitized.slice(0, length)
    }

    const fallback = crypto.randomBytes(length).toString('hex').toUpperCase()
    return fallback.slice(0, length)
  }

  async findUserIdByCode(code) {
    if (!code) {
      return null
    }
    const client = redis.getClientSafe()
    const normalized = code.trim().toUpperCase()
    return await client.get(this.codeKey(normalized))
  }

  async recordInvitation({ inviteeId, inviteeUsername, referrerId, referrerUsername }) {
    if (!this.isEnabled()) {
      return null
    }

    if (!inviteeId || !referrerId) {
      throw new Error('Invalid referral payload')
    }

    if (inviteeId === referrerId) {
      throw new Error('Cannot refer yourself')
    }

    const client = redis.getClientSafe()
    const recordKey = this.inviteKey(inviteeId)
    const existingRaw = await client.get(recordKey)
    if (existingRaw) {
      try {
        const existing = JSON.parse(existingRaw)
        return this.normalizeInviteRecord(existing)
      } catch (error) {
        logger.warn('Failed to parse existing referral record, will regenerate', {
          inviteeId,
          error: error.message
        })
      }
    }

    const stats = await this.getUserStats(referrerId)
    const maxInvitees = parseInt(this.getProgramConfig().maxInviteesPerUser) || 0
    if (maxInvitees > 0 && stats.totalInvites >= maxInvitees) {
      throw new Error('Referral limit reached')
    }

    const now = new Date().toISOString()
    const record = {
      inviteeId,
      inviteeUsername,
      referrerId,
      referrerUsername,
      createdAt: now,
      qualifiedAt: null,
      rewardedAt: null,
      totalRechargeUsd: 0,
      rewardIssued: false,
      rewardsIssued: 0,
      rewardAmountUsd: this.getRewardAmountUsd()
    }

    await client.set(recordKey, JSON.stringify(record))
    await client.lpush(this.userInviteListKey(referrerId), inviteeId)
    await this.updateStats(referrerId, {
      inc: { totalInvites: 1 },
      set: { lastInviteAt: now }
    })

    logger.info('Referral recorded', { referrerId, inviteeId })
    return this.normalizeInviteRecord(record)
  }

  async getInviteRecord(inviteeId) {
    const client = redis.getClientSafe()
    const raw = await client.get(this.inviteKey(inviteeId))
    if (!raw) {
      return null
    }
    try {
      return this.normalizeInviteRecord(JSON.parse(raw))
    } catch (error) {
      logger.error('Failed to parse invite record', { inviteeId, error: error.message })
      return null
    }
  }

  async saveInviteRecord(record) {
    if (!record || !record.inviteeId) {
      return
    }
    const client = redis.getClientSafe()
    await client.set(this.inviteKey(record.inviteeId), JSON.stringify(record))
  }

  async listInvitees(userId, options = {}) {
    if (!this.isEnabled()) {
      return {
        records: [],
        total: 0,
        page: 1,
        limit: options.limit || 20,
        totalPages: 0
      }
    }

    const client = redis.getClientSafe()
    const page = Math.max(parseInt(options.page, 10) || 1, 1)
    const limit = Math.max(parseInt(options.limit, 10) || 20, 1)
    const start = (page - 1) * limit
    const end = start + limit - 1

    const listKey = this.userInviteListKey(userId)
    const total = await client.llen(listKey)
    if (!total) {
      return {
        records: [],
        total: 0,
        page,
        limit,
        totalPages: 0
      }
    }

    const inviteeIds = await client.lrange(listKey, start, end)
    if (!inviteeIds.length) {
      return {
        records: [],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }

    const pipeline = client.pipeline()
    inviteeIds.forEach((inviteeId) => pipeline.get(this.inviteKey(inviteeId)))
    const responses = await pipeline.exec()

    const records = []
    responses.forEach(([error, value]) => {
      if (error || !value) {
        return
      }
      try {
        const parsed = JSON.parse(value)
        records.push(this.normalizeInviteRecord(parsed))
      } catch (parseError) {
        logger.warn('Failed to parse invite record during list', { error: parseError.message })
      }
    })

    return {
      records,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  async processInviteeRecharge({ inviteeId, totalRechargeUsd, rechargeAmountUsd }) {
    if (!this.isEnabled()) {
      return null
    }

    const record = await this.getInviteRecord(inviteeId)
    if (!record) {
      return null
    }

    const now = new Date().toISOString()
    record.totalRechargeUsd = parseFloat(totalRechargeUsd) || 0
    record.lastRechargeAt = now
    record.lastRechargeAmountUsd = parseFloat(rechargeAmountUsd) || 0

    const threshold = this.getQualifiedRechargeUsd()
    if (!record.qualifiedAt && record.totalRechargeUsd >= threshold) {
      record.qualifiedAt = now
      record.status = 'qualified'
      await this.updateStats(record.referrerId, {
        inc: { qualifiedInvites: 1 },
        set: { lastQualifiedAt: now }
      })
      logger.info('Referral invitee qualified', {
        inviteeId,
        referrerId: record.referrerId,
        totalRechargeUsd: record.totalRechargeUsd
      })
    }

    await this.saveInviteRecord(record)

    if (!record.qualifiedAt) {
      return null
    }

    if (record.rewardIssued) {
      return null
    }

    const maxRewards = parseInt(this.getProgramConfig().maxRewardsPerInvitee) || 1
    const rewardsIssued = parseInt(record.rewardsIssued) || 0
    if (maxRewards > 0 && rewardsIssued >= maxRewards) {
      return null
    }

    return {
      inviteeId,
      referrerId: record.referrerId,
      referrerUsername: record.referrerUsername,
      rewardAmountUsd: this.getRewardAmountUsd()
    }
  }

  async markRewardIssued(inviteeId, rewardAmountUsd) {
    const record = await this.getInviteRecord(inviteeId)
    if (!record) {
      return null
    }

    const now = new Date().toISOString()
    record.rewardIssued = true
    record.rewardAmountUsd = rewardAmountUsd
    record.rewardedAt = now
    record.rewardsIssued = (parseInt(record.rewardsIssued) || 0) + 1
    record.status = 'rewarded'

    await this.saveInviteRecord(record)
    await this.updateStats(record.referrerId, {
      inc: { totalRewardUsd: rewardAmountUsd },
      set: { lastRewardAt: now }
    })

    logger.info('Referral reward granted', {
      inviteeId,
      referrerId: record.referrerId,
      amount: rewardAmountUsd
    })

    return record
  }

  async acquireRewardLock(inviteeId, ttlSeconds = 30) {
    const client = redis.getClientSafe()
    const token = crypto.randomBytes(8).toString('hex')
    const result = await client.set(this.rewardLockKey(inviteeId), token, 'NX', 'EX', ttlSeconds)
    if (result === 'OK') {
      return token
    }
    return null
  }

  async releaseRewardLock(inviteeId, token) {
    if (!token) {
      return
    }
    const client = redis.getClientSafe()
    const key = this.rewardLockKey(inviteeId)
    const current = await client.get(key)
    if (current === token) {
      await client.del(key)
    }
  }

  async getReferralInfo(userId, { recentLimit = 5 } = {}) {
    if (!this.isEnabled()) {
      throw new Error('Referral program is not enabled')
    }

    const [code, stats, invitees] = await Promise.all([
      this.getOrCreateReferralCode(userId),
      this.getUserStats(userId),
      this.listInvitees(userId, { page: 1, limit: recentLimit })
    ])

    const linkBase = this.getReferralLinkBase()
    const hasQuery = linkBase.includes('?')
    const referralLink = `${linkBase}${hasQuery ? '&' : '?'}inviter=${code}`

    return {
      code,
      link: referralLink,
      rules: this.getRulesDescription(),
      rewardAmountUsd: this.getRewardAmountUsd(),
      qualifiedRechargeUsd: this.getQualifiedRechargeUsd(),
      qualifiedRechargeCny: this.getQualifiedRechargeCny(),
      stats,
      recentInvitees: invitees.records
    }
  }
}

module.exports = new ReferralService()
