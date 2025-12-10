/**
 * 支付服务抽象层
 * 统一管理多个支付渠道，处理订单创建、回调、状态查询
 */

const crypto = require('crypto')
const config = require('../../config/config')
const redis = require('../models/redis')
const logger = require('../utils/logger')
const zpayService = require('./zpayService')
const stripeService = require('./stripeService')
const userService = require('./userService')

// Redis Key 前缀
const REDIS_KEYS = {
  ORDER: 'payment_order:', // payment_order:{orderId}
  USER_ORDERS: 'payment_orders_user:', // payment_orders_user:{userId}
  ALL_ORDERS: 'payment_orders_all', // 全局订单列表
  TRADE_MAP: 'payment_order_trade:', // payment_order_trade:{tradeNo}
  RATE_LIMIT: 'payment_rate_limit:' // payment_rate_limit:{userId}
}

class PaymentService {
  constructor() {
    this.providers = {}

    // 初始化支付渠道
    if (config.payment.zpay?.enabled) {
      this.providers.zpay = zpayService
      logger.info('[PaymentService] ZPAY provider initialized')
    }

    if (config.payment.stripe?.enabled) {
      this.providers.stripe = stripeService
      logger.info('[PaymentService] Stripe provider configured')
    }

    // 启动过期订单清理任务
    this.startOrderCleanupTask()
  }

  /**
   * 检查支付功能是否启用
   */
  isEnabled() {
    return config.payment.enabled && Object.keys(this.providers).length > 0
  }

  /**
   * 获取支付配置（供前端使用）
   */
  getPaymentConfig() {
    return {
      enabled: this.isEnabled(),
      packages: config.payment.packages || [],
      methods: this.getAvailableMethods(),
      currency: {
        default: config.payment.defaultCurrency || 'CNY',
        exchangeRate: config.payment.exchangeRate || 7.2
      },
      limits: {
        min: config.payment.minAmount || 1,
        max: config.payment.maxAmount || 1000,
        allowCustom: config.payment.allowCustomAmount !== false
      },
      stripe: {
        currency: (config.payment.stripe?.currency || 'CNY').toUpperCase(),
        exchangeRateToCny:
          (config.payment.stripe?.currency || 'CNY').toUpperCase() === 'USD'
            ? config.payment.exchangeRate || 7.2
            : 1,
        minConvertedAmount: 0.5 // Stripe 要求至少 0.5 单位
      }
    }
  }

  /**
   * 获取所有可用的支付方式
   */
  getAvailableMethods() {
    const methods = []

    for (const [_name, provider] of Object.entries(this.providers)) {
      if (provider.isAvailable && provider.isAvailable()) {
        const providerMethods = provider.getSupportedMethods()
        methods.push(...providerMethods)
      }
    }

    return methods
  }

  /**
   * 生成订单ID
   */
  generateOrderId() {
    const timestamp = Date.now().toString(36)
    const random = crypto.randomBytes(4).toString('hex')
    return `order_${timestamp}_${random}`
  }

  /**
   * 检查订单创建速率限制
   */
  async checkRateLimit(userId) {
    const key = `${REDIS_KEYS.RATE_LIMIT}${userId}`
    const client = redis.getClient()

    const count = await client.get(key)
    const maxOrders = config.payment.maxOrdersPerMinute || 3

    if (count && parseInt(count, 10) >= maxOrders) {
      throw new Error(`Rate limit exceeded: max ${maxOrders} orders per minute`)
    }

    // 增加计数，设置1分钟过期
    const pipeline = client.pipeline()
    pipeline.incr(key)
    pipeline.expire(key, 60)
    await pipeline.exec()

    return true
  }

  /**
   * 创建支付订单
   * @param {string} userId - 用户ID
   * @param {object} options - 订单选项
   * @returns {object} - 订单信息
   */
  async createOrder(userId, options) {
    const { amount, currency = 'CNY', provider, paymentMethod, packageId = null } = options

    // 检查支付是否启用
    if (!this.isEnabled()) {
      throw new Error('Payment is not enabled')
    }

    // 检查速率限制
    await this.checkRateLimit(userId)

    // 验证支付渠道
    const providerService = this.providers[provider]
    if (!providerService || !providerService.isAvailable()) {
      throw new Error(`Payment provider not available: ${provider}`)
    }

    // 获取用户信息
    const user = await userService.getUserById(userId)
    if (!user) {
      throw new Error('User not found')
    }

    // 验证金额
    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error('Invalid amount')
    }

    // 计算美元金额
    let amountUsd = parsedAmount
    let exchangeRate = 1

    if (currency === 'CNY') {
      exchangeRate = config.payment.exchangeRate || 7.2
      amountUsd = parsedAmount / exchangeRate
    }

    // 验证金额限制
    const minAmount = config.payment.minAmount || 1
    const maxAmount = config.payment.maxAmount || 1000

    if (amountUsd < minAmount || amountUsd > maxAmount) {
      throw new Error(`Amount must be between $${minAmount} and $${maxAmount}`)
    }

    // 如果选择了套餐，验证套餐
    let packageInfo = null
    if (packageId) {
      const packages = config.payment.packages || []
      packageInfo = packages.find((p) => p.id === packageId)
      if (!packageInfo) {
        throw new Error(`Invalid package: ${packageId}`)
      }
    }

    // 生成订单ID
    const orderId = this.generateOrderId()
    const expireMinutes = config.payment.orderExpireMinutes || 30

    // 创建订单记录
    const order = {
      id: orderId,
      userId,
      username: user.username,
      amount: parsedAmount,
      currency,
      amountUsd: parseFloat(amountUsd.toFixed(2)),
      exchangeRate,
      packageId: packageInfo?.id || null,
      packageName: packageInfo?.name || null,
      provider,
      paymentMethod,
      tradeNo: null,
      status: 'pending',
      payUrl: null,
      paymentData: null,
      createdAt: new Date().toISOString(),
      paidAt: null,
      expiredAt: new Date(Date.now() + expireMinutes * 60 * 1000).toISOString()
    }

    // 调用支付渠道创建支付
    const paymentResult = await providerService.createOrder(orderId, parsedAmount, paymentMethod, {
      name: packageInfo ? `充值套餐-${packageInfo.name}` : 'AI Token充值',
      currency,
      amountUsd: order.amountUsd,
      userId,
      username: user.username,
      packageId: packageInfo?.id || null,
      exchangeRate
    })

    order.payUrl = paymentResult.payUrl || null
    if (paymentResult.tradeNo) {
      order.tradeNo = paymentResult.tradeNo
    }
    if (paymentResult.paymentData) {
      order.paymentData = paymentResult.paymentData
    }

    // 保存订单
    await this.saveOrder(order)

    logger.info('[PaymentService] Order created', {
      orderId,
      userId,
      amount: parsedAmount,
      currency,
      amountUsd: order.amountUsd,
      provider,
      paymentMethod
    })

    return order
  }

  /**
   * 保存订单到 Redis
   */
  async saveOrder(order) {
    const client = redis.getClient()
    const pipeline = client.pipeline()

    // 保存订单详情
    pipeline.set(`${REDIS_KEYS.ORDER}${order.id}`, JSON.stringify(order))

    // 添加到用户订单列表
    pipeline.lpush(`${REDIS_KEYS.USER_ORDERS}${order.userId}`, order.id)

    // 添加到全局订单列表
    pipeline.lpush(REDIS_KEYS.ALL_ORDERS, order.id)

    // 如果有交易号，添加映射
    if (order.tradeNo) {
      pipeline.set(`${REDIS_KEYS.TRADE_MAP}${order.tradeNo}`, order.id)
    }

    await pipeline.exec()
  }

  /**
   * 获取订单
   */
  async getOrder(orderId) {
    const client = redis.getClient()
    const data = await client.get(`${REDIS_KEYS.ORDER}${orderId}`)

    if (!data) {
      return null
    }

    return JSON.parse(data)
  }

  /**
   * 通过交易号获取订单ID
   */
  async getOrderIdByTradeNo(tradeNo) {
    const client = redis.getClient()
    return await client.get(`${REDIS_KEYS.TRADE_MAP}${tradeNo}`)
  }

  /**
   * 获取用户订单列表
   */
  async getUserOrders(userId, page = 1, pageSize = 10) {
    const client = redis.getClient()
    const key = `${REDIS_KEYS.USER_ORDERS}${userId}`

    const start = (page - 1) * pageSize
    const end = start + pageSize - 1

    // 获取订单ID列表
    const orderIds = await client.lrange(key, start, end)
    const total = await client.llen(key)

    // 获取订单详情
    const orders = []
    for (const orderId of orderIds) {
      const order = await this.getOrder(orderId)
      if (order) {
        orders.push(order)
      }
    }

    return {
      orders,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }
  }

  /**
   * 处理支付回调
   */
  async handleCallback(provider, data) {
    logger.info('[PaymentService] Handling callback', { provider, data })

    // 获取支付渠道服务
    const providerService = this.providers[provider]
    if (!providerService) {
      throw new Error(`Unknown payment provider: ${provider}`)
    }

    // 验证并解析回调
    const callbackResult = await providerService.handleCallback(data)

    if (!callbackResult) {
      logger.warn('[PaymentService] Callback returned no result', { provider })
      return { success: true, message: 'No action taken' }
    }

    if (callbackResult.ignored) {
      logger.info('[PaymentService] Callback ignored', {
        provider,
        reason: callbackResult.reason || 'No reason provided'
      })
      return { success: true, message: callbackResult.reason || 'Ignored' }
    }

    // 获取订单
    const order = await this.getOrder(callbackResult.orderId)
    if (!order) {
      throw new Error(`Order not found: ${callbackResult.orderId}`)
    }

    // 幂等检查：如果订单已支付，直接返回成功
    if (order.status === 'paid') {
      logger.info('[PaymentService] Order already paid, skipping', { orderId: order.id })
      return { success: true, message: 'Already processed', order }
    }

    if (callbackResult.failed) {
      order.status = 'failed'
      order.failReason = callbackResult.reason || 'Payment failed'
      order.failedAt = new Date().toISOString()
      await this.saveOrder(order)
      logger.warn('[PaymentService] Order marked as failed from callback', {
        orderId: order.id,
        provider,
        reason: order.failReason
      })
      return { success: false, failed: true, order }
    }

    // 验证订单状态
    if (order.status !== 'pending') {
      throw new Error(`Invalid order status: ${order.status}`)
    }

    // 验证金额（允许小数误差）
    const callbackAmount =
      typeof callbackResult.amountUsd === 'number'
        ? callbackResult.amountUsd
        : callbackResult.amount
    const expectedAmount =
      typeof callbackResult.amountUsd === 'number' ? order.amountUsd : order.amount

    if (typeof callbackAmount !== 'number' || Number.isNaN(callbackAmount)) {
      throw new Error('Invalid callback amount')
    }

    if (Math.abs(expectedAmount - callbackAmount) > 0.01) {
      throw new Error(`Amount mismatch: expected ${expectedAmount}, got ${callbackAmount}`)
    }

    // 更新订单状态
    order.status = 'paid'
    order.tradeNo = callbackResult.tradeNo
    order.paidAt = new Date().toISOString()

    // 保存订单
    await this.saveOrder(order)

    // 增加用户余额
    try {
      await userService.rechargeBalance(
        order.userId,
        order.amountUsd,
        { id: 'system', name: '在线支付' },
        `${provider}支付 - 订单${order.id}`
      )

      logger.info('[PaymentService] Balance recharged', {
        orderId: order.id,
        userId: order.userId,
        amountUsd: order.amountUsd
      })
    } catch (error) {
      // 余额充值失败，标记订单为失败状态
      logger.error('[PaymentService] Failed to recharge balance', {
        orderId: order.id,
        error: error.message
      })
      order.status = 'failed'
      order.failReason = `Balance recharge failed: ${error.message}`
      await this.saveOrder(order)
      throw error
    }

    return { success: true, order }
  }

  /**
   * 模拟支付回调（仅用于开发测试）
   */
  async simulateCallback(orderId, success = true) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Simulate callback is not allowed in production')
    }

    const order = await this.getOrder(orderId)
    if (!order) {
      throw new Error(`Order not found: ${orderId}`)
    }

    if (order.status !== 'pending') {
      throw new Error(`Order is not pending: ${order.status}`)
    }

    const { provider } = order
    const providerService = this.providers[provider]

    if (!providerService || !providerService.generateTestCallback) {
      throw new Error(`Provider does not support test callback: ${provider}`)
    }

    // 生成模拟回调参数
    const callbackData = providerService.generateTestCallback(
      order.id,
      order.amount,
      order.paymentMethod
    )

    if (!success) {
      callbackData.trade_status = 'TRADE_FAILED'
    }

    // 处理回调
    return await this.handleCallback(provider, callbackData)
  }

  /**
   * 启动过期订单清理任务
   */
  startOrderCleanupTask() {
    // 每5分钟执行一次
    const interval = 5 * 60 * 1000

    setInterval(async () => {
      try {
        await this.cleanupExpiredOrders()
      } catch (error) {
        logger.error('[PaymentService] Order cleanup task failed', { error: error.message })
      }
    }, interval)

    logger.info('[PaymentService] Order cleanup task started')
  }

  /**
   * 清理过期订单
   */
  async cleanupExpiredOrders() {
    const client = redis.getClient()
    const now = new Date()

    // 获取最近的订单（假设最多1000个待处理订单）
    const orderIds = await client.lrange(REDIS_KEYS.ALL_ORDERS, 0, 999)

    let expiredCount = 0

    for (const orderId of orderIds) {
      const order = await this.getOrder(orderId)
      if (!order) {
        continue
      }

      // 只处理 pending 状态的订单
      if (order.status !== 'pending') {
        continue
      }

      // 检查是否过期
      const expiredAt = new Date(order.expiredAt)
      if (now > expiredAt) {
        order.status = 'expired'
        await this.saveOrder(order)
        expiredCount++

        logger.info('[PaymentService] Order marked as expired', { orderId: order.id })
      }
    }

    if (expiredCount > 0) {
      logger.info('[PaymentService] Expired orders cleanup completed', { count: expiredCount })
    }
  }

  /**
   * 获取订单统计
   */
  async getOrderStats(userId = null) {
    const client = redis.getClient()
    let orderIds

    if (userId) {
      orderIds = await client.lrange(`${REDIS_KEYS.USER_ORDERS}${userId}`, 0, -1)
    } else {
      orderIds = await client.lrange(REDIS_KEYS.ALL_ORDERS, 0, -1)
    }

    const stats = {
      total: orderIds.length,
      pending: 0,
      paid: 0,
      expired: 0,
      failed: 0,
      totalAmountUsd: 0
    }

    for (const orderId of orderIds) {
      const order = await this.getOrder(orderId)
      if (!order) {
        continue
      }

      stats[order.status] = (stats[order.status] || 0) + 1

      if (order.status === 'paid') {
        stats.totalAmountUsd += order.amountUsd
      }
    }

    stats.totalAmountUsd = parseFloat(stats.totalAmountUsd.toFixed(2))

    return stats
  }
}

// 导出单例
module.exports = new PaymentService()
