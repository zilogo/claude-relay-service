#!/usr/bin/env node

/**
 * 远程 CRS 管理功能测试脚本
 * 测试管理界面、API Key 管理、账户管理等功能
 */

const axios = require('axios');
const chalk = require('chalk');
const Table = require('cli-table3');
require('dotenv').config({ path: '.env.test' });

// ==================== 配置 ====================
const config = {
  baseURL: process.env.REMOTE_CRS_URL || 'https://crs-demo.tokenfreeai.com',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  testApiKey: process.env.TEST_API_KEY || '',
  timeout: parseInt(process.env.TEST_TIMEOUT || '30000')
};

// ==================== 工具函数 ====================
class CRSAdminTester {
  constructor(config) {
    this.config = config;
    this.adminToken = null;
    this.testApiKeyId = null;
    this.createdResources = []; // 记录创建的资源，用于清理
  }

  // 管理员登录
  async adminLogin() {
    console.log(chalk.blue('\n🔐 尝试管理员登录...'));
    try {
      const response = await axios.post(`${this.config.baseURL}/admin/login`, {
        username: this.config.adminUsername,
        password: this.config.adminPassword
      });

      if (response.data.token) {
        this.adminToken = response.data.token;
        console.log(chalk.green('✓ 管理员登录成功'));
        return true;
      }
    } catch (error) {
      console.log(chalk.red('✗ 管理员登录失败'));
      console.log(chalk.gray(`  错误: ${error.response?.data?.error || error.message}`));
      return false;
    }
  }

  // 测试 API Key 管理
  async testApiKeyManagement() {
    console.log(chalk.blue('\n🔑 测试 API Key 管理...'));
    const results = [];

    // 1. 获取 API Key 列表
    try {
      const listResponse = await axios.get(`${this.config.baseURL}/admin/api-keys`, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });

      console.log(chalk.green(`  ✓ 获取 API Key 列表成功 (${listResponse.data.length} 个)`));
      results.push({ test: '获取 API Key 列表', passed: true });

      // 显示现有 Key 信息
      if (listResponse.data.length > 0) {
        const table = new Table({
          head: ['名称', '前缀', '限额', '已使用', '状态'],
          colWidths: [20, 15, 10, 10, 10]
        });

        listResponse.data.slice(0, 5).forEach(key => {
          table.push([
            key.name || 'N/A',
            key.key ? key.key.substring(0, 10) + '...' : 'N/A',
            key.limit || '无限',
            key.usage || 0,
            key.status || 'active'
          ]);
        });

        console.log(table.toString());
      }
    } catch (error) {
      console.log(chalk.red('  ✗ 获取 API Key 列表失败'));
      results.push({ test: '获取 API Key 列表', passed: false, error: error.message });
    }

    // 2. 创建测试 API Key
    try {
      const createResponse = await axios.post(`${this.config.baseURL}/admin/api-keys`, {
        name: `Test Key ${Date.now()}`,
        limit: 1000,
        permissions: 'all',
        allowedClients: ['Test-Client'],
        modelBlacklist: []
      }, {
        headers: { 'Authorization': `Bearer ${this.adminToken}` }
      });

      if (createResponse.data.id) {
        this.testApiKeyId = createResponse.data.id;
        this.createdResources.push({ type: 'apikey', id: this.testApiKeyId });
        console.log(chalk.green(`  ✓ 创建测试 API Key 成功: ${createResponse.data.key.substring(0, 20)}...`));
        results.push({ test: '创建 API Key', passed: true });
      }
    } catch (error) {
      console.log(chalk.red('  ✗ 创建 API Key 失败'));
      results.push({ test: '创建 API Key', passed: false, error: error.message });
    }

    // 3. 更新 API Key
    if (this.testApiKeyId) {
      try {
        await axios.put(`${this.config.baseURL}/admin/api-keys/${this.testApiKeyId}`, {
          limit: 2000,
          status: 'active'
        }, {
          headers: { 'Authorization': `Bearer ${this.adminToken}` }
        });

        console.log(chalk.green('  ✓ 更新 API Key 成功'));
        results.push({ test: '更新 API Key', passed: true });
      } catch (error) {
        console.log(chalk.red('  ✗ 更新 API Key 失败'));
        results.push({ test: '更新 API Key', passed: false, error: error.message });
      }
    }

    // 4. 获取 API Key 使用统计
    if (this.testApiKeyId) {
      try {
        const statsResponse = await axios.get(
          `${this.config.baseURL}/admin/api-keys/${this.testApiKeyId}/stats`,
          {
            headers: { 'Authorization': `Bearer ${this.adminToken}` }
          }
        );

        console.log(chalk.green('  ✓ 获取 API Key 统计成功'));
        console.log(chalk.gray(`    总请求: ${statsResponse.data.totalRequests || 0}`));
        console.log(chalk.gray(`    总 Token: ${statsResponse.data.totalTokens || 0}`));
        results.push({ test: '获取 API Key 统计', passed: true });
      } catch (error) {
        console.log(chalk.red('  ✗ 获取 API Key 统计失败'));
        results.push({ test: '获取 API Key 统计', passed: false, error: error.message });
      }
    }

    return results;
  }

  // 测试账户管理
  async testAccountManagement() {
    console.log(chalk.blue('\n👥 测试账户管理...'));
    const results = [];

    // 测试不同类型的账户
    const accountTypes = [
      { type: 'claude', endpoint: 'claude-accounts', name: 'Claude 账户' },
      { type: 'gemini', endpoint: 'gemini-accounts', name: 'Gemini 账户' },
      { type: 'openai', endpoint: 'openai-responses-accounts', name: 'OpenAI Responses 账户' }
    ];

    for (const accountType of accountTypes) {
      try {
        const response = await axios.get(
          `${this.config.baseURL}/admin/${accountType.endpoint}`,
          {
            headers: { 'Authorization': `Bearer ${this.adminToken}` }
          }
        );

        console.log(chalk.green(`  ✓ 获取 ${accountType.name} 列表成功 (${response.data.length || 0} 个)`));
        results.push({ test: `获取 ${accountType.name} 列表`, passed: true });

        // 显示账户信息
        if (response.data.length > 0) {
          console.log(chalk.gray(`    示例账户: ${response.data[0].name || response.data[0].id}`));
        }
      } catch (error) {
        // 404 表示该类型账户未启用，这是正常的
        if (error.response?.status === 404) {
          console.log(chalk.yellow(`  ⊘ ${accountType.name} 未启用`));
          results.push({ test: `获取 ${accountType.name} 列表`, passed: true, skipped: true });
        } else {
          console.log(chalk.red(`  ✗ 获取 ${accountType.name} 列表失败`));
          results.push({ test: `获取 ${accountType.name} 列表`, passed: false, error: error.message });
        }
      }
    }

    return results;
  }

  // 测试系统功能
  async testSystemFeatures() {
    console.log(chalk.blue('\n⚙️  测试系统功能...'));
    const results = [];

    // 1. 获取系统仪表板数据
    try {
      const dashboardResponse = await axios.get(
        `${this.config.baseURL}/admin/dashboard`,
        {
          headers: { 'Authorization': `Bearer ${this.adminToken}` }
        }
      );

      console.log(chalk.green('  ✓ 获取仪表板数据成功'));
      console.log(chalk.gray(`    API Keys: ${dashboardResponse.data.apiKeys?.total || 0}`));
      console.log(chalk.gray(`    总请求数: ${dashboardResponse.data.stats?.totalRequests || 0}`));
      results.push({ test: '获取仪表板数据', passed: true });
    } catch (error) {
      console.log(chalk.red('  ✗ 获取仪表板数据失败'));
      results.push({ test: '获取仪表板数据', passed: false, error: error.message });
    }

    // 2. 获取系统日志
    try {
      const logsResponse = await axios.get(
        `${this.config.baseURL}/admin/logs?limit=10`,
        {
          headers: { 'Authorization': `Bearer ${this.adminToken}` }
        }
      );

      console.log(chalk.green(`  ✓ 获取系统日志成功 (${logsResponse.data.logs?.length || 0} 条)`));
      results.push({ test: '获取系统日志', passed: true });
    } catch (error) {
      console.log(chalk.red('  ✗ 获取系统日志失败'));
      results.push({ test: '获取系统日志', passed: false, error: error.message });
    }

    // 3. 测试 Webhook 配置
    try {
      const webhookResponse = await axios.get(
        `${this.config.baseURL}/admin/webhook/configs`,
        {
          headers: { 'Authorization': `Bearer ${this.adminToken}` }
        }
      );

      console.log(chalk.green(`  ✓ 获取 Webhook 配置成功 (${webhookResponse.data.length || 0} 个)`));
      results.push({ test: '获取 Webhook 配置', passed: true });
    } catch (error) {
      console.log(chalk.red('  ✗ 获取 Webhook 配置失败'));
      results.push({ test: '获取 Webhook 配置', passed: false, error: error.message });
    }

    // 4. 测试定价服务
    try {
      const pricingResponse = await axios.get(
        `${this.config.baseURL}/admin/pricing`,
        {
          headers: { 'Authorization': `Bearer ${this.adminToken}` }
        }
      );

      console.log(chalk.green('  ✓ 获取定价信息成功'));
      if (pricingResponse.data.models) {
        const modelCount = Object.keys(pricingResponse.data.models).length;
        console.log(chalk.gray(`    已配置 ${modelCount} 个模型价格`));
      }
      results.push({ test: '获取定价信息', passed: true });
    } catch (error) {
      console.log(chalk.red('  ✗ 获取定价信息失败'));
      results.push({ test: '获取定价信息', passed: false, error: error.message });
    }

    return results;
  }

  // 清理测试资源
  async cleanup() {
    console.log(chalk.blue('\n🧹 清理测试资源...'));

    for (const resource of this.createdResources) {
      try {
        if (resource.type === 'apikey' && resource.id) {
          await axios.delete(
            `${this.config.baseURL}/admin/api-keys/${resource.id}`,
            {
              headers: { 'Authorization': `Bearer ${this.adminToken}` }
            }
          );
          console.log(chalk.green(`  ✓ 删除测试 API Key: ${resource.id}`));
        }
      } catch (error) {
        console.log(chalk.yellow(`  ⚠ 清理失败: ${resource.type} - ${resource.id}`));
      }
    }
  }

  // 生成测试报告
  generateReport(allResults) {
    console.log(chalk.cyan('\n========== 管理功能测试报告 =========='));

    const table = new Table({
      head: ['测试项', '结果', '备注'],
      colWidths: [35, 10, 40],
      style: { head: ['cyan'] }
    });

    let passedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    allResults.flat().forEach(result => {
      if (result.skipped) {
        table.push([
          result.test,
          chalk.yellow('跳过'),
          '功能未启用'
        ]);
        skippedCount++;
      } else if (result.passed) {
        table.push([
          result.test,
          chalk.green('通过'),
          '✓'
        ]);
        passedCount++;
      } else {
        table.push([
          result.test,
          chalk.red('失败'),
          result.error || '未知错误'
        ]);
        failedCount++;
      }
    });

    console.log(table.toString());

    // 统计
    console.log(chalk.cyan('\n统计信息:'));
    console.log(chalk.green(`  通过: ${passedCount}`));
    console.log(chalk.red(`  失败: ${failedCount}`));
    console.log(chalk.yellow(`  跳过: ${skippedCount}`));

    const totalTests = passedCount + failedCount + skippedCount;
    const passRate = totalTests > 0 ? Math.round((passedCount / (passedCount + failedCount)) * 100) : 0;
    console.log(chalk.white(`  通过率: ${passRate}%`));
  }

  // 运行所有测试
  async runAllTests() {
    console.log(chalk.bold.cyan('\n🚀 远程 CRS 管理功能测试'));
    console.log(chalk.gray(`服务器: ${this.config.baseURL}`));
    console.log(chalk.gray('=' .repeat(50)));

    // 检查配置
    if (!this.config.adminPassword) {
      console.log(chalk.red('\n❌ 错误: 未设置 ADMIN_PASSWORD'));
      console.log(chalk.gray('请在 .env.test 文件中配置管理员密码'));
      return;
    }

    const allResults = [];

    // 1. 管理员登录
    const loginSuccess = await this.adminLogin();
    if (!loginSuccess) {
      console.log(chalk.red('\n❌ 无法登录管理界面，测试中止'));
      return;
    }

    // 2. 运行各项测试
    allResults.push(await this.testApiKeyManagement());
    allResults.push(await this.testAccountManagement());
    allResults.push(await this.testSystemFeatures());

    // 3. 清理资源
    await this.cleanup();

    // 4. 生成报告
    this.generateReport(allResults);
  }
}

// ==================== 主函数 ====================
async function main() {
  const tester = new CRSAdminTester(config);
  await tester.runAllTests();
}

// ==================== 启动测试 ====================
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('\n测试执行失败:'), error);
    process.exit(1);
  });
}

module.exports = { CRSAdminTester };