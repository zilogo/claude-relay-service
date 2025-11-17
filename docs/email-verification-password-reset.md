# 邮箱验证和密码找回功能文档

## 📋 功能概述

本功能为 Claude Relay Service 添加了完整的邮箱验证和密码找回机制,提升用户账户安全性和可用性。

### 主要功能

- ✅ **邮箱验证**: 用户注册后可通过邮件验证邮箱地址
- ✅ **密码找回**: 用户忘记密码时可通过邮件重置
- ✅ **管理员重置**: 管理员可为用户重置密码
- ✅ **速率限制**: 防止邮件滥用(3次/10分钟)
- ✅ **安全存储**: Token使用SHA-256哈希存储
- ✅ **自动过期**: 验证链接24小时过期,重置链接1小时过期

## 🏗️ 架构设计

### 数据流程

```
用户请求 → 后端生成Token → 发送邮件 → 用户点击链接 → 验证Token → 执行操作
```

### 核心组件

#### 后端服务

1. **emailService.js** - 邮件发送服务
2. **userService.js** - 用户管理和Token生成
3. **userRoutes.js** - API路由端点
4. **config.js** - 配置管理

#### 前端页面

1. **ForgotPasswordView.vue** - 忘记密码页面
2. **ResetPasswordView.vue** - 重置密码页面
3. **EmailVerificationView.vue** - 邮箱验证页面

#### Redis数据结构

```
password_reset_token:{tokenHash}     - 密码重置Token (TTL: 1小时)
email_verification_token:{tokenHash} - 邮箱验证Token (TTL: 24小时)
password_reset_rate:{email}          - 密码重置速率限制
email_verification_rate:{email}      - 邮箱验证速率限制
```

## 🔧 配置指南

### 环境变量配置

在 `.env` 文件中添加以下配置:

```bash
# 📧 邮件服务配置
EMAIL_ENABLED=true
EMAIL_SERVICE_TYPE=smtp

# 📮 SMTP 配置
# 163邮箱示例
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@163.com
SMTP_PASS=your-smtp-authorization-code  # SMTP授权码(非登录密码)

# QQ邮箱示例
# SMTP_HOST=smtp.qq.com
# SMTP_PORT=465
# SMTP_SECURE=true
# SMTP_USER=your-email@qq.com
# SMTP_PASS=your-smtp-authorization-code

# 企业邮箱示例
# SMTP_HOST=smtp.exmail.qq.com  # 腾讯企业邮箱
# SMTP_HOST=smtp.qiye.aliyun.com  # 阿里企业邮箱
# SMTP_PORT=465
# SMTP_SECURE=true
# SMTP_USER=your-email@company.com
# SMTP_PASS=your-email-password

# 📬 发件人信息
EMAIL_FROM_NAME=Claude Relay Service
EMAIL_FROM_ADDRESS=noreply@example.com

# 🔗 基础URL(用于生成邮件中的链接)
BASE_URL=http://localhost:3000

# ✨ 邮件功能开关
REQUIRE_EMAIL_VERIFICATION=false  # 是否要求邮箱验证
ALLOW_PASSWORD_RESET=true         # 是否允许密码找回

# ⏱️ 邮件发送速率限制
EMAIL_RATE_LIMIT_WINDOW=600  # 速率限制窗口期(秒)
EMAIL_RATE_LIMIT_MAX=3       # 窗口期内最多发送次数

# 🔑 邮件验证Token有效期
EMAIL_VERIFICATION_TOKEN_TTL=86400  # 邮箱验证Token有效期(秒,24小时)
PASSWORD_RESET_TOKEN_TTL=3600       # 密码重置Token有效期(秒,1小时)
```

### SMTP授权码获取

#### 163邮箱
1. 登录163邮箱网页版
2. 设置 → POP3/SMTP/IMAP → 开启SMTP服务
3. 设置授权密码(这个就是SMTP_PASS)

#### QQ邮箱
1. 登录QQ邮箱网页版
2. 设置 → 账户 → POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务
3. 开启SMTP服务,获取授权码

#### 企业邮箱
- 通常使用邮箱登录密码
- 具体配置请咨询企业IT管理员

## 📡 API接口文档

### 1. 请求密码重置

**端点**: `POST /api/users/forgot-password`

**请求体**:
```json
{
  "email": "user@example.com"
}
```

**响应**:
```json
{
  "success": true,
  "message": "If a user account with that email exists, a password reset link has been sent to it."
}
```

**注意**: 为安全考虑,无论邮箱是否存在都返回相同响应

**速率限制**:
- IP限制: 10次/15分钟
- 邮箱限制: 3次/10分钟

### 2. 重置密码

**端点**: `POST /api/users/reset-password`

**请求体**:
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePass123!"
}
```

**响应**:
```json
{
  "success": true,
  "message": "Password reset successfully. Please log in with your new password."
}
```

**错误响应**:
```json
{
  "error": "Reset failed",
  "message": "Invalid or expired reset token"
}
```

### 3. 验证邮箱

**端点**: `POST /api/users/verify-email`

**请求体**:
```json
{
  "token": "verification-token-from-email"
}
```

**响应**:
```json
{
  "success": true,
  "message": "Email verified successfully",
  "user": {
    "id": "user-id",
    "username": "username",
    "email": "user@example.com",
    "emailVerified": true
  }
}
```

### 4. 重新发送验证邮件

**端点**: `POST /api/users/resend-verification`

**认证**: 需要用户登录(Bearer Token)

**响应**:
```json
{
  "success": true,
  "message": "Verification email sent successfully"
}
```

**速率限制**: 3次/10分钟

### 5. 管理员重置用户密码

**端点**: `POST /api/users/:userId/reset-password`

**认证**: 需要管理员权限

**请求体**:
```json
{
  "newPassword": "NewSecurePass123!"
}
```

**响应**:
```json
{
  "success": true,
  "message": "User password reset successfully"
}
```

## 🎨 前端页面

### 忘记密码页面

**路由**: `/forgot-password`

**功能**:
- 输入邮箱地址
- 请求密码重置链接
- 显示成功/失败提示
- 返回登录链接

**截图**: 输入邮箱 → 显示发送成功提示

### 重置密码页面

**路由**: `/reset-password/:token`

**功能**:
- 从邮件链接进入(携带token参数)
- 实时密码强度检测
- 密码确认验证
- 成功后跳转登录

**密码强度要求**:
- 至少8个字符
- 至少1个小写字母
- 至少1个大写字母
- 至少1个数字
- 至少1个特殊字符

### 邮箱验证页面

**路由**: `/verify-email/:token`

**功能**:
- 自动验证(页面加载时)
- 显示验证进度
- 显示验证结果(成功/失败)
- 提供登录链接

### 登录页面改进

**新增功能**:
- "Forgot Password?"链接(仅本地登录时显示)
- 位于登录按钮下方,醒目位置

### 注册页面改进

**新增功能**:
- 注册成功提示中说明邮箱验证(如果启用)
- 引导用户检查邮箱

## 📧 邮件模板

### 密码重置邮件

**主题**: 重置您的密码 - Claude Relay Service

**内容**:
- 友好的问候语
- 重置密码按钮(蓝色)
- 备用重置链接
- 过期时间提示(60分钟)
- 安全警告(未请求则忽略)
- 响应式设计,支持移动端

### 邮箱验证邮件

**主题**: 验证您的邮箱地址 - Claude Relay Service

**内容**:
- 欢迎语
- 验证邮箱按钮(绿色)
- 备用验证链接
- 过期时间提示(24小时)
- 说明验证后可用功能
- 响应式设计,支持移动端

## 🔒 安全机制

### Token安全

1. **生成**: 使用`crypto.randomBytes(32)`生成随机Token
2. **存储**: Token使用SHA-256哈希后存储在Redis
3. **传输**: 原始Token仅出现在邮件链接中,不存储
4. **验证**: 接收Token后哈希对比Redis中的值

### 速率限制

| 操作 | IP限制 | 邮箱限制 | 窗口期 |
|------|--------|----------|--------|
| 请求密码重置 | 10次/15分钟 | 3次/10分钟 | 滑动窗口 |
| 邮箱验证 | - | 3次/10分钟 | 滑动窗口 |

### 防滥用措施

1. **用户枚举防护**: 请求密码重置时,无论用户是否存在都返回相同响应
2. **Token过期**: 重置Token 1小时过期,验证Token 24小时过期
3. **一次性使用**: Token使用后立即从Redis删除
4. **会话失效**: 密码重置后,所有会话自动失效,强制重新登录

## 🛠️ 开发指南

### 添加新的邮件模板

1. 在 `src/services/emailService.js` 中添加新方法:

```javascript
async sendCustomEmail(email, data) {
  const html = this._renderCustomTemplate(data)
  return await this.sendEmail({
    to: email,
    subject: 'Your Subject',
    html
  })
}

_renderCustomTemplate(data) {
  return `
    <!DOCTYPE html>
    <html>
    <!-- 你的HTML模板 -->
    </html>
  `
}
```

2. 在 `src/services/userService.js` 中调用:

```javascript
const emailService = require('./emailService')
await emailService.sendCustomEmail(email, data)
```

### 修改Token有效期

在配置文件或环境变量中修改:

```javascript
// config/config.js
tokenTTL: {
  emailVerification: parseInt(process.env.EMAIL_VERIFICATION_TOKEN_TTL) || 86400,
  passwordReset: parseInt(process.env.PASSWORD_RESET_TOKEN_TTL) || 3600
}
```

### 自定义速率限制

在配置文件中修改:

```javascript
// config/config.js
rateLimit: {
  window: parseInt(process.env.EMAIL_RATE_LIMIT_WINDOW) || 600,
  max: parseInt(process.env.EMAIL_RATE_LIMIT_MAX) || 3
}
```

## 🧪 测试指南

### 本地测试

1. **配置测试邮箱**:
```bash
# 使用163邮箱进行测试
EMAIL_ENABLED=true
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-test-email@163.com
SMTP_PASS=your-smtp-auth-code
EMAIL_FROM_ADDRESS=your-test-email@163.com
```

2. **测试密码重置流程**:
   - 访问 `http://localhost:3000/admin-next/#/forgot-password`
   - 输入注册的邮箱地址
   - 检查邮箱是否收到重置邮件
   - 点击邮件中的重置链接
   - 设置新密码
   - 尝试用新密码登录

3. **测试邮箱验证流程**:
   - 启用 `REQUIRE_EMAIL_VERIFICATION=true`
   - 注册新用户
   - 检查邮箱是否收到验证邮件
   - 点击邮件中的验证链接
   - 确认验证成功

### 速率限制测试

```bash
# 快速连续发送10次重置请求,应触发速率限制
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/users/forgot-password \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}'
done
```

### Token过期测试

1. 获取密码重置链接
2. 等待超过1小时(或修改配置为更短时间)
3. 尝试使用过期Token重置密码
4. 应返回"Reset token has expired"错误

## 📊 监控和日志

### 日志位置

- 邮件发送日志: `logs/claude-relay-*.log`
- 错误日志: `logs/claude-relay-error-*.log`

### 关键日志示例

```
📧 Password reset token generated for: user@example.com
📧 Email sent successfully to user@example.com: 重置您的密码
🔓 Password reset successfully for user: testuser (user-id)
✅ Email verified successfully for user: testuser (user-id)
⚠️ Password reset requested for non-existent email: unknown@example.com
🚫 Password reset rate limit exceeded for IP: 192.168.1.100
```

### Redis监控

查看Token使用情况:

```bash
# 查看所有密码重置Token
redis-cli --scan --pattern "password_reset_token:*"

# 查看所有邮箱验证Token
redis-cli --scan --pattern "email_verification_token:*"

# 查看速率限制状态
redis-cli --scan --pattern "password_reset_rate:*"
redis-cli --scan --pattern "email_verification_rate:*"
```

## 🔍 故障排查

### 问题1: 邮件发送失败

**症状**: 日志显示"Email service initialization failed"

**解决方案**:
1. 检查SMTP配置是否正确
2. 确认SMTP授权码(不是登录密码)
3. 检查防火墙是否阻止SMTP端口
4. 尝试使用telnet测试SMTP连接:
```bash
telnet smtp.163.com 465
```

### 问题2: 收不到邮件

**可能原因**:
1. 邮件进入垃圾箱 → 检查垃圾邮件文件夹
2. 邮箱地址错误 → 检查日志确认发送地址
3. 邮件服务商限制 → 检查发件箱是否有退信
4. EMAIL_ENABLED未启用 → 确认环境变量

### 问题3: Token验证失败

**可能原因**:
1. Token已过期 → 检查Token TTL配置
2. Token已使用 → Token一次性使用后删除
3. Redis数据丢失 → 检查Redis服务状态
4. Token格式错误 → 确保完整复制邮件中的链接

### 问题4: 速率限制过于严格

**解决方案**:
调整速率限制配置:
```bash
EMAIL_RATE_LIMIT_WINDOW=1800  # 增加到30分钟
EMAIL_RATE_LIMIT_MAX=5        # 增加到5次
```

## 📝 最佳实践

### 生产环境配置

1. **使用企业邮箱**: 比个人邮箱更稳定,发送限制更宽松
2. **配置SPF/DKIM**: 提高邮件送达率,避免被标记为垃圾邮件
3. **使用专用发件地址**: 如 `noreply@yourdomain.com`
4. **启用SSL/TLS**: `SMTP_SECURE=true`
5. **设置合理的BASE_URL**: 使用生产域名而非IP

### 邮件模板优化

1. **移动端适配**: 所有模板已使用响应式设计
2. **品牌一致性**: 修改邮件中的品牌名称和Logo
3. **多语言支持**: 可根据用户语言发送不同语言的邮件
4. **个性化内容**: 在邮件中使用用户名等个性化信息

### 安全加固

1. **定期清理过期Token**: Redis TTL自动处理
2. **监控异常请求**: 记录IP黑名单
3. **使用HTTPS**: 确保重置链接使用HTTPS
4. **验证邮箱格式**: 后端已实现严格验证
5. **记录敏感操作**: 密码重置、邮箱验证都有详细日志

## 🔄 升级和维护

### 数据库迁移

现有用户数据结构:
```javascript
{
  emailVerified: false,        // 新增字段
  emailVerifiedAt: null        // 新增字段
}
```

迁移脚本会自动为现有用户添加这些字段。

### 依赖升级

主要依赖:
- `nodemailer`: ^6.9.0 - SMTP邮件发送
- `bcrypt`: ^5.1.1 - 密码哈希(已集成)

### 功能扩展建议

1. **邮件模板引擎**: 使用Handlebars或EJS替代字符串拼接
2. **邮件队列**: 使用Bull/BullMQ处理大量邮件发送
3. **多邮件服务商**: 支持SendGrid、Mailgun等云服务
4. **邮件统计**: 跟踪邮件打开率、点击率
5. **自定义模板**: 允许管理员自定义邮件模板

## 📚 相关文档

- [用户管理文档](./user-management.md)
- [本地认证文档](./local-authentication.md)
- [LDAP认证文档](./ldap-authentication.md)
- [API文档](./api-documentation.md)

## 🆘 技术支持

如遇问题,请:
1. 查看日志文件: `logs/claude-relay-*.log`
2. 检查Redis状态: `npm run data:debug`
3. 查看邮件服务状态: 在管理后台查看系统健康检查
4. 提交Issue: [GitHub Issues](https://github.com/your-org/claude-relay-service/issues)

---

**文档版本**: 1.0.0
**最后更新**: 2025-01-17
**维护者**: Claude Relay Service Team
