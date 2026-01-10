/**
 * 支付路由
 * 处理支付订单创建、回调、状态查询
 */

const express = require('express')
const router = express.Router()
const paymentService = require('../services/paymentService')
const logger = require('../utils/logger')
const { authenticateUser } = require('../middleware/auth')

/**
 * 获取支付配置
 * GET /payment/config
 * 公开接口，供前端获取支付配置
 */
router.get('/config', async (req, res) => {
  try {
    const config = paymentService.getPaymentConfig()
    res.json({
      success: true,
      data: config
    })
  } catch (error) {
    logger.error('[PaymentRoutes] Error getting payment config:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * 创建支付订单
 * POST /payment/orders
 * 需要用户认证
 */
router.post('/orders', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id
    const {
      amount,
      currency,
      provider,
      paymentMethod,
      packageId,
      displayAmount,
      displayCurrency,
      channelId
    } = req.body

    // 参数验证
    if (!amount || !provider || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: amount, provider, paymentMethod'
      })
    }

    const order = await paymentService.createOrder(userId, {
      amount,
      currency: currency || 'CNY',
      provider,
      paymentMethod,
      packageId,
      displayAmount,
      displayCurrency,
      channelId
    })

    res.json({
      success: true,
      data: {
        orderId: order.id,
        payUrl: order.payUrl,
        paymentData: order.paymentData || null,
        amount: order.amount,
        currency: order.currency,
        amountUsd: order.amountUsd,
        displayAmount: order.displayAmount || order.amountUsd,
        displayCurrency: order.displayCurrency,
        payableAmountCny: order.payableAmountCny || order.amount,
        expiredAt: order.expiredAt,
        provider: order.provider,
        paymentMethod: order.paymentMethod
      }
    })
  } catch (error) {
    logger.error('[PaymentRoutes] Error creating order:', error)
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * 获取订单详情
 * GET /payment/orders/:orderId
 * 需要用户认证
 */
router.get('/orders/:orderId', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id
    const { orderId } = req.params

    const order = await paymentService.getOrder(orderId)

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      })
    }

    // 验证订单属于当前用户
    if (order.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      })
    }

    res.json({
      success: true,
      data: order
    })
  } catch (error) {
    logger.error('[PaymentRoutes] Error getting order:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * 获取用户订单列表
 * GET /payment/orders
 * 需要用户认证
 */
router.get('/orders', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id
    const page = parseInt(req.query.page, 10) || 1
    const pageSize = Math.min(parseInt(req.query.pageSize, 10) || 10, 50)

    const result = await paymentService.getUserOrders(userId, page, pageSize)

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    logger.error('[PaymentRoutes] Error getting user orders:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

const handleZpayWebhook = async (req, res) => {
  try {
    logger.info('[PaymentRoutes] ZPAY webhook received', {
      body: req.body,
      query: req.query,
      method: req.method
    })

    // ZPAY 可能通过 POST body 或 GET query 传递参数
    const data = { ...req.query, ...req.body }

    await paymentService.handleCallback('zpay', data)

    // ZPAY 要求返回 'success' 字符串
    res.send('success')
  } catch (error) {
    logger.error('[PaymentRoutes] ZPAY webhook error:', error)
    // 返回错误状态，ZPAY 会重试
    res.status(400).send('fail')
  }
}

/**
 * ZPAY 支付回调
 * 支持第三方使用 POST / GET 调用 /payment/webhook/zpay
 */
router.post('/webhook/zpay', handleZpayWebhook)
router.get('/webhook/zpay', handleZpayWebhook)

/**
 * Stripe 支付回调
 * 仅支持 POST /payment/webhook/stripe
 */
router.post('/webhook/stripe', async (req, res) => {
  try {
    logger.info('[PaymentRoutes] Stripe webhook received', {
      headers: req.headers,
      bodyKeys: req.body ? Object.keys(req.body) : []
    })

    const signature = req.headers['stripe-signature']

    const result = await paymentService.handleCallback('stripe', {
      rawBody: req.rawBody,
      signature,
      body: req.body,
      headers: req.headers
    })

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    logger.error('[PaymentRoutes] Stripe webhook error:', error)
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * ZPAY 支付同步回调（用户支付后跳转）
 * GET /payment/return/zpay
 * 处理用户支付后的页面跳转
 */
router.get('/return/zpay', async (req, res) => {
  try {
    logger.info('[PaymentRoutes] ZPAY return callback', { query: req.query })

    const { out_trade_no: orderId, trade_status: tradeStatus } = req.query

    // 重定向到用户仪表板的充值页面
    const redirectUrl = `/admin-next/#/user-dashboard?tab=recharge&provider=zpay&order=${encodeURIComponent(
      orderId || ''
    )}&status=${encodeURIComponent(tradeStatus || '')}`
    res.redirect(redirectUrl)
  } catch (error) {
    logger.error('[PaymentRoutes] ZPAY return error:', error)
    res.redirect('/admin-next/#/user-dashboard?tab=recharge&error=callback_failed')
  }
})

/**
 * Stripe 支付同步回调（成功/取消后跳转）
 */
router.get('/return/stripe', async (req, res) => {
  try {
    logger.info('[PaymentRoutes] Stripe return callback', { query: req.query })
    const { order: orderId, status = 'success' } = req.query
    const redirectUrl = `/admin-next/#/user-dashboard?tab=recharge&provider=stripe&order=${encodeURIComponent(
      orderId || ''
    )}&status=${encodeURIComponent(status)}`
    res.redirect(redirectUrl)
  } catch (error) {
    logger.error('[PaymentRoutes] Stripe return error:', error)
    res.redirect('/admin-next/#/user-dashboard?tab=recharge&provider=stripe&error=callback_failed')
  }
})

/**
 * 模拟支付回调（仅开发环境）
 * POST /payment/test/simulate-callback
 * 用于开发测试，模拟支付成功
 */
router.post('/test/simulate-callback', async (req, res) => {
  try {
    // 生产环境禁用
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'This endpoint is disabled in production'
      })
    }

    const { orderId, success = true } = req.body

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Missing orderId'
      })
    }

    logger.info('[PaymentRoutes] Simulating payment callback', { orderId, success })

    const result = await paymentService.simulateCallback(orderId, success)

    res.json({
      success: true,
      data: {
        message: 'Payment callback simulated',
        order: result.order
      }
    })
  } catch (error) {
    logger.error('[PaymentRoutes] Simulate callback error:', error)
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * 获取用户支付统计
 * GET /payment/stats
 * 需要用户认证
 */
router.get('/stats', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id
    const stats = await paymentService.getOrderStats(userId)

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    logger.error('[PaymentRoutes] Error getting stats:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

module.exports = router
