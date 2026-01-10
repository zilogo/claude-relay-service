#!/usr/bin/env node
/**
 * 优化用户API Keys索引脚本
 *
 * 功能：
 * 1. 检查并修复用户API Keys的Redis索引完整性
 * 2. 为已删除的API Keys创建专门的索引结构
 * 3. 生成性能统计报告
 *
 * 使用方法：
 * node scripts/optimize-user-apikeys-index.js [--dry-run]
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

// Redis连接配置
const redisConfig = {
  host: config.redis.host,
  port: config.redis.port,
  db: config.redis.db || 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000)
    return delay
  }
}

if (config.redis.password) {
  redisConfig.password = config.redis.password
}

const redis = new Redis(redisConfig)

// 命令行参数
const isDryRun = process.argv.includes('--dry-run')

/**
 * 主函数
 */
async function main() {
  logger.info('='.repeat(60))
  logger.info('用户 API Keys 索引优化工具')
  logger.info(`模式: ${isDryRun ? '模拟运行（不修改数据）' : '实际执行'}`)
  logger.info('='.repeat(60))

  try {
    // 1. 扫描所有API Keys
    const allApiKeys = await scanAllApiKeys()
    logger.info(`✅ 扫描完成：发现 ${allApiKeys.length} 个 API Keys`)

    // 2. 构建索引映射
    const indexMap = await buildIndexMap(allApiKeys)
    logger.info(`✅ 索引映射构建完成`)

    // 3. 检查并修复现有索引
    const repairResults = await repairUserApiKeysIndex(indexMap)
    logger.info(`✅ 索引修复完成`)

    // 4. 创建删除键专用索引
    const deletedIndexResults = await createDeletedKeysIndex(allApiKeys)
    logger.info(`✅ 删除键索引创建完成`)

    // 5. 生成统计报告
    generateReport({
      totalKeys: allApiKeys.length,
      indexMap,
      repairResults,
      deletedIndexResults
    })

  } catch (error) {
    logger.error(`❌ 执行失败: ${error.message}`)
    process.exit(1)
  } finally {
    await redis.disconnect()
    logger.info('Redis 连接已关闭')
  }
}

/**
 * 扫描所有API Keys
 */
async function scanAllApiKeys() {
  const apiKeys = []
  let cursor = '0'

  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      'MATCH',
      'apikey:*',
      'COUNT',
      100
    )

    for (const key of keys) {
      const keyData = await redis.hgetall(key)
      if (keyData && Object.keys(keyData).length > 0) {
        const keyId = key.replace('apikey:', '')
        apiKeys.push({
          id: keyId,
          ...keyData
        })
      }
    }

    cursor = nextCursor
  } while (cursor !== '0')

  return apiKeys
}

/**
 * 构建用户-API Key索引映射
 */
async function buildIndexMap(apiKeys) {
  const indexMap = new Map() // userId -> Set<keyId>

  for (const apiKey of apiKeys) {
    if (apiKey.ownerId) {
      if (!indexMap.has(apiKey.ownerId)) {
        indexMap.set(apiKey.ownerId, new Set())
      }
      indexMap.get(apiKey.ownerId).add(apiKey.id)
    }
  }

  return indexMap
}

/**
 * 检查并修复用户API Keys索引
 */
async function repairUserApiKeysIndex(indexMap) {
  const results = {
    checked: 0,
    repaired: 0,
    errors: []
  }

  for (const [userId, keyIds] of indexMap) {
    results.checked++

    try {
      // 获取当前索引
      const currentIndex = await redis.smembers(`user_apikeys:${userId}`)
      const currentSet = new Set(currentIndex)

      // 计算差异
      const missing = [...keyIds].filter(id => !currentSet.has(id))
      const extra = currentIndex.filter(id => !keyIds.has(id))

      if (missing.length > 0 || extra.length > 0) {
        logger.info(`  修复用户 ${userId} 的索引：+${missing.length} -${extra.length}`)

        if (!isDryRun) {
          // 使用事务确保原子性
          const pipeline = redis.pipeline()

          // 添加缺失的键
          if (missing.length > 0) {
            pipeline.sadd(`user_apikeys:${userId}`, ...missing)
          }

          // 移除多余的键
          if (extra.length > 0) {
            pipeline.srem(`user_apikeys:${userId}`, ...extra)
          }

          await pipeline.exec()
        }

        results.repaired++
      }

    } catch (error) {
      results.errors.push({
        userId,
        error: error.message
      })
    }
  }

  // 清理不存在用户的索引
  const allUserIndexKeys = await scanKeys('user_apikeys:*')
  for (const indexKey of allUserIndexKeys) {
    const userId = indexKey.replace('user_apikeys:', '')
    if (!indexMap.has(userId)) {
      logger.info(`  清理孤立索引: ${indexKey}`)
      if (!isDryRun) {
        await redis.del(indexKey)
      }
      results.repaired++
    }
  }

  return results
}

/**
 * 创建已删除API Keys的专用索引
 */
async function createDeletedKeysIndex(apiKeys) {
  const results = {
    totalDeleted: 0,
    byUser: new Map(),
    byDate: new Map()
  }

  // 按用户和日期分组已删除的键
  for (const apiKey of apiKeys) {
    if (apiKey.isDeleted === 'true' || apiKey.deletedAt) {
      results.totalDeleted++

      // 按用户分组
      if (apiKey.ownerId) {
        if (!results.byUser.has(apiKey.ownerId)) {
          results.byUser.set(apiKey.ownerId, [])
        }
        results.byUser.get(apiKey.ownerId).push(apiKey.id)
      }

      // 按日期分组
      if (apiKey.deletedAt) {
        const date = new Date(apiKey.deletedAt).toISOString().split('T')[0]
        if (!results.byDate.has(date)) {
          results.byDate.set(date, [])
        }
        results.byDate.get(date).push(apiKey.id)
      }
    }
  }

  // 创建索引（如果需要的话）
  if (!isDryRun && results.totalDeleted > 0) {
    // 创建用户-已删除键索引（使用Sorted Set按删除时间排序）
    for (const [userId, keyIds] of results.byUser) {
      const pipeline = redis.pipeline()
      for (const keyId of keyIds) {
        const apiKey = apiKeys.find(k => k.id === keyId)
        const score = apiKey.deletedAt ? new Date(apiKey.deletedAt).getTime() : Date.now()
        pipeline.zadd(`user_deleted_keys:${userId}`, score, keyId)
      }
      await pipeline.exec()
    }

    // 创建全局已删除键索引（按日期）
    for (const [date, keyIds] of results.byDate) {
      await redis.sadd(`deleted_keys:${date}`, ...keyIds)
      // 设置30天过期时间
      await redis.expire(`deleted_keys:${date}`, 30 * 24 * 60 * 60)
    }
  }

  return results
}

/**
 * 扫描匹配的键
 */
async function scanKeys(pattern) {
  const keys = []
  let cursor = '0'

  do {
    const [nextCursor, batch] = await redis.scan(
      cursor,
      'MATCH',
      pattern,
      'COUNT',
      100
    )
    keys.push(...batch)
    cursor = nextCursor
  } while (cursor !== '0')

  return keys
}

/**
 * 生成统计报告
 */
function generateReport(data) {
  logger.info('')
  logger.info('='.repeat(60))
  logger.info('📊 优化统计报告')
  logger.info('='.repeat(60))

  logger.info(`📈 总体统计:`)
  logger.info(`  - 总 API Keys 数量: ${data.totalKeys}`)
  logger.info(`  - 用户数量: ${data.indexMap.size}`)
  logger.info(`  - 平均每用户 Keys: ${(data.totalKeys / data.indexMap.size).toFixed(2)}`)

  logger.info('')
  logger.info(`🔧 索引修复:`)
  logger.info(`  - 检查的用户数: ${data.repairResults.checked}`)
  logger.info(`  - 修复的索引数: ${data.repairResults.repaired}`)
  logger.info(`  - 错误数: ${data.repairResults.errors.length}`)

  if (data.repairResults.errors.length > 0) {
    logger.info(`  - 错误详情:`)
    for (const error of data.repairResults.errors) {
      logger.info(`    • 用户 ${error.userId}: ${error.error}`)
    }
  }

  logger.info('')
  logger.info(`🗑️ 已删除键索引:`)
  logger.info(`  - 已删除的 Keys 总数: ${data.deletedIndexResults.totalDeleted}`)
  logger.info(`  - 涉及用户数: ${data.deletedIndexResults.byUser.size}`)
  logger.info(`  - 删除日期数: ${data.deletedIndexResults.byDate.size}`)

  // 显示Top用户（删除最多的）
  if (data.deletedIndexResults.byUser.size > 0) {
    const sortedUsers = [...data.deletedIndexResults.byUser.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5)

    logger.info(`  - Top 5 用户（按删除数量）:`)
    for (const [userId, keyIds] of sortedUsers) {
      logger.info(`    • 用户 ${userId}: ${keyIds.length} 个已删除键`)
    }
  }

  logger.info('')
  logger.info('='.repeat(60))

  if (isDryRun) {
    logger.info('⚠️  模拟运行完成，未对数据进行任何修改')
    logger.info('💡 提示：移除 --dry-run 参数以实际执行优化')
  } else {
    logger.info('✅ 索引优化完成！')
  }
}

// 错误处理
process.on('uncaughtException', (error) => {
  logger.error(`未捕获的异常: ${error.message}`)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`未处理的 Promise 拒绝: ${reason}`)
  process.exit(1)
})

// 执行主函数
main().catch((error) => {
  logger.error(`执行失败: ${error.message}`)
  process.exit(1)
})