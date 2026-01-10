#!/usr/bin/env node
/**
 * 诊断已删除 API Keys 可见性问题
 *
 * 这个脚本帮助诊断为什么用户看不到已删除的 API Keys
 */

require('dotenv').config()
const Redis = require('ioredis')
const config = require('../config/config')
const winston = require('winston')
const readline = require('readline')

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

// 创建 readline 接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(prompt) {
  return new Promise(resolve => rl.question(prompt, resolve))
}

async function main() {
  logger.info('='.repeat(70))
  logger.info('🔍 诊断已删除 API Keys 可见性问题')
  logger.info('='.repeat(70))

  try {
    // 选择诊断模式
    logger.info('\n请选择诊断模式:')
    logger.info('1. 诊断特定用户')
    logger.info('2. 扫描所有用户')
    logger.info('3. 检查特定 API Key')
    logger.info('4. 测试 API 端点')

    const mode = await question('\n请输入选项 (1-4): ')

    switch (mode) {
      case '1':
        await diagnoseUser()
        break
      case '2':
        await scanAllUsers()
        break
      case '3':
        await checkApiKey()
        break
      case '4':
        await testApiEndpoint()
        break
      default:
        logger.error('无效选项')
    }

  } catch (error) {
    logger.error(`❌ 错误: ${error.message}`)
    console.error(error.stack)
  } finally {
    rl.close()
    await redis.disconnect()
  }
}

/**
 * 诊断特定用户
 */
async function diagnoseUser() {
  const userId = await question('\n请输入用户 ID: ')

  logger.info(`\n📊 诊断用户 ${userId}...`)

  // 1. 检查用户索引
  logger.info('\n1️⃣ 检查用户索引 (user_apikeys:${userId}):')
  const indexedKeys = await redis.smembers(`user_apikeys:${userId}`)
  logger.info(`   • 索引中的 Key 数量: ${indexedKeys.length}`)

  if (indexedKeys.length > 0) {
    logger.info('   • Key IDs:')
    for (const keyId of indexedKeys.slice(0, 10)) {
      logger.info(`     - ${keyId}`)
    }
    if (indexedKeys.length > 10) {
      logger.info(`     ... 还有 ${indexedKeys.length - 10} 个`)
    }
  }

  // 2. 扫描实际的 API Keys
  logger.info('\n2️⃣ 扫描实际的 API Keys:')
  const actualKeys = await scanUserApiKeys(userId)
  logger.info(`   • 实际存在的 Key 数量: ${actualKeys.length}`)

  const activeKeys = actualKeys.filter(k => k.isDeleted !== 'true' && !k.deletedAt)
  const deletedKeys = actualKeys.filter(k => k.isDeleted === 'true' || k.deletedAt)

  logger.info(`   • 活跃 Keys: ${activeKeys.length}`)
  logger.info(`   • 已删除 Keys: ${deletedKeys.length}`)

  // 3. 比较差异
  logger.info('\n3️⃣ 分析差异:')
  const indexSet = new Set(indexedKeys)
  const actualSet = new Set(actualKeys.map(k => k.id))

  const missingInIndex = actualKeys.filter(k => !indexSet.has(k.id))
  const extraInIndex = indexedKeys.filter(id => !actualSet.has(id))

  if (missingInIndex.length > 0) {
    logger.info(`   ⚠️  索引中缺失 ${missingInIndex.length} 个 Keys:`)
    for (const key of missingInIndex) {
      const status = key.isDeleted === 'true' ? '已删除' : '活跃'
      logger.info(`     - ${key.id} (${key.name}) [${status}]`)
      if (key.deletedAt) {
        logger.info(`       删除时间: ${key.deletedAt}`)
      }
    }
  }

  if (extraInIndex.length > 0) {
    logger.info(`   ⚠️  索引中多余 ${extraInIndex.length} 个不存在的 Keys:`)
    for (const keyId of extraInIndex) {
      logger.info(`     - ${keyId}`)
    }
  }

  if (missingInIndex.length === 0 && extraInIndex.length === 0) {
    logger.info('   ✅ 索引完全正确')
  }

  // 4. 测试服务层
  logger.info('\n4️⃣ 测试服务层:')
  await testServiceLayer(userId)

  // 5. 建议
  logger.info('\n5️⃣ 建议:')
  if (missingInIndex.length > 0) {
    logger.info('   💡 发现索引缺失问题，建议运行修复脚本:')
    logger.info('      node scripts/fix-deleted-keys-visibility.js')
  } else if (deletedKeys.length === 0) {
    logger.info('   ℹ️  该用户没有已删除的 API Keys')
  } else {
    logger.info('   ✅ 索引正常，用户应该能看到已删除的 Keys')
    logger.info('   💡 如果前端仍然看不到，请检查:')
    logger.info('      1. 前端是否传递了 includeDeleted=true 参数')
    logger.info('      2. 前端是否正确显示已删除的 Keys')
  }
}

/**
 * 扫描用户的实际 API Keys
 */
async function scanUserApiKeys(userId) {
  const keys = []
  let cursor = '0'

  do {
    const [nextCursor, batch] = await redis.scan(
      cursor,
      'MATCH', 'apikey:*',
      'COUNT', 100
    )

    for (const keyName of batch) {
      const keyData = await redis.hgetall(keyName)
      if (keyData && keyData.ownerId === userId) {
        const keyId = keyName.replace('apikey:', '')
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
 * 扫描所有用户
 */
async function scanAllUsers() {
  logger.info('\n📊 扫描所有用户的索引状态...')

  // 获取所有用户索引
  const userIndexKeys = []
  let cursor = '0'

  do {
    const [nextCursor, batch] = await redis.scan(
      cursor,
      'MATCH', 'user_apikeys:*',
      'COUNT', 100
    )
    userIndexKeys.push(...batch)
    cursor = nextCursor
  } while (cursor !== '0')

  logger.info(`发现 ${userIndexKeys.length} 个用户索引`)

  let problemUsers = []

  for (const indexKey of userIndexKeys) {
    const userId = indexKey.replace('user_apikeys:', '')
    const indexedKeys = await redis.smembers(indexKey)
    const actualKeys = await scanUserApiKeys(userId)

    const deletedKeys = actualKeys.filter(k => k.isDeleted === 'true' || k.deletedAt)
    const indexSet = new Set(indexedKeys)
    const missingDeleted = deletedKeys.filter(k => !indexSet.has(k.id))

    if (missingDeleted.length > 0) {
      problemUsers.push({
        userId,
        missing: missingDeleted.length,
        total: deletedKeys.length
      })
    }
  }

  if (problemUsers.length > 0) {
    logger.info(`\n⚠️  发现 ${problemUsers.length} 个用户存在索引问题:`)
    for (const user of problemUsers) {
      logger.info(`  • 用户 ${user.userId}: 缺失 ${user.missing}/${user.total} 个已删除 Keys`)
    }
    logger.info('\n💡 建议运行修复脚本:')
    logger.info('   node scripts/fix-deleted-keys-visibility.js')
  } else {
    logger.info('\n✅ 所有用户索引都正确')
  }
}

/**
 * 检查特定 API Key
 */
async function checkApiKey() {
  const keyId = await question('\n请输入 API Key ID: ')

  logger.info(`\n📊 检查 API Key ${keyId}...`)

  // 获取 Key 数据
  const keyData = await redis.hgetall(`apikey:${keyId}`)

  if (!keyData || Object.keys(keyData).length === 0) {
    logger.error('❌ API Key 不存在')
    return
  }

  logger.info('\n1️⃣ API Key 信息:')
  logger.info(`   • 名称: ${keyData.name}`)
  logger.info(`   • 所有者: ${keyData.ownerId}`)
  logger.info(`   • 状态: ${keyData.isActive === 'true' ? '活跃' : '禁用'}`)
  logger.info(`   • 已删除: ${keyData.isDeleted === 'true' ? '是' : '否'}`)

  if (keyData.deletedAt) {
    logger.info(`   • 删除时间: ${keyData.deletedAt}`)
    logger.info(`   • 删除者: ${keyData.deletedBy} (${keyData.deletedByType})`)
  }

  // 检查索引
  if (keyData.ownerId) {
    logger.info('\n2️⃣ 索引状态:')
    const isInIndex = await redis.sismember(`user_apikeys:${keyData.ownerId}`, keyId)

    if (isInIndex) {
      logger.info('   ✅ 在用户索引中')
    } else {
      logger.info('   ❌ 不在用户索引中')

      if (keyData.isDeleted === 'true' || keyData.deletedAt) {
        logger.info('   ⚠️  这是一个已删除的 Key，但不在索引中')
        logger.info('   💡 运行修复脚本来修复:')
        logger.info('      node scripts/fix-deleted-keys-visibility.js')
      }
    }
  }
}

/**
 * 测试 API 端点
 */
async function testApiEndpoint() {
  const userId = await question('\n请输入用户 ID: ')

  logger.info(`\n📊 测试 API 端点...`)

  // 直接调用服务层
  const apiKeyService = require('../src/services/apiKeyService')

  try {
    // 不包含已删除的
    const activeKeys = await apiKeyService.getUserApiKeys(userId, false)
    logger.info(`\n1️⃣ 不包含已删除 (includeDeleted=false):`)
    logger.info(`   • 返回 ${activeKeys.length} 个 Keys`)

    // 包含已删除的
    const allKeys = await apiKeyService.getUserApiKeys(userId, true)
    logger.info(`\n2️⃣ 包含已删除 (includeDeleted=true):`)
    logger.info(`   • 返回 ${allKeys.length} 个 Keys`)

    const deletedInResult = allKeys.filter(k => k.isDeleted === 'true')
    logger.info(`   • 其中已删除: ${deletedInResult.length}`)

    if (deletedInResult.length > 0) {
      logger.info('\n   已删除的 Keys:')
      for (const key of deletedInResult) {
        logger.info(`   - ${key.name} (${key.id})`)
        if (key.deletedAt) {
          logger.info(`     删除时间: ${key.deletedAt}`)
        }
      }
    }

    // 分析
    logger.info('\n3️⃣ 分析:')
    if (allKeys.length === activeKeys.length) {
      logger.info('   ℹ️  没有已删除的 Keys，或者已删除的 Keys 不在索引中')
    } else {
      logger.info('   ✅ API 端点正常工作，可以返回已删除的 Keys')
    }

  } catch (error) {
    logger.error(`❌ 测试失败: ${error.message}`)
  }
}

/**
 * 测试服务层
 */
async function testServiceLayer(userId) {
  const apiKeyService = require('../src/services/apiKeyService')

  try {
    const allKeys = await apiKeyService.getUserApiKeys(userId, true)
    const deletedKeys = allKeys.filter(k => k.isDeleted === 'true')

    logger.info(`   • 服务层返回 ${allKeys.length} 个 Keys`)
    logger.info(`   • 其中已删除: ${deletedKeys.length}`)

    if (deletedKeys.length > 0) {
      logger.info('   ✅ 服务层可以正确返回已删除的 Keys')
    }
  } catch (error) {
    logger.error(`   ❌ 服务层测试失败: ${error.message}`)
  }
}

// 执行
main().catch(error => {
  logger.error(`执行失败: ${error.message}`)
  console.error(error.stack)
  process.exit(1)
})