import { defineStore } from 'pinia'
import axios from 'axios'
import { showToast } from '@/utils/toast'
import { API_PREFIX } from '@/config/api'

const API_BASE = `${API_PREFIX}/users`

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    isAuthenticated: false,
    sessionToken: null,
    loading: false,
    config: null,
    referralInfo: null
  }),

  getters: {
    isLoggedIn: (state) => state.isAuthenticated && state.user,
    userName: (state) => state.user?.displayName || state.user?.username,
    userRole: (state) => state.user?.role
  },

  actions: {
    // 🔐 用户登录
    async login(credentials) {
      this.loading = true
      try {
        // 根据认证方式选择不同的登录端点
        const { authType = 'ldap', username, password } = credentials
        const endpoint = authType === 'local' ? `${API_BASE}/login/local` : `${API_BASE}/login/ldap`

        const response = await axios.post(endpoint, {
          username,
          password
        })

        if (response.data.success) {
          this.user = response.data.user
          this.sessionToken = response.data.sessionToken
          this.isAuthenticated = true

          // 保存到 localStorage
          localStorage.setItem('userToken', this.sessionToken)
          localStorage.setItem('userData', JSON.stringify(this.user))

          // 设置 axios 默认头部
          this.setAuthHeader()

          return response.data
        } else {
          throw new Error(response.data.message || 'Login failed')
        }
      } catch (error) {
        this.clearAuth()
        throw error
      } finally {
        this.loading = false
      }
    },

    // 🚪 用户登出
    async logout() {
      try {
        if (this.sessionToken) {
          await axios.post(
            `${API_BASE}/logout`,
            {},
            {
              headers: { 'x-user-token': this.sessionToken }
            }
          )
        }
      } catch (error) {
        console.error('Logout request failed:', error)
      } finally {
        this.clearAuth()
      }
    },

    // 🔄 检查认证状态
    async checkAuth() {
      const token = localStorage.getItem('userToken')
      const userData = localStorage.getItem('userData')
      const userConfig = localStorage.getItem('userConfig')

      if (!token || !userData) {
        this.clearAuth()
        return false
      }

      try {
        this.sessionToken = token
        this.user = JSON.parse(userData)
        this.config = userConfig ? JSON.parse(userConfig) : null
        this.isAuthenticated = true
        this.setAuthHeader()

        // 验证 token 是否仍然有效
        await this.getUserProfile()
        return true
      } catch (error) {
        console.error('Auth check failed:', error)
        this.clearAuth()
        return false
      }
    },

    // 👤 获取用户资料
    async getUserProfile() {
      try {
        const response = await axios.get(`${API_BASE}/profile`)

        if (response.data.success) {
          this.user = response.data.user
          this.config = response.data.config
          localStorage.setItem('userData', JSON.stringify(this.user))
          localStorage.setItem('userConfig', JSON.stringify(this.config))
          return response.data.user
        }
      } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          // 401: Invalid/expired session, 403: Account disabled
          this.clearAuth()
          // If it's a disabled account error, throw a specific error
          if (error.response?.status === 403) {
            throw new Error(error.response.data?.message || 'Your account has been disabled')
          }
        }
        throw error
      }
    },

    // 🔑 获取用户API Keys
    async getUserApiKeys(includeDeleted = false) {
      try {
        const params = {}
        if (includeDeleted) {
          params.includeDeleted = 'true'
        }
        const response = await axios.get(`${API_BASE}/api-keys`, { params })
        return response.data.success ? response.data.apiKeys : []
      } catch (error) {
        console.error('Failed to fetch API keys:', error)
        throw error
      }
    },

    // 🔑 创建API Key
    async createApiKey(keyData) {
      try {
        const response = await axios.post(`${API_BASE}/api-keys`, keyData)
        return response.data
      } catch (error) {
        console.error('Failed to create API key:', error)
        throw error
      }
    },

    // 🗑️ 删除API Key
    async deleteApiKey(keyId) {
      try {
        const response = await axios.delete(`${API_BASE}/api-keys/${keyId}`)
        return response.data
      } catch (error) {
        console.error('Failed to delete API key:', error)
        throw error
      }
    },

    // 📊 获取使用统计
    async getUserUsageStats(params = {}) {
      try {
        const response = await axios.get(`${API_BASE}/usage-stats`, { params })
        return response.data.success ? response.data.stats : null
      } catch (error) {
        console.error('Failed to fetch usage stats:', error)
        throw error
      }
    },

    // 📈 获取使用趋势（用于图表）
    async getUserUsageTrend(params = {}) {
      try {
        const response = await axios.get(`${API_BASE}/usage-trend`, { params })
        return response.data.success ? response.data.trend : []
      } catch (error) {
        console.error('Failed to fetch usage trend:', error)
        throw error
      }
    },

    // 💰 获取用户余额信息
    async getUserBalance() {
      try {
        const response = await axios.get(`${API_BASE}/balance`)
        return response.data.success ? response.data.data : null
      } catch (error) {
        console.error('Failed to fetch balance:', error)
        throw error
      }
    },

    // 💰 获取用户充值记录
    async getRechargeRecords(params = {}) {
      try {
        const response = await axios.get(`${API_BASE}/recharge-records`, { params })
        return response.data.success ? response.data.data : { records: [], total: 0 }
      } catch (error) {
        console.error('Failed to fetch recharge records:', error)
        throw error
      }
    },

    // 🎁 获取邀请返利信息
    async getReferralInfo() {
      try {
        const response = await axios.get(`${API_BASE}/referral`)
        if (response.data.success) {
          this.referralInfo = response.data.data
          return response.data.data
        }
        return null
      } catch (error) {
        if (error.response?.status === 404) {
          return null
        }
        console.error('Failed to fetch referral info:', error)
        throw error
      }
    },

    // 🎁 获取邀请详情列表
    async getReferralInvitees(params = {}) {
      try {
        const response = await axios.get(`${API_BASE}/referral/invitees`, { params })
        return response.data.success ? response.data.data : { records: [], total: 0 }
      } catch (error) {
        if (error.response?.status === 404) {
          return { records: [], total: 0, page: 1, limit: 20, totalPages: 0 }
        }
        console.error('Failed to fetch referral invitees:', error)
        throw error
      }
    },

    // 🧹 清除认证信息
    clearAuth() {
      this.user = null
      this.sessionToken = null
      this.isAuthenticated = false
      this.config = null
      this.referralInfo = null

      localStorage.removeItem('userToken')
      localStorage.removeItem('userData')
      localStorage.removeItem('userConfig')

      // 清除 axios 默认头部
      delete axios.defaults.headers.common['x-user-token']
    },

    // 🔧 设置认证头部
    setAuthHeader() {
      if (this.sessionToken) {
        axios.defaults.headers.common['x-user-token'] = this.sessionToken
      }
    },

    // 🔧 设置axios拦截器
    setupAxiosInterceptors() {
      // Response interceptor to handle disabled user responses globally
      axios.interceptors.response.use(
        (response) => response,
        (error) => {
          if (error.response?.status === 403) {
            const message = error.response.data?.message
            if (message && (message.includes('disabled') || message.includes('Account disabled'))) {
              this.clearAuth()
              showToast(message, 'error')
              // Redirect to login page
              if (window.location.pathname !== '/user-login') {
                window.location.href = '/user-login'
              }
            }
          }
          return Promise.reject(error)
        }
      )
    }
  }
})
