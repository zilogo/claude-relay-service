#!/usr/bin/env node

/**
 * 生成测试使用数据脚本（修复版）
 * 按照后端期望的数据格式生成测试数据
 * 数据键格式：usage:daily:{keyId}:{dateStr}
 */

const redis = require('../src/models/redis');
const logger = require('../src/utils/logger');
const apiKeyService = require('../src/services/apiKeyService');

// 配置参数
const CONFIG = {
  DAYS_TO_GENERATE: 7, // 生成最近 N 天的数据
  REQUESTS_PER_DAY_MIN: 10,
  REQUESTS_PER_DAY_MAX: 50,
  INPUT_TOKENS_MIN: 500,
  INPUT_TOKENS_MAX: 5000,
  OUTPUT_TOKENS_MIN: 100,
  OUTPUT_TOKENS_MAX: 2000,
  MODELS: [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
  ],
  // 模型价格（每百万令牌，美元）
  MODEL_PRICES: {
    'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
    'claude-3-5-haiku-20241022': { input: 0.8, output: 4.0 },
    'claude-3-opus-20240229': { input: 15.0, output: 75.0 },
    'claude-3-sonnet-20240229': { input: 3.0, output: 15.0 },
  },
};

/**
 * 生成随机整数
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 获取日期字符串 (YYYY-MM-DD)
 */
function getDateString(daysAgo = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

/**
 * 计算成本
 */
function calculateCost(model, inputTokens, outputTokens) {
  const prices = CONFIG.MODEL_PRICES[model] || { input: 3.0, output: 15.0 };
  const inputCost = (inputTokens / 1000000) * prices.input;
  const outputCost = (outputTokens / 1000000) * prices.output;
  return inputCost + outputCost;
}

/**
 * 生成每日使用数据
 */
async function generateDailyUsageData(apiKeyId, date) {
  const requests = randomInt(
    CONFIG.REQUESTS_PER_DAY_MIN,
    CONFIG.REQUESTS_PER_DAY_MAX
  );
  const model =
    CONFIG.MODELS[Math.floor(Math.random() * CONFIG.MODELS.length)];

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheCreateTokens = 0;
  let totalCacheReadTokens = 0;
  let totalCost = 0;

  // 生成每个请求的数据
  for (let i = 0; i < requests; i++) {
    const inputTokens = randomInt(
      CONFIG.INPUT_TOKENS_MIN,
      CONFIG.INPUT_TOKENS_MAX
    );
    const outputTokens = randomInt(
      CONFIG.OUTPUT_TOKENS_MIN,
      CONFIG.OUTPUT_TOKENS_MAX
    );
    const cacheCreateTokens = randomInt(0, 200);
    const cacheReadTokens = randomInt(0, 100);
    const cost = calculateCost(model, inputTokens, outputTokens);

    totalInputTokens += inputTokens;
    totalOutputTokens += outputTokens;
    totalCacheCreateTokens += cacheCreateTokens;
    totalCacheReadTokens += cacheReadTokens;
    totalCost += cost;
  }

  return {
    date,
    model,
    requests,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    cacheCreateTokens: totalCacheCreateTokens,
    cacheReadTokens: totalCacheReadTokens,
    cost: totalCost,
  };
}

/**
 * 保存 API Key 使用统计到 Redis（正确的格式）
 */
async function saveApiKeyUsageData(apiKeyId, data) {
  const client = redis.getClient();
  const { date, model, requests, inputTokens, outputTokens, cost } = data;

  // 1. 保存按日期的详细统计（后端期望的格式）
  const dailyKey = `usage:daily:${apiKeyId}:${date}`;
  await client.hset(dailyKey, {
    requests: requests.toString(),
    inputTokens: inputTokens.toString(),
    outputTokens: outputTokens.toString(),
    cacheCreateTokens: data.cacheCreateTokens.toString(),
    cacheReadTokens: data.cacheReadTokens.toString(),
    cost: cost.toFixed(6),
    model,
    date,
  });
  await client.expire(dailyKey, 90 * 24 * 3600); // 保留 90 天

  // 2. 更新 API Key 使用统计（总计）
  const usageKey = `usage:${apiKeyId}`;
  await client.hincrby(usageKey, 'totalRequests', requests);
  await client.hincrby(usageKey, 'totalInputTokens', inputTokens);
  await client.hincrby(usageKey, 'totalOutputTokens', outputTokens);
  await client.hincrby(
    usageKey,
    'totalTokens',
    inputTokens + outputTokens
  );
  await client.hincrby(
    usageKey,
    'totalAllTokens',
    inputTokens + outputTokens + data.cacheCreateTokens + data.cacheReadTokens
  );
  await client.hincrby(usageKey, 'totalCacheCreateTokens', data.cacheCreateTokens);
  await client.hincrby(usageKey, 'totalCacheReadTokens', data.cacheReadTokens);

  // 3. 更新 API Key 成本统计
  const costTotalKey = `usage:cost:total:${apiKeyId}`;
  const costDailyKey = `usage:cost:daily:${apiKeyId}:${date}`;
  await client.incrbyfloat(costTotalKey, cost);
  await client.incrbyfloat(costDailyKey, cost);
  await client.expire(costDailyKey, 90 * 24 * 3600);

  // 4. 更新全局统计
  const globalKey = `usage:global:${date}`;
  await client.hincrby(globalKey, 'requests', requests);
  await client.hincrby(globalKey, 'inputTokens', inputTokens);
  await client.hincrby(globalKey, 'outputTokens', outputTokens);
  await client.hincrbyfloat(globalKey, 'cost', cost);
  await client.expire(globalKey, 90 * 24 * 3600);
}

/**
 * 获取所有用户
 */
async function getAllUsers() {
  const client = redis.getClient();
  const keys = await client.keys('user:*');

  const users = [];
  for (const key of keys) {
    if (!key.includes('email:') && !key.includes('session:')) {
      const dataStr = await client.get(key);
      if (dataStr) {
        try {
          const data = JSON.parse(dataStr);
          if (data && data.id && data.username) {
            users.push({
              id: data.id,
              username: data.username,
              email: data.email,
            });
          }
        } catch (err) {
          // 跳过无效数据
        }
      }
    }
  }

  return users;
}

/**
 * 确保用户有 API Key
 */
async function ensureUserHasApiKey(userId, username) {
  // 获取用户的 API Keys
  let apiKeys = await apiKeyService.getUserApiKeys(userId, true);

  if (apiKeys.length === 0) {
    logger.info(`  📝 用户 ${username} 没有 API Key，创建一个测试 API Key...`);
    // 创建一个测试 API Key
    const newKey = await apiKeyService.createApiKey({
      userId,
      name: `${username} 的测试 Key`,
      rateLimit: 1000,
      expiry: null, // 永不过期
      notes: '自动生成的测试 API Key',
    });
    apiKeys = [newKey];
    logger.info(`  ✅ API Key 创建成功: ${newKey.name}`);
  }

  return apiKeys;
}

/**
 * 清除现有的使用数据
 */
async function clearExistingData(apiKeyId) {
  const client = redis.getClient();

  // 清除 API Key 使用统计（总计）
  await client.del(`usage:${apiKeyId}`);

  // 清除成本统计
  await client.del(`usage:cost:total:${apiKeyId}`);

  // 清除每日统计（最近 30 天）
  for (let i = 0; i < 30; i++) {
    const date = getDateString(i);
    const dailyKey = `usage:daily:${apiKeyId}:${date}`;
    const costDailyKey = `usage:cost:daily:${apiKeyId}:${date}`;
    await client.del(dailyKey);
    await client.del(costDailyKey);
  }

  logger.info(`  ✅ 已清除 API Key ${apiKeyId} 的现有数据`);
}

/**
 * 主函数
 */
async function main() {
  try {
    logger.info('🚀 开始生成测试使用数据（修复版）...');

    // 连接 Redis
    await redis.connect();
    logger.info('✅ Redis 连接成功');

    // 获取所有用户
    const users = await getAllUsers();
    if (users.length === 0) {
      logger.warn('⚠️  未找到任何用户，请先创建用户');
      process.exit(0);
    }

    logger.info(`📋 找到 ${users.length} 个用户`);

    // 为每个用户生成数据
    for (const user of users) {
      logger.info(
        `\n🔧 处理用户: ${user.username} (${user.email || user.id})`
      );

      // 确保用户有 API Key
      const apiKeys = await ensureUserHasApiKey(user.id, user.username);

      // 为每个 API Key 生成数据
      for (const apiKey of apiKeys) {
        logger.info(`\n  📊 为 API Key "${apiKey.name}" 生成数据`);

        // 清除现有数据
        await clearExistingData(apiKey.id);

        // 生成最近 N 天的数据
        let totalRequests = 0;
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        let totalCost = 0;

        for (
          let daysAgo = CONFIG.DAYS_TO_GENERATE - 1;
          daysAgo >= 0;
          daysAgo--
        ) {
          const date = getDateString(daysAgo);
          const data = await generateDailyUsageData(apiKey.id, date);

          await saveApiKeyUsageData(apiKey.id, data);

          totalRequests += data.requests;
          totalInputTokens += data.inputTokens;
          totalOutputTokens += data.outputTokens;
          totalCost += data.cost;

          logger.info(
            `    📅 ${date}: ${data.requests} 请求, ${data.inputTokens} 输入, ${data.outputTokens} 输出, $${data.cost.toFixed(4)}`
          );
        }

        logger.info(
          `  ✅ API Key "${apiKey.name}" 总计: ${totalRequests} 请求, $${totalCost.toFixed(4)}`
        );
      }
    }

    logger.info('\n🎉 测试数据生成完成！');
    logger.info(`📊 生成了最近 ${CONFIG.DAYS_TO_GENERATE} 天的数据`);
    logger.info('🌐 请刷新前端页面查看效果');

    process.exit(0);
  } catch (error) {
    logger.error('❌ 生成测试数据失败:', error);
    process.exit(1);
  }
}

// 运行主函数
main();
