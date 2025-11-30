#!/usr/bin/env node

/**
 * 生成测试使用数据脚本
 * 用于填充使用统计、令牌数据和成本数据，方便调试前端界面
 */

const redis = require('../src/models/redis');
const logger = require('../src/utils/logger');

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
async function generateDailyUsageData(userId, date) {
  const requests = randomInt(
    CONFIG.REQUESTS_PER_DAY_MIN,
    CONFIG.REQUESTS_PER_DAY_MAX
  );
  const model =
    CONFIG.MODELS[Math.floor(Math.random() * CONFIG.MODELS.length)];

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
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
    const cost = calculateCost(model, inputTokens, outputTokens);

    totalInputTokens += inputTokens;
    totalOutputTokens += outputTokens;
    totalCost += cost;
  }

  return {
    date,
    model,
    requests,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    cacheCreationTokens: randomInt(0, 1000),
    cacheReadTokens: randomInt(0, 500),
    cost: totalCost,
  };
}

/**
 * 保存用户使用统计到 Redis
 */
async function saveUserUsageData(userId, data) {
  const client = redis.getClient();
  const { date, model, requests, inputTokens, outputTokens, cost } = data;

  // 1. 保存按日期的详细统计
  const dailyKey = `usage:daily:${date}:user_${userId}:${model}`;
  await client.hset(dailyKey, {
    requests: requests.toString(),
    inputTokens: inputTokens.toString(),
    outputTokens: outputTokens.toString(),
    cacheCreationTokens: data.cacheCreationTokens.toString(),
    cacheReadTokens: data.cacheReadTokens.toString(),
    cost: cost.toFixed(6),
    model,
    date,
    userId,
  });
  await client.expire(dailyKey, 90 * 24 * 3600); // 保留 90 天

  // 2. 更新用户数据中的总计
  const userKey = `user:${userId}`;
  const userDataStr = await client.get(userKey);
  if (userDataStr) {
    const userData = JSON.parse(userDataStr);
    if (!userData.totalUsage) {
      userData.totalUsage = {
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0,
      };
    }
    userData.totalUsage.requests += requests;
    userData.totalUsage.inputTokens += inputTokens;
    userData.totalUsage.outputTokens += outputTokens;
    userData.totalUsage.totalCost += cost;
    await client.set(userKey, JSON.stringify(userData));
  }

  // 3. 更新全局统计
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
 * 清除现有的使用数据
 */
async function clearExistingData(userId) {
  const client = redis.getClient();

  // 清除每日统计（最近 30 天）
  for (let i = 0; i < 30; i++) {
    const date = getDateString(i);
    const pattern = `usage:daily:${date}:user_${userId}:*`;
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  }

  // 重置用户统计
  const userKey = `user:${userId}`;
  const userDataStr = await client.get(userKey);
  if (userDataStr) {
    const userData = JSON.parse(userDataStr);
    userData.totalUsage = {
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalCost: 0,
    };
    await client.set(userKey, JSON.stringify(userData));
  }

  logger.info(`✅ 已清除用户 ${userId} 的现有数据`);
}

/**
 * 主函数
 */
async function main() {
  try {
    logger.info('🚀 开始生成测试使用数据...');

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

      // 清除现有数据
      await clearExistingData(user.id);

      // 生成最近 N 天的数据
      let totalRequests = 0;
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let totalCost = 0;

      for (let daysAgo = CONFIG.DAYS_TO_GENERATE - 1; daysAgo >= 0; daysAgo--) {
        const date = getDateString(daysAgo);
        const data = await generateDailyUsageData(user.id, date);

        await saveUserUsageData(user.id, data);

        totalRequests += data.requests;
        totalInputTokens += data.inputTokens;
        totalOutputTokens += data.outputTokens;
        totalCost += data.cost;

        logger.info(
          `  📅 ${date}: ${data.requests} 请求, ${data.inputTokens} 输入, ${data.outputTokens} 输出, $${data.cost.toFixed(4)}`
        );
      }

      logger.info(`  ✅ 总计: ${totalRequests} 请求, $${totalCost.toFixed(4)}`);
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
