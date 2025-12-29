# Claude Relay Service 变更记录

## 基础信息

| 项目 | 内容 |
|------|------|
| 起始版本 | `77938b6e394ac2a8c58a6c7438c77b7d3a62cf48` (v1.1.197) |
| 起始日期 | 2025-11-16 |
| 当前版本 | HEAD (`1579a9f7`) |
| 提交数量 | **125 个提交** |
| 文件变更 | **101 个文件** (+27,965 / -1,386 行) |

---

## 功能改造列表

### 1. 💰 支付系统（全新功能）

**新增文件：**
- `src/services/paymentService.js` - 支付服务抽象层（733行）
- `src/services/zpayService.js` - ZPAY 支付渠道实现
- `src/services/stripeService.js` - Stripe 支付渠道实现
- `src/routes/paymentRoutes.js` - 支付相关路由（322行）
- `web/admin-spa/src/stores/payment.js` - 前端支付状态管理
- `web/admin-spa/src/constants/paymentMessages.js` - 支付消息常量

**功能清单：**
- ✅ 多支付渠道支持（ZPAY、Stripe）
- ✅ 支付订单创建与管理
- ✅ 支付回调处理（Webhook）
- ✅ 订单状态查询与统计
- ✅ 过期订单自动清理
- ✅ 支付速率限制
- ✅ 汇率配置与多币种支持（CNY/USD）
- ✅ 充值套餐配置
- ✅ 支付同步/异步回调

---

### 2. 🎁 活动优惠系统（全新功能）

**新增文件：**
- `src/services/promotionService.js` - 促销活动服务（576行）
- `web/admin-spa/src/components/user/PromotionBanner.vue` - 活动横幅组件（595行）

**功能清单：**
- ✅ 新用户限时优惠活动（多档位赠送）
  - 24小时内：额外赠送30%
  - 36小时内：额外赠送20%
  - 48小时内：额外赠送10%
  - 72小时内：额外赠送5%
- ✅ 活动倒计时显示
- ✅ 活动统计与转化率分析
- ✅ 活动赠额自动发放
- ✅ 档位可配置（环境变量）
- ✅ 用户活动状态跟踪

**相关提交：**
- `75efa442` - 完善活动增额
- `94be7b7c` - 系统自动赠送额度
- `8f0ae5b7` - 首充规则修改为按比例发放
- `25697f98` - 优化新用户限时优惠

---

### 3. 👥 邀请返利系统（全新功能）

**新增文件：**
- `src/services/referralService.js` - 邀请返利服务（536行）

**功能清单：**
- ✅ 用户邀请码生成与管理
- ✅ 邀请关系记录
- ✅ 被邀请人充值达标判断
- ✅ 邀请人返利自动发放
- ✅ 邀请统计（总邀请数、有效邀请数、总返利金额）
- ✅ 返利规则配置
  - 最低充值金额限制（仅在线充值计入）
  - 返利金额可配置
  - 最大邀请人数限制

**相关提交：**
- `9c70c667` - 邀请返利描述语
- `92b710bc` - 邀请返利仅限在线充值累计20元才进行返利

---

### 4. 💵 用户余额系统（全新功能）

**修改文件：**
- `src/services/userService.js` - 新增余额相关功能（+1184行）

**功能清单：**
- ✅ 用户余额管理（balance, totalRecharge）
- ✅ 管理员充值功能
- ✅ 管理员扣减余额功能
- ✅ 充值记录查询（按用户/全局）
- ✅ 可用余额计算（余额 - 消费）
- ✅ 新用户注册测试金赠送
- ✅ 充值记录导出（含筛选条件）

**相关API路由：**
- `POST /admin/users/:userId/recharge` - 用户充值
- `POST /admin/users/:userId/deduct` - 扣减余额
- `GET /admin/users/:userId/balance` - 获取余额信息
- `GET /admin/users/:userId/recharge-records` - 获取充值记录
- `GET /admin/recharge-records` - 获取所有充值记录

**相关提交：**
- `1586517d` - 增加减余额功能
- `fb4a6388` - 新用户注册测试金
- `fbe32370` - 管理页面充值获取余额为0问题

---

### 5. 📧 邮件服务（全新功能）

**新增文件：**
- `src/services/emailService.js` - 邮件服务（329行）
- `docs/email-verification-password-reset.md` - 邮件功能文档

**功能清单：**
- ✅ SMTP 邮件发送
- ✅ 密码重置邮件
- ✅ 邮箱验证邮件
- ✅ 邮件模板（HTML）
- ✅ 速率限制（防止滥用）
- ✅ Token 过期管理

**相关提交：**
- `93b8a8f8` - 忘记密码，发送邮箱重置密码逻辑完善

---

### 6. 🔐 用户认证增强

**修改文件：**
- `src/services/userService.js`
- `src/routes/userRoutes.js`

**功能清单：**
- ✅ 本地用户注册（自助注册）
- ✅ 本地用户登录认证
- ✅ 密码修改功能
- ✅ 密码哈希升级（AES → bcrypt）
- ✅ 旧密码格式自动迁移
- ✅ 密码重置 Token 机制
- ✅ 邮箱验证流程
- ✅ 会话管理优化

**新增前端页面：**
- `UserRegisterView.vue` - 用户注册页面（462行）
- `ForgotPasswordView.vue` - 忘记密码页面（237行）
- `ResetPasswordView.vue` - 重置密码页面（303行）
- `EmailVerificationView.vue` - 邮箱验证页面（201行）

---

### 7. 🔑 API Key 管理增强

**功能清单：**
- ✅ API Key 明文查看功能（管理员）
  - 需要输入管理员密码验证
  - 支持操作原因记录（审计）
  - 速率限制保护
  - 审计日志记录
- ✅ API Key 加密存储（AES-256-GCM）
- ✅ 用户-API Key 索引优化（O(1) 查询）
- ✅ API Key 分钟级调用统计
- ✅ 使用统计优化（多周期支持）

**新增API：**
- `POST /admin/api-keys/reveal` - 查看 API Key 明文
- `GET /admin/api-key-calls-metrics` - API Key 调用统计

**相关提交：**
- `48bb8a1c` - 修改监控每分钟apikey调用次数的 redis keyname

---

### 8. 📊 用户管理优化

**性能优化：**
- ✅ 用户列表缓存（TTL 300秒）
- ✅ 用户统计缓存（TTL 60秒）
- ✅ 并发查询优化（p-limit 限制10并发）
- ✅ 搜索功能（用户名/显示名/邮箱）
- ✅ 分页禁用选项（导出场景）

**相关提交：**
- `1579a9f7` - 解决用户管理页面慢
- `a9defdf1` - 解决用户管理慢问题
- `25ea99aa` - 解决用户列表慢问题
- `b48331cf` - 优化用户列表

---

### 9. 🛡️ 安全修复

**修复内容：**
- ✅ 鉴权检测重大安全漏洞修复

**相关提交：**
- `0eef7dcd` - fix: 修复鉴权检测的重大安全漏洞

---

### 10. 🖥️ 前端界面改造

**新增组件：**
| 组件 | 功能 | 代码行数 |
|------|------|----------|
| `PromotionBanner.vue` | 活动横幅 | 595 |
| `UserManualView.vue` | 使用手册 | 2117 |
| `UserRechargeRecords.vue` | 充值记录 | 2013 |
| `ContactUsModal.vue` | 联系我们弹窗 | 106 |
| `ConfigurationGuideModal.vue` | 配置指南弹窗 | - |
| `EnvironmentSetupGuide.vue` | 环境配置指南 | - |
| `PlatformCodeSnippet.vue` | 平台代码片段 | - |
| `PasswordStrengthMeter.vue` | 密码强度指示器 | 176 |
| `RevealApiKeyModal.vue` | API Key 明文查看弹窗 | - |

**新增页面：**
| 页面 | 功能 | 代码行数 |
|------|------|----------|
| `UserRegisterView.vue` | 用户注册 | 462 |
| `RechargeRecordsView.vue` | 充值记录管理 | 706 |
| `ForgotPasswordView.vue` | 忘记密码 | 237 |
| `ResetPasswordView.vue` | 重置密码 | 303 |
| `EmailVerificationView.vue` | 邮箱验证 | 201 |

**优化改进：**
- `UserDashboardView.vue` - 用户仪表板大幅增强（+1169行）
- `UserUsageStats.vue` - 使用统计组件增强（+821行）
- `UserApiKeysManager.vue` - API Key 管理增强（+489行）
- `UserManagementView.vue` - 用户管理页面增强（+1084行）
- `UserLoginView.vue` - 登录页面优化（+216行）
- `DashboardView.vue` - 仪表板增强（+305行）

**UI/UX 改进：**
- ✅ 立即充值按钮位置优化
- ✅ API Key 配置指南优化
- ✅ 活动页面排版优化
- ✅ 响应式设计改进
- ✅ 联系我们功能
- ✅ 字体资源本地化

**相关提交：**
- `630fff96` - 优化用户页面排版
- `1a87d94b` - apikey配置详情优化 立即充值按钮一直显示
- `4940732e` - apikey 创建完成显示配置页面
- `48e21c24` - 用户页面添加联系我们按钮
- `fc00408a` - 用户登陆页面 css 字体

---

### 11. 🤖 钉钉机器人集成

**新增文件：**
- `src/routes/dingtalkBot.js` - 钉钉机器人路由

**功能清单：**
- ✅ 充值自动隐藏操作员信息

**相关提交：**
- `dee7da7a` - 机器人充值自动隐藏操作员

---

### 12. 🏗️ 架构调整

**Frontpage 拆分：**
- ✅ frontpage 拆分为独立项目单独部署

**相关提交：**
- `d715b883` - frontpage 拆分出去单独部署

**新增配置文件：**
- `docker-compose-dev.yml` - 开发环境 Docker 配置
- `docker-compose.repo.yml` - 仓库 Docker 配置（原 docker-compose.yml 重命名）
- `crs-compose.sh` - Docker Compose 脚本
- `setup-docker-compose.sh` - Docker Compose 安装脚本
- `docs/nginx.example.conf` - Nginx 配置示例
- `docs/ROUTING.md` - 路由文档

---

### 13. 📝 其他改进

**新增工具/脚本：**
- `scripts/generate-test-usage-data.js` - 测试数据生成
- `scripts/migrate-add-user-apikey-index.js` - 用户-API Key 索引迁移
- `scripts/migrate-user-authtype.js` - 用户认证类型迁移

**配置增强：**
- ✅ 新增 `useEnvironmentConfig.js` 环境配置 composable
- ✅ clipboard 工具函数
- ✅ 输入验证器增强

**文档更新：**
- `USER_API_REFERENCE.md` - 用户 API 参考文档
- `docs/stripe-payment-analysis.md` - Stripe 支付分析
- `docs/user-balance-payment.md` - 用户余额支付文档

---

## 配置变更汇总

### 新增环境变量

```bash
# 支付相关
PAYMENT_ENABLED=true
ZPAY_ENABLED=true
ZPAY_APPID=xxx
ZPAY_APPSECRET=xxx
STRIPE_ENABLED=true
STRIPE_SECRET_KEY=xxx

# 活动相关
PROMOTION_ENABLED=true
PROMOTION_TIER1_BONUS=30
PROMOTION_TIER2_BONUS=20
PROMOTION_TIER3_BONUS=10
PROMOTION_TIER4_BONUS=5
PROMOTION_MIN_AMOUNT=0
PROMOTION_DURATION_HOURS=72

# 邀请返利
REFERRAL_ENABLED=true
REFERRAL_REWARD_USD=10
REFERRAL_QUALIFIED_RECHARGE_CNY=20

# 新用户注册赠送
SIGNUP_BONUS_ENABLED=true
SIGNUP_BONUS_AMOUNT_USD=2.0

# 邮件服务
EMAIL_ENABLED=true
SMTP_HOST=xxx
SMTP_PORT=465
SMTP_USER=xxx
SMTP_PASS=xxx
```

---

## 数据库（Redis）变更

### 新增 Key 结构

| Key 模式 | 用途 |
|----------|------|
| `payment_order:{orderId}` | 支付订单详情 |
| `payment_orders_user:{userId}` | 用户订单列表 |
| `payment_orders_all` | 全局订单列表 |
| `user_promotion:{userId}` | 用户活动状态 |
| `promotion_stats:*` | 活动统计 |
| `referral:code:{code}` | 邀请码映射 |
| `referral:user:{userId}:code` | 用户邀请码 |
| `referral:invite:{inviteeId}` | 邀请记录 |
| `referral:stats:{userId}` | 邀请统计 |
| `user_apikeys:{userId}` | 用户 API Key 索引 |
| `password_reset_token:{hash}` | 密码重置 Token |
| `email_verification_token:{hash}` | 邮箱验证 Token |
| `recharge_record:{recordId}` | 充值记录 |
| `admin:reveal:audit` | API Key 查看审计日志 |

---

## 统计信息

| 类别 | 数量 |
|------|------|
| 新增后端服务 | 6 个 |
| 新增路由文件 | 2 个 |
| 新增前端组件 | 10+ 个 |
| 新增前端页面 | 5 个 |
| 新增脚本文件 | 3 个 |
| 新增文档文件 | 6 个 |
| 修改文件总数 | 101 个 |
| 新增代码行数 | ~27,965 行 |
| 删除代码行数 | ~1,386 行 |
