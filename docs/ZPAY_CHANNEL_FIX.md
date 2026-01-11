# ZPay 渠道ID配置问题修复记录

## 问题描述

用户反馈创建微信支付订单时，没有按照指定的 zpay 支付渠道 ID 创建二维码。

## 问题分析

### 环境变量配置
`.env` 文件中已正确配置：
```bash
ZPAY_CHANNEL_MAPPING='{"wxpay":"12322","alipay":"11540"}'
```

### 根本原因
虽然 `config/config.example.js` 中已经包含了 `channelMapping` 配置项的解析代码，但用户本地的 `config/config.js` 文件（从旧版本 example 复制而来）缺少这个配置项。

由于 `config/config.js` 被 `.gitignore` 忽略（包含敏感信息），该文件不受版本控制，导致用户没有自动获取到最新的配置结构。

## 修复方案

### 1. 更新本地配置文件
在 `config/config.js` 的 `zpay` 配置块中添加 `channelMapping` 配置：

```javascript
// ZPay 配置
zpay: {
  enabled: process.env.ZPAY_ENABLED === 'true',
  pid: process.env.ZPAY_PID || '',
  key: process.env.ZPAY_KEY || '',
  apiUrl: process.env.ZPAY_API_URL || 'https://zpayz.cn',
  submitUrl: process.env.ZPAY_SUBMIT_URL || 'https://zpayz.cn/submit.php',
  queryUrl: process.env.ZPAY_QUERY_URL || 'https://zpayz.cn/api.php',
  paymentMethods: process.env.ZPAY_PAYMENT_METHODS
    ? process.env.ZPAY_PAYMENT_METHODS.split(',').map((m) => m.trim())
    : ['alipay', 'wxpay'],
  orderPrefix: process.env.ZPAY_ORDER_PREFIX || 'ORD_',
  notifyUrl: process.env.ZPAY_NOTIFY_URL || '',
  returnUrl: process.env.ZPAY_RETURN_URL || '',
  notifyUser: process.env.ZPAY_NOTIFY_USER === 'true',
  ipWhitelist: process.env.ZPAY_IP_WHITELIST
    ? process.env.ZPAY_IP_WHITELIST.split(',').map((ip) => ip.trim()).filter(Boolean)
    : [],
  requireHttps:
    process.env.ZPAY_REQUIRE_HTTPS !== 'false' && process.env.NODE_ENV === 'production',
  // 渠道ID映射配置：为不同支付方式指定默认渠道ID
  // 格式：{ '支付方式': '渠道ID' }
  // 例如：{ "wxpay": "10001", "alipay": "10002" }
  // 环境变量格式：ZPAY_CHANNEL_MAPPING='{"wxpay":"10001","alipay":"10002"}'
  channelMapping: (() => {
    const mapping = process.env.ZPAY_CHANNEL_MAPPING
    if (!mapping) return {}
    try {
      return JSON.parse(mapping)
    } catch (e) {
      console.warn('[Config] Invalid ZPAY_CHANNEL_MAPPING JSON, using empty mapping')
      return {}
    }
  })()
},
```

### 2. 重启服务
```bash
npm run service:stop
npm run service:start:daemon
```

## 验证结果

执行测试脚本验证配置生效：

```bash
node test_zpay_channel.js
```

测试结果：
- ✅ 微信支付订单正确使用渠道ID `12322`
- ✅ 支付宝订单正确使用渠道ID `11540`
- ✅ 支付URL包含 `channel_id` 参数
- ✅ 签名计算正确排除 `channel_id`（符合ZPay API要求）

### 测试输出示例

```
1️⃣ 测试微信支付 (wxpay):
   ✅ 订单创建成功
   📋 渠道ID: 12322
   🔗 支付URL参数:
   - channel_id: 12322
   - sign: fc33c663ee3ed2a5...
   - type: wxpay

2️⃣ 测试支付宝 (alipay):
   ✅ 订单创建成功
   📋 渠道ID: 11540
   🔗 支付URL参数:
   - channel_id: 11540
   - sign: da70cd4dc5dbe974...
   - type: alipay
```

## 相关代码

### ZpayService 渠道ID使用逻辑
位置：`src/services/zpayService.js:126-166`

```javascript
async createOrder(orderId, amount, paymentMethod, options = {}) {
  // ... 省略其他代码 ...

  const params = {
    pid: this.pid,
    type: paymentMethod,
    out_trade_no: orderId,
    notify_url: `${baseUrl}/payment/webhook/zpay`,
    return_url: options.returnUrl || `${baseUrl}/admin-next/#/user-dashboard?tab=recharge&order=${orderId}`,
    name: options.name || 'AI Token充值',
    money: amount.toFixed(2),
    sitename: options.sitename || config.web.title || 'AI TokenCloud'
  }

  // 如果指定了 channelId，添加到参数中
  if (options.channelId) {
    params.channel_id = options.channelId
    logger.info('[ZpayService] Using specified channel ID', {
      orderId,
      channelId: options.channelId,
      paymentMethod
    })
  } else if (this.channelMapping[paymentMethod]) {
    // 如果没有指定 channelId，但配置中有该支付方式的默认渠道映射，则使用映射的渠道ID
    params.channel_id = this.channelMapping[paymentMethod]
    logger.info('[ZpayService] Using mapped channel ID from config', {
      orderId,
      channelId: params.channel_id,
      paymentMethod
    })
  }

  // ... 省略其他代码 ...
}
```

### 签名计算排除 channel_id
位置：`src/services/zpayService.js:73-89`

```javascript
buildSignString(params) {
  const sortedPairs = []

  for (const key in params) {
    // 过滤空值、sign、sign_type 和 channel_id（channel_id不参与签名）
    if (!params[key] || key === 'sign' || key === 'sign_type' || key === 'channel_id') {
      continue
    }
    sortedPairs.push([key, params[key]])
  }

  // 按照 key 排序
  sortedPairs.sort((a, b) => a[0].localeCompare(b[0]))

  // 拼接字符串
  return sortedPairs.map((pair) => `${pair[0]}=${pair[1]}`).join('&')
}
```

## 升级指南

如果其他用户也遇到类似问题，需要：

1. 对比 `config/config.example.js` 和本地 `config/config.js`
2. 将 example 文件中的 `channelMapping` 配置复制到本地配置
3. 确保 `.env` 中配置了 `ZPAY_CHANNEL_MAPPING`
4. 重启服务

## 预防措施

建议在项目 README 或升级文档中添加提示：
- 当更新代码后，检查 `config/config.example.js` 是否有新的配置项
- 手动同步到本地的 `config/config.js` 文件中

## 修复日期

2026-01-11

## 修复人员

Claude (Karma AI)
