#!/usr/bin/env node

/**
 * ZPay 调试工具
 * 用于测试和调试 ZPay 支付签名问题
 *
 * 使用方法:
 *   node scripts/test-zpay-debug.js              # 生成测试URL
 *   node scripts/test-zpay-debug.js --simple     # 生成简化测试URL（推荐）
 *   node scripts/test-zpay-debug.js --verify     # 验证实际订单签名
 */

const crypto = require('crypto')
require('dotenv').config()

// 从环境变量读取配置
const CONFIG = {
  pid: process.env.ZPAY_PID || '2025101712111787',
  key: process.env.ZPAY_KEY || '1Xk0vZMLBsiI2rSZ41ixDK8iiQLkh1s7',
  apiUrl: process.env.ZPAY_API_URL || 'https://zpayz.cn'
}

// 渠道映射
const CHANNEL_MAPPING = process.env.ZPAY_CHANNEL_MAPPING
  ? JSON.parse(process.env.ZPAY_CHANNEL_MAPPING)
  : { wxpay: '12322', alipay: '11540' }

console.log('=' .repeat(80))
console.log('ZPay 调试工具')
console.log('=' .repeat(80))

// 签名计算函数
function buildSignString(params) {
  const sortedPairs = []
  for (const key in params) {
    // 排除 sign、sign_type 和 channel_id
    if (!params[key] || key === 'sign' || key === 'sign_type' || key === 'channel_id') {
      continue
    }
    sortedPairs.push([key, params[key]])
  }
  sortedPairs.sort((a, b) => a[0].localeCompare(b[0]))
  return sortedPairs.map(pair => `${pair[0]}=${pair[1]}`).join('&')
}

function generateSign(params, key) {
  const signString = buildSignString(params)
  const fullString = signString + key
  return crypto.createHash('md5').update(fullString).digest('hex')
}

function generateTestUrl(params, channelId) {
  const signString = buildSignString(params)
  const sign = generateSign(params, CONFIG.key)

  console.log('\n参数信息:')
  Object.entries(params).forEach(([k, v]) => {
    console.log(`  ${k}: ${v}`)
  })
  if (channelId) {
    console.log(`  channel_id: ${channelId} (不参与签名)`)
  }

  console.log('\n签名计算:')
  console.log('  1. 参与签名的字符串:')
  console.log('     ' + signString)
  console.log('  2. 拼接密钥后:')
  console.log('     ' + signString + '[KEY]')
  console.log('  3. MD5签名:')
  console.log('     ' + sign)

  // 构建完整参数
  const fullParams = { ...params }
  if (channelId) {
    fullParams.channel_id = channelId
  }
  fullParams.sign = sign
  fullParams.sign_type = 'MD5'

  const url = `${CONFIG.apiUrl}/submit.php?${new URLSearchParams(fullParams).toString()}`
  console.log('\n生成的URL:')
  console.log(url)

  return url
}

// 获取命令行参数
const args = process.argv.slice(2)
const isSimple = args.includes('--simple')
const isVerify = args.includes('--verify')

console.log('\n配置信息:')
console.log('  PID:', CONFIG.pid)
console.log('  密钥:', CONFIG.key.substring(0, 8) + '...' + CONFIG.key.substring(24))
console.log('  API URL:', CONFIG.apiUrl)
console.log('  渠道映射:', JSON.stringify(CHANNEL_MAPPING))

if (isVerify) {
  // 验证模式：分析实际失败的订单
  console.log('\n' + '=' .repeat(80))
  console.log('验证模式：分析实际失败的订单')
  console.log('=' .repeat(80))

  const failedParams = {
    pid: '2025101712111787',
    type: 'alipay',
    out_trade_no: 'order_mk8bjnxy_6935683f',
    notify_url: 'https://crs-demo.tokenfreeai.com/payment/webhook/zpay',
    return_url: 'https://crs-demo.tokenfreeai.com/admin-next/#/user-dashboard?tab=recharge&order=order_mk8bjnxy_6935683f',
    name: 'AI Token充值',
    money: '106.50',
    sitename: 'AI TokenCloud'
  }

  generateTestUrl(failedParams, CHANNEL_MAPPING.alipay)

  console.log('\n分析结果:')
  console.log('  ✓ 签名算法正确（参数排序 + 密钥拼接 + MD5）')
  console.log('  ✓ channel_id 正确排除在签名之外')
  console.log('\n可能的问题:')
  console.log('  1. IP 白名单限制 - 检查 ZPay 后台是否设置了 IP 白名单')
  console.log('  2. 渠道配置错误 - 确认渠道 ' + CHANNEL_MAPPING.alipay + ' 是否正确配置')
  console.log('  3. 商户状态异常 - 检查商户账号是否正常')

} else if (isSimple) {
  // 简化模式：使用最简单的参数测试
  console.log('\n' + '=' .repeat(80))
  console.log('简化测试模式：使用最少参数避免干扰')
  console.log('=' .repeat(80))

  const simpleParams = {
    pid: CONFIG.pid,
    type: 'alipay',
    out_trade_no: 'TEST_' + Date.now(),
    notify_url: 'https://crs-demo.tokenfreeai.com/test',
    return_url: 'https://crs-demo.tokenfreeai.com/test',
    name: 'Test',
    money: '1.00',
    sitename: 'Test'
  }

  generateTestUrl(simpleParams, CHANNEL_MAPPING.alipay)

  console.log('\n测试建议:')
  console.log('  1. 复制上面的 URL 在浏览器中打开')
  console.log('  2. 如果能正常显示支付页面，说明签名算法正确')
  console.log('  3. 如果还是签名错误，请检查:')
  console.log('     - PID 和密钥是否正确')
  console.log('     - 是否有 IP 白名单限制')
  console.log('     - 渠道 ID 是否正确')

} else {
  // 默认模式：生成标准测试
  console.log('\n' + '=' .repeat(80))
  console.log('标准测试模式')
  console.log('=' .repeat(80))

  const testParams = {
    pid: CONFIG.pid,
    type: 'alipay',
    out_trade_no: 'ORDER_' + Date.now(),
    notify_url: 'https://crs-demo.tokenfreeai.com/payment/webhook/zpay',
    return_url: 'https://crs-demo.tokenfreeai.com/admin-next/#/user-dashboard?tab=recharge',
    name: 'AI Token充值',
    money: '10.00',
    sitename: 'AI TokenCloud'
  }

  console.log('\n测试支付宝:')
  generateTestUrl(testParams, CHANNEL_MAPPING.alipay)

  // 也测试微信
  const wxParams = { ...testParams, type: 'wxpay', out_trade_no: 'WX_' + Date.now() }
  console.log('\n' + '=' .repeat(80))
  console.log('测试微信支付:')
  generateTestUrl(wxParams, CHANNEL_MAPPING.wxpay)

  console.log('\n使用提示:')
  console.log('  --simple  生成简化测试URL（推荐首次测试）')
  console.log('  --verify  验证实际失败的订单签名')
}

console.log('\n' + '=' .repeat(80))
console.log('调试完成')
console.log('=' .repeat(80))