# Stripe 微信支付实现说明

> 适用版本：`lei-claude-relay-service`（Stripe + WeChat Pay 集成）  
> 最后更新：2025-03-xx

本文记录 Stripe 渠道在系统中的集成方式，重点描述如何通过 PaymentIntent + WeChat Pay 实现扫码/JSAPI 支付，并与现有订单、余额逻辑联动。

## 1. 组件概览

| 组件 | 文件 | 说明 |
|------|------|------|
| `paymentService` | `src/services/paymentService.js` | 支付调度层，负责订单创建、回调、Redis 存储、余额入账等通用逻辑，统一封装多种支付渠道。 |
| `stripeService` | `src/services/stripeService.js` | 基于 Stripe PaymentIntent，生成 WeChat Pay 二维码/跳转信息、处理 webhook 并构造测试事件。 |
| `paymentRoutes` | `src/routes/paymentRoutes.js` | 提供 `/payment/orders`、`/payment/webhook/stripe` 等接口，转发 request/rawBody 给服务层。 |
| 配置 | `config/config.example.js` | `payment.stripe` 节点包含 API Key、Webhook Secret、微信客户端类型、AppID、跳转地址等。 |

`paymentService` 会在构造函数中根据 `config.payment.stripe.enabled` 注册 `stripeService`。只要 `stripeService.isAvailable()` 返回 `true`，`/payment/config` 中就会自动出现 `provider: 'stripe'` 的微信支付方式。

## 2. 配置项

```env
PAYMENT_ENABLED=true

# Stripe 基础配置
STRIPE_ENABLED=true
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_API_VERSION=2024-06-20
STRIPE_PAYMENT_METHODS=wechat_pay
STRIPE_CURRENCY=CNY
STRIPE_SUCCESS_URL=https://domain/payment/return/stripe?order={ORDER_ID}&status=success
STRIPE_CANCEL_URL=https://domain/payment/return/stripe?order={ORDER_ID}&status=cancel

# Stripe WeChat Pay 额外配置
STRIPE_WECHAT_CLIENT=web             # web / ios / android（旧值 wechat_qr 等会自动归一）
STRIPE_WECHAT_APP_ID=wx1234567890abcd # 仅在 ios/android 模式下需要
```

- `{ORDER_ID}` 会在服务端被替换为真实订单号，便于前端在跳转/展示时回填。
- Stripe 微信支付仅支持人民币金额，因此前端在选择该方式时会自动切换为 `CNY` 输入，后端再根据 `exchangeRate` 计算美元余额。
- 若需启用 App / 移动端支付，应在 Stripe Dashboard 开通对应能力并将 `STRIPE_WECHAT_CLIENT` 设为 `ios` 或 `android`（若留空或填旧值，系统会自动按 `web` 处理）。

## 3. 请求与支付流程

1. **获取配置**  
   前端调用 `GET /payment/config`，得到 `methods` 列表，其中 Stripe 项为：
   ```json
   {
     "provider": "stripe",
     "method": "wechat_pay",
     "name": "Stripe 微信支付",
     "icon": "wechat",
     "currency": "CNY"
   }
   ```

2. **创建订单**  
   `POST /payment/orders` 携带 `{ amount, currency: 'CNY', provider: 'stripe', paymentMethod: 'wechat_pay' }`。  
   `paymentService.createOrder()` 会：
   - 校验限流 / 金额区间 / 套餐；
   - 通过 `stripeService.createOrder()` 创建 PaymentIntent（`confirm: true`、`payment_method_types: ['wechat_pay']`）；
   - 将返回的二维码/跳转信息保存到 `order.paymentData` 并写入 Redis。

3. **前端展示与轮询**  
   - 若 `paymentData.wechat.type === 'qr'`，前端展示 `imageUrlPng`；若为 `redirect`，提示用户在微信环境打开 `url`；
   - 同时启动轮询（或提供“我已支付”按钮）调用 `GET /payment/orders/:id` 检查 `status` 是否变为 `paid`；
   - `paymentData.expiresAt` 为二维码有效期（Stripe Unix 时间戳），前端需倒计时并在过期后提示重新创建订单。

4. **Webhook 回调**  
   Stripe 将 `payment_intent.succeeded` / `payment_intent.payment_failed` 等事件 POST 到 `/payment/webhook/stripe`。  
   `stripeService.handleCallback()`:
   - 使用 `stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)` 验签；
   - 在 `succeeded` 时返回 `{ orderId, tradeNo, amount, amountUsd }`，交由 `paymentService` 更新 Redis、充值余额；
   - 在 `payment_failed` 时返回 `{ failed: true, reason }`，`paymentService` 会将订单标记为 `failed` 并记录 `failReason`。

5. **余额入账**  
   `paymentService.handleCallback()` 成功后调用 `userService.rechargeBalance()`，以订单中的 `amountUsd` 增加余额，并更新充值记录。

6. **查询**  
   用户可通过 `/payment/orders`、`/payment/orders/:orderId`、`/payment/stats` 查看状态，Redis 中的 `paymentData` 也会随订单返回，便于前端展示。

## 4. Webhook 与安全

- 终端：`POST https://<your-domain>/payment/webhook/stripe`
- Stripe Dashboard 中仅需订阅 `payment_intent.succeeded`、`payment_intent.payment_failed` 等必要事件。
- 服务端通过 `req.rawBody` + `stripe-signature` 验签；若签名错误会返回 400，Stripe 会自动重试。
- 对于无关事件（如 `payment_intent.created`），`stripeService` 会返回 `{ ignored: true }`，`paymentService` 直接返回 200 避免反复推送。

## 5. 前端集成要点

- **自动切换币种**：选中 Stripe 微信方式时，输入框自动切换为人民币，金额限制也会按照 `limits.min/max` × 汇率显示。
- **支付弹窗**：创建订单成功后弹出二维码弹窗，提供倒计时、支付状态提示、重新生成二维码等功能。
- **轮询机制**：默认每 5 秒调用一次 `/payment/orders/:id`，也可通过“我已完成支付”按钮手动触发。
- **失败反馈**：若订单被回调为 `failed`，弹窗与充值记录都会显示 `failReason`，提示用户重新下单。

## 6. 开发与测试

1. **Stripe 测试模式**：使用 `sk_test_*`、`whsec_test_*`；需在 Dashboard 中为 Test 模式启用 WeChat Pay。
2. **Stripe CLI**：`stripe listen --forward-to localhost:3000/payment/webhook/stripe` + `stripe trigger payment_intent.succeeded` 可模拟回调。
3. **本地模拟**：`POST /payment/test/simulate-callback` 支持 `provider=stripe`，会生成虚拟 PaymentIntent 成功事件。
4. **排错指南**  
   - `Amount mismatch`：检查前端是否按 CNY 传递金额，以及 `exchangeRate` 是否正确写入 Metadata。  
   - `Stripe service is not available`：确认 `STRIPE_ENABLED`、`STRIPE_PAYMENT_METHODS=wechat_pay`、API Key/Webhook Secret 配置完整。  
   - `二维码无法加载`：检查服务器是否能访问 Stripe 给出的 CDN 链接，或在 H5/JSAPI 模式下是否在微信环境打开。  
   - `支付失败`：查看订单 `failReason`（通常为 `last_payment_error.message`），确认商户资格或用户支付状态。

## 7. 与 ZPay 的区别

| 项目 | ZPay | Stripe (WeChat Pay) |
|------|------|---------------------|
| 支付方式 | 支付宝/微信聚合 | Stripe 微信扫码 / H5 / JSAPI |
| 金额单位 | CNY | CNY（内部折算为 USD 记账） |
| 回调 | GET/POST + MD5 签名 | POST + `stripe-signature` 验签 |
| 前端交互 | 跳转到 ZPay 收银台 | 站内展示二维码或打开微信链接，需轮询状态 |
| 模拟工具 | 内建 test callback | Stripe CLI / `simulate-callback` |

两者共享 `paymentService` 的限流、订单存储、统计与余额逻辑，可按需同时启用。

## 8. 注意事项

1. **二维码有效期**：Stripe 返回的 `expires_at`（Unix 秒）通常 2 分钟左右，需及时提示用户刷新。
2. **多端场景**：`wechat_qr` 适合 PC 扫码；`wechat_h5`/`wechat_jsapi` 适合移动端；`wechat_app` 需配置 `STRIPE_WECHAT_APP_ID`。
3. **失败订单**：`payment_intent.payment_failed` 会自动把订单状态置为 `failed`，并在充值记录中展示失败原因，便于客服排查。
4. **金额换算**：`stripeService` 会把 `amountUsd` / `exchangeRate` 写入 Metadata，回调时若 Stripe 只返回 CNY 金额，`paymentService` 会根据 Metadata 做二次换算，确保余额与下单金额一致。
5. **扩展事件**：若需要监听退款或争议，可在 `stripeService.handleCallback` 中增加更多 `event.type` 分支，并在 `paymentService` 中按需处理。

通过上述方案，Stripe 渠道完全切换为微信支付模式，既满足国内用户的扫码需求，又保留了与现有订单、回调、余额系统的深度集成。
