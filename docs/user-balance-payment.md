# 用户余额与支付功能方案

> 版本: v1.1
> 创建日期: 2025-11-26
> 更新日期: 2025-11-26
> 状态: **第一阶段已完成** ✅

## 1. 需求概述

### 1.1 目标

为用户提供余额充值功能，用户可以通过充值增加账户余额，系统根据余额控制 API 使用权限。

### 1.2 核心功能

- ✅ 用户账户增加余额字段
- ✅ 管理员可为用户手动充值
- ✅ API 调用时检查余额是否足够
- ✅ 用户可查看余额和充值记录
- ⏳ （后续）支持自助支付充值

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
| 第二阶段 | 充值记录详情 | 充值记录详情页面、导出功能 | ⏳ 待开发 |
| 第三阶段 | 自助支付 | 支付网关集成（支付宝/微信/Stripe） | ⏳ 待开发 |

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

### 3.3 第二阶段：充值记录详情（待开发）

| 序号 | 任务 | 说明 |
|------|------|------|
| 2.1 | 充值记录列表页面 | 用户仪表板新增 Tab 显示充值记录 |
| 2.2 | 管理员充值记录页面 | 管理后台查看所有充值记录 |
| 2.3 | 记录导出功能 | 支持导出 CSV/Excel |

---

### 3.4 第三阶段：自助支付（待开发）

| 序号 | 任务 | 说明 |
|------|------|------|
| 3.1 | 支付网关选型 | 支付宝/微信/Stripe |
| 3.2 | 订单服务 | 创建订单、订单状态管理 |
| 3.3 | 支付回调处理 | 接收支付通知、更新余额 |
| 3.4 | 前端充值页面 | 选择金额、发起支付 |
| 3.5 | 支付安全 | 签名验证、防重放攻击 |

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
| `web/admin-spa/src/views/UserDashboardView.vue` | 修改 | 添加余额卡片显示 |
| `web/admin-spa/src/views/UserManagementView.vue` | 修改 | 添加充值按钮和弹窗 |

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
