/**
 * 支付 Store
 * 管理支付配置、订单创建和状态查询
 */

import { defineStore } from 'pinia'
import axios from 'axios'
import { API_PREFIX } from '@/config/api'

const PAYMENT_API = `${API_PREFIX}/payment`

export const usePaymentStore = defineStore('payment', {
  state: () => ({
    // 支付配置
    config: null,
    configLoading: false,

    // 当前订单
    currentOrder: null,
    orderLoading: false,

    // 用户订单列表
    orders: [],
    ordersTotal: 0,
    ordersLoading: false,

    // 支付统计
    stats: null
  }),

  getters: {
    // 支付是否启用
    isPaymentEnabled: (state) => state.config?.enabled || false,

    // 可用套餐
    packages: (state) => state.config?.packages || [],

    // 可用支付方式
    paymentMethods: (state) => state.config?.methods || [],

    // 货币配置
    currency: (state) => state.config?.currency || { default: 'CNY', exchangeRate: 7.2 },

    // 金额限制
    limits: (state) => state.config?.limits || { min: 1, max: 1000, allowCustom: true },

    // Stripe 配置
    stripeConfig: (state) =>
      state.config?.stripe || { currency: 'CNY', exchangeRateToCny: 1, minConvertedAmount: 0.5 },

    // 是否允许自定义金额
    allowCustomAmount: (state) => state.config?.limits?.allowCustom !== false
  },

  actions: {
    /**
     * 获取支付配置
     */
    async loadConfig() {
      if (this.config) return this.config

      this.configLoading = true
      try {
        const response = await axios.get(`${PAYMENT_API}/config`)
        if (response.data.success) {
          this.config = response.data.data
          return this.config
        }
        throw new Error(response.data.error || 'Failed to load payment config')
      } catch (error) {
        console.error('[PaymentStore] Failed to load config:', error)
        throw error
      } finally {
        this.configLoading = false
      }
    },

    /**
     * 创建支付订单
     * @param {Object} options - 订单选项
     */
    async createOrder(options) {
      const { amount, currency, provider, paymentMethod, packageId } = options

      this.orderLoading = true
      try {
        const response = await axios.post(`${PAYMENT_API}/orders`, {
          amount,
          currency: currency || 'CNY',
          provider,
          paymentMethod,
          packageId
        })

        if (response.data.success) {
          this.currentOrder = response.data.data
          return response.data.data
        }
        throw new Error(response.data.error || 'Failed to create order')
      } catch (error) {
        console.error('[PaymentStore] Failed to create order:', error)
        throw error
      } finally {
        this.orderLoading = false
      }
    },

    /**
     * 获取订单详情
     * @param {string} orderId - 订单ID
     */
    async getOrder(orderId) {
      try {
        const response = await axios.get(`${PAYMENT_API}/orders/${orderId}`)
        if (response.data.success) {
          return response.data.data
        }
        throw new Error(response.data.error || 'Order not found')
      } catch (error) {
        console.error('[PaymentStore] Failed to get order:', error)
        throw error
      }
    },

    /**
     * 获取用户订单列表
     * @param {number} page - 页码
     * @param {number} pageSize - 每页数量
     */
    async loadOrders(page = 1, pageSize = 10) {
      this.ordersLoading = true
      try {
        const response = await axios.get(`${PAYMENT_API}/orders`, {
          params: { page, pageSize }
        })

        if (response.data.success) {
          this.orders = response.data.data.orders
          this.ordersTotal = response.data.data.total
          return response.data.data
        }
        throw new Error(response.data.error || 'Failed to load orders')
      } catch (error) {
        console.error('[PaymentStore] Failed to load orders:', error)
        throw error
      } finally {
        this.ordersLoading = false
      }
    },

    /**
     * 获取支付统计
     */
    async loadStats() {
      try {
        const response = await axios.get(`${PAYMENT_API}/stats`)
        if (response.data.success) {
          this.stats = response.data.data
          return this.stats
        }
        throw new Error(response.data.error || 'Failed to load stats')
      } catch (error) {
        console.error('[PaymentStore] Failed to load stats:', error)
        throw error
      }
    },

    /**
     * 模拟支付回调（仅开发环境）
     * @param {string} orderId - 订单ID
     * @param {boolean} success - 是否成功
     */
    async simulateCallback(orderId, success = true) {
      try {
        const response = await axios.post(`${PAYMENT_API}/test/simulate-callback`, {
          orderId,
          success
        })

        if (response.data.success) {
          return response.data.data
        }
        throw new Error(response.data.error || 'Failed to simulate callback')
      } catch (error) {
        console.error('[PaymentStore] Failed to simulate callback:', error)
        throw error
      }
    },

    /**
     * 重置当前订单
     */
    clearCurrentOrder() {
      this.currentOrder = null
    },

    /**
     * 刷新配置
     */
    async refreshConfig() {
      this.config = null
      return await this.loadConfig()
    }
  }
})
