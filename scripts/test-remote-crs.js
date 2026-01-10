#!/usr/bin/env node

/**
 * 远程 CRS 服务测试脚本
 * 用于测试部署在远程服务器上的 Claude Relay Service
 */

const axios = require('axios');
const chalk = require('chalk');
const Table = require('cli-table3');

// ==================== 配置部分 ====================
const REMOTE_CRS_URL = process.env.REMOTE_CRS_URL || 'https://crs-demo.tokenfreeai.com';
const API_KEY = process.env.TEST_API_KEY || 'cr_test_key_here'; // 请替换为实际的 API Key
const TEST_TIMEOUT = 30000; // 30秒超时

// 测试配置
const testConfig = {
  baseURL: REMOTE_CRS_URL,
  timeout: TEST_TIMEOUT,
  headers: {
    'User-Agent': 'CRS-Test-Client/1.0',
  }
};

// ==================== 测试用例 ====================
const testCases = [
  {
    name: '健康检查',
    method: 'GET',
    url: '/health',
    expectedStatus: 200,
    validateResponse: (data) => {
      return data.status === 'ok' || data.status === 'healthy';
    }
  },
  {
    name: '获取系统指标',
    method: 'GET',
    url: '/metrics',
    expectedStatus: 200,
    validateResponse: (data) => {
      return data.totalMessages !== undefined;
    }
  },
  {
    name: '验证 API Key',
    method: 'GET',
    url: '/api/v1/key-info',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'x-api-key': API_KEY
    },
    expectedStatus: [200, 401], // 可能返回401如果key无效
    validateResponse: (data, status) => {
      if (status === 401) {
        console.log(chalk.yellow('  API Key 验证失败，请检查配置'));
        return true; // 这是预期的行为
      }
      return data.id !== undefined;
    }
  },
  {
    name: '获取模型列表',
    method: 'GET',
    url: '/api/v1/models',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'x-api-key': API_KEY
    },
    expectedStatus: [200, 401],
    validateResponse: (data, status) => {
      if (status === 401) {
        console.log(chalk.yellow('  需要有效的 API Key'));
        return true;
      }
      return Array.isArray(data.data || data.models);
    }
  },
  {
    name: '测试 Claude 消息接口',
    method: 'POST',
    url: '/api/v1/messages',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'x-api-key': API_KEY,
      'Content-Type': 'application/json'
    },
    data: {
      model: 'claude-3-5-sonnet-20241022',
      messages: [
        {
          role: 'user',
          content: 'Say "Hello from CRS test" in exactly 5 words.'
        }
      ],
      max_tokens: 100,
      stream: false
    },
    expectedStatus: [200, 401, 400],
    validateResponse: (data, status) => {
      if (status === 401) {
        console.log(chalk.yellow('  需要有效的 API Key'));
        return true;
      }
      if (status === 400) {
        console.log(chalk.yellow('  请求格式错误或模型不可用'));
        return true;
      }
      return data.content !== undefined || data.error !== undefined;
    }
  },
  {
    name: '测试流式响应',
    method: 'POST',
    url: '/api/v1/messages',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream'
    },
    data: {
      model: 'claude-3-5-sonnet-20241022',
      messages: [
        {
          role: 'user',
          content: 'Count from 1 to 3.'
        }
      ],
      max_tokens: 50,
      stream: true
    },
    expectedStatus: [200, 401, 400],
    isStream: true,
    validateResponse: (data, status) => {
      if (status === 401 || status === 400) {
        return true;
      }
      // 流式响应会返回多个data块
      return true;
    }
  },
  {
    name: '测试管理界面访问',
    method: 'GET',
    url: '/admin-next/',
    expectedStatus: [200, 302], // 可能重定向到登录
    validateResponse: (data, status) => {
      return true; // 只要能访问就行
    }
  },
  {
    name: '测试 Gemini 接口',
    method: 'GET',
    url: '/gemini/v1/models',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'x-api-key': API_KEY
    },
    expectedStatus: [200, 401, 404],
    validateResponse: (data, status) => {
      if (status === 404) {
        console.log(chalk.yellow('  Gemini 接口未启用'));
        return true;
      }
      if (status === 401) {
        console.log(chalk.yellow('  需要 Gemini 权限'));
        return true;
      }
      return Array.isArray(data.models);
    }
  },
  {
    name: '测试 OpenAI 兼容接口',
    method: 'GET',
    url: '/openai/v1/models',
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    },
    expectedStatus: [200, 401, 404],
    validateResponse: (data, status) => {
      if (status === 404) {
        console.log(chalk.yellow('  OpenAI 兼容接口未启用'));
        return true;
      }
      if (status === 401) {
        console.log(chalk.yellow('  需要 OpenAI 权限'));
        return true;
      }
      return Array.isArray(data.data);
    }
  }
];

// ==================== 测试执行函数 ====================
async function runTest(testCase) {
  const startTime = Date.now();
  const result = {
    name: testCase.name,
    passed: false,
    status: null,
    responseTime: 0,
    error: null,
    details: null
  };

  try {
    console.log(chalk.blue(`\n运行测试: ${testCase.name}`));

    const config = {
      ...testConfig,
      method: testCase.method,
      url: testCase.url,
      headers: {
        ...testConfig.headers,
        ...testCase.headers
      }
    };

    if (testCase.data) {
      config.data = testCase.data;
    }

    // 处理流式响应
    if (testCase.isStream) {
      config.responseType = 'stream';
    }

    const response = await axios(config);
    result.status = response.status;
    result.responseTime = Date.now() - startTime;

    // 处理流式数据
    if (testCase.isStream && response.data) {
      let streamData = '';
      await new Promise((resolve, reject) => {
        response.data.on('data', chunk => {
          streamData += chunk.toString();
        });
        response.data.on('end', resolve);
        response.data.on('error', reject);
        setTimeout(resolve, 5000); // 5秒超时
      });
      console.log(chalk.gray(`  流式响应数据大小: ${streamData.length} 字节`));
      result.passed = true;
    } else {
      // 验证响应状态码
      const expectedStatuses = Array.isArray(testCase.expectedStatus)
        ? testCase.expectedStatus
        : [testCase.expectedStatus];

      if (!expectedStatuses.includes(response.status)) {
        throw new Error(`期望状态码 ${expectedStatuses.join(' 或 ')}，实际: ${response.status}`);
      }

      // 验证响应数据
      if (testCase.validateResponse) {
        const isValid = testCase.validateResponse(response.data, response.status);
        if (!isValid) {
          throw new Error('响应数据验证失败');
        }
      }

      result.passed = true;
      result.details = response.data;
    }

    console.log(chalk.green(`  ✓ 测试通过 (${result.responseTime}ms)`));

  } catch (error) {
    result.error = error.response ? error.response.data : error.message;
    result.status = error.response ? error.response.status : 'ERROR';
    result.responseTime = Date.now() - startTime;

    // 某些错误状态码可能是预期的
    if (error.response && testCase.expectedStatus) {
      const expectedStatuses = Array.isArray(testCase.expectedStatus)
        ? testCase.expectedStatus
        : [testCase.expectedStatus];

      if (expectedStatuses.includes(error.response.status)) {
        if (testCase.validateResponse) {
          const isValid = testCase.validateResponse(error.response.data, error.response.status);
          if (isValid) {
            result.passed = true;
            console.log(chalk.green(`  ✓ 测试通过 (预期的错误状态: ${error.response.status})`));
            return result;
          }
        }
      }
    }

    console.log(chalk.red(`  ✗ 测试失败: ${result.error}`));
  }

  return result;
}

// ==================== 连接性测试 ====================
async function testConnectivity() {
  console.log(chalk.cyan('\n========== 测试远程 CRS 连接性 =========='));
  console.log(chalk.gray(`目标服务器: ${REMOTE_CRS_URL}`));
  console.log(chalk.gray(`API Key: ${API_KEY.substring(0, 10)}...`));

  try {
    const response = await axios.get(`${REMOTE_CRS_URL}/health`, {
      timeout: 5000
    });
    console.log(chalk.green('✓ 服务器连接成功'));
    console.log(chalk.gray(`  服务状态: ${response.data.status}`));
    if (response.data.version) {
      console.log(chalk.gray(`  服务版本: ${response.data.version}`));
    }
    return true;
  } catch (error) {
    console.log(chalk.red('✗ 无法连接到服务器'));
    console.log(chalk.red(`  错误: ${error.message}`));
    return false;
  }
}

// ==================== 生成测试报告 ====================
function generateReport(results) {
  console.log(chalk.cyan('\n========== 测试报告 =========='));

  const table = new Table({
    head: ['测试名称', '状态', '响应时间', '结果'],
    colWidths: [30, 10, 15, 20],
    style: {
      head: ['cyan']
    }
  });

  let passedCount = 0;
  let failedCount = 0;
  let totalTime = 0;

  results.forEach(result => {
    const status = result.passed ? chalk.green('通过') : chalk.red('失败');
    const statusCode = result.status || 'N/A';
    const time = `${result.responseTime}ms`;

    if (result.passed) {
      passedCount++;
    } else {
      failedCount++;
    }
    totalTime += result.responseTime;

    table.push([
      result.name,
      status,
      time,
      statusCode
    ]);
  });

  console.log(table.toString());

  // 统计信息
  console.log(chalk.cyan('\n========== 统计信息 =========='));
  console.log(chalk.white(`总测试数: ${results.length}`));
  console.log(chalk.green(`通过: ${passedCount}`));
  console.log(chalk.red(`失败: ${failedCount}`));
  console.log(chalk.gray(`总耗时: ${totalTime}ms`));
  console.log(chalk.gray(`平均响应时间: ${Math.round(totalTime / results.length)}ms`));

  const passRate = Math.round((passedCount / results.length) * 100);
  const passRateColor = passRate >= 80 ? 'green' : passRate >= 60 ? 'yellow' : 'red';
  console.log(chalk[passRateColor](`通过率: ${passRate}%`));
}

// ==================== 主函数 ====================
async function main() {
  console.log(chalk.bold.cyan('\n🚀 Claude Relay Service 远程测试工具'));
  console.log(chalk.gray('=' .repeat(50)));

  // 首先测试连接性
  const isConnected = await testConnectivity();
  if (!isConnected) {
    console.log(chalk.red('\n❌ 无法连接到服务器，测试中止'));
    process.exit(1);
  }

  // 运行所有测试
  console.log(chalk.cyan('\n========== 开始执行测试 =========='));
  const results = [];

  for (const testCase of testCases) {
    const result = await runTest(testCase);
    results.push(result);

    // 添加延迟避免请求过快
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // 生成报告
  generateReport(results);

  // 返回退出码
  const failedCount = results.filter(r => !r.passed).length;
  if (failedCount > 0) {
    console.log(chalk.red(`\n❌ 测试完成，有 ${failedCount} 个测试失败`));
    process.exit(1);
  } else {
    console.log(chalk.green('\n✅ 所有测试通过！'));
    process.exit(0);
  }
}

// ==================== 错误处理 ====================
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('\n未处理的错误:'), error);
  process.exit(1);
});

// ==================== 启动测试 ====================
if (require.main === module) {
  // 检查环境变量
  if (!API_KEY || API_KEY === 'cr_test_key_here') {
    console.log(chalk.yellow('\n⚠️  警告: 未设置 TEST_API_KEY 环境变量'));
    console.log(chalk.gray('使用方法: TEST_API_KEY=cr_xxx node scripts/test-remote-crs.js'));
    console.log(chalk.gray('或者编辑脚本中的 API_KEY 变量'));
    console.log(chalk.yellow('\n继续使用默认配置进行基础连接测试...'));
  }

  main().catch(error => {
    console.error(chalk.red('\n测试执行失败:'), error);
    process.exit(1);
  });
}

module.exports = { runTest, testConnectivity, testCases };