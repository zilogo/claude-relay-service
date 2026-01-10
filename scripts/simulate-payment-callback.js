#!/usr/bin/env node

/**
 * 模拟支付回调脚本
 * 用于测试支付系统，手动触发支付成功回调
 */

const axios = require('axios');

// 配置
const BASE_URL = process.env.BASE_URL || 'https://crs-demo.tokenfreeai.com';
const ZPAY_KEY = process.env.ZPAY_KEY || '1Xk0vZMLBsiI2rSZ41ixDK8iiQLkh1s7';

async function simulateZpayCallback(orderId, success = true) {
  const crypto = require('crypto');

  // 构建回调参数
  const params = {
    pid: '2025101712111787',
    trade_no: `ZPAY_${Date.now()}`, // 支付平台交易号
    out_trade_no: orderId,
    type: 'wxpay', // 或 alipay
    name: 'AI Token充值',
    money: '106.50',
    trade_status: success ? 'TRADE_SUCCESS' : 'TRADE_CLOSED'
  };

  // 生成签名
  const signStr = Object.keys(params)
    .filter(key => key !== 'sign' && key !== 'sign_type' && params[key])
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&') + ZPAY_KEY;

  params.sign = crypto.createHash('md5').update(signStr).digest('hex');
  params.sign_type = 'MD5';

  // 发送回调
  const url = `${BASE_URL}/payment/webhook/zpay`;

  try {
    console.log(`🔄 发送支付回调到: ${url}`);
    console.log('📦 回调参数:', JSON.stringify(params, null, 2));

    const response = await axios.get(url, { params });

    console.log('✅ 回调响应:', response.data);
    console.log('✅ 支付回调模拟成功！');

    return response.data;
  } catch (error) {
    console.error('❌ 回调失败:', error.response?.data || error.message);
    throw error;
  }
}

// 命令行参数处理
const [,, orderId, status] = process.argv;

if (!orderId) {
  console.log(`
使用方法:
  node simulate-payment-callback.js <订单ID> [success|failed]

示例:
  node simulate-payment-callback.js order_mk8bcph0_204f9eca
  node simulate-payment-callback.js order_mk8bcph0_204f9eca success
  node simulate-payment-callback.js order_mk8bcph0_204f9eca failed
  `);
  process.exit(1);
}

const isSuccess = status !== 'failed';

// 执行模拟
simulateZpayCallback(orderId, isSuccess)
  .then(() => {
    console.log('✨ 完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 错误:', error);
    process.exit(1);
  });