/**
 * Stripe 微信支付服务
 * 通过 PaymentIntent + WeChat Pay 实现扫码/JSAPI 支付
 */

const Stripe = require('stripe')
const config = require('../../config/config')
const logger = require('../utils/logger')

const SUPPORTED_WECHAT_CLIENTS = new Set(['wechat_qr', 'wechat_app', 'wechat_h5', 'wechat_jsapi'])

class StripeService {
  constructor() {
    this.settings = config.payment?.stripe || {}
    this.enabled = this.settings.enabled
    this.apiKey = this.settings.apiKey
    this.apiVersion = this.settings.apiVersion || undefined
    this.webhookSecret = this.settings.webhookSecret
    this.paymentMethods =
      Array.isArray(this.settings.paymentMethods) && this.settings.paymentMethods.length > 0
        ? this.settings.paymentMethods
        : ['wechat_pay']
    this.currency = (this.settings.currency || 'cny').toLowerCase()
    this.successUrl = this.settings.successUrl
    this.cancelUrl = this.settings.cancelUrl
    this.wechatConfig = this.settings.wechatPay || {}
    this.wechatClient = SUPPORTED_WECHAT_CLIENTS.has(this.wechatConfig.client)
      ? this.wechatConfig.client
      : 'wechat_qr'
    this.wechatAppId = this.wechatConfig.appId || ''

    if (this.apiKey) {
      const stripeOptions = {}
      if (this.apiVersion) {
        stripeOptions.apiVersion = this.apiVersion
      }
      this.client = new Stripe(this.apiKey, stripeOptions)
      logger.info('[StripeService] Stripe client initialized (WeChat)')
    } else {
      this.client = null
      if (this.enabled) {
        logger.warn('[StripeService] Stripe API key missing, provider unavailable')
      }
    }
  }

  isWechatPayEnabled() {
    return this.paymentMethods.includes('wechat_pay')
  }

  isAvailable() {
    return !!(this.enabled && this.client && this.isWechatPayEnabled())
  }

  getSupportedMethods() {
    if (!this.isAvailable()) {
      return []
    }

    return [
      {
        provider: 'stripe',
        method: 'wechat_pay',
        name: 'Stripe 微信支付',
        icon: 'wechat',
        currency: 'CNY'
      }
    ]
  }

  normalizeAmount(amount) {
    const value = parseFloat(amount)
    if (isNaN(value) || value <= 0) {
      throw new Error('Invalid amount for Stripe payment')
    }
    return value
  }

  ensureCurrencySupported(currency) {
    if ((currency || '').toLowerCase() !== 'cny') {
      throw new Error('Stripe WeChat Pay only supports CNY amounts')
    }
  }

  extractWechatPaymentData(intent) {
    const nextAction = intent.next_action
    if (!nextAction) {
      return null
    }

    if (nextAction.wechat_pay_display_qr_code) {
      return {
        type: 'qr',
        imageUrlPng: nextAction.wechat_pay_display_qr_code.image_url_png,
        imageUrlSvg: nextAction.wechat_pay_display_qr_code.image_url_svg,
        expiresAt: nextAction.wechat_pay_display_qr_code.expires_at || null
      }
    }

    if (nextAction.wechat_pay_redirect_to_url) {
      return {
        type: 'redirect',
        url: nextAction.wechat_pay_redirect_to_url.url,
        expiresAt: nextAction.wechat_pay_redirect_to_url.expires_at || null
      }
    }

    return null
  }

  buildMetadata(orderId, options) {
    return {
      orderId,
      userId: options.userId || '',
      username: options.username || '',
      packageId: options.packageId || '',
      exchangeRate: options.exchangeRate ? String(options.exchangeRate) : '',
      amountUsd: options.amountUsd ? String(options.amountUsd) : ''
    }
  }

  async createOrder(orderId, amount, paymentMethod, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('Stripe service is not available')
    }

    if (paymentMethod !== 'wechat_pay') {
      throw new Error(`Unsupported Stripe payment method: ${paymentMethod}`)
    }

    const currency = (options.currency || this.currency || 'cny').toLowerCase()
    this.ensureCurrencySupported(currency)

    const amountCny = this.normalizeAmount(amount)
    const amountInCents = Math.round(amountCny * 100)

    const metadata = this.buildMetadata(orderId, options)

    const params = {
      amount: amountInCents,
      currency: 'cny',
      payment_method_types: ['wechat_pay'],
      metadata,
      description: options.name || 'AI Token充值',
      confirm: true,
      payment_method_data: {
        type: 'wechat_pay'
      },
      payment_method_options: {
        wechat_pay: {
          client: this.wechatClient
        }
      }
    }

    if (this.wechatClient === 'wechat_app' && this.wechatAppId) {
      params.payment_method_options.wechat_pay.app_id = this.wechatAppId
    }

    if (this.successUrl && ['wechat_h5', 'wechat_jsapi'].includes(this.wechatClient)) {
      params.return_url = this.successUrl.replace('{ORDER_ID}', encodeURIComponent(orderId))
    }

    const intent = await this.client.paymentIntents.create(params)
    const wechatData = this.extractWechatPaymentData(intent)

    if (!wechatData) {
      logger.error('[StripeService] Missing WeChat payment instructions', {
        orderId,
        paymentIntentId: intent.id
      })
      throw new Error('Unable to retrieve WeChat payment instructions')
    }

    logger.info('[StripeService] WeChat PaymentIntent created', {
      orderId,
      paymentIntentId: intent.id,
      client: this.wechatClient
    })

    return {
      provider: 'stripe',
      method: 'wechat_pay',
      tradeNo: intent.id,
      paymentData: {
        type: 'wechat_pay',
        paymentIntentId: intent.id,
        clientSecret: intent.client_secret,
        wechat: wechatData,
        nextActionType: wechatData.type,
        expiresAt: wechatData.expiresAt || null
      }
    }
  }

  parseAmountFromIntent(intent) {
    const rawAmount = intent.amount_received || intent.amount || 0
    const amount = parseFloat((rawAmount / 100).toFixed(2))
    const currency = (intent.currency || 'cny').toUpperCase()
    return { amount, currency }
  }

  resolveAmountUsd(amount, metadata) {
    if (metadata?.amountUsd) {
      const parsed = parseFloat(metadata.amountUsd)
      if (!isNaN(parsed)) {
        return parsed
      }
    }
    if (metadata?.exchangeRate) {
      const rate = parseFloat(metadata.exchangeRate)
      if (!isNaN(rate) && rate > 0) {
        return parseFloat((amount / rate).toFixed(2))
      }
    }
    return undefined
  }

  async handleCallback(payload) {
    if (payload?.testEvent) {
      if (payload.failed) {
        return {
          failed: true,
          orderId: payload.orderId,
          tradeNo: payload.tradeNo,
          reason: payload.reason || 'Test payment failed'
        }
      }
      return {
        orderId: payload.orderId,
        tradeNo: payload.tradeNo || `stripe_test_${Date.now()}`,
        amount: payload.amount,
        amountUsd: payload.amountUsd ?? payload.amount,
        paymentMethod: 'wechat_pay',
        currency: payload.currency || 'CNY'
      }
    }

    if (!this.isAvailable()) {
      throw new Error('Stripe service is not available')
    }
    if (!this.webhookSecret) {
      throw new Error('Stripe webhook secret not configured')
    }
    if (!payload?.rawBody) {
      throw new Error('Stripe webhook missing raw body')
    }
    if (!payload?.signature) {
      throw new Error('Stripe webhook signature header missing')
    }

    let event
    try {
      event = this.client.webhooks.constructEvent(
        payload.rawBody,
        payload.signature,
        this.webhookSecret
      )
    } catch (error) {
      logger.error('[StripeService] Invalid webhook signature', { error: error.message })
      throw new Error('Invalid Stripe signature')
    }

    const intent = event.data?.object
    if (!intent) {
      return { ignored: true, reason: 'Missing event data object' }
    }

    const orderId = intent.metadata?.orderId
    if (!orderId) {
      logger.error('[StripeService] PaymentIntent missing orderId', { eventType: event.type })
      return { ignored: true, reason: 'No orderId metadata' }
    }

    if (event.type === 'payment_intent.succeeded') {
      const { amount, currency } = this.parseAmountFromIntent(intent)
      return {
        orderId,
        tradeNo: intent.id,
        amount,
        amountUsd: this.resolveAmountUsd(amount, intent.metadata),
        paymentMethod: 'wechat_pay',
        currency
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      return {
        failed: true,
        orderId,
        tradeNo: intent.id,
        reason: intent.last_payment_error?.message || 'Stripe payment failed'
      }
    }

    logger.info('[StripeService] Ignoring unsupported Stripe event', { eventType: event.type })
    return { ignored: true, reason: `Unhandled Stripe event: ${event.type}` }
  }

  generateTestCallback(orderId, amount) {
    return {
      testEvent: true,
      orderId,
      amount,
      amountUsd: amount,
      paymentMethod: 'wechat_pay',
      currency: 'CNY',
      tradeNo: `pi_test_${Date.now()}`,
      trade_status: 'TRADE_SUCCESS'
    }
  }
}

module.exports = new StripeService()
