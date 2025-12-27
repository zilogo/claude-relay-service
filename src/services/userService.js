const redis = require('../models/redis')
const crypto = require('crypto')
const bcrypt = require('bcrypt')
const logger = require('../utils/logger')
const config = require('../../config/config')
const NodeCache = require('node-cache')

class UserService {
  constructor() {
    this.userPrefix = 'user:'
    this.usernamePrefix = 'username:'
    this.userSessionPrefix = 'user_session:'
    // 加密相关常量
    this.ENCRYPTION_ALGORITHM = 'aes-256-cbc'
    this.ENCRYPTION_SALT = 'salt'
    this._encryptionKeyCache = null

    // 缓存实例
    // 用户统计缓存: TTL 60秒
    this.userStatsCache = new NodeCache({ stdTTL: 60, checkperiod: 120 })
    // 用户列表缓存: TTL 300秒 (5分钟)
    this.userListCache = new NodeCache({ stdTTL: 300, checkperiod: 600 })

    logger.info('✅ UserService cache initialized (stats: 60s, list: 300s)')
  }

  // 🔑 生成用户ID
  generateUserId() {
    return crypto.randomBytes(16).toString('hex')
  }

  // 🔑 生成会话Token
  generateSessionToken() {
    return crypto.randomBytes(32).toString('hex')
  }

  // 🔑 生成加密密钥
  _generateEncryptionKey() {
    if (!this._encryptionKeyCache) {
      this._encryptionKeyCache = crypto.scryptSync(
        config.security.encryptionKey,
        this.ENCRYPTION_SALT,
        32
      )
    }
    return this._encryptionKeyCache
  }

  // 🔐 哈希密码（使用 bcrypt）
  async _hashPassword(password) {
    if (!password) {
      return ''
    }

    try {
      const saltRounds = 10
      const hashedPassword = await bcrypt.hash(password, saltRounds)
      return hashedPassword
    } catch (error) {
      logger.error('❌ Password hashing error:', error)
      throw error
    }
  }

  // 🔓 解密旧密码（AES 加密，用于向后兼容）
  _decryptLegacyPassword(encryptedPassword) {
    if (!encryptedPassword) {
      return ''
    }

    try {
      // 检查是否是旧格式（包含IV）
      if (encryptedPassword.includes(':')) {
        const parts = encryptedPassword.split(':')
        if (parts.length === 2) {
          const key = this._generateEncryptionKey()
          const iv = Buffer.from(parts[0], 'hex')
          const encrypted = parts[1]

          const decipher = crypto.createDecipheriv(this.ENCRYPTION_ALGORITHM, key, iv)
          let decrypted = decipher.update(encrypted, 'hex', 'utf8')
          decrypted += decipher.final('utf8')

          return decrypted
        }
      }

      // 格式错误
      logger.warn('⚠️ Invalid encrypted password format')
      return ''
    } catch (error) {
      logger.error('❌ Password decryption error:', error)
      return ''
    }
  }

  // 🔍 验证密码（支持 bcrypt 和旧 AES 格式）
  async verifyPassword(password, passwordHash) {
    try {
      // 检查是否是 bcrypt 格式（以 $2b$ 或 $2a$ 开头）
      if (passwordHash.startsWith('$2b$') || passwordHash.startsWith('$2a$')) {
        // 使用 bcrypt 验证
        return await bcrypt.compare(password, passwordHash)
      } else {
        // 尝试使用旧的 AES 解密方式（向后兼容）
        const decryptedPassword = this._decryptLegacyPassword(passwordHash)
        return password === decryptedPassword
      }
    } catch (error) {
      logger.error('❌ Password verification error:', error)
      return false
    }
  }

  // 🔄 检查密码是否为旧格式
  _isLegacyPasswordHash(passwordHash) {
    return passwordHash && !passwordHash.startsWith('$2b$') && !passwordHash.startsWith('$2a$')
  }

  // 👤 创建或更新用户
  async createOrUpdateUser(userData) {
    try {
      const {
        username,
        email,
        displayName,
        firstName,
        lastName,
        role = config.userManagement.defaultUserRole,
        isActive = true
      } = userData

      // 检查用户是否已存在
      let user = await this.getUserByUsername(username)
      const isNewUser = !user

      if (isNewUser) {
        const userId = this.generateUserId()
        user = {
          id: userId,
          username,
          email,
          displayName,
          firstName,
          lastName,
          role,
          isActive,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: null,
          apiKeyCount: 0,
          totalUsage: {
            requests: 0,
            inputTokens: 0,
            outputTokens: 0,
            totalCost: 0
          },
          // 余额相关字段
          balance: 0,
          totalRecharge: 0,
          lastRechargeAt: null
        }
      } else {
        // 更新现有用户信息
        user = {
          ...user,
          email,
          displayName,
          firstName,
          lastName,
          updatedAt: new Date().toISOString()
        }
      }

      // 保存用户信息
      await redis.set(`${this.userPrefix}${user.id}`, JSON.stringify(user))
      await redis.set(`${this.usernamePrefix}${username}`, user.id)

      // 如果是新用户，尝试转移匹配的API Keys
      if (isNewUser) {
        await this.transferMatchingApiKeys(user)
      }

      // 清理缓存
      this.userListCache.flushAll()
      this.userStatsCache.del('user_stats_overview')

      logger.info(`📝 ${isNewUser ? 'Created' : 'Updated'} user: ${username} (${user.id})`)
      return user
    } catch (error) {
      logger.error('❌ Error creating/updating user:', error)
      throw error
    }
  }

  // 👤 通过用户名获取用户
  async getUserByUsername(username) {
    try {
      const userId = await redis.get(`${this.usernamePrefix}${username}`)
      if (!userId) {
        return null
      }

      const userData = await redis.get(`${this.userPrefix}${userId}`)
      return userData ? JSON.parse(userData) : null
    } catch (error) {
      logger.error('❌ Error getting user by username:', error)
      throw error
    }
  }

  // 👤 通过ID获取用户
  async getUserById(userId, calculateUsage = true) {
    try {
      const userData = await redis.get(`${this.userPrefix}${userId}`)
      if (!userData) {
        return null
      }

      const user = JSON.parse(userData)

      // Calculate totalUsage by aggregating user's API keys usage (if requested)
      if (calculateUsage) {
        try {
          const usageStats = await this.calculateUserUsageStats(userId)
          user.totalUsage = usageStats.totalUsage
          user.apiKeyCount = usageStats.apiKeyCount
        } catch (error) {
          logger.error('❌ Error calculating user usage stats:', error)
          // Fallback to stored values if calculation fails
          user.totalUsage = user.totalUsage || {
            requests: 0,
            inputTokens: 0,
            outputTokens: 0,
            totalCost: 0
          }
          user.apiKeyCount = user.apiKeyCount || 0
        }
      }

      return user
    } catch (error) {
      logger.error('❌ Error getting user by ID:', error)
      throw error
    }
  }

  // 📊 计算用户使用统计（通过聚合API Keys）
  async calculateUserUsageStats(userId) {
    try {
      // Use the existing apiKeyService method which already includes usage stats
      const apiKeyService = require('./apiKeyService')
      const userApiKeys = await apiKeyService.getUserApiKeys(userId, true) // Include deleted keys for stats

      const totalUsage = {
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0
      }

      for (const apiKey of userApiKeys) {
        if (apiKey.usage && apiKey.usage.total) {
          totalUsage.requests += apiKey.usage.total.requests || 0
          totalUsage.inputTokens += apiKey.usage.total.inputTokens || 0
          totalUsage.outputTokens += apiKey.usage.total.outputTokens || 0
          totalUsage.totalCost += apiKey.totalCost || 0
        }
      }

      logger.debug(
        `📊 Calculated user ${userId} usage: ${totalUsage.requests} requests, ${totalUsage.inputTokens} input tokens, $${totalUsage.totalCost.toFixed(4)} total cost from ${userApiKeys.length} API keys`
      )

      // Count only non-deleted API keys for the user's active count
      const activeApiKeyCount = userApiKeys.filter((key) => key.isDeleted !== 'true').length

      return {
        totalUsage,
        apiKeyCount: activeApiKeyCount
      }
    } catch (error) {
      logger.error('❌ Error calculating user usage stats:', error)
      return {
        totalUsage: {
          requests: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalCost: 0
        },
        apiKeyCount: 0
      }
    }
  }

  // 📋 获取所有用户列表（管理员功能）
  async getAllUsers(options = {}) {
    try {
      // 生成缓存键（包含过滤条件）
      const cacheKey = `user_list_${JSON.stringify(options)}`
      const cached = this.userListCache.get(cacheKey)

      if (cached) {
        logger.debug('✅ User list cache hit')
        return cached
      }

      logger.debug('⏳ User list cache miss, fetching from Redis...')
      const result = await this._fetchAllUsersInternal(options)
      this.userListCache.set(cacheKey, result)
      return result
    } catch (error) {
      logger.error('❌ Error in getAllUsers:', error)
      throw error
    }
  }

  async _fetchAllUsersInternal(options = {}) {
    try {
      const client = redis.getClientSafe()
      const { page = 1, limit = 20, role, isActive, search, disablePagination = false } = options
      const pageNumber = Number.isInteger(page)
        ? Math.max(page, 1)
        : Math.max(parseInt(page, 10) || 1, 1)
      const limitNumber = Number.isInteger(limit)
        ? Math.max(limit, 1)
        : Math.max(parseInt(limit, 10) || 20, 1)
      const searchQuery = typeof search === 'string' ? search.trim().toLowerCase() : ''
      const pattern = `${this.userPrefix}*`
      const keys = await client.keys(pattern)

      // 第一步：收集所有用户数据（不计算使用统计）
      const users = []
      for (const key of keys) {
        const userData = await client.get(key)
        if (userData) {
          const user = JSON.parse(userData)

          // 应用过滤条件
          if (role && user.role !== role) {
            continue
          }
          if (typeof isActive === 'boolean' && user.isActive !== isActive) {
            continue
          }

          users.push(user)
        }
      }

      // 第二步：✅ 并发计算所有用户的使用统计（最多10个并发）
      const pLimit = require('p-limit')
      const limit = pLimit(10)

      const usagePromises = users.map((user) =>
        limit(async () => {
          try {
            const usageStats = await this.calculateUserUsageStats(user.id)
            user.totalUsage = usageStats.totalUsage
            user.apiKeyCount = usageStats.apiKeyCount
          } catch (error) {
            logger.error(`❌ Error calculating usage for user ${user.id}:`, error)
            // Fallback to stored values
            user.totalUsage = user.totalUsage || {
              requests: 0,
              inputTokens: 0,
              outputTokens: 0,
              totalCost: 0
            }
            user.apiKeyCount = user.apiKeyCount || 0
          }

          // Normalize balance-related fields for the user list response
          const balance = parseFloat(user.balance) || 0
          const totalRecharge = parseFloat(user.totalRecharge) || 0
          const totalCost = user.totalUsage?.totalCost || 0

          user.balance = balance
          user.totalRecharge = totalRecharge
          user.availableBalance = balance - totalCost
          user.lastRechargeAt = user.lastRechargeAt || null

          return user
        })
      )

      await Promise.all(usagePromises)

      let filteredUsers = users
      if (searchQuery) {
        filteredUsers = users.filter((user) => {
          const username = (user.username || '').toLowerCase()
          const displayName = (user.displayName || '').toLowerCase()
          const email = (user.email || '').toLowerCase()

          return (
            username.includes(searchQuery) ||
            displayName.includes(searchQuery) ||
            email.includes(searchQuery)
          )
        })
      }

      // 排序和分页
      filteredUsers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      let paginatedUsers
      if (disablePagination) {
        paginatedUsers = filteredUsers
      } else {
        const startIndex = (pageNumber - 1) * limitNumber
        const endIndex = startIndex + limitNumber
        paginatedUsers = filteredUsers.slice(startIndex, endIndex)
      }
      const total = filteredUsers.length
      const totalPages = total === 0 ? 0 : Math.ceil(total / limitNumber)

      return {
        users: paginatedUsers,
        total,
        page: disablePagination ? 1 : pageNumber,
        limit: disablePagination ? paginatedUsers.length || 0 : limitNumber,
        totalPages: disablePagination ? (total === 0 ? 0 : 1) : totalPages
      }
    } catch (error) {
      logger.error('❌ Error getting all users:', error)
      throw error
    }
  }

  // 🔄 更新用户状态
  async updateUserStatus(userId, isActive) {
    try {
      const user = await this.getUserById(userId, false) // Skip usage calculation
      if (!user) {
        throw new Error('User not found')
      }

      user.isActive = isActive
      user.updatedAt = new Date().toISOString()

      await redis.set(`${this.userPrefix}${userId}`, JSON.stringify(user))
      logger.info(`🔄 Updated user status: ${user.username} -> ${isActive ? 'active' : 'disabled'}`)

      // 如果禁用用户，删除所有会话并禁用其所有API Keys
      if (!isActive) {
        await this.invalidateUserSessions(userId)

        // Disable all user's API keys when user is disabled
        try {
          const apiKeyService = require('./apiKeyService')
          const result = await apiKeyService.disableUserApiKeys(userId)
          logger.info(`🔑 Disabled ${result.count} API keys for disabled user: ${user.username}`)
        } catch (error) {
          logger.error('❌ Error disabling user API keys during user disable:', error)
        }
      }

      // 清理缓存
      this.userListCache.flushAll()
      this.userStatsCache.del('user_stats_overview')

      return user
    } catch (error) {
      logger.error('❌ Error updating user status:', error)
      throw error
    }
  }

  // 🔄 更新用户角色
  async updateUserRole(userId, role) {
    try {
      const user = await this.getUserById(userId, false) // Skip usage calculation
      if (!user) {
        throw new Error('User not found')
      }

      user.role = role
      user.updatedAt = new Date().toISOString()

      await redis.set(`${this.userPrefix}${userId}`, JSON.stringify(user))
      logger.info(`🔄 Updated user role: ${user.username} -> ${role}`)

      // 清理缓存
      this.userListCache.flushAll()
      this.userStatsCache.del('user_stats_overview')

      return user
    } catch (error) {
      logger.error('❌ Error updating user role:', error)
      throw error
    }
  }

  // 📊 更新用户API Key数量 (已废弃，现在通过聚合计算)
  async updateUserApiKeyCount(userId, _count) {
    // This method is deprecated since apiKeyCount is now calculated dynamically
    // in getUserById by aggregating the user's API keys
    logger.debug(
      `📊 updateUserApiKeyCount called for ${userId} but is now deprecated (count auto-calculated)`
    )
  }

  // 📝 记录用户登录
  async recordUserLogin(userId) {
    try {
      const user = await this.getUserById(userId, false) // Skip usage calculation
      if (!user) {
        return
      }

      user.lastLoginAt = new Date().toISOString()
      await redis.set(`${this.userPrefix}${userId}`, JSON.stringify(user))
    } catch (error) {
      logger.error('❌ Error recording user login:', error)
    }
  }

  // 🎫 创建用户会话
  async createUserSession(userId, sessionData = {}) {
    try {
      const sessionToken = this.generateSessionToken()
      const session = {
        token: sessionToken,
        userId,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + config.userManagement.userSessionTimeout).toISOString(),
        ...sessionData
      }

      const ttl = Math.floor(config.userManagement.userSessionTimeout / 1000)
      await redis.setex(`${this.userSessionPrefix}${sessionToken}`, ttl, JSON.stringify(session))

      logger.info(`🎫 Created session for user: ${userId}`)
      return sessionToken
    } catch (error) {
      logger.error('❌ Error creating user session:', error)
      throw error
    }
  }

  // 🎫 验证用户会话
  async validateUserSession(sessionToken) {
    try {
      const sessionData = await redis.get(`${this.userSessionPrefix}${sessionToken}`)
      if (!sessionData) {
        return null
      }

      const session = JSON.parse(sessionData)

      // 检查会话是否过期
      if (new Date() > new Date(session.expiresAt)) {
        await this.invalidateUserSession(sessionToken)
        return null
      }

      // 获取用户信息
      const user = await this.getUserById(session.userId, false) // Skip usage calculation for validation
      if (!user || !user.isActive) {
        await this.invalidateUserSession(sessionToken)
        return null
      }

      return { session, user }
    } catch (error) {
      logger.error('❌ Error validating user session:', error)
      return null
    }
  }

  // 🚫 使用户会话失效
  async invalidateUserSession(sessionToken) {
    try {
      await redis.del(`${this.userSessionPrefix}${sessionToken}`)
      logger.info(`🚫 Invalidated session: ${sessionToken}`)
    } catch (error) {
      logger.error('❌ Error invalidating user session:', error)
    }
  }

  // 🚫 使用户所有会话失效
  async invalidateUserSessions(userId) {
    try {
      const client = redis.getClientSafe()
      const pattern = `${this.userSessionPrefix}*`
      const keys = await client.keys(pattern)

      for (const key of keys) {
        const sessionData = await client.get(key)
        if (sessionData) {
          const session = JSON.parse(sessionData)
          if (session.userId === userId) {
            await client.del(key)
          }
        }
      }

      logger.info(`🚫 Invalidated all sessions for user: ${userId}`)
    } catch (error) {
      logger.error('❌ Error invalidating user sessions:', error)
    }
  }

  // 🗑️ 删除用户（软删除，标记为不活跃）
  async deleteUser(userId) {
    try {
      const user = await this.getUserById(userId, false) // Skip usage calculation
      if (!user) {
        throw new Error('User not found')
      }

      // 软删除：标记为不活跃并添加删除时间戳
      user.isActive = false
      user.deletedAt = new Date().toISOString()
      user.updatedAt = new Date().toISOString()

      await redis.set(`${this.userPrefix}${userId}`, JSON.stringify(user))

      // 删除所有会话
      await this.invalidateUserSessions(userId)

      // Disable all user's API keys when user is deleted
      try {
        const apiKeyService = require('./apiKeyService')
        const result = await apiKeyService.disableUserApiKeys(userId)
        logger.info(`🔑 Disabled ${result.count} API keys for deleted user: ${user.username}`)
      } catch (error) {
        logger.error('❌ Error disabling user API keys during user deletion:', error)
      }

      // 清理缓存
      this.userListCache.flushAll()
      this.userStatsCache.del('user_stats_overview')

      logger.info(`🗑️ Soft deleted user: ${user.username} (${userId})`)
      return user
    } catch (error) {
      logger.error('❌ Error deleting user:', error)
      throw error
    }
  }

  // 📊 获取用户统计信息
  async getUserStats() {
    try {
      const cacheKey = 'user_stats_overview'
      const cached = this.userStatsCache.get(cacheKey)

      if (cached) {
        logger.debug('✅ User stats cache hit')
        return cached
      }

      logger.debug('⏳ User stats cache miss, calculating...')
      const stats = await this._calculateUserStatsInternal()
      this.userStatsCache.set(cacheKey, stats)
      return stats
    } catch (error) {
      logger.error('❌ Error in getUserStats:', error)
      throw error
    }
  }

  async _calculateUserStatsInternal() {
    try {
      const client = redis.getClientSafe()
      const pattern = `${this.userPrefix}*`
      const keys = await client.keys(pattern)

      const stats = {
        totalUsers: 0,
        activeUsers: 0,
        adminUsers: 0,
        regularUsers: 0,
        totalApiKeys: 0,
        totalUsage: {
          requests: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalCost: 0
        }
      }

      // ✅ 并发计算所有用户统计（最多10个并发）
      const pLimit = require('p-limit')
      const limit = pLimit(10)

      const statsPromises = []

      for (const key of keys) {
        statsPromises.push(
          limit(async () => {
            const userData = await client.get(key)
            if (!userData) return null

            const user = JSON.parse(userData)
            const usageStats = await this.calculateUserUsageStats(user.id).catch((error) => {
              logger.error(`❌ Error calculating usage for user ${user.id} in stats:`, error)
              // Fallback to stored values
              return {
                apiKeyCount: user.apiKeyCount || 0,
                totalUsage: {
                  requests: user.totalUsage?.requests || 0,
                  inputTokens: user.totalUsage?.inputTokens || 0,
                  outputTokens: user.totalUsage?.outputTokens || 0,
                  totalCost: user.totalUsage?.totalCost || 0
                }
              }
            })

            return { user, usageStats }
          })
        )
      }

      const results = await Promise.all(statsPromises)

      // 聚合统计结果
      for (const result of results) {
        if (!result) continue
        const { user, usageStats } = result

        stats.totalUsers++

        if (user.isActive) {
          stats.activeUsers++
        }

        if (user.role === 'admin') {
          stats.adminUsers++
        } else {
          stats.regularUsers++
        }

        stats.totalApiKeys += usageStats.apiKeyCount
        stats.totalUsage.requests += usageStats.totalUsage.requests
        stats.totalUsage.inputTokens += usageStats.totalUsage.inputTokens
        stats.totalUsage.outputTokens += usageStats.totalUsage.outputTokens
        stats.totalUsage.totalCost += usageStats.totalUsage.totalCost
      }

      return stats
    } catch (error) {
      logger.error('❌ Error getting user stats:', error)
      throw error
    }
  }

  // 🔄 转移匹配的API Keys给新用户
  async transferMatchingApiKeys(user) {
    try {
      const apiKeyService = require('./apiKeyService')
      const { displayName, username, email } = user

      // 获取所有API Keys
      const allApiKeys = await apiKeyService.getAllApiKeys()

      // 找到没有用户ID的API Keys（即由Admin创建的）
      const unownedApiKeys = allApiKeys.filter((key) => !key.userId || key.userId === '')

      if (unownedApiKeys.length === 0) {
        logger.debug(`📝 No unowned API keys found for potential transfer to user: ${username}`)
        return
      }

      // 构建匹配字符串数组（只考虑displayName、username、email，去除空值和重复值）
      const matchStrings = new Set()
      if (displayName) {
        matchStrings.add(displayName.toLowerCase().trim())
      }
      if (username) {
        matchStrings.add(username.toLowerCase().trim())
      }
      if (email) {
        matchStrings.add(email.toLowerCase().trim())
      }

      const matchingKeys = []

      // 查找名称匹配的API Keys（只进行完全匹配）
      for (const apiKey of unownedApiKeys) {
        const keyName = apiKey.name ? apiKey.name.toLowerCase().trim() : ''

        // 检查API Key名称是否与用户信息完全匹配
        for (const matchString of matchStrings) {
          if (keyName === matchString) {
            matchingKeys.push(apiKey)
            break // 找到匹配后跳出内层循环
          }
        }
      }

      // 转移匹配的API Keys
      let transferredCount = 0
      for (const apiKey of matchingKeys) {
        try {
          await apiKeyService.updateApiKey(apiKey.id, {
            userId: user.id,
            userUsername: user.username,
            createdBy: user.username
          })

          transferredCount++
          logger.info(`🔄 Transferred API key "${apiKey.name}" (${apiKey.id}) to user: ${username}`)
        } catch (error) {
          logger.error(`❌ Failed to transfer API key ${apiKey.id} to user ${username}:`, error)
        }
      }

      if (transferredCount > 0) {
        logger.success(
          `🎉 Successfully transferred ${transferredCount} API key(s) to new user: ${username} (${displayName})`
        )
      } else if (matchingKeys.length === 0) {
        logger.debug(`📝 No matching API keys found for user: ${username} (${displayName})`)
      }
    } catch (error) {
      logger.error('❌ Error transferring matching API keys:', error)
      // Don't throw error to prevent blocking user creation
    }
  }

  // 📝 本地用户注册
  async registerLocalUser(userData) {
    try {
      const { username, email, password, displayName, firstName, lastName } = userData

      // 检查本地认证是否启用
      if (!config.localAuth.enabled) {
        throw new Error('Local authentication is not enabled')
      }

      // 检查是否允许自助注册
      if (!config.localAuth.allowSelfRegistration) {
        throw new Error('Self-registration is not allowed')
      }

      // 检查用户是否已存在
      const existingUser = await this.getUserByUsername(username)
      if (existingUser) {
        throw new Error('Username already exists')
      }

      // 验证密码长度
      if (
        password.length < config.localAuth.passwordMinLength ||
        password.length > config.localAuth.passwordMaxLength
      ) {
        throw new Error(
          `Password must be between ${config.localAuth.passwordMinLength} and ${config.localAuth.passwordMaxLength} characters`
        )
      }

      // 使用 bcrypt 哈希密码
      const hashedPassword = await this._hashPassword(password)

      // 创建用户ID
      const userId = this.generateUserId()

      // 创建用户对象
      const user = {
        id: userId,
        username,
        email,
        displayName: displayName || username,
        firstName: firstName || '',
        lastName: lastName || '',
        role: config.userManagement.defaultUserRole,
        isActive: true,
        authType: 'local', // 标记为本地认证用户
        passwordHash: hashedPassword,
        passwordChangedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: null,
        apiKeyCount: 0,
        totalUsage: {
          requests: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalCost: 0
        },
        // 余额相关字段
        balance: 0,
        totalRecharge: 0,
        lastRechargeAt: null
      }

      // 保存用户信息
      await redis.set(`${this.userPrefix}${user.id}`, JSON.stringify(user))
      await redis.set(`${this.usernamePrefix}${username}`, user.id)

      // 尝试转移匹配的API Keys
      await this.transferMatchingApiKeys(user)

      // 清理缓存
      this.userListCache.flushAll()
      this.userStatsCache.del('user_stats_overview')

      logger.info(`📝 Registered local user: ${username} (${user.id})`)

      // 🎁 新用户注册赠送测试金
      if (config.signupBonus && config.signupBonus.enabled) {
        try {
          const bonusAmount = parseFloat(config.signupBonus.amountUsd) || 2.0
          const bonusRemark = config.signupBonus.remark || '新用户注册测试金'

          await this.rechargeBalance(
            user.id,
            bonusAmount,
            { id: 'system', name: 'signup-bonus' },
            bonusRemark,
            {
              recordType: 'manual', // 使用手动充值类型
              source: 'signup_bonus',
              countTowardTotalRecharge: true, // 计入总充值
              updateLastRecharge: true, // 更新最后充值时间
              skipReferralProcessing: true, // 跳过邀请返利处理
              metadata: {
                reason: 'new_user_signup',
                autoGranted: true
              }
            }
          )

          logger.info(
            `🎁 Granted signup bonus $${bonusAmount} to new user: ${username} (${user.id})`
          )
        } catch (bonusError) {
          logger.error(
            `❌ Failed to grant signup bonus to user ${username} (${user.id}):`,
            bonusError
          )
          // 不抛出错误，允许用户注册继续
        }
      }

      // 返回用户信息（不包含密码哈希）
      const { passwordHash: _passwordHash, ...userWithoutPassword } = user
      return userWithoutPassword
    } catch (error) {
      logger.error('❌ Error registering local user:', error)
      throw error
    }
  }

  // 🔐 本地用户认证
  async authenticateLocalUser(username, password) {
    try {
      // 检查本地认证是否启用
      if (!config.localAuth.enabled) {
        throw new Error('Local authentication is not enabled')
      }

      // 获取用户
      const user = await this.getUserByUsername(username)
      if (!user) {
        throw new Error('Invalid username or password')
      }

      // 检查是否是本地用户
      if (user.authType !== 'local') {
        throw new Error('This user cannot use local authentication')
      }

      // 检查用户是否被禁用
      if (!user.isActive) {
        throw new Error('User account is disabled')
      }

      // 验证密码
      const isValid = await this.verifyPassword(password, user.passwordHash)
      if (!isValid) {
        throw new Error('Invalid username or password')
      }

      // 🔄 自动迁移旧密码格式到 bcrypt
      if (this._isLegacyPasswordHash(user.passwordHash)) {
        logger.info(`🔄 Migrating password to bcrypt for user: ${username}`)
        const newPasswordHash = await this._hashPassword(password)
        user.passwordHash = newPasswordHash
        user.passwordChangedAt = new Date().toISOString()
        await redis.set(`${this.userPrefix}${user.id}`, JSON.stringify(user))
        logger.info(`✅ Password migrated successfully for user: ${username}`)
      }

      // 更新最后登录时间
      await this.recordUserLogin(user.id)

      // 创建会话
      const sessionToken = await this.createUserSession(user.id)

      logger.info(`🔐 Local user authenticated: ${username} (${user.id})`)

      // 返回用户信息（不包含密码哈希）
      const { passwordHash: _passwordHash, ...userWithoutPassword } = user
      return {
        user: userWithoutPassword,
        sessionToken
      }
    } catch (error) {
      logger.error('❌ Error authenticating local user:', error)
      throw error
    }
  }

  // 🔄 修改用户密码
  async updateUserPassword(userId, oldPassword, newPassword) {
    try {
      // 获取用户
      const user = await this.getUserById(userId, false)
      if (!user) {
        throw new Error('User not found')
      }

      // 检查是否是本地用户
      if (user.authType !== 'local') {
        throw new Error('Only local users can change their password')
      }

      // 验证旧密码
      const isValid = await this.verifyPassword(oldPassword, user.passwordHash)
      if (!isValid) {
        throw new Error('Current password is incorrect')
      }

      // 验证新密码长度
      if (
        newPassword.length < config.localAuth.passwordMinLength ||
        newPassword.length > config.localAuth.passwordMaxLength
      ) {
        throw new Error(
          `Password must be between ${config.localAuth.passwordMinLength} and ${config.localAuth.passwordMaxLength} characters`
        )
      }

      // 使用 bcrypt 哈希新密码
      const hashedPassword = await this._hashPassword(newPassword)

      // 更新用户密码
      user.passwordHash = hashedPassword
      user.passwordChangedAt = new Date().toISOString()
      user.updatedAt = new Date().toISOString()

      // 保存用户信息
      await redis.set(`${this.userPrefix}${userId}`, JSON.stringify(user))

      logger.info(`🔄 User password updated: ${user.username} (${userId})`)

      return true
    } catch (error) {
      logger.error('❌ Error updating user password:', error)
      throw error
    }
  }

  // 🔓 重置用户密码（管理员功能）
  async resetUserPassword(userId, newPassword) {
    try {
      // 获取用户
      const user = await this.getUserById(userId, false)
      if (!user) {
        throw new Error('User not found')
      }

      // 检查是否是本地用户
      if (user.authType !== 'local') {
        throw new Error('Only local users can have their password reset')
      }

      // 验证新密码长度
      if (
        newPassword.length < config.localAuth.passwordMinLength ||
        newPassword.length > config.localAuth.passwordMaxLength
      ) {
        throw new Error(
          `Password must be between ${config.localAuth.passwordMinLength} and ${config.localAuth.passwordMaxLength} characters`
        )
      }

      // 使用 bcrypt 哈希新密码
      const hashedPassword = await this._hashPassword(newPassword)

      // 更新用户密码
      user.passwordHash = hashedPassword
      user.passwordChangedAt = new Date().toISOString()
      user.updatedAt = new Date().toISOString()

      // 保存用户信息
      await redis.set(`${this.userPrefix}${userId}`, JSON.stringify(user))

      logger.info(`🔓 User password reset by admin: ${user.username} (${userId})`)

      return true
    } catch (error) {
      logger.error('❌ Error resetting user password:', error)
      throw error
    }
  }

  // 📧 生成密码重置Token
  async generatePasswordResetToken(email) {
    try {
      // 检查邮件服务是否可用
      if (!config.email?.enabled || !config.email?.features?.allowPasswordReset) {
        throw new Error('Password reset feature is not enabled')
      }

      // 根据邮箱查找用户
      const client = redis.getClientSafe()
      const pattern = `${this.userPrefix}*`
      const keys = await client.keys(pattern)

      let user = null
      for (const key of keys) {
        const userData = await client.get(key)
        if (userData) {
          const u = JSON.parse(userData)
          if (u.email === email && u.authType === 'local') {
            user = u
            break
          }
        }
      }

      if (!user) {
        // 用户不存在，抛出明确错误（根据用户需求：完全透明）
        logger.warn(`⚠️ Password reset requested for non-existent email: ${email}`)
        throw new Error('该邮箱未注册或不是本地账户')
      }

      // 检查速率限制（防止滥用）
      const rateLimitKey = `password_reset_rate:${email}`
      const resetAttempts = await redis.get(rateLimitKey)
      if (resetAttempts && parseInt(resetAttempts) >= config.email.rateLimit.max) {
        throw new Error('Too many password reset attempts. Please try again later.')
      }

      // 生成重置Token（32字节随机字符串）
      const resetToken = crypto.randomBytes(32).toString('hex')
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')

      // 保存重置Token（使用哈希存储）
      const resetTokenData = {
        userId: user.id,
        email: user.email,
        tokenHash: resetTokenHash,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + config.email.tokenTTL.passwordReset * 1000).toISOString()
      }

      const ttl = config.email.tokenTTL.passwordReset
      await redis.setex(
        `password_reset_token:${resetTokenHash}`,
        ttl,
        JSON.stringify(resetTokenData)
      )

      // 记录速率限制
      const rateLimitTtl = config.email.rateLimit.window
      await redis.getClient().incr(rateLimitKey)
      await redis.getClient().expire(rateLimitKey, rateLimitTtl)

      // 发送重置邮件
      const emailService = require('./emailService')
      try {
        await emailService.sendPasswordResetEmail(email, resetToken, user.username)
        logger.info(`📧 Password reset token generated and email sent for: ${email}`)
      } catch (emailError) {
        logger.error('❌ Failed to send password reset email:', emailError)
        // 重新抛出包含明确信息的错误
        throw new Error(`邮件发送失败：${emailError.message}`)
      }

      return {
        success: true,
        message: 'Password reset email sent successfully',
        resetToken // 仅用于开发/测试，生产环境应移除
      }
    } catch (error) {
      logger.error('❌ Error generating password reset token:', error)
      throw error
    }
  }

  // 🔓 使用Token重置密码
  async resetPasswordWithToken(resetToken, newPassword) {
    try {
      // 验证新密码长度
      if (
        newPassword.length < config.localAuth.passwordMinLength ||
        newPassword.length > config.localAuth.passwordMaxLength
      ) {
        throw new Error(
          `Password must be between ${config.localAuth.passwordMinLength} and ${config.localAuth.passwordMaxLength} characters`
        )
      }

      // 哈希Token进行查找
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')
      const tokenData = await redis.get(`password_reset_token:${resetTokenHash}`)

      if (!tokenData) {
        throw new Error('Invalid or expired reset token')
      }

      const tokenInfo = JSON.parse(tokenData)

      // 检查Token是否过期
      if (new Date() > new Date(tokenInfo.expiresAt)) {
        await redis.del(`password_reset_token:${resetTokenHash}`)
        throw new Error('Reset token has expired')
      }

      // 获取用户
      const user = await this.getUserById(tokenInfo.userId, false)
      if (!user) {
        throw new Error('User not found')
      }

      // 检查是否是本地用户
      if (user.authType !== 'local') {
        throw new Error('Only local users can reset their password')
      }

      // 使用 bcrypt 哈希新密码
      const hashedPassword = await this._hashPassword(newPassword)

      // 更新用户密码
      user.passwordHash = hashedPassword
      user.passwordChangedAt = new Date().toISOString()
      user.updatedAt = new Date().toISOString()

      // 保存用户信息
      await redis.set(`${this.userPrefix}${user.id}`, JSON.stringify(user))

      // 删除已使用的重置Token
      await redis.del(`password_reset_token:${resetTokenHash}`)

      // 使所有会话失效（强制重新登录）
      await this.invalidateUserSessions(user.id)

      logger.info(`🔓 Password reset successfully for user: ${user.username} (${user.id})`)

      return {
        success: true,
        message: 'Password reset successfully'
      }
    } catch (error) {
      logger.error('❌ Error resetting password with token:', error)
      throw error
    }
  }

  // 📧 生成邮箱验证Token
  async generateEmailVerificationToken(userId) {
    try {
      // 检查邮件服务是否可用
      if (!config.email?.enabled || !config.email?.features?.requireEmailVerification) {
        logger.warn('Email verification is not enabled, skipping token generation')
        return { success: true, skipped: true }
      }

      // 获取用户
      const user = await this.getUserById(userId, false)
      if (!user) {
        throw new Error('User not found')
      }

      // 检查用户邮箱是否已验证
      if (user.emailVerified) {
        return { success: true, message: 'Email already verified' }
      }

      // 检查速率限制
      const rateLimitKey = `email_verification_rate:${user.email}`
      const verificationAttempts = await redis.get(rateLimitKey)
      if (verificationAttempts && parseInt(verificationAttempts) >= config.email.rateLimit.max) {
        throw new Error('Too many verification emails sent. Please try again later.')
      }

      // 生成验证Token（32字节随机字符串）
      const verificationToken = crypto.randomBytes(32).toString('hex')
      const verificationTokenHash = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex')

      // 保存验证Token（使用哈希存储）
      const verificationTokenData = {
        userId: user.id,
        email: user.email,
        tokenHash: verificationTokenHash,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(
          Date.now() + config.email.tokenTTL.emailVerification * 1000
        ).toISOString()
      }

      const ttl = config.email.tokenTTL.emailVerification
      await redis.setex(
        `email_verification_token:${verificationTokenHash}`,
        ttl,
        JSON.stringify(verificationTokenData)
      )

      // 记录速率限制
      const rateLimitTtl = config.email.rateLimit.window
      await redis.getClient().incr(rateLimitKey)
      await redis.getClient().expire(rateLimitKey, rateLimitTtl)

      // 发送验证邮件
      const emailService = require('./emailService')
      await emailService.sendEmailVerificationEmail(user.email, verificationToken, user.username)

      logger.info(`📧 Email verification token generated for: ${user.email}`)

      return {
        success: true,
        message: 'Verification email sent successfully',
        verificationToken // 仅用于开发/测试，生产环境应移除
      }
    } catch (error) {
      logger.error('❌ Error generating email verification token:', error)
      throw error
    }
  }

  // ✅ 验证邮箱
  async verifyEmail(verificationToken) {
    try {
      // 哈希Token进行查找
      const verificationTokenHash = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex')
      const tokenData = await redis.get(`email_verification_token:${verificationTokenHash}`)

      if (!tokenData) {
        throw new Error('Invalid or expired verification token')
      }

      const tokenInfo = JSON.parse(tokenData)

      // 检查Token是否过期
      if (new Date() > new Date(tokenInfo.expiresAt)) {
        await redis.del(`email_verification_token:${verificationTokenHash}`)
        throw new Error('Verification token has expired')
      }

      // 获取用户
      const user = await this.getUserById(tokenInfo.userId, false)
      if (!user) {
        throw new Error('User not found')
      }

      // 更新用户邮箱验证状态
      user.emailVerified = true
      user.emailVerifiedAt = new Date().toISOString()
      user.updatedAt = new Date().toISOString()

      // 保存用户信息
      await redis.set(`${this.userPrefix}${user.id}`, JSON.stringify(user))

      // 删除已使用的验证Token
      await redis.del(`email_verification_token:${verificationTokenHash}`)

      logger.info(`✅ Email verified successfully for user: ${user.username} (${user.id})`)

      return {
        success: true,
        message: 'Email verified successfully',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          emailVerified: user.emailVerified
        }
      }
    } catch (error) {
      logger.error('❌ Error verifying email:', error)
      throw error
    }
  }

  // 🔄 重新发送验证邮件
  async resendVerificationEmail(userId) {
    try {
      // 直接调用生成验证Token的方法（包含速率限制）
      return await this.generateEmailVerificationToken(userId)
    } catch (error) {
      logger.error('❌ Error resending verification email:', error)
      throw error
    }
  }

  // ============================================
  // 💰 余额管理相关方法
  // ============================================

  async _sumRechargeByTypes(userId, types = []) {
    try {
      if (!Array.isArray(types) || types.length === 0) {
        return 0
      }

      const client = redis.getClientSafe()
      // 获取用户充值记录ID列表
      const recordIds = await client.lrange(`user_recharge_records:${userId}`, 0, -1)

      if (!recordIds || recordIds.length === 0) {
        return 0
      }

      let total = 0
      for (const recordId of recordIds) {
        const recordData = await client.get(`recharge_record:${recordId}`)
        if (recordData) {
          const record = JSON.parse(recordData)
          const recordType = (record.type || '').toLowerCase()
          const amount = parseFloat(record.amount) || 0
          if (amount > 0 && types.includes(recordType)) {
            total += amount
          }
        }
      }

      return total
    } catch (error) {
      logger.error('❌ Error getting recharge total:', error)
      return 0
    }
  }

  /**
   * 获取用户手动充值的累计额度（包含活动增额）
   * @param {string} userId - 用户ID
   * @returns {number} 手动充值累计额度
   */
  async getManualRechargeTotal(userId) {
    return this._sumRechargeByTypes(userId, ['manual', 'promotion'])
  }

  /**
   * 获取用户余额信息
   * @param {string} userId - 用户ID
   * @returns {object} 余额信息
   */
  async getBalanceInfo(userId) {
    try {
      const user = await this.getUserById(userId, true) // 需要计算 totalCost
      if (!user) {
        throw new Error('User not found')
      }

      const balance = parseFloat(user.balance) || 0
      const totalRecharge = parseFloat(user.totalRecharge) || 0
      const totalCost = user.totalUsage?.totalCost || 0
      const availableBalance = balance - totalCost

      // 获取手动充值累计额度（活动增额）
      const manualRechargeTotal = await this.getManualRechargeTotal(userId)

      return {
        balance,
        totalRecharge,
        totalCost,
        availableBalance,
        manualRechargeTotal,
        lastRechargeAt: user.lastRechargeAt || null
      }
    } catch (error) {
      logger.error('❌ Error getting balance info:', error)
      throw error
    }
  }

  /**
   * 为用户充值
   * @param {string} userId - 用户ID
   * @param {number} amount - 充值金额（美元）
   * @param {object} operator - 操作者信息 { id, name }
   * @param {string} remark - 备注
   * @returns {object} 充值结果
   */
  async rechargeBalance(userId, amount, operator = {}, remark = '', options = {}) {
    try {
      // 验证金额
      const rechargeAmount = parseFloat(amount)
      if (isNaN(rechargeAmount) || rechargeAmount <= 0) {
        throw new Error('Invalid recharge amount: must be a positive number')
      }

      let paymentAmount = null
      if (options.paymentAmount !== undefined && options.paymentAmount !== null) {
        const parsedPayment = parseFloat(options.paymentAmount)
        if (Number.isNaN(parsedPayment) || parsedPayment < 0) {
          throw new Error('Invalid payment amount metadata')
        }
        paymentAmount = parsedPayment
      }

      let displayAmount = null
      if (options.displayAmount !== undefined && options.displayAmount !== null) {
        const parsedDisplay = parseFloat(options.displayAmount)
        if (Number.isNaN(parsedDisplay) || parsedDisplay < 0) {
          throw new Error('Invalid display amount metadata')
        }
        displayAmount = parsedDisplay
      }

      const paymentCurrency =
        typeof options.paymentCurrency === 'string' && options.paymentCurrency.trim().length > 0
          ? options.paymentCurrency.trim().toUpperCase()
          : null

      const displayCurrency =
        typeof options.displayCurrency === 'string' && options.displayCurrency.trim().length > 0
          ? options.displayCurrency.trim().toUpperCase()
          : null

      // 获取用户（不计算 usage，避免循环依赖）
      const user = await this.getUserById(userId, false)
      if (!user) {
        throw new Error('User not found')
      }

      // 计算新余额
      const balanceBefore = parseFloat(user.balance) || 0
      const balanceAfter = balanceBefore + rechargeAmount
      const totalRechargeBefore = parseFloat(user.totalRecharge) || 0

      const recordType = options.recordType || 'manual'
      const recordSource = options.source || 'admin'
      const metadata =
        options.metadata && typeof options.metadata === 'object' ? options.metadata : null
      const shouldCountTowardsTotalRecharge =
        options.countTowardTotalRecharge !== undefined ? options.countTowardTotalRecharge : true
      const shouldUpdateLastRecharge =
        options.updateLastRecharge !== undefined
          ? options.updateLastRecharge
          : shouldCountTowardsTotalRecharge
      const skipReferralProcessing = options.skipReferralProcessing === true

      // 生成充值记录ID
      const recordId = `rec_${crypto.randomBytes(8).toString('hex')}`
      const now = new Date().toISOString()

      // 创建充值记录
      const rechargeRecord = {
        id: recordId,
        userId,
        username: user.username,
        amount: rechargeAmount,
        balanceBefore,
        balanceAfter,
        type: recordType,
        source: recordSource,
        operatorId: operator.id || '',
        operatorName: operator.name || 'system',
        remark: remark || '',
        paymentAmount,
        paymentCurrency,
        displayAmount,
        displayCurrency,
        metadata,
        createdAt: now
      }

      if (!metadata) {
        delete rechargeRecord.metadata
      }

      // 更新用户余额
      user.balance = balanceAfter
      if (shouldCountTowardsTotalRecharge) {
        user.totalRecharge = totalRechargeBefore + rechargeAmount
      }
      if (shouldUpdateLastRecharge) {
        user.lastRechargeAt = now
      }
      user.updatedAt = now

      // 使用 Redis 事务保证原子性
      const client = redis.getClientSafe()
      const multi = client.multi()

      // 保存用户信息
      multi.set(`${this.userPrefix}${userId}`, JSON.stringify(user))

      // 保存充值记录
      multi.set(`recharge_record:${recordId}`, JSON.stringify(rechargeRecord))

      // 添加到用户充值记录列表（按时间倒序）
      multi.lpush(`user_recharge_records:${userId}`, recordId)

      // 添加到全局充值记录列表
      multi.lpush('recharge_records:all', recordId)

      await multi.exec()

      logger.success(
        `💰 User ${user.username} (${userId}) recharged $${rechargeAmount.toFixed(2)} by ${operator.name || 'system'}, balance: $${balanceBefore.toFixed(2)} -> $${balanceAfter.toFixed(2)} [${recordType}]`
      )

      const result = {
        recordId,
        userId,
        username: user.username,
        amount: rechargeAmount,
        balanceBefore,
        balanceAfter,
        balance: balanceAfter,
        totalRecharge: user.totalRecharge,
        operatorName: operator.name || 'system',
        createdAt: now,
        paymentAmount,
        paymentCurrency,
        displayAmount,
        displayCurrency,
        metadata: metadata || undefined
      }

      // 只有符合配置的充值类型才触发邀请奖励
      const qualifiedTypes = config.referralProgram?.qualifiedRechargeTypes || ['payment']
      const isQualifiedType = qualifiedTypes.includes(recordType)

      if (!skipReferralProcessing && shouldCountTowardsTotalRecharge && isQualifiedType) {
        await this.handleReferralReward(user, rechargeAmount, recordType)
      }

      return result
    } catch (error) {
      logger.error('❌ Error recharging balance:', error)
      throw error
    }
  }

  async deductBalance(userId, amount, operator = {}, remark = '', options = {}) {
    try {
      // 验证金额
      const deductAmount = parseFloat(amount)
      if (isNaN(deductAmount) || deductAmount <= 0) {
        throw new Error('Invalid deduct amount: must be a positive number')
      }

      // 获取用户（不计算 usage，避免循环依赖）
      const user = await this.getUserById(userId, false)
      if (!user) {
        throw new Error('User not found')
      }

      // 计算新余额
      const balanceBefore = parseFloat(user.balance) || 0

      // 检查余额是否足够
      if (balanceBefore < deductAmount) {
        throw new Error(
          `Insufficient balance: current balance ${balanceBefore.toFixed(2)}, requested deduction ${deductAmount.toFixed(2)}`
        )
      }

      const balanceAfter = balanceBefore - deductAmount
      const totalRechargeBefore = parseFloat(user.totalRecharge) || 0
      const totalRechargeAfter = Math.max(0, totalRechargeBefore - deductAmount) // 确保不会变成负数

      const recordType = options.recordType || 'manual'
      const recordSource = options.source || 'admin'

      // 生成扣减记录ID
      const recordId = `ded_${crypto.randomBytes(8).toString('hex')}`
      const now = new Date().toISOString()

      // 创建扣减记录
      const deductionRecord = {
        id: recordId,
        userId,
        username: user.username,
        amount: -deductAmount, // 负数表示扣减
        balanceBefore,
        balanceAfter,
        type: recordType,
        source: recordSource,
        operatorId: operator.id || '',
        operatorName: operator.name || 'system',
        remark: remark || '管理员手动扣费',
        createdAt: now
      }

      // 更新用户余额和累计充值
      user.balance = balanceAfter
      user.totalRecharge = totalRechargeAfter
      user.updatedAt = now

      // 使用 Redis 事务保证原子性
      const client = redis.getClientSafe()
      const multi = client.multi()

      // 保存用户信息
      multi.set(`${this.userPrefix}${userId}`, JSON.stringify(user))

      // 保存扣减记录（使用与充值记录相同的key模式，方便统一查询）
      multi.set(`recharge_record:${recordId}`, JSON.stringify(deductionRecord))

      // 添加到用户充值记录列表（扣减也记录在同一个列表中，便于完整的交易历史）
      multi.lpush(`user_recharge_records:${userId}`, recordId)

      // 添加到全局充值记录列表
      multi.lpush('recharge_records:all', recordId)

      await multi.exec()

      logger.success(
        `💸 User ${user.username} (${userId}) balance deducted $${deductAmount.toFixed(2)} by ${operator.name || 'system'}, balance: $${balanceBefore.toFixed(2)} -> $${balanceAfter.toFixed(2)} [${recordType}]`
      )

      const result = {
        recordId,
        userId,
        username: user.username,
        amount: -deductAmount,
        balanceBefore,
        balanceAfter,
        balance: balanceAfter,
        totalRecharge: totalRechargeAfter,
        operatorName: operator.name || 'system',
        createdAt: now
      }

      return result
    } catch (error) {
      logger.error('❌ Error deducting balance:', error)
      throw error
    }
  }

  async handleReferralReward(user, rechargeAmount, recordType = 'payment') {
    try {
      const referralService = require('./referralService')
      if (!referralService.isEnabled()) {
        return
      }

      const rewardPlan = await referralService.processInviteeRecharge({
        inviteeId: user.id,
        totalRechargeUsd: user.totalRecharge || 0,
        rechargeAmountUsd: rechargeAmount,
        recordType
      })

      if (!rewardPlan) {
        return
      }

      const lockToken = await referralService.acquireRewardLock(user.id)
      if (!lockToken) {
        logger.warn('Referral reward lock unavailable, skipping duplicate reward', {
          inviteeId: user.id
        })
        return
      }

      try {
        await this.rechargeBalance(
          rewardPlan.referrerId,
          rewardPlan.rewardAmountUsd,
          { id: 'system', name: 'referral-program' },
          `Invitee ${user.username} qualified for referral reward`,
          {
            recordType: 'reward',
            source: 'referral',
            countTowardTotalRecharge: false,
            updateLastRecharge: false,
            skipReferralProcessing: true
          }
        )

        await referralService.markRewardIssued(user.id, rewardPlan.rewardAmountUsd)
      } finally {
        await referralService.releaseRewardLock(user.id, lockToken)
      }
    } catch (error) {
      logger.error('❌ Error processing referral reward:', error)
    }
  }

  /**
   * 获取用户充值记录
   * @param {string} userId - 用户ID
   * @param {object} options - 分页选项
   * @returns {object} 充值记录列表
   */
  async getRechargeRecords(userId, options = {}) {
    try {
      const { page = 1, limit = 20, type } = options
      const client = redis.getClientSafe()

      // 获取用户充值记录ID列表
      const recordIds = await client.lrange(`user_recharge_records:${userId}`, 0, -1)

      if (!recordIds || recordIds.length === 0) {
        return {
          records: [],
          total: 0,
          page,
          limit,
          totalPages: 0
        }
      }

      // 获取所有充值记录
      const records = []
      for (const recordId of recordIds) {
        const recordData = await client.get(`recharge_record:${recordId}`)
        if (recordData) {
          records.push(JSON.parse(recordData))
        }
      }

      const typeFilter =
        typeof type === 'string' && type.trim().length > 0 ? type.trim().toLowerCase() : ''
      const filteredRecords = typeFilter
        ? records.filter((record) => (record.type || '').toLowerCase() === typeFilter)
        : records

      // 分页
      const total = filteredRecords.length
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedRecords = filteredRecords.slice(startIndex, endIndex)

      return {
        records: paginatedRecords,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    } catch (error) {
      logger.error('❌ Error getting recharge records:', error)
      throw error
    }
  }

  /**
   * 获取所有充值记录（管理员用）
   * @param {object} options - 分页和过滤选项
   * @returns {object} 充值记录列表
   */
  async getAllRechargeRecords(options = {}) {
    try {
      const { page = 1, limit = 20, username, type, startDate, endDate } = options
      const client = redis.getClientSafe()

      const parsePositiveInt = (value, defaultValue) => {
        const parsed = parseInt(value, 10)
        return Number.isNaN(parsed) || parsed <= 0 ? defaultValue : parsed
      }

      const pageNumber = parsePositiveInt(page, 1)
      const limitNumber = parsePositiveInt(limit, 20)

      const baseResponse = {
        records: [],
        total: 0,
        page: pageNumber,
        limit: limitNumber,
        totalPages: 0,
        stats: {
          totalAmount: 0,
          totalCount: 0,
          userCount: 0,
          avgAmount: 0
        }
      }

      // 获取全局充值记录ID列表
      const recordIds = await client.lrange('recharge_records:all', 0, -1)

      if (!recordIds || recordIds.length === 0) {
        return baseResponse
      }

      // 获取所有充值记录
      const records = []
      for (const recordId of recordIds) {
        const recordData = await client.get(`recharge_record:${recordId}`)
        if (recordData) {
          records.push(JSON.parse(recordData))
        }
      }

      const usernameFilter =
        typeof username === 'string' && username.trim().length > 0
          ? username.trim().toLowerCase()
          : ''
      const typeFilter =
        typeof type === 'string' && type.trim().length > 0 ? type.trim().toLowerCase() : ''

      const parseDateToTimestamp = (value) => {
        if (!value) {
          return null
        }
        const timestamp = Date.parse(value)
        return Number.isNaN(timestamp) ? null : timestamp
      }

      const startTimestamp = parseDateToTimestamp(startDate)
      const endTimestamp = parseDateToTimestamp(endDate)
      const shouldFilterByDate = startTimestamp !== null || endTimestamp !== null

      const filteredRecords = records.filter((record) => {
        if (usernameFilter) {
          const recordUsername = (record.username || '').toLowerCase()
          if (!recordUsername.includes(usernameFilter)) {
            return false
          }
        }

        if (typeFilter) {
          const recordType = (record.type || '').toLowerCase()
          if (recordType !== typeFilter) {
            return false
          }
        }

        if (shouldFilterByDate) {
          const recordTimestamp = parseDateToTimestamp(record.createdAt)
          if (
            startTimestamp !== null &&
            (recordTimestamp === null || recordTimestamp < startTimestamp)
          ) {
            return false
          }
          if (
            endTimestamp !== null &&
            (recordTimestamp === null || recordTimestamp > endTimestamp)
          ) {
            return false
          }
        }

        return true
      })

      const total = filteredRecords.length
      const startIndex = (pageNumber - 1) * limitNumber
      const endIndex = startIndex + limitNumber
      const paginatedRecords = filteredRecords.slice(startIndex, endIndex)

      const totalAmountRaw = filteredRecords.reduce((sum, record) => {
        const amount = parseFloat(record.amount)
        return sum + (Number.isNaN(amount) ? 0 : amount)
      }, 0)
      const totalAmount = Number(totalAmountRaw.toFixed(2))
      const totalCount = total
      const uniqueUserIds = filteredRecords
        .map((record) => record.userId)
        .filter((userId) => !!userId)
      const userCount = uniqueUserIds.length > 0 ? new Set(uniqueUserIds).size : 0
      const avgAmount = totalCount > 0 ? Number((totalAmountRaw / totalCount).toFixed(2)) : 0

      return {
        records: paginatedRecords,
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: total > 0 ? Math.ceil(total / limitNumber) : 0,
        stats: {
          totalAmount,
          totalCount,
          userCount,
          avgAmount
        }
      }
    } catch (error) {
      logger.error('❌ Error getting all recharge records:', error)
      throw error
    }
  }

  /**
   * 检查用户余额是否足够
   * @param {string} userId - 用户ID
   * @returns {object} 余额检查结果
   */
  async checkBalance(userId) {
    try {
      const balanceInfo = await this.getBalanceInfo(userId)

      return {
        sufficient: balanceInfo.availableBalance > 0,
        ...balanceInfo
      }
    } catch (error) {
      logger.error('❌ Error checking balance:', error)
      throw error
    }
  }
}

module.exports = new UserService()
