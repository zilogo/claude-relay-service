# 功能迁移考虑事项指南

本文档详细说明从 v1.1.197 迁移到当前版本时需要考虑的各个方面。

---

## 目录

1. [迁移前置条件](#1-迁移前置条件)
2. [依赖项变更](#2-依赖项变更)
3. [环境变量配置](#3-环境变量配置)
4. [数据库迁移](#4-数据库迁移)
5. [功能依赖关系](#5-功能依赖关系)
6. [第三方服务集成](#6-第三方服务集成)
7. [安全考虑](#7-安全考虑)
8. [前端资源更新](#8-前端资源更新)
9. [API 接口变更](#9-api-接口变更)
10. [回滚方案](#10-回滚方案)
11. [迁移检查清单](#11-迁移检查清单)

---

## 1. 迁移前置条件

### 1.1 系统要求

| 组件 | 最低版本 | 说明 |
|------|----------|------|
| Node.js | 18.x+ | bcrypt 依赖需要 |
| Redis | 6.x+ | 支持新增数据结构 |
| npm | 8.x+ | 依赖管理 |

### 1.2 备份要求

在开始迁移前，必须完成以下备份：

```bash
# 1. 备份 Redis 数据
redis-cli BGSAVE
cp /var/lib/redis/dump.rdb ./backup/redis-$(date +%Y%m%d).rdb

# 2. 导出现有数据（使用项目脚本）
npm run data:export:enhanced -- --output ./backup/data-$(date +%Y%m%d).json

# 3. 备份环境配置
cp .env ./backup/.env.backup
cp config/config.js ./backup/config.js.backup
```

### 1.3 停机窗口评估

| 迁移步骤 | 预计时间 | 是否需要停机 |
|----------|----------|--------------|
| 依赖安装 | 2-5 分钟 | 否 |
| 数据迁移脚本 | 取决于数据量 | **是** |
| 配置更新 | 5 分钟 | **是** |
| 服务重启 | 1-2 分钟 | **是** |

---

## 2. 依赖项变更

### 2.1 新增 npm 依赖

```json
{
  "bcrypt": "^6.0.0",        // 密码哈希（替代旧 AES 加密）
  "node-cache": "^5.1.2",    // 内存缓存（用户列表/统计优化）
  "p-limit": "^3.1.0",       // 并发控制
  "stripe": "^14.25.0"       // Stripe 支付 SDK
}
```

### 2.2 安装命令

```bash
npm install

# 如果遇到 bcrypt 编译问题
npm rebuild bcrypt
```

### 2.3 注意事项

| 依赖 | 注意事项 |
|------|----------|
| `bcrypt` | 需要编译环境（gcc/make），Docker 镜像需要包含 build 工具 |
| `stripe` | 仅在启用 Stripe 支付时需要，可选安装 |
| `node-cache` | 内存占用会增加，注意监控 |

---

## 3. 环境变量配置

### 3.1 必须配置的新变量

#### 安全相关（必须）

```bash
# 管理员 API Key 明文查看功能
ADMIN_ENABLE_API_KEY_REVEAL=false  # 是否启用，建议生产环境关闭

# 信任代理（Nginx 反代时需要）
TRUST_PROXY=true
```

#### 功能开关（按需）

```bash
# 支付功能
PAYMENT_ENABLED=false              # 总开关

# 本地认证（用户注册/登录）
LOCAL_AUTH_ENABLED=false
ALLOW_SELF_REGISTRATION=true

# 新用户注册赠送
SIGNUP_BONUS_ENABLED=false
SIGNUP_BONUS_AMOUNT_USD=2.0

# 活动优惠
PROMOTION_ENABLED=false

# 邀请返利
REFERRAL_PROGRAM_ENABLED=false

# 邮件服务
EMAIL_ENABLED=false
```

### 3.2 支付配置（如需启用）

#### ZPAY 配置

```bash
PAYMENT_ENABLED=true
ZPAY_ENABLED=true
ZPAY_PID=你的商户ID
ZPAY_KEY=你的商户密钥
ZPAY_API_URL=https://zpayz.cn
ZPAY_NOTIFY_URL=https://你的域名/payment/webhook/zpay
ZPAY_RETURN_URL=https://你的域名/payment/return/zpay
```

#### Stripe 配置

```bash
STRIPE_ENABLED=true
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_CURRENCY=cny
STRIPE_SUCCESS_URL=https://你的域名/payment/return/stripe?order={ORDER_ID}&status=success
STRIPE_CANCEL_URL=https://你的域名/payment/return/stripe?order={ORDER_ID}&status=cancel
```

### 3.3 邮件服务配置（如需启用）

```bash
EMAIL_ENABLED=true
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@163.com
SMTP_PASS=你的授权码  # 注意：是授权码不是登录密码
EMAIL_FROM_NAME=你的服务名称
EMAIL_FROM_ADDRESS=your-email@163.com
BASE_URL=https://你的域名  # 邮件中链接的域名
```

### 3.4 活动优惠配置（如需启用）

```bash
PROMOTION_ENABLED=true
PROMOTION_TIER1_BONUS=30    # 24小时内 30%
PROMOTION_TIER2_BONUS=20    # 36小时内 20%
PROMOTION_TIER3_BONUS=10    # 48小时内 10%
PROMOTION_TIER4_BONUS=5     # 72小时内 5%
PROMOTION_MIN_AMOUNT=0      # 最低充值金额
PROMOTION_DURATION_HOURS=72 # 活动总时长
```

### 3.5 邀请返利配置（如需启用）

```bash
REFERRAL_PROGRAM_ENABLED=true
REFERRAL_REWARD_USD=10                    # 返利金额（美元）
REFERRAL_QUALIFIED_RECHARGE_CNY=20        # 达标充值金额（人民币）
REFERRAL_QUALIFIED_RECHARGE_TYPES=payment # 仅在线支付计入
```

---

## 4. 数据库迁移

### 4.1 必须执行的迁移脚本

#### 4.1.1 用户-API Key 索引迁移

**目的**：创建 `user_apikeys:{userId}` 索引，优化用户 API Key 查询性能（从 O(n) 到 O(1)）

```bash
# 执行迁移
node scripts/migrate-add-user-apikey-index.js
```

**影响范围**：
- 新增 Redis Key: `user_apikeys:{userId}` (Set 类型)
- 不影响现有数据
- 可重复执行（幂等）

#### 4.1.2 用户认证类型迁移

**目的**：为现有用户添加 `authType` 字段

```bash
# 执行迁移
node scripts/migrate-user-authtype.js
```

**影响范围**：
- 更新 `user:{userId}` 数据，添加 `authType: 'ldap'` 或 `authType: 'local'`
- 现有 LDAP 用户默认为 `ldap` 类型
- 可重复执行（幂等）

### 4.2 新增 Redis Key 结构

迁移后系统会自动创建以下新 Key（无需手动创建）：

| Key 模式 | 类型 | 用途 | 何时创建 |
|----------|------|------|----------|
| `user_apikeys:{userId}` | Set | 用户 API Key 索引 | 迁移脚本 / 创建 API Key 时 |
| `payment_order:{orderId}` | String(JSON) | 支付订单 | 创建订单时 |
| `payment_orders_user:{userId}` | List | 用户订单列表 | 创建订单时 |
| `user_promotion:{userId}` | String(JSON) | 用户活动状态 | 用户注册时 |
| `referral:code:{code}` | String | 邀请码映射 | 生成邀请码时 |
| `referral:invite:{inviteeId}` | String(JSON) | 邀请记录 | 注册时绑定邀请关系 |
| `recharge_record:{recordId}` | String(JSON) | 充值记录 | 充值时 |
| `password_reset_token:{hash}` | String(JSON) | 密码重置 Token | 请求重置时 |
| `admin:reveal:audit` | List | API Key 查看审计 | 查看 API Key 时 |

### 4.3 用户数据结构变更

现有用户数据会自动添加以下字段：

```javascript
// 新增字段（首次访问时自动添加）
{
  // 余额相关
  balance: 0,              // 账户余额（美元）
  totalRecharge: 0,        // 累计充值（美元）
  lastRechargeAt: null,    // 最后充值时间

  // 认证相关
  authType: 'local',       // 认证类型: local / ldap
  passwordHash: '...',     // bcrypt 哈希（本地用户）
  passwordChangedAt: null, // 密码修改时间

  // 邮箱验证
  emailVerified: false,    // 邮箱是否验证
  emailVerifiedAt: null    // 验证时间
}
```

### 4.4 密码格式迁移

系统支持自动迁移旧密码格式：

| 旧格式 | 新格式 | 迁移方式 |
|--------|--------|----------|
| AES 加密 (`iv:ciphertext`) | bcrypt (`$2b$...`) | 用户登录时自动迁移 |

**注意**：首次迁移后，用户需要使用原密码登录一次，系统会自动将密码升级为 bcrypt 格式。

---

## 5. 功能依赖关系

### 5.1 功能模块依赖图

```
┌─────────────────────────────────────────────────────────────────┐
│                        核心基础服务                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Redis      │  │ UserService  │  │   ApiKeyService      │  │
│  │  (必须)      │  │   (必须)     │  │      (必须)          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   支付系统       │  │   活动优惠      │  │   邀请返利      │
│ PaymentService  │  │PromotionService │  │ ReferralService │
│                 │  │                 │  │                 │
│ 依赖:           │  │ 依赖:           │  │ 依赖:           │
│ - UserService   │  │ - UserService   │  │ - UserService   │
│ - ZPAY/Stripe   │  │ - PaymentService│  │ - PaymentService│
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   邮件服务       │
                    │  EmailService   │
                    │                 │
                    │ 依赖:           │
                    │ - SMTP 配置     │
                    └─────────────────┘
```

### 5.2 最小可迁移单元

如果只需要部分功能，可以按以下顺序选择性迁移：

| 迁移级别 | 包含功能 | 配置项 |
|----------|----------|--------|
| **Level 0** (必须) | 安全修复、性能优化、用户管理缓存 | 无需额外配置 |
| **Level 1** | + 本地用户注册/登录 | `LOCAL_AUTH_ENABLED=true` |
| **Level 2** | + 邮件服务（密码重置） | `EMAIL_ENABLED=true` + SMTP |
| **Level 3** | + 支付系统 | `PAYMENT_ENABLED=true` + 支付渠道 |
| **Level 4** | + 活动优惠 | `PROMOTION_ENABLED=true` |
| **Level 5** | + 邀请返利 | `REFERRAL_PROGRAM_ENABLED=true` |

### 5.3 功能启用条件

```
活动优惠(Promotion)
  └─► 需要: 支付系统(Payment) 已启用
       └─► 充值时自动应用优惠

邀请返利(Referral)
  └─► 需要: 支付系统(Payment) 已启用
       └─► 被邀请人充值达标后，自动发放返利

密码重置
  └─► 需要: 邮件服务(Email) 已启用
       └─► 发送重置邮件

邮箱验证
  └─► 需要: 邮件服务(Email) 已启用 + REQUIRE_EMAIL_VERIFICATION=true
```

---

## 6. 第三方服务集成

### 6.1 ZPAY 支付

#### 准备工作

1. 注册 ZPAY 商户账号
2. 获取 PID（商户ID）和 KEY（商户密钥）
3. 配置回调白名单

#### 配置要点

```bash
# 必须配置
ZPAY_PID=商户ID
ZPAY_KEY=商户密钥

# 回调地址（必须是公网可访问的 HTTPS 地址）
ZPAY_NOTIFY_URL=https://你的域名/payment/webhook/zpay
ZPAY_RETURN_URL=https://你的域名/payment/return/zpay
```

#### 回调验证

- 系统会验证签名防止伪造
- 可配置 IP 白名单: `ZPAY_IP_WHITELIST=1.2.3.4,5.6.7.8`

### 6.2 Stripe 支付

#### 准备工作

1. 注册 Stripe 账号并完成实名认证
2. 获取 API 密钥（Live Key）
3. 配置 Webhook

#### 配置要点

```bash
# 必须配置
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx  # 从 Stripe Dashboard 获取

# Webhook 端点
# 在 Stripe Dashboard 添加: https://你的域名/payment/webhook/stripe
# 监听事件: checkout.session.completed, payment_intent.succeeded
```

### 6.3 邮件服务 (SMTP)

#### 常见邮箱配置

| 邮箱 | SMTP Host | Port | 备注 |
|------|-----------|------|------|
| 163 | smtp.163.com | 465 | 需开启 SMTP 服务，使用授权码 |
| QQ | smtp.qq.com | 465 | 需开启 SMTP 服务，使用授权码 |
| Gmail | smtp.gmail.com | 465 | 需开启"应用专用密码" |
| 阿里云 | smtp.aliyun.com | 465 | 使用邮箱密码 |

#### 测试邮件服务

```bash
# 检查配置
node -e "
const config = require('./config/config');
console.log('Email enabled:', config.email.enabled);
console.log('SMTP host:', config.email.smtp.host);
"
```

### 6.4 钉钉机器人

#### 配置要点

```bash
DINGTALK_BOT_ENABLED=true
DINGTALK_BOT_ACCESS_TOKEN=xxx
DINGTALK_BOT_SIGN_SECRET=xxx  # 可选，启用签名验证
```

---

## 7. 安全考虑

### 7.1 密码存储升级

| 方面 | 旧版本 | 新版本 | 影响 |
|------|--------|--------|------|
| 算法 | AES-256-CBC | bcrypt | 更安全，无法解密 |
| 格式 | `iv:ciphertext` | `$2b$10$...` | 不兼容 |
| 迁移 | - | 登录时自动升级 | 需用户登录一次 |

### 7.2 API Key 安全

#### 新增功能：API Key 明文查看

**风险评估**：
- 功能默认关闭
- 需要管理员密码二次验证
- 所有查看操作记录审计日志
- 支持速率限制

**配置建议**：

```bash
# 生产环境建议关闭
ADMIN_ENABLE_API_KEY_REVEAL=false

# 如必须启用
ADMIN_REVEAL_REQUIRE_PASSWORD=true   # 强制密码验证
ADMIN_REVEAL_REQUIRE_REASON=true     # 强制填写原因
ADMIN_REVEAL_RATE_LIMIT=5            # 每5分钟最多5次
```

### 7.3 鉴权安全修复

本次更新包含一个重大安全漏洞修复（commit `0eef7dcd`）。

**建议**：
- 立即更新到最新版本
- 检查是否有异常访问日志
- 更新后重新生成敏感凭据

### 7.4 支付安全

#### ZPAY

- 配置 IP 白名单
- 验证回调签名
- 使用 HTTPS

#### Stripe

- 使用 Webhook Secret 验证
- 不在客户端暴露 Secret Key
- 定期轮换 API 密钥

---

## 8. 前端资源更新

### 8.1 新增页面

| 页面 | 路由 | 功能 |
|------|------|------|
| UserRegisterView | `/user-register` | 用户注册 |
| ForgotPasswordView | `/forgot-password` | 忘记密码 |
| ResetPasswordView | `/reset-password/:token` | 重置密码 |
| EmailVerificationView | `/verify-email/:token` | 邮箱验证 |
| RechargeRecordsView | `/admin/recharge-records` | 充值记录管理 |

### 8.2 新增组件

- `PromotionBanner.vue` - 活动横幅
- `ContactUsModal.vue` - 联系我们
- `ConfigurationGuideModal.vue` - 配置指南
- `PasswordStrengthMeter.vue` - 密码强度
- `UserRechargeRecords.vue` - 充值记录

### 8.3 构建命令

```bash
cd web/admin-spa
npm install
npm run build
```

### 8.4 静态资源

新增本地字体文件：

```
web/admin-spa/src/assets/fonts/
├── Inter-300.ttf
├── Inter-400.ttf
├── Inter-500.ttf
├── Inter-600.ttf
├── Inter-700.ttf
├── JetBrainsMono-400.ttf
├── JetBrainsMono-500.ttf
└── Merriweather-*.ttf
```

---

## 9. API 接口变更

### 9.1 新增管理员接口

```
POST /admin/users/:userId/recharge     # 用户充值
POST /admin/users/:userId/deduct       # 扣减余额
GET  /admin/users/:userId/balance      # 获取余额
GET  /admin/users/:userId/recharge-records  # 充值记录
GET  /admin/recharge-records           # 所有充值记录
POST /admin/users/:userId/reset-password    # 重置密码
POST /admin/api-keys/reveal            # 查看 API Key 明文
GET  /admin/api-key-calls-metrics      # API Key 调用统计
```

### 9.2 新增用户接口

```
POST /users/register                   # 用户注册
POST /users/login/local                # 本地登录
POST /users/forgot-password            # 忘记密码
POST /users/reset-password             # 重置密码
POST /users/change-password            # 修改密码
POST /users/verify-email               # 邮箱验证
GET  /users/referral/info              # 邀请返利信息
GET  /users/promotion/status           # 活动状态
GET  /users/balance                    # 余额信息
GET  /users/recharge-records           # 充值记录
```

### 9.3 新增支付接口

```
GET  /payment/config                   # 支付配置
POST /payment/orders                   # 创建订单
GET  /payment/orders                   # 订单列表
GET  /payment/orders/:orderId          # 订单详情
POST /payment/webhook/zpay             # ZPAY 回调
POST /payment/webhook/stripe           # Stripe 回调
GET  /payment/return/zpay              # ZPAY 同步回调
GET  /payment/return/stripe            # Stripe 同步回调
```

---

## 10. 回滚方案

### 10.1 快速回滚步骤

```bash
# 1. 停止服务
npm run service:stop

# 2. 恢复代码
git checkout 77938b6e394ac2a8c58a6c7438c77b7d3a62cf48

# 3. 恢复依赖
npm install

# 4. 恢复配置
cp ./backup/.env.backup .env
cp ./backup/config.js.backup config/config.js

# 5. 恢复 Redis 数据（如有必要）
redis-cli FLUSHALL
redis-cli --pipe < ./backup/redis-dump.txt

# 6. 重启服务
npm run service:start
```

### 10.2 部分回滚

如果只需要禁用某些功能，修改环境变量即可：

```bash
# 禁用支付
PAYMENT_ENABLED=false

# 禁用活动
PROMOTION_ENABLED=false

# 禁用邀请返利
REFERRAL_PROGRAM_ENABLED=false
```

### 10.3 数据兼容性

| 数据类型 | 回滚兼容性 | 说明 |
|----------|------------|------|
| 用户数据 | ✅ 兼容 | 新字段不影响旧版本 |
| API Key 数据 | ✅ 兼容 | 新字段不影响旧版本 |
| 支付订单 | ⚠️ 仅新版本 | 旧版本无法读取 |
| 充值记录 | ⚠️ 仅新版本 | 旧版本无法读取 |
| 活动数据 | ⚠️ 仅新版本 | 旧版本无法读取 |
| 密码哈希 | ⚠️ 需注意 | bcrypt 格式旧版本无法验证 |

---

## 11. 迁移检查清单

### 11.1 迁移前检查

- [ ] 已完成 Redis 数据备份
- [ ] 已导出现有数据
- [ ] 已备份环境配置文件
- [ ] 已确认 Node.js 版本 >= 18
- [ ] 已确认 Redis 版本 >= 6
- [ ] 已通知相关人员维护窗口

### 11.2 迁移执行

- [ ] 停止服务
- [ ] 更新代码到最新版本
- [ ] 安装新依赖 `npm install`
- [ ] 更新环境变量配置
- [ ] 执行数据迁移脚本
  - [ ] `node scripts/migrate-add-user-apikey-index.js`
  - [ ] `node scripts/migrate-user-authtype.js`
- [ ] 重建前端 `cd web/admin-spa && npm install && npm run build`
- [ ] 启动服务

### 11.3 迁移后验证

- [ ] 服务正常启动，无报错
- [ ] 管理员可以登录
- [ ] 用户列表正常加载
- [ ] API Key 功能正常
- [ ] （如启用）支付功能测试
- [ ] （如启用）邮件发送测试
- [ ] （如启用）活动优惠显示正常
- [ ] 监控日志无异常

### 11.4 通知事项

- [ ] 通知用户新功能上线
- [ ] 如启用本地注册，告知用户注册方式
- [ ] 如启用支付，告知用户充值方式
- [ ] 如启用活动，告知用户活动规则

---

## 附录：常见问题

### Q1: bcrypt 安装失败

```bash
# 安装编译依赖
# Ubuntu/Debian
apt-get install build-essential python3

# CentOS/RHEL
yum install gcc-c++ make python3

# macOS
xcode-select --install
```

### Q2: 用户无法登录（密码迁移后）

旧 AES 格式密码需要用户使用原密码登录一次，系统会自动升级为 bcrypt。如果用户忘记密码：

1. 使用管理员重置密码功能
2. 或启用邮件服务后使用"忘记密码"功能

### Q3: 支付回调收不到

1. 检查回调 URL 是否公网可访问
2. 检查是否为 HTTPS
3. 检查服务器防火墙
4. 查看 logs/claude-relay-*.log 中的回调日志

### Q4: 邮件发送失败

1. 确认使用的是 SMTP 授权码而非登录密码
2. 检查 SMTP 端口是否正确（465/587）
3. 检查邮箱是否开启 SMTP 服务
4. 查看 logs/claude-relay-error-*.log

### Q5: 用户管理页面仍然慢

确认已执行用户索引迁移脚本：

```bash
node scripts/migrate-add-user-apikey-index.js
```

迁移后重启服务使缓存生效。
