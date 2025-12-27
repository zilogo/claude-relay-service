const redis = require('../src/models/redis')
const logger = require('../src/utils/logger')

/**
 * 数据迁移脚本：为现有API Keys创建userId索引
 *
 * 目的：为每个用户创建 user_apikeys:{userId} Redis Set，包含该用户的所有API Key IDs
 * 数据结构：user_apikeys:{userId} → Set { keyId1, keyId2, keyId3, ... }
 *
 * 使用方法：node scripts/migrate-add-user-apikey-index.js
 */

async function migrateUserApiKeyIndex() {
  try {
    logger.info('🚀 开始为现有API Keys创建userId索引...')

    // ✅ 确保 Redis 连接已建立
    await redis.connect()
    logger.info('✅ Redis 连接成功')

    // 获取所有API Keys（最后一次使用KEYS命令）
    const pattern = 'apikey:*'
    const keys = await redis.getClient().keys(pattern)

    logger.info(`📊 找到 ${keys.length} 个API Keys`)

    let migratedCount = 0
    let skippedCount = 0
    const pipeline = redis.getClient().pipeline()

    for (const key of keys) {
      // 跳过hash_map键
      if (key === 'apikey:hash_map') {
        skippedCount++
        continue
      }

      const keyData = await redis.getClient().hgetall(key)
      if (keyData && keyData.userId) {
        const keyId = key.replace('apikey:', '')

        // 添加到用户索引
        pipeline.sadd(`user_apikeys:${keyData.userId}`, keyId)
        migratedCount++

        if (migratedCount % 100 === 0) {
          logger.info(`⏳ 进度: 已处理 ${migratedCount} 个API Keys...`)
        }
      } else if (keyData) {
        // 没有userId的API Key（Admin创建的未分配给用户的Key）
        skippedCount++
      }
    }

    // 执行批量操作
    await pipeline.exec()

    logger.info(`✅ 成功为 ${migratedCount} 个API Keys创建索引`)
    logger.info(`⏭️  跳过 ${skippedCount} 个API Keys（无userId或hash_map）`)
    logger.info('🎉 数据迁移完成')

    // 验证迁移结果
    logger.info('\n📊 验证迁移结果...')
    const userIndexKeys = await redis.getClient().keys('user_apikeys:*')
    logger.info(`✅ 创建了 ${userIndexKeys.length} 个用户索引`)

    // 显示示例
    if (userIndexKeys.length > 0) {
      const sampleKey = userIndexKeys[0]
      const sampleCount = await redis.getClient().scard(sampleKey)
      logger.info(`📝 示例: ${sampleKey} 包含 ${sampleCount} 个API Keys`)
    }

    // ✅ 断开 Redis 连接
    await redis.disconnect()
    logger.info('👋 Redis 连接已关闭')

    process.exit(0)
  } catch (error) {
    logger.error('❌ 数据迁移失败:', error)

    // ✅ 错误时也要断开连接
    try {
      await redis.disconnect()
    } catch (disconnectError) {
      // 忽略断开连接的错误
    }

    process.exit(1)
  }
}

// 执行迁移
migrateUserApiKeyIndex()
