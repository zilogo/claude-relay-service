/**
 * ZPAY 支付服务
 * 支持支付宝和微信支付的聚合支付
 * API 文档: https://7-pay.cn/doc.html
 *
 * 功能特性：
 * - 支持多种支付方式（支付宝、微信、QQ钱包、财付通）
 * - 支持指定支付渠道 ID（用于区分不同的支付渠道）
 * - 支持从配置文件映射默认渠道 ID
 * - 自动签名验证和回调处理
 */

const crypto = require('crypto')
const config = require('../../config/config')
const logger = require('../utils/logger')

class ZpayService {
  constructor() {
    this.pid = config.payment.zpay.pid
    this.key = config.payment.zpay.key
    this.apiUrl = config.payment.zpay.apiUrl
    this.paymentMethods = config.payment.zpay.paymentMethods || ['alipay', 'wxpay']
    this.channelMapping = config.payment.zpay.channelMapping || {}

    if (!this.pid || !this.key) {
      logger.warn('[ZpayService] ZPAY credentials not configured')
    }
  }

  /**
   * 检查服务是否可用
   */
  isAvailable() {
    return config.payment.zpay.enabled && this.pid && this.key
  }

  /**
   * 获取支持的支付方式
   */
  getSupportedMethods() {
    if (!this.isAvailable()) {
      return []
    }

    const methodNames = {
      alipay: '支付宝',
      wxpay: '微信支付',
      qqpay: 'QQ钱包',
      tenpay: '财付通'
    }

    const methodIcons = {
      alipay: 'alipay',
      wxpay: 'wechat',
      qqpay: 'qq',
      tenpay: 'tencent'
    }

    return this.paymentMethods.map((method) => ({
      provider: 'zpay',
      method,
      name: methodNames[method] || method,
      icon: methodIcons[method] || 'credit-card',
      currency: 'CNY'
    }))
  }

  /**
   * 对参数进行排序并拼接字符串
   * @param {Object} params - 参数对象
   * @returns {string} - 排序后的参数字符串
   */
  buildSignString(params) {
    const sortedPairs = []

    for (const key in params) {
      // 过滤空值、sign、sign_type 和 cid（cid不参与签名）
      if (!params[key] || key === 'sign' || key === 'sign_type' || key === 'cid') {
        continue
      }
      sortedPairs.push([key, params[key]])
    }

    // 按照 key 排序
    sortedPairs.sort((a, b) => a[0].localeCompare(b[0]))

    // 拼接字符串
    return sortedPairs.map((pair) => `${pair[0]}=${pair[1]}`).join('&')
  }

  /**
   * 生成签名
   * @param {Object} params - 参数对象
   * @returns {string} - MD5 签名
   */
  generateSign(params) {
    const signString = this.buildSignString(params)
    // 根据 ZPay 文档，签名 = MD5(参数字符串 + 商户密钥)
    // 注意：密钥直接拼接在参数字符串后面，没有 & 符号
    const fullString = signString + this.key

    // 记录调试信息（生产环境应该移除）
    if (process.env.DEBUG_ZPAY === 'true') {
      logger.debug('[ZpayService] Sign calculation:', {
        paramString: signString,
        fullString: fullString.replace(this.key, '***KEY***'),
        sign: crypto.createHash('md5').update(fullString).digest('hex')
      })
    }

    return crypto
      .createHash('md5')
      .update(fullString)
      .digest('hex')
  }

  /**
   * 创建支付订单
   * @param {string} orderId - 订单号
   * @param {number} amount - 金额（人民币）
   * @param {string} paymentMethod - 支付方式 (alipay/wxpay)
   * @param {Object} options - 额外选项
   * @param {string} options.channelId - 支付渠道ID（可选）
   * @returns {Object} - 支付信息
   */
  async createOrder(orderId, amount, paymentMethod, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('ZPAY service is not available')
    }

    if (!this.paymentMethods.includes(paymentMethod)) {
      throw new Error(`Unsupported payment method: ${paymentMethod}`)
    }

    const { baseUrl } = config.payment

    // 构建支付参数
    const params = {
      pid: this.pid,
      type: paymentMethod,
      out_trade_no: orderId,
      notify_url: `${baseUrl}/payment/webhook/zpay`,
      return_url:
        options.returnUrl || `${baseUrl}/admin-next/#/user-dashboard?tab=recharge&order=${orderId}`,
      name: options.name || 'AI Token充值',
      money: amount.toFixed(2),
      sitename: options.sitename || config.web.title || 'AI TokenCloud'
    }

    // 如果指定了 channelId，添加到参数中（使用 cid 作为参数名）
    if (options.channelId) {
      params.cid = options.channelId
      logger.info('[ZpayService] Using specified channel ID', {
        orderId,
        channelId: options.channelId,
        paymentMethod
      })
    } else if (this.channelMapping[paymentMethod]) {
      // 如果没有指定 channelId，但配置中有该支付方式的默认渠道映射，则使用映射的渠道ID
      params.cid = this.channelMapping[paymentMethod]
      logger.info('[ZpayService] Using mapped channel ID from config', {
        orderId,
        channelId: params.cid,
        paymentMethod
      })
    }

    // 生成签名
    params.sign = this.generateSign(params)
    params.sign_type = 'MD5'

    // 构建支付 URL
    const payUrl = `${this.apiUrl}/submit.php?${new URLSearchParams(params).toString()}`

    logger.info('[ZpayService] Order created', {
      orderId,
      amount,
      paymentMethod,
      channelId: params.cid || 'default',
      payUrl: payUrl.replace(this.key, '***')
    })

    return {
      payUrl,
      params,
      provider: 'zpay',
      method: paymentMethod,
      channelId: params.cid || null
    }
  }

  /**
   * 验证回调签名
   * @param {Object} params - 回调参数
   * @returns {boolean} - 签名是否有效
   */
  verifyCallback(params) {
    const receivedSign = params.sign
    if (!receivedSign) {
      logger.warn('[ZpayService] Callback missing sign parameter')
      return false
    }

    const calculatedSign = this.generateSign(params)
    const isValid = receivedSign.toLowerCase() === calculatedSign.toLowerCase()

    if (!isValid) {
      logger.warn('[ZpayService] Callback signature mismatch', {
        received: receivedSign,
        calculated: calculatedSign
      })
    }

    return isValid
  }

  /**
   * 处理支付回调
   * @param {Object} params - 回调参数
   * @returns {Object} - 解析后的订单信息
   */
  async handleCallback(params) {
    logger.info('[ZpayService] Processing callback', {
      out_trade_no: params.out_trade_no,
      trade_no: params.trade_no,
      trade_status: params.trade_status,
      money: params.money,
      type: params.type
    })

    // 验证签名
    if (!this.verifyCallback(params)) {
      throw new Error('Invalid signature')
    }

    // 验证交易状态
    if (params.trade_status !== 'TRADE_SUCCESS') {
      throw new Error(`Trade not successful: ${params.trade_status}`)
    }

    // 返回订单信息
    return {
      orderId: params.out_trade_no,
      tradeNo: params.trade_no,
      amount: parseFloat(params.money),
      paymentMethod: params.type,
      status: 'paid'
    }
  }

  /**
   * 生成模拟回调参数（仅用于开发测试）
   * @param {string} orderId - 订单号
   * @param {number} amount - 金额
   * @param {string} paymentMethod - 支付方式
   * @returns {Object} - 模拟的回调参数
   */
  generateTestCallback(orderId, amount, paymentMethod = 'alipay') {
    const params = {
      pid: this.pid,
      trade_no: `T${Date.now()}${Math.random().toString(36).substr(2, 6)}`,
      out_trade_no: orderId,
      type: paymentMethod,
      name: 'AI Token充值',
      money: amount.toFixed(2),
      trade_status: 'TRADE_SUCCESS'
    }

    params.sign = this.generateSign(params)
    params.sign_type = 'MD5'

    return params
  }
}

// 导出单例
module.exports = new ZpayService()
