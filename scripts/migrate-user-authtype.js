#!/usr/bin/env node

/**
 * 数据迁移脚本：为现有用户添加 authType 字段
 *
 * 使用方法：
 * node scripts/migrate-user-authtype.js [--dry-run]
 *
 * 参数：
 * --dry-run: 仅模拟运行，不实际修改数据
 *
 * 说明：
 * 此脚本会为所有现有用户添加 authType 字段
 * - 如果用户没有 authType 字段，将设置为 'ldap'（向后兼容）
 * - 如果用户已有 authType 字段，将保持不变
 */

const redis = require('../src/models/redis')
const logger = require('../src/utils/logger')
const readline = require('readline')

// 解析命令行参数
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')

// 创建 readline 接口用于用户确认
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

async function askConfirmation(question) {
  return new Promise((resolve) => {
    rl.question(`${question} (yes/no): `, (answer) => {
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y')
    })
  })
}

async function migrateUsers() {
  try {
    logger.info('🔄 Starting user authType migration...')
    logger.info(`🔍 Mode: ${DRY_RUN ? 'DRY RUN (no changes will be made)' : 'LIVE RUN'}`)

    // 连接 Redis
    await redis.connect()
    logger.success('✅ Connected to Redis')

    const client = redis.getClientSafe()

    // 获取所有用户
    const userKeys = await client.keys('user:*')
    logger.info(`📊 Found ${userKeys.length} user keys in Redis`)

    // 过滤掉非用户数据的键（如 user_session:*）
    const actualUserKeys = userKeys.filter((key) => {
      const parts = key.split(':')
      return parts.length === 2 && parts[0] === 'user'
    })

    logger.info(`📊 Found ${actualUserKeys.length} actual users`)

    // 统计信息
    const stats = {
      total: actualUserKeys.length,
      needsMigration: 0,
      alreadyHasAuthType: 0,
      migrated: 0,
      errors: 0
    }

    // 需要迁移的用户
    const usersToMigrate = []

    // 分析每个用户
    for (const userKey of actualUserKeys) {
      const userData = await client.get(userKey)
      if (!userData) {
        logger.warn(`⚠️ User key ${userKey} has no data, skipping`)
        continue
      }

      try {
        const user = JSON.parse(userData)

        if (!user.authType) {
          usersToMigrate.push({ key: userKey, user })
          stats.needsMigration++
          logger.info(
            `📌 User "${user.username}" (${user.id}) needs migration - will set authType to 'ldap'`
          )
        } else {
          stats.alreadyHasAuthType++
          logger.info(
            `✓ User "${user.username}" (${user.id}) already has authType: ${user.authType}`
          )
        }
      } catch (error) {
        logger.error(`❌ Error parsing user data for key ${userKey}:`, error)
        stats.errors++
      }
    }

    if (usersToMigrate.length === 0) {
      logger.success('✨ No users need migration!')
      rl.close()
      await redis.disconnect()
      return
    }

    // 显示迁移摘要
    console.log(`\n${'='.repeat(60)}`)
    console.log('📋 Migration Summary:')
    console.log('='.repeat(60))
    console.log(`Total users: ${stats.total}`)
    console.log(`Already have authType: ${stats.alreadyHasAuthType}`)
    console.log(`Need migration: ${stats.needsMigration}`)
    console.log(`Default authType: ldap (for backward compatibility)`)
    console.log(`${'='.repeat(60)}\n`)

    // 如果不是 dry run，请求确认
    if (!DRY_RUN) {
      const confirmed = await askConfirmation(
        `Are you sure you want to migrate ${stats.needsMigration} user(s)?`
      )

      if (!confirmed) {
        logger.info('❌ Migration cancelled by user')
        rl.close()
        await redis.disconnect()
        return
      }
    }

    // 执行迁移
    logger.info('🚀 Starting migration process...')

    for (const { key, user } of usersToMigrate) {
      try {
        if (DRY_RUN) {
          logger.info(`[DRY RUN] Would set authType='ldap' for user: ${user.username} (${user.id})`)
          stats.migrated++
        } else {
          // 添加 authType 字段
          user.authType = 'ldap'
          user.updatedAt = new Date().toISOString()

          // 保存更新后的用户数据
          await client.set(key, JSON.stringify(user))

          logger.success(`✅ Migrated user: ${user.username} (${user.id})`)
          stats.migrated++
        }
      } catch (error) {
        logger.error(`❌ Error migrating user ${user.username} (${user.id}):`, error)
        stats.errors++
      }
    }

    // 显示最终结果
    console.log(`\n${'='.repeat(60)}`)
    console.log('✨ Migration Complete!')
    console.log('='.repeat(60))
    console.log(`Total users: ${stats.total}`)
    console.log(`Already had authType: ${stats.alreadyHasAuthType}`)
    console.log(`Needed migration: ${stats.needsMigration}`)
    console.log(`Successfully migrated: ${stats.migrated}`)
    console.log(`Errors: ${stats.errors}`)
    console.log(`${'='.repeat(60)}\n`)

    if (DRY_RUN) {
      logger.info('🔍 This was a DRY RUN. No actual changes were made.')
      logger.info('💡 Run without --dry-run to apply the migration.')
    }

    rl.close()
    await redis.disconnect()
  } catch (error) {
    logger.error('❌ Migration failed:', error)
    rl.close()
    await redis.disconnect()
    process.exit(1)
  }
}

// 运行迁移
migrateUsers()
  .then(() => {
    logger.success('✅ Migration script completed')
    process.exit(0)
  })
  .catch((error) => {
    logger.error('❌ Migration script failed:', error)
    process.exit(1)
  })
