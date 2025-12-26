# 📋 分支迁移方案文档 v2.1

## pay_dev_02 → main (ai_token_cloud_user)

> 更新：根据评审意见，补充前置条件、数据兼容、支付回调细节、回滚策略；新增 Stripe CLI 真验签与模拟回调示例

---

## 一、项目背景

### 1.1 目标
将 `pay_dev_02` 分支的所有功能迁移到 `main` 分支的模块化架构上，形成新分支 `ai_token_cloud_user`。

### 1.2 分支状态对比

| 指标 | pay_dev_02 | main |
|------|-----------|------|
| 独有提交数 | **211 个** | **329 个** |
| admin.js 结构 | 单文件 **9740 行** | 模块化 **19 个文件** |
| 架构模式 | 旧架构（单文件） | 新架构（模块化） |
| 共同祖先 | `77938b6e` | `77938b6e` |

---

## 二、批次 0：差异盘点与对齐（必须先做）

### 2.1 验证共同祖先

```bash
# 执行命令
git merge-base main pay_dev_02

# 预期结果
77938b6e394ac2a8c58a6c7438c77b7d3a62cf48

# 验收标准
如果输出不是上述 hash，说明分支关系有变化，需要重新分析
```

### 2.2 三张文件清单

#### ➕ pay_dev_02 独有文件（可直接复制）
```
src/services/emailService.js
src/services/paymentService.js
src/services/stripeService.js
src/services/zpayService.js
src/services/promotionService.js
src/services/referralService.js
src/routes/paymentRoutes.js
src/routes/dingtalkBot.js
web/admin-spa/src/utils/clipboard.js
web/admin-spa/src/constants/paymentMessages.js
web/admin-spa/src/composables/useEnvironmentConfig.js
docs/nginx.example.conf
docs/ROUTING.md
docs/email-verification-password-reset.md
docs/stripe-payment-analysis.md
docs/user-balance-payment.md
USER_API_REFERENCE.md
```

#### 🔀 两边都有的文件（必须手工合并）
```
web/admin-spa/src/config/api.js          ⚠️ main 已有，不能覆盖！
src/services/userService.js
src/routes/userRoutes.js
src/middleware/auth.js
src/models/redis.js
src/app.js
config/config.example.js
.env.example
package.json
web/admin-spa/src/stores/user.js
web/admin-spa/src/views/UserDashboardView.vue
web/admin-spa/src/views/UserManagementView.vue
web/admin-spa/src/router/index.js
```

#### 📌 main 独有且必须保留
```
src/routes/admin/  (整个模块化目录，19 个文件)
src/services/antigravityClient.js
src/services/requestIdentityService.js
src/services/costRankService.js
src/handlers/geminiHandlers.js
src/utils/anthropicRequestDump.js
src/utils/anthropicResponseDump.js
```

### 2.3 线上影响评估（Rebase / 部署 / 数据库）

#### 2.3.1 关于 “rebase” 本身
- `git rebase` 只是在 **Git 历史层面** 重写提交（commit hash 会变），不会直接改动线上运行中的服务、也不会直接改动 Redis 数据。
- 真正影响线上的是：你把 rebase 后的代码 **push/部署** 上去，导致服务版本发生变化（通常会触发重启/滚动发布）。

#### 2.3.2 对线上用户可能的影响点（与 rebase 无关，来自“部署 + 代码差异”）
- **短暂不可用**：发布过程如果不是滚动/多实例，会有重启窗口，用户会感知到 5xx/断连。
- **行为变化**：只要代码有差异，就可能影响接口行为（但不是“rebase”导致的，是“最终部署的代码”导致的）。
- **余额/费用口径**：如果切换到“算法不同”的版本，`availableBalance` 可能变化并触发“余额不足”；本方案前提是 **不切换算法**，仅做结构迁移与功能合并。

#### 2.3.3 数据库（Redis）会不会变化？
本项目主要持久化在 **Redis（Key/Value + JSON）**，没有类似 MySQL/Postgres 的“schema migration”。因此：
- 不会发生“表结构升级/列迁移”这种数据库结构变更。
- 数据层面的变化主要来自 **新增 key** 或 **在现有 JSON 上新增字段**（通常是向后兼容的）。

#### 2.3.4 pay_dev_02 已上线 + Redis 独占（你的场景）
- 只要新版本继续指向同一个 Redis（同一个 `REDIS_URL` / DB index），并且 key 命名保持一致（如 `user:*`、`payment_order:*`），**线上历史数据会原样保留**。
- ✅ 建议：上线前做一次 Redis 备份（RDB/AOF/快照），并在灰度环境对同一批用户做“接口输出对比”（例如余额接口、订单列表接口）。
- ⚠️ 不建议在该场景按“期望为 0”去清理 `payment_*`/`referral:*` 等 key；这些 key 很可能就是线上真实数据。

---

## 三、关键技术问题与解决方案

### 3.1 ⚠️ Stripe rawBody 问题（必须修复）

**问题描述**：
- pay_dev_02 的 `paymentRoutes.js:197` 使用 `req.rawBody` 传给 Stripe 验签
- main 的 `app.js:167-171` 的 `express.json({ verify })` 只验证 JSON 格式，**没有设置 req.rawBody**
- 如果不修复，Stripe 回调验签将 100% 失败

**修复方案**：
```javascript
// 修改 main 的 src/app.js 中的 express.json 配置
express.json({
  limit: config.http?.maxBodySize || '10mb',
  verify: (req, res, buf, encoding) => {
    // 保存原始 body（Buffer）用于 Stripe 验签（必须保持字节级一致）
    if (buf && buf.length) {
      req.rawBody = Buffer.from(buf)
      const bodyString = buf.toString(encoding || 'utf8')
      // 验证 JSON 格式（空白 body 视为非法 JSON）
      if (!bodyString.trim()) {
        throw new Error('Invalid JSON: empty body')
      }
    } else {
      req.rawBody = Buffer.alloc(0)
    }
  }
})
```

**验收标准**：
- 发送测试 Stripe webhook 到 `/payment/webhook/stripe`
- 日志/报错应体现“已进入验签流程”（例如 `Invalid Stripe signature`），而不是 `Stripe webhook missing raw body`

#### 3.1.1（可选但推荐）Stripe CLI 真验签（端到端到本服务）

> 目的：用 Stripe CLI 发送**带真实签名**的 webhook 到本地 `/payment/webhook/stripe`，验证 rawBody + webhookSecret 配置无误。
>
> 前提：需要安装并登录 `stripe` CLI（会用到外网/API），并准备 Stripe 测试环境的 `STRIPE_SECRET_KEY`。

**步骤**：
1. 准备 `.env`（先不启动服务也可以）：
   - `.env` 中至少开启：
     - `PAYMENT_ENABLED=true`
     - `STRIPE_ENABLED=true`
     - `STRIPE_SECRET_KEY=sk_test_...`

2. 启动 Stripe webhook 转发（另开一个终端，用于获取 `whsec` 并转发事件）：
   ```bash
   stripe listen --forward-to http://localhost:3000/payment/webhook/stripe
   ```
   - CLI 会输出类似 `whsec_...` 的签名密钥，把它写入 `.env`：
     - `STRIPE_WEBHOOK_SECRET=whsec_...`
   - 若之前已启动服务：修改 `.env` 后需要重启（确保 `stripeService` 读取到新 secret）

3. 启动服务（确保已读取到 `STRIPE_WEBHOOK_SECRET`）：
   - 启动：`npm run dev`

4. 触发一条测试事件（另开一个终端）：
   ```bash
   stripe trigger payment_intent.succeeded
   ```

**验收标准**：
- `/payment/webhook/stripe` 返回 200（或 JSON `success: true`）
- 服务端日志不应出现：
  - `Stripe webhook missing raw body`
  - `Stripe webhook secret not configured`
- 如果出现 `No orderId metadata`（或 “Ignored”），属于预期：该触发事件通常不包含本项目需要的 `metadata.orderId`，但能证明“真验签路径”可用。

### 3.2 ⚠️ 支付回调关键细节

#### Stripe Webhook
| 检查项 | 代码位置 | 说明 |
|-------|---------|------|
| rawBody 捕获 | `app.js:167` | 见上方修复方案 |
| 签名验证 | `stripeService.js:273-280` | 使用 `constructEvent()` |
| 幂等处理 | `paymentService.js:421-423` | 订单已支付则跳过 |
| 状态机 | `paymentService.js` | pending → paid/failed |

#### ZPAY Webhook
| 检查项 | 代码位置 | 说明 |
|-------|---------|------|
| 签名验证 | `zpayService.js` | 已实现：MD5(参数排序拼接 + key)，回调对比 `sign` |
| 来源校验 | 可选增强 | 以签名校验为主；如需降低探测/滥用，可加 allow-list/速率限制 |
| 重放保护 | `paymentService.js` | 订单状态幂等：已 paid 则跳过；可额外校验 `tradeNo → orderId` 映射一致性 |

#### 测试端点生产禁用
```javascript
// paymentRoutes.js:260 的 /test/simulate-callback
// 验收：生产环境调用应返回 403 或 404
if (process.env.NODE_ENV === 'production') {
  return res.status(403).json({ error: 'Test endpoint disabled in production' })
}
```

### 3.3 订单状态机

```
┌─────────┐
│ pending │ ← 创建订单时
└────┬────┘
     │
     ├──────────────────┐
     ↓                  ↓
┌─────────┐        ┌─────────┐
│  paid   │        │ failed  │
└─────────┘        └─────────┘
```

**状态转换规则**：
- `pending` → `paid`：支付成功回调
- `pending` → `failed`：支付失败/超时
- `paid` → 不可变：幂等保护

---

## 四、数据迁移与 Redis Key

### 4.1 新增 Redis Key 结构

| Key 模式 | 用途 | 数据类型 |
|---------|------|---------|
| `payment_order:{orderId}` | 订单详情（JSON） | String |
| `payment_orders_user:{userId}` | 用户订单列表（orderId 列表） | List |
| `payment_orders_all` | 全局订单列表（orderId 列表） | List |
| `payment_order_trade:{tradeNo}` | 交易号 → orderId 映射 | String |
| `user_promotion:{userId}` | 用户促销状态（JSON） | String |
| `referral:code:{CODE}` | 邀请码 → userId 映射 | String |
| `referral:user:{userId}:code` | userId → 邀请码 | String |
| `referral:invite:{inviteeId}` | 邀请记录（JSON） | String |
| `referral:user:{userId}:invitees` | 邀请人邀请的用户列表（inviteeId 列表） | List |
| `referral:stats:{userId}` | 邀请统计（JSON） | String |
| `referral:reward-lock:{inviteeId}` | 返利发放幂等锁（TTL） | String |
| `email_verification_token:{tokenHash}` | 邮箱验证 token（JSON，TTL） | String |
| `password_reset_token:{tokenHash}` | 密码重置 token（JSON，TTL） | String |

### 4.2 数据兼容性检查

> 注意：这里分两种部署场景，请不要混用“预期结果”。

#### 场景 A：新环境/空 Redis（首次部署支付/返利等功能）
**迁移前验证脚本（空库检查）**：
```bash
# ⚠️ 生产环境不要使用 KEYS（可能阻塞 Redis）；优先使用 SCAN

# 检查是否有遗留的支付/活动/邀请相关 key（测试环境可接受）
redis-cli KEYS "payment_order:*" | wc -l
redis-cli KEYS "payment_orders_user:*" | wc -l
redis-cli KEYS "payment_order_trade:*" | wc -l
redis-cli KEYS "payment_orders_all" | wc -l
redis-cli KEYS "user_promotion:*" | wc -l
redis-cli KEYS "referral:*" | wc -l
redis-cli KEYS "email_verification_token:*" | wc -l
redis-cli KEYS "password_reset_token:*" | wc -l

# 生产环境示例（统计数量用 SCAN）
# redis-cli --scan --pattern "payment_order:*" | wc -l
# redis-cli --scan --pattern "payment_orders_user:*" | wc -l
# redis-cli --scan --pattern "payment_order_trade:*" | wc -l
# redis-cli --scan --pattern "user_promotion:*" | wc -l
# redis-cli --scan --pattern "referral:*" | wc -l
# redis-cli --scan --pattern "email_verification_token:*" | wc -l
# redis-cli --scan --pattern "password_reset_token:*" | wc -l
# redis-cli EXISTS payment_orders_all

# 预期结果：0（如果不是，需要清理或迁移）
```

#### 场景 B：替换 pay_dev_02 线上服务但复用同一 Redis（你的场景）
**目标**：验证“新版本能读懂旧数据”，并避免误连到错误的 Redis（连接错库会表现为 key 数量突然变成 0）。

建议检查：
- `SCAN user:*` 能扫到用户 key（数量与上线前大致一致）
- 随机抽样几个 `user:{id}`，确认 JSON 可解析，且余额字段缺省时能按 0 处理
- 支付/返利 key（如 `payment_order:*`、`referral:*`）数量上线前后不应“凭空归零”

---

## 五、配置级降级开关（回滚策略核心）

### 5.1 已有的功能开关

| 环境变量 | 默认值 | 功能 |
|---------|-------|------|
| `PAYMENT_ENABLED` | false | 支付总开关 |
| `ZPAY_ENABLED` | false | ZPAY 支付 |
| `STRIPE_ENABLED` | false | Stripe 支付 |
| `REFERRAL_PROGRAM_ENABLED` | false | 邀请返利 |
| `DINGTALK_BOT_ENABLED` | false | 钉钉机器人 |
| `EMAIL_ENABLED` | false | 邮件服务 |
| `SIGNUP_BONUS_ENABLED` | false | 注册赠金 |
| `LOCAL_AUTH_ENABLED` | false | 本地认证 |

### 5.2 降级策略（优于代码回滚）

**问题发生时的处理顺序**：
1. **第一步：关闭功能开关**
   ```bash
   # 修改 .env 并重启服务
   PAYMENT_ENABLED=false
   REFERRAL_PROGRAM_ENABLED=false
   ```

2. **第二步：评估业务影响**
   - 已发放的余额/返利/赠金无法通过代码回滚撤销
   - 需要人工审计 Redis 中的 `payment_order:*` 记录

3. **第三步：如需代码回滚**
   ```bash
   git revert <batch-commit-hash>
   ```

### 5.3 业务补偿策略

| 场景 | 补偿方式 |
|-----|---------|
| 重复加钱 | 根据 `payment_order:*` 审计，手工扣减 |
| 返利计算错误 | 根据 `referral:invite:*` / `referral:stats:*` 审计，调整余额 |
| 促销叠加错误 | 根据 `user_promotion:*` 审计，调整余额 |

---

## 六、分批实施计划（9 个批次，含批次 0）

### 批次概览

| 批次 | 功能模块 | 风险 | 预计耗时 | 依赖 |
|------|---------|------|---------|------|
| **0** | 差异盘点与对齐 | 🟢 低 | 1h | - |
| **1** | 基础配置和工具 | 🟢 低 | 1-2h | 批次 0 |
| **2** | 新服务文件 | 🟢 低 | 2-3h | 批次 1 |
| **3** | 用户认证增强 | 🟡 中 | 3-4h | 批次 2 |
| **4** | 支付系统核心 | 🟡 中 | 4-5h | **批次 3**（余额方法） |
| **5** | 邀请返利和促销 | 🟡 中 | 2-3h | **批次 4**（支付流程） |
| **6** | 钉钉机器人 | 🟢 低 | 1-2h | 批次 4 |
| **7** | 前端组件和页面 | 🔴 高 | 5-6h | 批次 1-6 |
| **8** | 集成测试和文档 | 🟢 低 | 2-3h | 批次 1-7 |

### 批次间依赖图

```
批次0 → 批次1 → 批次2 → 批次3 → 批次4 → 批次5
                          ↓         ↓
                        批次7 ← 批次6
                          ↓
                        批次8
```

**关键依赖说明**：
- 批次 4（支付）依赖批次 3（userService 的余额方法），否则会出现"路由通了但记账缺方法"
- 批次 5（返利）依赖批次 4（支付回调），否则无法触发返利逻辑
- 批次 7（前端）依赖所有后端批次完成

---

### 批次 1：基础配置和工具 🟢

**操作**：
- 复制 pay_dev_02 独有的文档和工具文件
- **合并**（非覆盖）`.env.example`、`config/config.example.js`、`package.json`

**验收标准（AC）**：
- [ ] `npm install` 成功，无新增错误
- [ ] `config/config.example.js` 包含 `payment`、`referralProgram`、`email` 配置段
- [ ] `.env.example` 包含所有新增环境变量

---

### 批次 2：新服务文件 🟢

**操作**：
- 复制 6 个新服务文件和 2 个新路由文件

**验收标准（AC）**：
- [ ] `require('./services/emailService')` 不报错
- [ ] `require('./services/paymentService')` 不报错
- [ ] `npm run lint` 通过

---

### 批次 3：用户认证增强 🟡

**操作**：
- 手工合并 `userService.js`（+1288 行）
- 手工合并 `userRoutes.js`（+1847 行）
- 确认 `authenticateUser` 中间件

**验收标准（AC）**：
- [ ] `POST /users/register` 返回 200，创建用户成功
- [ ] `GET /users/balance` 返回 `{ success: true, data: { balance, availableBalance } }`
- [ ] `POST /users/forgot-password` 发送邮件（需配置 SMTP）
- [ ] 余额方法存在：`userService.getBalanceInfo()`、`rechargeBalance()`、`deductBalance()`、`checkBalance()`

---

### 批次 4：支付系统核心 🟡

**操作**：
- 修改 `app.js`：添加路由挂载 + **修复 rawBody 捕获**
- 复制前端支付组件

**验收标准（AC）**：
- [ ] `GET /payment/config` 返回支付配置（含 enabled 状态）
- [ ] 创建测试订单：`POST /payment/orders` 返回 orderId
- [ ] Stripe webhook 验签流程可执行（rawBody 不缺失）：
  ```bash
  curl -X POST http://localhost:3000/payment/webhook/stripe \
    -H "stripe-signature: test" \
    -H "Content-Type: application/json" \
    -d '{"test": true}'
	  # 日志应显示验签错误而非 rawBody 缺失
	  ```
- [ ] （可选）使用 Stripe CLI 完成一次“真验签 webhook”投递（见 `3.1.1`）
- [ ] 模拟回调可以跑通 pending → paid（仅开发环境）：
  ```bash
  curl -X POST http://localhost:3000/payment/test/simulate-callback \
    -H "Content-Type: application/json" \
    -d '{"orderId":"<上一步返回的orderId>","success":true}'
  ```
- [ ] 订单状态变化：pending → paid（模拟回调后）
- [ ] 余额更新：用户余额增加对应金额
- [ ] 幂等检查：重复回调不会重复加钱

---

### 批次 5：邀请返利和促销 🟡

**操作**：
- 复制促销组件
- 修改 UserDashboardView

**验收标准（AC）**：
- [ ] 新用户注册后自动生成邀请码
- [ ] 促销活动倒计时显示正确
- [ ] 被邀请用户充值后，邀请人获得返利
- [ ] 返利金额计算正确（根据配置的百分比）

---

### 批次 6：钉钉机器人 🟢

**验收标准（AC）**：
- [ ] `POST /hooks/dingtalk/recharge` 接收消息成功
- [ ] 命令解析正确：`《testuser》 《100》`（或 `testuser 100`）
- [ ] 用户余额增加 100

---

### 批次 7：前端组件和页面 🔴

**操作**：
- 复制新增组件
- **合并**（非覆盖）`api.js`、`router/index.js`、`stores/user.js`
- 合并视图文件

**验收标准（AC）**：
- [ ] `npm run build`（前端）成功
- [ ] 用户仪表板显示余额、促销横幅、邀请码
- [ ] 充值记录页面数据加载正常
- [ ] 暗黑模式兼容

---

### 批次 8：集成测试和文档 🟢

**完整测试清单**：
- [ ] 用户注册 → 邮箱验证 → 登录
- [ ] 创建 API Key → 查看余额
- [ ] 充值（ZPAY）→ 回调 → 余额更新
- [ ] 充值（Stripe）→ 回调 → 余额更新
- [ ] 分享邀请码 → 被邀请人注册 → 被邀请人充值 → 邀请人获得返利
- [ ] 促销活动：新用户首充优惠
- [ ] 钉钉充值：管理员通过机器人充值
- [ ] `/payment/test/simulate-callback` 生产环境返回 403

---

## 七、迁移前代码清理

### 7.1 需要修复的问题

| 文件 | 问题 | 修复方式 |
|-----|------|---------|
| `paymentRoutes.js:260` | simulate-callback 端点必须保持生产禁用 | 确保 `NODE_ENV=production` 时返回 403/404 |

---

## 八、执行步骤

```bash
# 0. 验证分支状态
git fetch --all
git merge-base main pay_dev_02  # 应输出 77938b6e...

# 1. 创建工作分支
git checkout main
git pull origin main
git checkout -b ai_token_cloud_user

# 2. 按批次执行（每批次完成后提交）
# 批次 0 → 批次 1 → ... → 批次 8

# 3. 每批次验证
npm install
npm run lint
npm run dev  # 启动测试
# 执行该批次的 AC 验收

# 4. 批次提交
git add .
git commit -m "feat(batch-N): <批次描述>"
```

---

## 九、工时估算

| 阶段 | 批次 | 预计耗时 |
|------|------|---------|
| 准备阶段 | 批次 0 | 1 小时 |
| 第一阶段 | 批次 1-2 | 3-5 小时 |
| 第二阶段 | 批次 3-4 | 7-9 小时 |
| 第三阶段 | 批次 5-6 | 3-5 小时 |
| 第四阶段 | 批次 7-8 | 7-9 小时 |
| **总计** | - | **21-29 小时** |

**建议**：分 3-4 天完成，每天完成 2-3 个批次。

---

## 十、关键文件清单

| 文件路径 | 操作类型 | 优先级 |
|---------|---------|-------|
| `src/app.js` | 🔧 修改（rawBody + 路由） | P0 |
| `src/services/userService.js` | 🔀 手工合并 | P0 |
| `src/routes/userRoutes.js` | 🔀 手工合并 | P0 |
| `config/config.example.js` | 🔀 合并配置 | P1 |
| `web/admin-spa/src/config/api.js` | 🔀 合并（非覆盖） | P1 |
| `web/admin-spa/src/views/UserDashboardView.vue` | 🔀 大量 UI 合并 | P2 |

---

**文档版本**：v2.1
**更新时间**：2025-12-26
**更新内容**：补充前置条件、数据兼容、支付回调细节、配置级降级开关、业务补偿策略；新增 Stripe CLI 真验签与模拟回调示例
