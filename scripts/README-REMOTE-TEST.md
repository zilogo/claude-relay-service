# 远程 CRS 测试工具集

本目录包含用于测试远程部署的 Claude Relay Service 的脚本集合。

## 前置要求

1. 确保远程服务器已正确部署并运行 CRS 服务
2. 需要有效的 API Key（在远程服务器管理界面创建）
3. 需要管理员凭据（用于管理功能测试）

## 配置

复制配置文件模板并填写您的测试参数：

```bash
cp .env.test.example .env.test
```

编辑 `.env.test` 文件：

```env
# 远程服务器地址
REMOTE_CRS_URL=https://crs-demo.tokenfreeai.com

# 测试用 API Key（需要在远程服务器上创建）
TEST_API_KEY=cr_your_actual_api_key_here

# 管理员凭据（用于管理界面测试）
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_admin_password

# 测试配置
TEST_TIMEOUT=30000
```

## 测试脚本

### 1. 基础连接测试 (`test-remote-crs.js`)

测试基本的 API 连接和功能：

```bash
# 使用环境变量
TEST_API_KEY=cr_xxx npm run test:remote

# 或使用 .env.test 文件
npm run test:remote
```

测试内容：
- ✅ 健康检查 (`/health`)
- ✅ 系统指标 (`/metrics`)
- ✅ API Key 验证
- ✅ 模型列表获取
- ✅ Claude 消息接口
- ✅ 流式响应
- ✅ 管理界面访问
- ✅ Gemini 接口（如果启用）
- ✅ OpenAI 兼容接口（如果启用）

### 2. 管理功能测试 (`test-remote-admin.js`)

测试管理界面和后台功能：

```bash
npm run test:remote:admin
```

测试内容：
- ✅ 管理员登录
- ✅ API Key 管理（创建、更新、删除、统计）
- ✅ 账户管理（Claude、Gemini、OpenAI 等）
- ✅ 系统仪表板
- ✅ 系统日志
- ✅ Webhook 配置
- ✅ 定价服务

### 3. 压力测试 (`test-remote-stress.js`)

测试服务的负载能力：

```bash
# 并发测试（默认）
npm run test:remote:stress

# 速率限制测试
npm run test:remote:stress ratelimit

# 全部测试
npm run test:remote:stress all
```

配置选项（在 `.env.test` 中设置）：
- `STRESS_CONCURRENCY=5` - 并发请求数
- `STRESS_TOTAL_REQUESTS=50` - 总请求数
- `STRESS_RPS=10` - 每秒请求数

### 4. 运行所有测试

```bash
npm run test:remote:all
```

## 测试报告

每个测试脚本都会生成详细的报告，包括：

### 基础测试报告
- 每个测试的通过/失败状态
- 响应时间
- HTTP 状态码
- 总体通过率

### 管理功能报告
- 功能可用性
- 账户和 API Key 统计
- 系统配置状态

### 压力测试报告
- 成功率
- 响应时间分布（平均值、P50、P95、P99）
- 错误分析
- 性能建议
- RPS（每秒请求数）

## 故障排查

### 常见问题

1. **连接失败**
   - 检查 `REMOTE_CRS_URL` 是否正确
   - 确认服务器防火墙允许访问
   - 检查 HTTPS 证书是否有效

2. **API Key 认证失败**
   - 确认 API Key 在远程服务器上已创建且激活
   - 检查 API Key 格式（应以 `cr_` 开头）
   - 验证 API Key 权限设置

3. **管理员登录失败**
   - 确认管理员用户名和密码正确
   - 检查管理员账户是否激活

4. **速率限制错误（429）**
   - 降低并发数或 RPS
   - 增加测试间隔

## 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `REMOTE_CRS_URL` | 远程服务器地址 | https://crs-demo.tokenfreeai.com |
| `TEST_API_KEY` | 测试用 API Key | 无 |
| `ADMIN_USERNAME` | 管理员用户名 | admin |
| `ADMIN_PASSWORD` | 管理员密码 | 无 |
| `TEST_TIMEOUT` | 请求超时时间（毫秒） | 30000 |
| `STRESS_CONCURRENCY` | 压力测试并发数 | 5 |
| `STRESS_TOTAL_REQUESTS` | 压力测试总请求数 | 50 |
| `STRESS_RPS` | 目标每秒请求数 | 10 |

## 测试流程建议

1. **首次部署后**：
   ```bash
   # 1. 基础连接测试
   npm run test:remote

   # 2. 如果基础测试通过，运行管理功能测试
   npm run test:remote:admin

   # 3. 最后运行压力测试
   npm run test:remote:stress
   ```

2. **日常监控**：
   ```bash
   # 运行基础测试检查服务状态
   npm run test:remote
   ```

3. **性能调优**：
   ```bash
   # 运行压力测试评估性能
   npm run test:remote:stress all
   ```

## 输出示例

### 成功的测试输出
```
🚀 Claude Relay Service 远程测试工具
==================================================

========== 测试远程 CRS 连接性 ==========
目标服务器: https://crs-demo.tokenfreeai.com
✓ 服务器连接成功
  服务状态: healthy
  服务版本: 1.0.0

运行测试: 健康检查
  ✓ 测试通过 (123ms)

运行测试: API Key 验证
  ✓ 测试通过 (456ms)

========== 测试报告 ==========
┌──────────────────────┬──────────┬─────────────┬──────────┐
│ 测试名称              │ 状态      │ 响应时间     │ 结果      │
├──────────────────────┼──────────┼─────────────┼──────────┤
│ 健康检查              │ 通过      │ 123ms       │ 200      │
│ API Key 验证          │ 通过      │ 456ms       │ 200      │
└──────────────────────┴──────────┴─────────────┴──────────┘

通过率: 100%
✅ 所有测试通过！
```

## 注意事项

1. 测试脚本会实际调用远程 API，可能产生费用
2. 压力测试应谨慎使用，避免对生产环境造成影响
3. 建议在非高峰时段运行压力测试
4. 测试创建的资源会自动清理，但建议定期检查

## 支持

如有问题，请查看主项目文档或提交 Issue。