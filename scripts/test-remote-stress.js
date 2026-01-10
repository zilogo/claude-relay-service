#!/usr/bin/env node

/**
 * 远程 CRS 压力测试脚本
 * 测试并发请求、速率限制、负载能力等
 */

const axios = require('axios');
const chalk = require('chalk');
const Table = require('cli-table3');
const ProgressBar = require('progress');
require('dotenv').config({ path: '.env.test' });

// ==================== 配置 ====================
const config = {
  baseURL: process.env.REMOTE_CRS_URL || 'https://crs-demo.tokenfreeai.com',
  apiKey: process.env.TEST_API_KEY || '',
  concurrency: parseInt(process.env.STRESS_CONCURRENCY || '5'),
  totalRequests: parseInt(process.env.STRESS_TOTAL_REQUESTS || '50'),
  requestsPerSecond: parseInt(process.env.STRESS_RPS || '10'),
  timeout: parseInt(process.env.TEST_TIMEOUT || '30000')
};

// ==================== 测试用例 ====================
const testPrompts = [
  "Hello, how are you?",
  "What's 2+2?",
  "Tell me a short joke.",
  "What's the weather like?",
  "Count from 1 to 5.",
  "Say 'test' in 3 languages.",
  "What day is it?",
  "Give me a random number.",
  "What's your name?",
  "How do you work?"
];

// ==================== 压力测试类 ====================
class StressTester {
  constructor(config) {
    this.config = config;
    this.results = {
      successful: 0,
      failed: 0,
      errors: {},
      responseTimes: [],
      startTime: null,
      endTime: null
    };
    this.progressBar = null;
  }

  // 创建测试请求
  createTestRequest() {
    const prompt = testPrompts[Math.floor(Math.random() * testPrompts.length)];
    return {
      model: 'claude-3-5-sonnet-20241022',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 50,
      stream: false
    };
  }

  // 发送单个请求
  async sendRequest() {
    const startTime = Date.now();
    const requestData = this.createTestRequest();

    try {
      const response = await axios.post(
        `${this.config.baseURL}/api/v1/messages`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'x-api-key': this.config.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: this.config.timeout
        }
      );

      const responseTime = Date.now() - startTime;
      this.results.successful++;
      this.results.responseTimes.push(responseTime);

      return {
        success: true,
        responseTime,
        status: response.status
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.results.failed++;

      const errorKey = error.response?.status || 'network';
      this.results.errors[errorKey] = (this.results.errors[errorKey] || 0) + 1;

      return {
        success: false,
        responseTime,
        status: error.response?.status || 0,
        error: error.message
      };
    }
  }

  // 运行并发测试
  async runConcurrentTest() {
    console.log(chalk.blue('\n🔥 开始并发测试...'));
    console.log(chalk.gray(`并发数: ${this.config.concurrency}`));
    console.log(chalk.gray(`总请求数: ${this.config.totalRequests}`));

    this.progressBar = new ProgressBar('  进度 [:bar] :percent :current/:total 成功::successful 失败::failed', {
      total: this.config.totalRequests,
      width: 40,
      complete: '█',
      incomplete: '░'
    });

    this.results.startTime = Date.now();

    const batches = Math.ceil(this.config.totalRequests / this.config.concurrency);
    for (let i = 0; i < batches; i++) {
      const batchSize = Math.min(
        this.config.concurrency,
        this.config.totalRequests - (i * this.config.concurrency)
      );

      const promises = [];
      for (let j = 0; j < batchSize; j++) {
        promises.push(this.sendRequest());
      }

      const batchResults = await Promise.all(promises);

      // 更新进度条
      this.progressBar.tick(batchSize, {
        successful: this.results.successful,
        failed: this.results.failed
      });

      // 添加延迟以控制请求速率
      if (i < batches - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 / this.config.requestsPerSecond * batchSize));
      }
    }

    this.results.endTime = Date.now();
  }

  // 运行速率限制测试
  async runRateLimitTest() {
    console.log(chalk.blue('\n⏱️  测试速率限制...'));
    console.log(chalk.gray(`目标 RPS: ${this.config.requestsPerSecond}`));

    const testDuration = 10; // 测试10秒
    const interval = 1000 / this.config.requestsPerSecond;
    let requestsSent = 0;
    let rateLimitHits = 0;

    const startTime = Date.now();
    const endTime = startTime + (testDuration * 1000);

    console.log(chalk.gray(`测试持续时间: ${testDuration} 秒`));

    while (Date.now() < endTime) {
      const result = await this.sendRequest();
      requestsSent++;

      if (result.status === 429) {
        rateLimitHits++;
        console.log(chalk.yellow(`  速率限制触发 (${rateLimitHits}次)`));
      }

      // 等待下一个请求时机
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    console.log(chalk.gray(`\n  发送请求: ${requestsSent}`));
    console.log(chalk.gray(`  速率限制触发: ${rateLimitHits} 次`));

    return {
      requestsSent,
      rateLimitHits,
      duration: Date.now() - startTime
    };
  }

  // 计算统计数据
  calculateStatistics() {
    if (this.results.responseTimes.length === 0) {
      return null;
    }

    const sorted = [...this.results.responseTimes].sort((a, b) => a - b);
    const total = sorted.reduce((sum, time) => sum + time, 0);
    const avg = total / sorted.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    const duration = (this.results.endTime - this.results.startTime) / 1000;
    const rps = this.results.successful / duration;

    return {
      avg: Math.round(avg),
      min,
      max,
      p50,
      p95,
      p99,
      rps: Math.round(rps * 10) / 10,
      duration: Math.round(duration * 10) / 10
    };
  }

  // 生成测试报告
  generateReport() {
    console.log(chalk.cyan('\n========== 压力测试报告 =========='));

    // 基本统计
    const table1 = new Table({
      head: ['指标', '值'],
      colWidths: [20, 30],
      style: { head: ['cyan'] }
    });

    const total = this.results.successful + this.results.failed;
    const successRate = total > 0 ? Math.round((this.results.successful / total) * 100) : 0;

    table1.push(
      ['总请求数', total],
      ['成功请求', chalk.green(this.results.successful)],
      ['失败请求', chalk.red(this.results.failed)],
      ['成功率', successRate >= 95 ? chalk.green(`${successRate}%`) :
                 successRate >= 80 ? chalk.yellow(`${successRate}%`) :
                 chalk.red(`${successRate}%`)]
    );

    console.log(table1.toString());

    // 响应时间统计
    const stats = this.calculateStatistics();
    if (stats) {
      const table2 = new Table({
        head: ['响应时间', '毫秒'],
        colWidths: [20, 30],
        style: { head: ['cyan'] }
      });

      table2.push(
        ['平均值', `${stats.avg}ms`],
        ['最小值', `${stats.min}ms`],
        ['最大值', `${stats.max}ms`],
        ['P50', `${stats.p50}ms`],
        ['P95', `${stats.p95}ms`],
        ['P99', `${stats.p99}ms`]
      );

      console.log(chalk.cyan('\n响应时间分析:'));
      console.log(table2.toString());

      // 性能指标
      console.log(chalk.cyan('\n性能指标:'));
      console.log(chalk.white(`  请求速率 (RPS): ${stats.rps}`));
      console.log(chalk.white(`  测试时长: ${stats.duration} 秒`));
    }

    // 错误分析
    if (Object.keys(this.results.errors).length > 0) {
      const table3 = new Table({
        head: ['错误类型', '次数'],
        colWidths: [20, 30],
        style: { head: ['cyan'] }
      });

      Object.entries(this.results.errors).forEach(([error, count]) => {
        table3.push([
          error === 'network' ? '网络错误' :
          error === '401' ? '认证失败' :
          error === '429' ? '速率限制' :
          error === '500' ? '服务器错误' :
          error === '503' ? '服务不可用' :
          `HTTP ${error}`,
          count
        ]);
      });

      console.log(chalk.cyan('\n错误分析:'));
      console.log(table3.toString());
    }

    // 建议
    console.log(chalk.cyan('\n性能建议:'));
    if (successRate < 95) {
      console.log(chalk.yellow('  ⚠ 成功率较低，建议检查服务稳定性'));
    }
    if (stats && stats.p95 > 5000) {
      console.log(chalk.yellow('  ⚠ P95 响应时间较高，可能存在性能瓶颈'));
    }
    if (this.results.errors['429'] > 0) {
      console.log(chalk.yellow('  ⚠ 触发速率限制，建议降低请求频率'));
    }
    if (successRate >= 95 && stats && stats.p95 < 3000) {
      console.log(chalk.green('  ✓ 服务性能良好'));
    }
  }
}

// ==================== 主函数 ====================
async function main() {
  console.log(chalk.bold.cyan('\n🚀 Claude Relay Service 压力测试'));
  console.log(chalk.gray(`服务器: ${config.baseURL}`));
  console.log(chalk.gray('=' .repeat(50)));

  // 检查配置
  if (!config.apiKey || config.apiKey === 'cr_test_key_here') {
    console.log(chalk.red('\n❌ 错误: 未设置有效的 TEST_API_KEY'));
    console.log(chalk.gray('请在 .env.test 文件中配置 API Key'));
    process.exit(1);
  }

  // 首先测试连接
  console.log(chalk.blue('\n📡 测试服务连接...'));
  try {
    const healthResponse = await axios.get(`${config.baseURL}/health`, {
      timeout: 5000
    });
    console.log(chalk.green('✓ 服务连接正常'));
  } catch (error) {
    console.log(chalk.red('✗ 无法连接到服务'));
    process.exit(1);
  }

  // 创建测试器
  const tester = new StressTester(config);

  // 选择测试模式
  const testMode = process.argv[2] || 'concurrent';

  switch (testMode) {
    case 'concurrent':
      await tester.runConcurrentTest();
      break;
    case 'ratelimit':
      await tester.runRateLimitTest();
      break;
    case 'all':
      await tester.runConcurrentTest();
      await tester.runRateLimitTest();
      break;
    default:
      console.log(chalk.yellow('\n使用方法:'));
      console.log('  node scripts/test-remote-stress.js [模式]');
      console.log('  模式: concurrent (并发测试), ratelimit (速率限制测试), all (全部)');
      process.exit(0);
  }

  // 生成报告
  tester.generateReport();
}

// ==================== 启动测试 ====================
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('\n测试执行失败:'), error);
    process.exit(1);
  });
}

module.exports = { StressTester };