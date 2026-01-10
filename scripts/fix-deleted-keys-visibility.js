#!/usr/bin/env node
/**
 * 修复已删除 API Keys 的可见性问题
 *
 * 问题描述：
 * - 用户无法看到自己已删除的 API Keys
 * - 可能是因为删除时从 user_apikeys 索引中移除了 key ID
 *
 * 解决方案：
 * 1. 扫描所有 API Keys
 * 2. 找出已删除但未在用户索引中的 keys
 * 3. 将它们重新添加到用户索引中
 * 4. 验证修复结果
 */

require('dotenv').config()
const Redis = require('ioredis')
const config = require('../config/config')
const winston = require('winston')

// 配置日志
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`
    })
  ),
  transports: [new winston.transports.Console()]
})

// Redis 连接
const redisConfig = {
  host: config.redis.host,
  port: config.redis.port,
  db: config.redis.db || 0,
  retryStrategy: (times) => Math.min(times * 50, 2000)
}

if (config.redis.password) {
  redisConfig.password = config.redis.password
}

const redis = new Redis(redisConfig)

// 命令行参数
const isDryRun = process.argv.includes('--dry-run')
const verbose = process.argv.includes('--verbose')

async function main() {
  logger.info('='.repeat(70))
  logger.info('🔧 修复已删除 API Keys 可见性工具')
  logger.info(`模式: ${isDryRun ? '🔍 模拟运行（不修改数据）' : '⚡ 实际执行'}`)
  logger.info('='.repeat(70))

  try {
    // 1. 扫描所有 API Keys
    logger.info('\n📊 第一步：扫描所有 API Keys...')
    const allKeys = await scanAllApiKeys()
    logger.info(`  ✅ 发现 ${allKeys.length} 个 API Keys`)

    // 2. 分析已删除的 keys
    logger.info('\n🔍 第二步：分析已删除的 Keys...')
    const deletedKeys = allKeys.filter(key =>
      key.isDeleted === 'true' || key.deletedAt
    )
    logger.info(`  ✅ 发现 ${deletedKeys.length} 个已删除的 Keys`)

    // 3. 按用户分组
    const userDeletedKeys = new Map()
    for (const key of deletedKeys) {
      if (key.ownerId) {
        if (!userDeletedKeys.has(key.ownerId)) {
          userDeletedKeys.set(key.ownerId, [])
        }
        userDeletedKeys.get(key.ownerId).push(key)
      }
    }
    logger.info(`  ✅ 涉及 ${userDeletedKeys.size} 个用户`)

    // 4. 检查并修复索引
    logger.info('\n🔧 第三步：检查并修复用户索引...')
    const fixResults = await fixUserIndexes(userDeletedKeys)

    // 5. 生成详细报告
    generateReport({
      totalKeys: allKeys.length,
      deletedKeys: deletedKeys.length,
      userDeletedKeys,
      fixResults
    })

  } catch (error) {
    logger.error(`❌ 错误: ${error.message}`)
    if (verbose) {
      console.error(error.stack)
    }
    process.exit(1)
  } finally {
    await redis.disconnect()
    logger.info('\n✅ Redis 连接已关闭')
  }
}

/**
 * 扫描所有 API Keys
 */
async function scanAllApiKeys() {
  const keys = []
  let cursor = '0'

  do {
    const [nextCursor, batch] = await redis.scan(
      cursor,
      'MATCH', 'apikey:*',
      'COUNT', 100
    )

    for (const keyName of batch) {
      const keyId = keyName.replace('apikey:', '')
      const keyData = await redis.hgetall(keyName)

      if (keyData && Object.keys(keyData).length > 0) {
        keys.push({
          id: keyId,
          ...keyData
        })
      }
    }

    cursor = nextCursor
  } while (cursor !== '0')

  return keys
}

/**
 * 修复用户索引
 */
async function fixUserIndexes(userDeletedKeys) {
  const results = {
    checked: 0,
    fixed: 0,
    alreadyCorrect: 0,
    errors: [],
    details: []
  }

  for (const [userId, deletedKeys] of userDeletedKeys) {
    results.checked++

    try {
      // 获取当前用户索引
      const currentIndex = await redis.smembers(`user_apikeys:${userId}`)
      const currentSet = new Set(currentIndex)

      // 找出缺失的已删除 keys
      const missingKeys = deletedKeys.filter(key => !currentSet.has(key.id))

      if (missingKeys.length > 0) {
        logger.info(`  👤 用户 ${userId}:`)
        logger.info(`     - 当前索引包含 ${currentIndex.length} 个 Keys`)
        logger.info(`     - 发现 ${missingKeys.length} 个缺失的已删除 Keys`)

        if (verbose) {
          for (const key of missingKeys) {
            logger.info(`       • ${key.id} (${key.name}) - 删除于 ${key.deletedAt || '未知'}`)
          }
        }

        if (!isDryRun) {
          // 将缺失的 keys 添加回索引
          const pipeline = redis.pipeline()
          for (const key of missingKeys) {
            pipeline.sadd(`user_apikeys:${userId}`, key.id)
          }
          await pipeline.exec()
          logger.info(`     ✅ 已修复：添加 ${missingKeys.length} 个 Keys 到索引`)
        } else {
          logger.info(`     ⚠️  模拟运行：将添加 ${missingKeys.length} 个 Keys 到索引`)
        }

        results.fixed++
        results.details.push({
          userId,
          fixed: missingKeys.length,
          keys: missingKeys.map(k => ({
            id: k.id,
            name: k.name,
            deletedAt: k.deletedAt
          }))
        })
      } else {
        if (verbose) {
          logger.info(`  ✓ 用户 ${userId}: 索引已正确（包含所有 ${deletedKeys.length} 个已删除 Keys）`)
        }
        results.alreadyCorrect++
      }

    } catch (error) {
      logger.error(`  ❌ 处理用户 ${userId} 时出错: ${error.message}`)
      results.errors.push({ userId, error: error.message })
    }
  }

  return results
}

/**
 * 生成报告
 */
function generateReport(data) {
  logger.info('\n' + '='.repeat(70))
  logger.info('📊 修复报告')
  logger.info('='.repeat(70))

  logger.info('\n📈 总体统计:')
  logger.info(`  • 总 API Keys: ${data.totalKeys}`)
  logger.info(`  • 已删除 Keys: ${data.deletedKeys}`)
  logger.info(`  • 涉及用户数: ${data.userDeletedKeys.size}`)

  logger.info('\n🔧 修复结果:')
  logger.info(`  • 检查的用户: ${data.fixResults.checked}`)
  logger.info(`  • 需要修复的用户: ${data.fixResults.fixed}`)
  logger.info(`  • 已正确的用户: ${data.fixResults.alreadyCorrect}`)
  logger.info(`  • 错误: ${data.fixResults.errors.length}`)

  // 显示 Top 5 修复最多的用户
  if (data.fixResults.details.length > 0) {
    const sorted = data.fixResults.details
      .sort((a, b) => b.fixed - a.fixed)
      .slice(0, 5)

    logger.info('\n🏆 修复最多的用户 (Top 5):')
    for (const detail of sorted) {
      logger.info(`  • 用户 ${detail.userId}: 修复了 ${detail.fixed} 个 Keys`)
      if (verbose && detail.keys.length <= 3) {
        for (const key of detail.keys) {
          logger.info(`    - ${key.name} (${key.id})`)
        }
      }
    }
  }

  // 错误详情
  if (data.fixResults.errors.length > 0) {
    logger.info('\n⚠️  错误详情:')
    for (const error of data.fixResults.errors) {
      logger.info(`  • 用户 ${error.userId}: ${error.error}`)
    }
  }

  logger.info('\n' + '='.repeat(70))

  if (isDryRun) {
    logger.info('💡 这是模拟运行，没有修改任何数据')
    logger.info('💡 使用以下命令实际执行修复:')
    logger.info('   node scripts/fix-deleted-keys-visibility.js')
  } else {
    logger.info('✅ 修复完成！')
    logger.info('💡 用户现在应该能够看到他们的已删除 API Keys 了')
  }
}

// 验证修复结果
async function verifyFix(userId) {
  const apiKeyService = require('../src/services/apiKeyService')

  try {
    // 测试获取包含已删除的 keys
    const keys = await apiKeyService.getUserApiKeys(userId, true)
    const deletedKeys = keys.filter(k => k.isDeleted === 'true')

    logger.info(`\n✅ 验证结果: 用户 ${userId} 现在可以看到 ${deletedKeys.length} 个已删除的 Keys`)
    return true
  } catch (error) {
    logger.error(`\n❌ 验证失败: ${error.message}`)
    return false
  }
}

// 错误处理
process.on('uncaughtException', (error) => {
  logger.error(`未捕获的异常: ${error.message}`)
  if (verbose) {
    console.error(error.stack)
  }
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`未处理的 Promise 拒绝: ${reason}`)
  process.exit(1)
})

// 执行
main().catch(error => {
  logger.error(`执行失败: ${error.message}`)
  if (verbose) {
    console.error(error.stack)
  }
  process.exit(1)
})