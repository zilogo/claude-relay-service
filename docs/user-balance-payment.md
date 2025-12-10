# 用户余额与支付功能方案

> 版本: v1.3
> 创建日期: 2025-11-26
> 更新日期: 2025-11-26
> 状态: **第三阶段已完成** ✅

## 1. 需求概述

### 1.1 目标

为用户提供余额充值功能，用户可以通过充值增加账户余额，系统根据余额控制 API 使用权限。

### 1.2 核心功能

- ✅ 用户账户增加余额字段
- ✅ 管理员可为用户手动充值
- ✅ API 调用时检查余额是否足够
- ✅ 用户可查看余额和充值记录
- ✅ 支持自助支付充值（ZPAY 支付宝/微信）

---

## 2. 系统设计

### 2.1 数据模型

#### 2.1.1 用户余额字段

在用户数据结构中新增字段（`src/services/userService.js`）：

```javascript
{
  // ... 现有字段 ...
  balance: 0,              // 账户余额（单位：美元）
  totalRecharge: 0,        // 累计充值金额
  lastRechargeAt: null,    // 最后充值时间
}
```

#### 2.1.2 充值记录数据结构

Redis Key: `recharge_record:{id}`

```javascript
{
  id: 'rec_xxxxxxxx',           // 记录ID
  userId: 'user_xxx',           // 用户ID
  username: 'john',             // 用户名
  amount: 10.00,                // 充值金额（美元）
  balanceBefore: 5.00,          // 充值前余额
  balanceAfter: 15.00,          // 充值后余额
  type: 'manual',               // 类型: manual(手动) / payment(支付) / refund(退款) / adjustment(调整)
  source: 'admin',              // 来源: admin / alipay / wechat / stripe
  operatorId: 'admin_xxx',      // 操作者ID（管理员充值时）
  operatorName: 'admin',        // 操作者名称
  remark: '首次充值',           // 备注
  createdAt: '2025-01-01T00:00:00.000Z'
}
```

Redis 索引 Key:
- `user_recharge_records:{userId}` - 用户充值记录列表（存储记录ID，按时间倒序）
- `recharge_records:all` - 全部充值记录ID列表（分页用）

### 2.2 余额检查逻辑

```
API 请求流程:
1. 验证 API Key
2. 获取关联用户ID（从 keyData.userId）
3. 调用 userService.checkBalance(userId)
4. 如果余额不足（availableBalance <= 0），返回 402 Payment Required
5. 如果余额足够，继续处理请求
```

**余额判断公式**：
```
可用余额 = balance（已充值总额） - totalCost（已消费总额）
如果 可用余额 <= 0，则拒绝请求
```

### 2.3 API 设计

#### 2.3.1 用户接口

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| GET | `/users/balance` | 获取当前余额信息 | ✅ 已实现 |
| GET | `/users/recharge-records` | 获取充值记录列表 | ✅ 已实现 |

#### 2.3.2 管理员接口

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| POST | `/admin/users/:userId/recharge` | 为用户充值 | ✅ 已实现 |
| GET | `/admin/users/:userId/balance` | 获取用户余额 | ✅ 已实现 |
| GET | `/admin/users/:userId/recharge-records` | 获取用户充值记录 | ✅ 已实现 |
| GET | `/admin/recharge-records` | 获取所有充值记录 | ✅ 已实现 |

#### 2.3.3 接口详情

**POST /admin/users/:userId/recharge**

请求：
```json
{
  "amount": 10.00,
  "remark": "首次充值"
}
```

响应：
```json
{
  "success": true,
  "data": {
    "recordId": "rec_xxxxxxxx",
    "userId": "user_xxx",
    "username": "john",
    "amount": 10.00,
    "balanceBefore": 5.00,
    "balanceAfter": 15.00,
    "balance": 15.00,
    "totalRecharge": 15.00,
    "operatorName": "admin",
    "createdAt": "2025-11-26T10:00:00.000Z"
  }
}
```

**GET /users/balance**

响应：
```json
{
  "success": true,
  "data": {
    "balance": 15.00,
    "totalRecharge": 20.00,
    "totalCost": 5.00,
    "availableBalance": 10.00,
    "lastRechargeAt": "2025-01-01T00:00:00.000Z"
  }
}
```

**余额不足响应（HTTP 402）**

```json
{
  "error": "Insufficient balance",
  "message": "账户余额不足，请充值后继续使用",
  "balance": 5.00,
  "totalCost": 10.00,
  "availableBalance": -5.00
}
```

---

## 3. 实施进度

### 3.1 阶段总览

| 阶段 | 名称 | 核心功能 | 状态 |
|------|------|----------|------|
| **第一阶段** | 基础余额系统 | 余额字段、手动充值、余额检查、前端显示 | ✅ **已完成** |
| **第二阶段** | 充值记录详情 | 充值记录详情页面、导出功能 | ✅ **已完成** |
| **第三阶段** | 自助支付 | ZPAY支付网关集成（支付宝/微信） | ✅ **已完成** |

---

### 3.2 第一阶段：基础余额系统 ✅ 已完成

#### 3.2.1 任务清单

| 序号 | 任务 | 文件 | 状态 |
|------|------|------|------|
| 1.1 | 添加用户余额字段 | `src/services/userService.js` | ✅ |
| 1.2 | 实现充值服务方法 | `src/services/userService.js` | ✅ |
| 1.3 | 添加余额检查逻辑 | `src/middleware/auth.js` | ✅ |
| 1.4 | 添加 userId 到 keyData | `src/services/apiKeyService.js` | ✅ |
| 1.5 | 管理员充值 API | `src/routes/admin.js` | ✅ |
| 1.6 | 用户余额查询 API | `src/routes/userRoutes.js` | ✅ |
| 1.7 | 前端余额显示 | `web/admin-spa/src/views/UserDashboardView.vue` | ✅ |
| 1.8 | 前端 Store 方法 | `web/admin-spa/src/stores/user.js` | ✅ |
| 1.9 | 管理员充值入口 | `web/admin-spa/src/views/UserManagementView.vue` | ✅ |

#### 3.2.2 实现详情

##### userService.js 新增方法

```javascript
// 获取用户余额信息
async getBalanceInfo(userId)

// 为用户充值
async rechargeBalance(userId, amount, operator, remark)

// 获取用户充值记录
async getRechargeRecords(userId, options)

// 获取所有充值记录（管理员）
async getAllRechargeRecords(options)

// 检查用户余额是否足够
async checkBalance(userId)
```

##### auth.js 余额检查逻辑

在 API Key 验证通过后、处理请求前，检查关联用户的余额：

```javascript
// 检查用户余额（如果 API Key 关联了用户）
if (validation.keyData.userId) {
  const balanceCheck = await userService.checkBalance(validation.keyData.userId)
  if (!balanceCheck.sufficient) {
    return res.status(402).json({
      error: 'Insufficient balance',
      message: '账户余额不足，请充值后继续使用',
      balance: balanceCheck.balance,
      totalCost: balanceCheck.totalCost,
      availableBalance: balanceCheck.availableBalance
    })
  }
}
```

##### 前端实现

**用户仪表板 (UserDashboardView.vue)**
- 新增"可用余额"统计卡片
- 显示可用余额（绿色/红色根据正负）
- 显示累计充值金额

**用户管理页面 (UserManagementView.vue)**
- 在用户操作列新增充值按钮（💳图标）
- 充值弹窗显示当前余额、已消费、可用余额
- 输入充值金额和备注
- 充值成功后刷新用户列表

---

### 3.3 第二阶段：充值记录详情 ✅ 已完成

#### 3.3.1 任务清单

| 序号 | 任务 | 文件 | 状态 |
|------|------|------|------|
| 2.1 | 用户充值记录 Tab | `web/admin-spa/src/components/user/UserRechargeRecords.vue` | ✅ |
| 2.2 | 用户仪表板集成 | `web/admin-spa/src/views/UserDashboardView.vue` | ✅ |
| 2.3 | 管理员充值记录页面 | `web/admin-spa/src/views/RechargeRecordsView.vue` | ✅ |
| 2.4 | 路由和导航配置 | `web/admin-spa/src/router/index.js` | ✅ |
| 2.5 | 标签栏菜单更新 | `web/admin-spa/src/components/layout/TabBar.vue` | ✅ |
| 2.6 | 布局路由映射 | `web/admin-spa/src/components/layout/MainLayout.vue` | ✅ |
| 2.7 | CSV 导出功能 | 用户端和管理端均已实现 | ✅ |

#### 3.3.2 实现详情

##### 用户充值记录组件 (UserRechargeRecords.vue)

功能特点：
- 余额概览卡片：显示当前余额、累计充值、累计消费、可用余额
- 充值记录表格：时间、金额、类型、备注、变动前后余额
- 分页支持：每页 10 条记录
- CSV 导出：支持导出所有充值记录（UTF-8 BOM 格式兼容 Excel）

##### 管理员充值记录页面 (RechargeRecordsView.vue)

功能特点：
- 统计卡片：总充值金额、充值次数、充值用户数、平均充值金额
- 筛选功能：用户名搜索、充值类型、时间范围
- 充值记录表格：包含用户列、操作员信息
- 分页支持：每页 20 条记录
- CSV 导出：支持导出筛选后的记录

##### 导航菜单更新

在「用户管理」菜单后新增「充值记录」菜单项：
- 菜单 Key: `rechargeRecords`
- 路由路径: `/recharge-records`
- 图标: `fas fa-receipt`
- 显示条件: `userManagementEnabled` 或 `ldapEnabled` 为 true

---

### 3.4 第三阶段：自助支付 ✅ 已完成

#### 3.4.1 任务清单

| 序号 | 任务 | 文件 | 状态 |
|------|------|------|------|
| 3.1.1 | 更新 config.js 添加支付配置 | `config/config.js` | ✅ |
| 3.1.2 | 创建 ZPAY 支付服务 | `src/services/zpayService.js` | ✅ |
| 3.1.3 | 创建支付服务抽象层 | `src/services/paymentService.js` | ✅ |
| 3.1.4 | 创建支付路由 | `src/routes/paymentRoutes.js` | ✅ |
| 3.1.5 | 注册路由到 app.js | `src/app.js` | ✅ |
| 3.1.6 | 更新环境变量示例 | `.env.example` | ✅ |
| 3.2.1 | 创建支付 Store | `web/admin-spa/src/stores/payment.js` | ✅ |
| 3.2.2 | 更新充值记录组件 | `web/admin-spa/src/components/user/UserRechargeRecords.vue` | ✅ |
| 3.3.1 | 引入 Stripe SDK 并新增配置 | `package.json` / `config/config.js` | ✅ |
| 3.3.2 | 实现 Stripe 支付服务 | `src/services/stripeService.js` | ✅ |
| 3.3.3 | Stripe Webhook & Return 路由 | `src/routes/paymentRoutes.js` | ✅ |
| 3.3.4 | 回调验签、金额换算增强 | `src/services/paymentService.js` | ✅ |

#### 3.4.2 实现详情

##### 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                      前端充值界面                            │
│          (UserRechargeRecords.vue - 在线充值区域)           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   支付路由 (paymentRoutes.js)                │
│     POST /payment/orders                                    │
│     POST /payment/webhook/zpay                              │
│     GET  /payment/orders                                    │
│     GET  /payment/orders/:orderId                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              支付服务抽象层 (paymentService.js)              │
│     - createOrder(userId, options)                          │
│     - handleCallback(provider, data)                        │
│     - getOrderStatus(orderId)                               │
└─────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            ▼                                   ▼
┌──────────────────────────────┐    ┌──────────────────────────────┐
│      zpayService.js          │    │      stripeService.js        │
│ (支付宝/微信聚合支付)          │    │ (信用卡/国际支付 Checkout)   │
└──────────────────────────────┘    └──────────────────────────────┘
```

##### 环境变量配置

```bash
# 支付系统配置
PAYMENT_ENABLED=true                         # 启用支付功能
PAYMENT_MIN_AMOUNT=1                         # 支持 RECHARGE_MIN_AMOUNT
PAYMENT_MAX_AMOUNT=1000                      # 支持 RECHARGE_MAX_AMOUNT
PAYMENT_ALLOW_CUSTOM_AMOUNT=true             # 支持 ALLOW_CUSTOM_AMOUNT
PAYMENT_DEFAULT_CURRENCY=CNY                 # 支持 DEFAULT_CURRENCY
PAYMENT_EXCHANGE_RATE=7.2                    # 支持 EXCHANGE_RATE
PAYMENT_ORDER_EXPIRE_MINUTES=30              # 支持 ZPAY_ORDER_EXPIRE_MINUTES
MAX_ORDERS_PER_MINUTE=3
PAYMENT_PACKAGES=[]                          # JSON 字符串，定义充值套餐

# ZPAY 配置
ZPAY_ENABLED=true
ZPAY_PID=你的商户ID
ZPAY_KEY=你的商户密钥
ZPAY_API_URL=https://zpayz.cn
ZPAY_SUBMIT_URL=https://zpayz.cn/submit.php
ZPAY_QUERY_URL=https://zpayz.cn/api.php
ZPAY_PAYMENT_METHODS=alipay,wxpay
ZPAY_ORDER_PREFIX=ORD_

# Stripe 配置
STRIPE_ENABLED=true
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PAYMENT_METHODS=wechat_pay
STRIPE_CURRENCY=CNY
STRIPE_SUCCESS_URL=https://your-domain/payment/return/stripe?order={ORDER_ID}&status=success
STRIPE_CANCEL_URL=https://your-domain/payment/return/stripe?order={ORDER_ID}&status=cancel
STRIPE_WECHAT_CLIENT=wechat_qr
STRIPE_WECHAT_APP_ID=
ZPAY_NOTIFY_URL=https://example.com/payment/zpay/notify
ZPAY_RETURN_URL=https://example.com/payment/zpay/return
ZPAY_NOTIFY_USER=false
ZPAY_IP_WHITELIST=
ZPAY_REQUIRE_HTTPS=true
```

##### 支付订单数据结构

```javascript
{
  id: 'order_xxxxxxxx',           // 订单ID
  userId: 'user_xxx',             // 用户ID
  username: 'john',               // 用户名
  amount: 70.00,                  // 支付金额（原始货币）
  currency: 'CNY',                // 货币类型
  amountUsd: 10.00,               // 美元金额
  exchangeRate: 7.0,              // 汇率
  packageId: 'pkg_10',            // 套餐ID
  packageName: '基础套餐',         // 套餐名称
  provider: 'zpay',               // 支付渠道
  paymentMethod: 'alipay',        // 支付方式
  tradeNo: 'xxx',                 // 第三方交易号
  status: 'pending',              // pending/paid/failed/expired
  payUrl: 'https://...',          // 支付链接（仅部分渠道）
  paymentData: {                  // Stripe WeChat Pay 返回的二维码/跳转信息
    type: 'wechat_pay',
    wechat: {
      type: 'qr',
      imageUrlPng: 'https://...',
      expiresAt: 1710000000
    }
  },
  createdAt: '...',
  paidAt: null,
  expiredAt: '...'
}
```

##### 前端实现

用户充值界面功能：
- 套餐选择：显示预设套餐（如 ¥70/$10、¥350/$50、¥700/$100）
- 自定义金额：支持人民币/美元输入，自动换算
- 支付方式：支付宝、微信支付、Stripe 微信支付（三者共享 UI，自动切换货币与限额）
- 实时显示：支付金额预览
- Stripe 微信支付：创建订单后弹出二维码弹窗（含倒计时、轮询状态、重新生成二维码按钮）；ZPay 仍保持跳转收银台流程

##### 安全机制

1. **签名验证**: MD5 签名验证回调真实性
2. **幂等处理**: 订单状态检查防重复充值
3. **金额验证**: 回调金额与订单金额比对
4. **订单过期**: 30分钟自动过期清理
5. **速率限制**: 每用户每分钟最多3个订单

##### 测试策略

开发环境提供模拟回调接口：
```bash
POST /payment/test/simulate-callback
Body: { "orderId": "order_xxx", "success": true }
```

---

## 4. 使用说明

### 4.1 管理员给用户充值

1. 登录管理后台
2. 进入「用户管理」页面
3. 找到目标用户，点击操作列的 💳 充值按钮
4. 在弹窗中查看用户当前余额信息
5. 输入充值金额（美元）和备注（可选）
6. 点击「确认充值」

### 4.2 用户查看余额

1. 登录用户仪表板
2. 在「总览」页面查看「可用余额」卡片
3. 显示可用余额和累计充值金额

### 4.3 余额不足处理

当用户余额不足时，API 请求会返回：
- HTTP 状态码：402 Payment Required
- 错误信息：账户余额不足，请充值后继续使用

---

## 5. 技术实现细节

### 5.1 并发安全

充值操作使用 Redis 事务（MULTI/EXEC）保证原子性：

```javascript
const client = redis.getClientSafe()
const multi = client.multi()
multi.set(`user:${userId}`, JSON.stringify(user))
multi.set(`recharge_record:${recordId}`, JSON.stringify(rechargeRecord))
multi.lpush(`user_recharge_records:${userId}`, recordId)
multi.lpush('recharge_records:all', recordId)
await multi.exec()
```

### 5.2 容错处理

余额检查失败时不阻止请求，仅记录警告日志：

```javascript
try {
  const balanceCheck = await userService.checkBalance(userId)
  // ...
} catch (balanceError) {
  // 余额检查失败时记录警告但不阻止请求
  logger.warn(`Balance check failed for user ${userId}:`, balanceError.message)
}
```

### 5.3 审计追踪

所有充值记录包含完整的操作者信息：
- `operatorId`: 操作者ID
- `operatorName`: 操作者名称
- `createdAt`: 操作时间

---

## 6. 相关文件清单

### 后端文件

| 文件路径 | 修改类型 | 说明 |
|----------|----------|------|
| `src/services/userService.js` | 修改 | 添加余额字段和充值相关方法 |
| `src/middleware/auth.js` | 修改 | 添加余额检查逻辑 |
| `src/services/apiKeyService.js` | 修改 | 在 keyData 中返回 userId |
| `src/routes/admin.js` | 修改 | 添加充值和余额查询 API |
| `src/routes/userRoutes.js` | 修改 | 添加用户余额查询 API |

### 前端文件

| 文件路径 | 修改类型 | 说明 |
|----------|----------|------|
| `web/admin-spa/src/stores/user.js` | 修改 | 添加余额查询方法 |
| `web/admin-spa/src/views/UserDashboardView.vue` | 修改 | 添加余额卡片显示、充值记录 Tab |
| `web/admin-spa/src/views/UserManagementView.vue` | 修改 | 添加充值按钮和弹窗 |
| `web/admin-spa/src/components/user/UserRechargeRecords.vue` | **新增** | 用户充值记录组件（第二阶段） |
| `web/admin-spa/src/views/RechargeRecordsView.vue` | **新增** | 管理员充值记录页面（第二阶段） |
| `web/admin-spa/src/components/layout/TabBar.vue` | 修改 | 新增充值记录菜单项（第二阶段） |
| `web/admin-spa/src/components/layout/MainLayout.vue` | 修改 | 新增充值记录路由映射（第二阶段） |
| `web/admin-spa/src/router/index.js` | 修改 | 新增充值记录路由（第二阶段） |

---

## 7. Redis Key 规范

| Key 模式 | 说明 |
|----------|------|
| `user:{id}` | 用户信息（含 balance、totalRecharge、lastRechargeAt 字段） |
| `recharge_record:{id}` | 充值记录详情 |
| `user_recharge_records:{userId}` | 用户充值记录ID列表（LPUSH，新记录在前） |
| `recharge_records:all` | 全部充值记录ID列表（分页用） |

---

## 8. 后续扩展计划

- **优惠券系统**：支持优惠码充值
- **套餐系统**：预定义充值套餐（如 $10、$50、$100）
- **自动充值**：余额低于阈值时自动充值
- **消费明细**：每次 API 调用的扣费记录
- **发票系统**：充值后自动生成发票
- **余额预警**：余额不足时邮件/Webhook 通知
