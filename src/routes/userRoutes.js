const express = require('express')
const router = express.Router()
const ldapService = require('../services/ldapService')
const userService = require('../services/userService')
const apiKeyService = require('../services/apiKeyService')
const logger = require('../utils/logger')
const config = require('../../config/config')
const inputValidator = require('../utils/inputValidator')
const { RateLimiterRedis } = require('rate-limiter-flexible')
const redis = require('../models/redis')
const { authenticateUser, authenticateUserOrAdmin, requireAdmin } = require('../middleware/auth')
const CostCalculator = require('../utils/costCalculator')
const referralService = require('../services/referralService')

// 🚦 配置登录速率限制
// 只基于IP地址限制，避免攻击者恶意锁定特定账户

// 延迟初始化速率限制器，确保 Redis 已连接
let ipRateLimiter = null
let strictIpRateLimiter = null

// 初始化速率限制器函数
function initRateLimiters() {
  if (!ipRateLimiter) {
    try {
      const redisClient = redis.getClientSafe()

      // IP地址速率限制 - 正常限制
      ipRateLimiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: 'login_ip_limiter',
        points: 30, // 每个IP允许30次尝试
        duration: 900, // 15分钟窗口期
        blockDuration: 900 // 超限后封禁15分钟
      })

      // IP地址速率限制 - 严格限制（用于检测暴力破解）
      strictIpRateLimiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: 'login_ip_strict',
        points: 100, // 每个IP允许100次尝试
        duration: 3600, // 1小时窗口期
        blockDuration: 3600 // 超限后封禁1小时
      })
    } catch (error) {
      logger.error('❌ 初始化速率限制器失败:', error)
      // 速率限制器初始化失败时继续运行，但记录错误
    }
  }
  return { ipRateLimiter, strictIpRateLimiter }
}

// 🔒 账户锁定相关函数
const ACCOUNT_LOCK_PREFIX = 'account_lock:'
const ACCOUNT_LOCK_DURATION = 900 // 15分钟（秒）
const MAX_LOGIN_ATTEMPTS = 5 // 最多失败5次

// 检查账户是否被锁定
async function checkAccountLock(username) {
  try {
    const lockKey = `${ACCOUNT_LOCK_PREFIX}${username}`
    const lockData = await redis.get(lockKey)

    if (!lockData) {
      return { locked: false, attempts: 0 }
    }

    const data = JSON.parse(lockData)
    const now = Date.now()

    // 检查是否已过锁定期
    if (data.lockedUntil && now < data.lockedUntil) {
      return {
        locked: true,
        attempts: data.attempts,
        remainingSeconds: Math.ceil((data.lockedUntil - now) / 1000)
      }
    }

    // 锁定期已过，重置
    await redis.del(lockKey)
    return { locked: false, attempts: 0 }
  } catch (error) {
    logger.error('❌ Error checking account lock:', error)
    // 出错时默认不锁定
    return { locked: false, attempts: 0 }
  }
}

// 记录登录失败
async function recordLoginFailure(username) {
  try {
    const lockKey = `${ACCOUNT_LOCK_PREFIX}${username}`
    const lockData = await redis.get(lockKey)

    let attempts = 1
    if (lockData) {
      const data = JSON.parse(lockData)
      attempts = (data.attempts || 0) + 1
    }

    const newData = {
      attempts,
      lastAttempt: Date.now()
    }

    // 如果失败次数达到上限，锁定账户
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      newData.lockedUntil = Date.now() + ACCOUNT_LOCK_DURATION * 1000
      logger.security(`🔒 Account locked due to too many failed attempts: ${username}`)
    }

    await redis.set(lockKey, JSON.stringify(newData), 'EX', ACCOUNT_LOCK_DURATION)
    return attempts
  } catch (error) {
    logger.error('❌ Error recording login failure:', error)
    return 0
  }
}

// 清除登录失败记录（成功登录后）
async function clearLoginFailures(username) {
  try {
    const lockKey = `${ACCOUNT_LOCK_PREFIX}${username}`
    await redis.del(lockKey)
  } catch (error) {
    logger.error('❌ Error clearing login failures:', error)
  }
}

// 🔐 用户登录端点
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown'

    // 初始化速率限制器（如果尚未初始化）
    const limiters = initRateLimiters()

    // 检查IP速率限制 - 基础限制
    if (limiters.ipRateLimiter) {
      try {
        await limiters.ipRateLimiter.consume(clientIp)
      } catch (rateLimiterRes) {
        const retryAfter = Math.round(rateLimiterRes.msBeforeNext / 1000) || 900
        logger.security(`🚫 Login rate limit exceeded for IP: ${clientIp}`)
        res.set('Retry-After', String(retryAfter))
        return res.status(429).json({
          error: 'Too many requests',
          message: `Too many login attempts from this IP. Please try again later.`
        })
      }
    }

    // 检查IP速率限制 - 严格限制（防止暴力破解）
    if (limiters.strictIpRateLimiter) {
      try {
        await limiters.strictIpRateLimiter.consume(clientIp)
      } catch (rateLimiterRes) {
        const retryAfter = Math.round(rateLimiterRes.msBeforeNext / 1000) || 3600
        logger.security(`🚫 Strict rate limit exceeded for IP: ${clientIp} - possible brute force`)
        res.set('Retry-After', String(retryAfter))
        return res.status(429).json({
          error: 'Too many requests',
          message: 'Too many login attempts detected. Access temporarily blocked.'
        })
      }
    }

    if (!username || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Username and password are required'
      })
    }

    // 验证输入格式
    let validatedUsername
    try {
      validatedUsername = inputValidator.validateUsername(username)
      inputValidator.validatePassword(password)
    } catch (validationError) {
      return res.status(400).json({
        error: 'Invalid input',
        message: validationError.message
      })
    }

    // 检查用户管理是否启用
    if (!config.userManagement.enabled) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'User management is not enabled'
      })
    }

    // 检查LDAP是否启用
    if (!config.ldap || !config.ldap.enabled) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'LDAP authentication is not enabled'
      })
    }

    // 尝试LDAP认证
    const authResult = await ldapService.authenticateUserCredentials(validatedUsername, password)

    if (!authResult.success) {
      // 登录失败
      logger.info(`🚫 Failed login attempt for user: ${validatedUsername} from IP: ${clientIp}`)
      return res.status(401).json({
        error: 'Authentication failed',
        message: authResult.message
      })
    }

    // 登录成功
    logger.info(`✅ User login successful: ${validatedUsername} from IP: ${clientIp}`)

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: authResult.user.id,
        username: authResult.user.username,
        email: authResult.user.email,
        displayName: authResult.user.displayName,
        firstName: authResult.user.firstName,
        lastName: authResult.user.lastName,
        role: authResult.user.role
      },
      sessionToken: authResult.sessionToken
    })
  } catch (error) {
    logger.error('❌ User login error:', error)
    res.status(500).json({
      error: 'Login error',
      message: 'Internal server error during login'
    })
  }
})

// 📝 用户注册端点
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, displayName, firstName, lastName } = req.body
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown'

    const referralCodeInput =
      req.body?.referralCode || req.body?.inviter || req.query?.referralCode || req.query?.inviter
    const referralCode = typeof referralCodeInput === 'string' ? referralCodeInput.trim() : ''
    let referrerUser = null

    // 初始化速率限制器（如果尚未初始化）
    const limiters = initRateLimiters()

    // 检查IP速率限制
    if (limiters.ipRateLimiter) {
      try {
        await limiters.ipRateLimiter.consume(clientIp)
      } catch (rateLimiterRes) {
        const retryAfter = Math.round(rateLimiterRes.msBeforeNext / 1000) || 900
        logger.security(`🚫 Registration rate limit exceeded for IP: ${clientIp}`)
        res.set('Retry-After', String(retryAfter))
        return res.status(429).json({
          error: 'Too many requests',
          message: 'Too many registration attempts from this IP. Please try again later.'
        })
      }
    }

    // 验证必填字段
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Missing fields',
        message: 'Username, email, and password are required'
      })
    }

    // 验证输入格式
    try {
      inputValidator.validateUsername(username)
      inputValidator.validateEmail(email)
      inputValidator.validatePassword(password)
      if (displayName) {
        inputValidator.validateDisplayName(displayName)
      }
    } catch (validationError) {
      return res.status(400).json({
        error: 'Invalid input',
        message: validationError.message
      })
    }

    // 检查用户管理是否启用
    if (!config.userManagement.enabled) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'User management is not enabled'
      })
    }

    if (referralCode) {
      if (!referralService.isEnabled()) {
        return res.status(400).json({
          error: 'Referral disabled',
          message: 'Referral program is not enabled at the moment'
        })
      }

      const referrerId = await referralService.findUserIdByCode(referralCode)
      if (!referrerId) {
        return res.status(400).json({
          error: 'Invalid referral code',
          message: '邀请链接无效或已失效'
        })
      }

      referrerUser = await userService.getUserById(referrerId, false)
      if (!referrerUser) {
        return res.status(400).json({
          error: 'Invalid referral code',
          message: '邀请人信息不存在'
        })
      }

      const maxInvitees = parseInt(config.referralProgram?.maxInviteesPerUser) || 0
      if (maxInvitees > 0) {
        const stats = await referralService.getUserStats(referrerUser.id)
        if (stats.totalInvites >= maxInvitees) {
          return res.status(400).json({
            error: 'Referral limit reached',
            message: '邀请人可用名额已用完，请联系管理员'
          })
        }
      }
    }

    // 注册用户
    const user = await userService.registerLocalUser({
      username,
      email,
      password,
      displayName,
      firstName,
      lastName
    })

    if (referrerUser) {
      try {
        await referralService.recordInvitation({
          inviteeId: user.id,
          inviteeUsername: user.username,
          referrerId: referrerUser.id,
          referrerUsername: referrerUser.username
        })
      } catch (referralError) {
        logger.error('❌ Failed to record referral info:', referralError)
      }
    }

    logger.info(`📝 New user registered: ${username} from IP: ${clientIp}`)

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    })
  } catch (error) {
    logger.error('❌ User registration error:', error)

    // 返回友好的错误信息
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        error: 'Registration failed',
        message: error.message
      })
    }

    if (error.message.includes('not enabled') || error.message.includes('not allowed')) {
      return res.status(403).json({
        error: 'Registration failed',
        message: error.message
      })
    }

    res.status(500).json({
      error: 'Registration error',
      message: 'Internal server error during registration'
    })
  }
})

// 🔐 本地用户登录端点
router.post('/login/local', async (req, res) => {
  try {
    const { username, password } = req.body
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown'

    // 初始化速率限制器
    const limiters = initRateLimiters()

    // 检查IP速率限制
    if (limiters.ipRateLimiter) {
      try {
        await limiters.ipRateLimiter.consume(clientIp)
      } catch (rateLimiterRes) {
        const retryAfter = Math.round(rateLimiterRes.msBeforeNext / 1000) || 900
        logger.security(`🚫 Login rate limit exceeded for IP: ${clientIp}`)
        res.set('Retry-After', String(retryAfter))
        return res.status(429).json({
          error: 'Too many requests',
          message: 'Too many login attempts from this IP. Please try again later.'
        })
      }
    }

    if (limiters.strictIpRateLimiter) {
      try {
        await limiters.strictIpRateLimiter.consume(clientIp)
      } catch (rateLimiterRes) {
        const retryAfter = Math.round(rateLimiterRes.msBeforeNext / 1000) || 3600
        logger.security(`🚫 Strict rate limit exceeded for IP: ${clientIp}`)
        res.set('Retry-After', String(retryAfter))
        return res.status(429).json({
          error: 'Too many requests',
          message: 'Too many login attempts detected. Access temporarily blocked.'
        })
      }
    }

    if (!username || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Username and password are required'
      })
    }

    // 验证输入格式
    let validatedUsername
    try {
      validatedUsername = inputValidator.validateUsername(username)
      inputValidator.validatePassword(password)
    } catch (validationError) {
      return res.status(400).json({
        error: 'Invalid input',
        message: validationError.message
      })
    }

    // 检查用户管理是否启用
    if (!config.userManagement.enabled) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'User management is not enabled'
      })
    }

    // 🔒 检查账户是否被锁定
    const lockStatus = await checkAccountLock(validatedUsername)
    if (lockStatus.locked) {
      logger.security(
        `🔒 Login attempt for locked account: ${validatedUsername} from IP: ${clientIp}`
      )
      return res.status(423).json({
        error: 'Account locked',
        message: `Too many failed login attempts. Please try again in ${lockStatus.remainingSeconds} seconds.`,
        remainingSeconds: lockStatus.remainingSeconds
      })
    }

    // 本地认证
    const authResult = await userService.authenticateLocalUser(validatedUsername, password)

    // ✅ 登录成功，清除失败记录
    await clearLoginFailures(validatedUsername)

    logger.info(`✅ Local user login successful: ${validatedUsername} from IP: ${clientIp}`)

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: authResult.user.id,
        username: authResult.user.username,
        email: authResult.user.email,
        displayName: authResult.user.displayName,
        firstName: authResult.user.firstName,
        lastName: authResult.user.lastName,
        role: authResult.user.role,
        authType: authResult.user.authType
      },
      sessionToken: authResult.sessionToken
    })
  } catch (error) {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown'
    const { username } = req.body

    // 记录登录失败
    if (username) {
      try {
        const validatedUsername = inputValidator.validateUsername(username)
        const attempts = await recordLoginFailure(validatedUsername)
        logger.security(
          `🚫 Failed local login attempt for ${validatedUsername} from IP: ${clientIp} (Attempt ${attempts}/${MAX_LOGIN_ATTEMPTS})`
        )
      } catch (err) {
        // 用户名无效，不记录
      }
    }

    logger.info(`🚫 Failed local login attempt from IP: ${clientIp}`)
    logger.error('❌ Local user login error:', error)

    // 返回通用错误信息，避免用户枚举
    res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid username or password'
    })
  }
})

// 🔐 LDAP用户登录端点
router.post('/login/ldap', async (req, res) => {
  try {
    const { username, password } = req.body
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown'

    // 初始化速率限制器
    const limiters = initRateLimiters()

    // 检查IP速率限制
    if (limiters.ipRateLimiter) {
      try {
        await limiters.ipRateLimiter.consume(clientIp)
      } catch (rateLimiterRes) {
        const retryAfter = Math.round(rateLimiterRes.msBeforeNext / 1000) || 900
        logger.security(`🚫 Login rate limit exceeded for IP: ${clientIp}`)
        res.set('Retry-After', String(retryAfter))
        return res.status(429).json({
          error: 'Too many requests',
          message: 'Too many login attempts from this IP. Please try again later.'
        })
      }
    }

    if (limiters.strictIpRateLimiter) {
      try {
        await limiters.strictIpRateLimiter.consume(clientIp)
      } catch (rateLimiterRes) {
        const retryAfter = Math.round(rateLimiterRes.msBeforeNext / 1000) || 3600
        logger.security(`🚫 Strict rate limit exceeded for IP: ${clientIp}`)
        res.set('Retry-After', String(retryAfter))
        return res.status(429).json({
          error: 'Too many requests',
          message: 'Too many login attempts detected. Access temporarily blocked.'
        })
      }
    }

    if (!username || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Username and password are required'
      })
    }

    // 验证输入格式
    let validatedUsername
    try {
      validatedUsername = inputValidator.validateUsername(username)
      inputValidator.validatePassword(password)
    } catch (validationError) {
      return res.status(400).json({
        error: 'Invalid input',
        message: validationError.message
      })
    }

    // 检查用户管理是否启用
    if (!config.userManagement.enabled) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'User management is not enabled'
      })
    }

    // 检查LDAP是否启用
    if (!config.ldap || !config.ldap.enabled) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'LDAP authentication is not enabled'
      })
    }

    // LDAP认证
    const authResult = await ldapService.authenticateUserCredentials(validatedUsername, password)

    if (!authResult.success) {
      logger.info(
        `🚫 Failed LDAP login attempt for user: ${validatedUsername} from IP: ${clientIp}`
      )
      return res.status(401).json({
        error: 'Authentication failed',
        message: authResult.message
      })
    }

    logger.info(`✅ LDAP user login successful: ${validatedUsername} from IP: ${clientIp}`)

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: authResult.user.id,
        username: authResult.user.username,
        email: authResult.user.email,
        displayName: authResult.user.displayName,
        firstName: authResult.user.firstName,
        lastName: authResult.user.lastName,
        role: authResult.user.role
      },
      sessionToken: authResult.sessionToken
    })
  } catch (error) {
    logger.error('❌ LDAP user login error:', error)
    res.status(500).json({
      error: 'Login error',
      message: 'Internal server error during login'
    })
  }
})

// 🔄 修改密码端点
router.post('/change-password', authenticateUser, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        error: 'Missing fields',
        message: 'Old password and new password are required'
      })
    }

    // 验证新密码格式
    try {
      inputValidator.validatePassword(newPassword)
    } catch (validationError) {
      return res.status(400).json({
        error: 'Invalid input',
        message: validationError.message
      })
    }

    // 修改密码
    await userService.updateUserPassword(req.user.id, oldPassword, newPassword)

    logger.info(`🔄 User password changed: ${req.user.username}`)

    res.json({
      success: true,
      message: 'Password changed successfully'
    })
  } catch (error) {
    logger.error('❌ Change password error:', error)

    if (error.message.includes('incorrect') || error.message.includes('Only local users')) {
      return res.status(400).json({
        error: 'Change password failed',
        message: error.message
      })
    }

    res.status(500).json({
      error: 'Change password error',
      message: 'Internal server error during password change'
    })
  }
})

// 🚪 用户登出端点
router.post('/logout', authenticateUser, async (req, res) => {
  try {
    await userService.invalidateUserSession(req.user.sessionToken)

    logger.info(`👋 User logout: ${req.user.username}`)

    res.json({
      success: true,
      message: 'Logout successful'
    })
  } catch (error) {
    logger.error('❌ User logout error:', error)
    res.status(500).json({
      error: 'Logout error',
      message: 'Internal server error during logout'
    })
  }
})

// 🔍 检查密码强度（无需认证，供注册页面使用）
router.post('/check-password-strength', (req, res) => {
  try {
    const { password } = req.body

    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Password is required'
      })
    }

    const strengthInfo = inputValidator.calculatePasswordStrength(password)

    res.json({
      success: true,
      strength: strengthInfo
    })
  } catch (error) {
    logger.error('❌ Password strength check error:', error)
    res.status(500).json({
      error: 'Check error',
      message: 'Failed to check password strength'
    })
  }
})

// 👤 获取当前用户信息
router.get('/profile', authenticateUser, async (req, res) => {
  try {
    const user = await userService.getUserById(req.user.id)
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      })
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        apiKeyCount: user.apiKeyCount,
        totalUsage: user.totalUsage
      },
      config: {
        maxApiKeysPerUser: config.userManagement.maxApiKeysPerUser,
        allowUserDeleteApiKeys: config.userManagement.allowUserDeleteApiKeys
      }
    })
  } catch (error) {
    logger.error('❌ Get user profile error:', error)
    res.status(500).json({
      error: 'Profile error',
      message: 'Failed to retrieve user profile'
    })
  }
})

// 💰 获取当前用户余额信息
router.get('/balance', authenticateUser, async (req, res) => {
  try {
    const balanceInfo = await userService.getBalanceInfo(req.user.id)

    res.json({
      success: true,
      data: balanceInfo
    })
  } catch (error) {
    logger.error('❌ Get balance error:', error)
    res.status(500).json({
      error: 'Balance error',
      message: 'Failed to retrieve balance information'
    })
  }
})

// 💰 获取当前用户充值记录
router.get('/recharge-records', authenticateUser, async (req, res) => {
  try {
    const { page = 1, limit, pageSize, type } = req.query

    const parsedPage = parseInt(page, 10)
    const perPageRaw = pageSize ?? limit ?? 20
    const parsedLimit = parseInt(perPageRaw, 10)

    const result = await userService.getRechargeRecords(req.user.id, {
      page: Number.isNaN(parsedPage) ? 1 : parsedPage,
      limit: Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 20 : parsedLimit,
      type: typeof type === 'string' ? type : undefined
    })

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    logger.error('❌ Get recharge records error:', error)
    res.status(500).json({
      error: 'Recharge records error',
      message: 'Failed to retrieve recharge records'
    })
  }
})

// 🎁 获取邀请返利信息
router.get('/referral', authenticateUser, async (req, res) => {
  try {
    if (!referralService.isEnabled()) {
      return res.status(404).json({
        error: 'Referral disabled',
        message: 'Referral program is not enabled'
      })
    }

    const info = await referralService.getReferralInfo(req.user.id, { recentLimit: 5 })
    res.json({
      success: true,
      data: info
    })
  } catch (error) {
    logger.error('❌ Get referral info error:', error)
    res.status(500).json({
      error: 'Referral error',
      message: 'Failed to retrieve referral information'
    })
  }
})

// 🎁 获取邀请列表
router.get('/referral/invitees', authenticateUser, async (req, res) => {
  try {
    if (!referralService.isEnabled()) {
      return res.status(404).json({
        error: 'Referral disabled',
        message: 'Referral program is not enabled'
      })
    }

    const { page = 1, limit = 20 } = req.query
    const result = await referralService.listInvitees(req.user.id, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10)
    })

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    logger.error('❌ Get referral invitees error:', error)
    res.status(500).json({
      error: 'Referral error',
      message: 'Failed to retrieve referral invitees'
    })
  }
})

// 🔑 获取用户的API Keys
router.get('/api-keys', authenticateUser, async (req, res) => {
  try {
    const { includeDeleted = 'false' } = req.query
    const apiKeys = await apiKeyService.getUserApiKeys(req.user.id, includeDeleted === 'true')

    // 移除敏感信息并格式化usage数据
    const safeApiKeys = apiKeys.map((key) => {
      // Flatten usage structure for frontend compatibility
      let flatUsage = {
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        cacheCreateTokens: 0,
        cacheReadTokens: 0,
        totalCost: 0
      }

      if (key.usage && key.usage.total) {
        flatUsage = {
          requests: key.usage.total.requests || 0,
          inputTokens: key.usage.total.inputTokens || 0,
          outputTokens: key.usage.total.outputTokens || 0,
          cacheCreateTokens: key.usage.total.cacheCreateTokens || 0,
          cacheReadTokens: key.usage.total.cacheReadTokens || 0,
          totalCost: key.totalCost || 0
        }
      }

      return {
        id: key.id,
        name: key.name,
        description: key.description,
        tokenLimit: key.tokenLimit,
        isActive: key.isActive,
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt,
        expiresAt: key.expiresAt,
        usage: flatUsage,
        dailyCost: key.dailyCost,
        dailyCostLimit: key.dailyCostLimit,
        totalCost: key.totalCost,
        totalCostLimit: key.totalCostLimit,
        // 不返回实际的key值，只返回前缀和后几位
        keyPreview: key.key
          ? `${key.key.substring(0, 8)}...${key.key.substring(key.key.length - 4)}`
          : null,
        // Include deletion fields for deleted keys
        isDeleted: key.isDeleted,
        deletedAt: key.deletedAt,
        deletedBy: key.deletedBy,
        deletedByType: key.deletedByType
      }
    })

    res.json({
      success: true,
      apiKeys: safeApiKeys,
      total: safeApiKeys.length
    })
  } catch (error) {
    logger.error('❌ Get user API keys error:', error)
    res.status(500).json({
      error: 'API Keys error',
      message: 'Failed to retrieve API keys'
    })
  }
})

// 🔑 创建新的API Key
router.post('/api-keys', authenticateUser, async (req, res) => {
  try {
    const { name, description, tokenLimit, expiresAt, dailyCostLimit, totalCostLimit } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Missing name',
        message: 'API key name is required'
      })
    }

    if (
      totalCostLimit !== undefined &&
      totalCostLimit !== null &&
      totalCostLimit !== '' &&
      (Number.isNaN(Number(totalCostLimit)) || Number(totalCostLimit) < 0)
    ) {
      return res.status(400).json({
        error: 'Invalid total cost limit',
        message: 'Total cost limit must be a non-negative number'
      })
    }

    // 检查用户API Key数量限制
    const userApiKeys = await apiKeyService.getUserApiKeys(req.user.id)
    if (userApiKeys.length >= config.userManagement.maxApiKeysPerUser) {
      return res.status(400).json({
        error: 'API key limit exceeded',
        message: `You can only have up to ${config.userManagement.maxApiKeysPerUser} API keys`
      })
    }

    // 创建API Key数据
    const apiKeyData = {
      name: name.trim(),
      description: description?.trim() || '',
      userId: req.user.id,
      userUsername: req.user.username,
      tokenLimit: tokenLimit || null,
      expiresAt: expiresAt || null,
      dailyCostLimit: dailyCostLimit || null,
      totalCostLimit: totalCostLimit || null,
      createdBy: 'user',
      // 设置服务权限为全部服务，确保前端显示“服务权限”为“全部服务”且具备完整访问权限
      permissions: 'all'
    }

    const newApiKey = await apiKeyService.createApiKey(apiKeyData)

    // 更新用户API Key数量
    await userService.updateUserApiKeyCount(req.user.id, userApiKeys.length + 1)

    logger.info(`🔑 User ${req.user.username} created API key: ${name}`)

    res.status(201).json({
      success: true,
      message: 'API key created successfully',
      apiKey: {
        id: newApiKey.id,
        name: newApiKey.name,
        description: newApiKey.description,
        key: newApiKey.apiKey, // 只在创建时返回完整key
        tokenLimit: newApiKey.tokenLimit,
        expiresAt: newApiKey.expiresAt,
        dailyCostLimit: newApiKey.dailyCostLimit,
        totalCostLimit: newApiKey.totalCostLimit,
        createdAt: newApiKey.createdAt
      }
    })
  } catch (error) {
    logger.error('❌ Create user API key error:', error)
    res.status(500).json({
      error: 'API Key creation error',
      message: 'Failed to create API key'
    })
  }
})

// 🗑️ 删除API Key
router.delete('/api-keys/:keyId', authenticateUser, async (req, res) => {
  try {
    const { keyId } = req.params

    // 检查是否允许用户删除自己的API Keys
    if (!config.userManagement.allowUserDeleteApiKeys) {
      return res.status(403).json({
        error: 'Operation not allowed',
        message:
          'Users are not allowed to delete their own API keys. Please contact an administrator.'
      })
    }

    // 检查API Key是否属于当前用户
    const existingKey = await apiKeyService.getApiKeyById(keyId)
    if (!existingKey || existingKey.userId !== req.user.id) {
      return res.status(404).json({
        error: 'API key not found',
        message: 'API key not found or you do not have permission to access it'
      })
    }

    await apiKeyService.deleteApiKey(keyId, req.user.username, 'user')

    // 更新用户API Key数量
    const userApiKeys = await apiKeyService.getUserApiKeys(req.user.id)
    await userService.updateUserApiKeyCount(req.user.id, userApiKeys.length)

    logger.info(`🗑️ User ${req.user.username} deleted API key: ${existingKey.name}`)

    res.json({
      success: true,
      message: 'API key deleted successfully'
    })
  } catch (error) {
    logger.error('❌ Delete user API key error:', error)
    res.status(500).json({
      error: 'API Key deletion error',
      message: 'Failed to delete API key'
    })
  }
})

// 📊 获取用户使用统计
router.get('/usage-stats', authenticateUser, async (req, res) => {
  try {
    const { period = 'week', model } = req.query

    // 获取用户的API Keys (including deleted ones for complete usage stats)
    const userApiKeys = await apiKeyService.getUserApiKeys(req.user.id, true)
    const apiKeyIds = userApiKeys.map((key) => key.id)

    if (apiKeyIds.length === 0) {
      return res.json({
        success: true,
        stats: {
          totalRequests: 0,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalCost: 0,
          dailyStats: [],
          modelStats: []
        }
      })
    }

    // 获取使用统计
    const stats = await apiKeyService.getAggregatedUsageStats(apiKeyIds, { period, model })

    res.json({
      success: true,
      stats
    })
  } catch (error) {
    logger.error('❌ Get user usage stats error:', error)
    res.status(500).json({
      error: 'Usage stats error',
      message: 'Failed to retrieve usage statistics'
    })
  }
})

// 📊 获取用户使用趋势（用于图表展示）
router.get('/usage-trend', authenticateUser, async (req, res) => {
  try {
    const { days = 7 } = req.query
    const daysCount = Math.min(parseInt(days) || 7, 90) // 最多90天

    // 获取用户的所有 API Keys
    const userApiKeys = await apiKeyService.getUserApiKeys(req.user.id, true)
    const apiKeyIds = userApiKeys.map((key) => key.id)

    if (apiKeyIds.length === 0) {
      return res.json({
        success: true,
        trend: []
      })
    }

    const client = redis.getClientSafe()
    const trendData = []
    const today = new Date()

    // 获取过去N天的数据
    for (let i = 0; i < daysCount; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = redis.getDateStringInTimezone(date)

      let dayInputTokens = 0
      let dayOutputTokens = 0
      let dayRequests = 0
      let dayCacheCreateTokens = 0
      let dayCacheReadTokens = 0
      let dayCost = 0

      // 遍历用户的每个 API Key，汇总当天数据
      for (const keyId of apiKeyIds) {
        // 获取该 Key 当天的使用数据
        const dailyKey = `usage:daily:${keyId}:${dateStr}`
        const data = await client.hgetall(dailyKey)

        if (data && Object.keys(data).length > 0) {
          const inputTokens = parseInt(data.inputTokens) || 0
          const outputTokens = parseInt(data.outputTokens) || 0
          const cacheCreateTokens = parseInt(data.cacheCreateTokens) || 0
          const cacheReadTokens = parseInt(data.cacheReadTokens) || 0
          const requests = parseInt(data.requests) || 0

          dayInputTokens += inputTokens
          dayOutputTokens += outputTokens
          dayCacheCreateTokens += cacheCreateTokens
          dayCacheReadTokens += cacheReadTokens
          dayRequests += requests
        }
      }

      // 计算成本（使用默认模型价格）
      if (dayInputTokens > 0 || dayOutputTokens > 0) {
        const usage = {
          input_tokens: dayInputTokens,
          output_tokens: dayOutputTokens,
          cache_creation_input_tokens: dayCacheCreateTokens,
          cache_read_input_tokens: dayCacheReadTokens
        }
        const costResult = CostCalculator.calculateCost(usage, 'unknown')
        dayCost = costResult.costs.total
      }

      trendData.push({
        date: dateStr,
        inputTokens: dayInputTokens,
        outputTokens: dayOutputTokens,
        requests: dayRequests,
        cacheCreateTokens: dayCacheCreateTokens,
        cacheReadTokens: dayCacheReadTokens,
        tokens: dayInputTokens + dayOutputTokens + dayCacheCreateTokens + dayCacheReadTokens,
        cost: dayCost
      })
    }

    // 按日期升序排列（最早的在前）
    trendData.reverse()

    res.json({
      success: true,
      trend: trendData
    })
  } catch (error) {
    logger.error('❌ Get user usage trend error:', error)
    res.status(500).json({
      error: 'Usage trend error',
      message: 'Failed to retrieve usage trend'
    })
  }
})

// === 管理员用户管理端点 ===

// 📋 获取用户列表（管理员）
router.get('/', authenticateUserOrAdmin, requireAdmin, async (req, res) => {
  let paginationParams
  try {
    paginationParams = inputValidator.validatePagination(req.query.page, req.query.limit)
  } catch (validationError) {
    return res.status(400).json({
      error: 'Invalid pagination',
      message: validationError.message
    })
  }

  try {
    const { role, isActive, search } = req.query
    const searchQuery = typeof search === 'string' ? search.trim() : ''

    const options = {
      ...paginationParams,
      role,
      search: searchQuery,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined
    }

    const result = await userService.getAllUsers(options)

    if (referralService.isEnabled()) {
      await Promise.all(
        result.users.map(async (user) => {
          user.referralStats = await referralService.getUserStats(user.id)
          return user
        })
      )
    }

    res.json({
      success: true,
      users: result.users,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      }
    })
  } catch (error) {
    logger.error('❌ Get users list error:', error)
    res.status(500).json({
      error: 'Users list error',
      message: 'Failed to retrieve users list'
    })
  }
})

// 👤 获取特定用户信息（管理员）
router.get('/:userId/referrals', authenticateUserOrAdmin, requireAdmin, async (req, res) => {
  if (!referralService.isEnabled()) {
    return res.status(404).json({
      error: 'Referral disabled',
      message: 'Referral program is not enabled'
    })
  }

  try {
    const { userId } = req.params
    const { page = 1, limit = 20 } = req.query
    const [stats, invitees, code] = await Promise.all([
      referralService.getUserStats(userId),
      referralService.listInvitees(userId, {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
      }),
      referralService.getOrCreateReferralCode(userId)
    ])

    res.json({
      success: true,
      data: {
        code,
        stats,
        invitees
      }
    })
  } catch (error) {
    logger.error('❌ Get user referral details error:', error)
    res.status(500).json({
      error: 'Referral error',
      message: 'Failed to retrieve referral details'
    })
  }
})

router.get('/:userId', authenticateUserOrAdmin, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params

    const user = await userService.getUserById(userId)
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User not found'
      })
    }

    // 获取用户的API Keys（包括已删除的以保留统计数据）
    const apiKeys = await apiKeyService.getUserApiKeys(userId, true)

    let referralInfo = null
    if (referralService.isEnabled()) {
      referralInfo = await referralService.getReferralInfo(userId, { recentLimit: 5 })
    }

    res.json({
      success: true,
      user: {
        ...user,
        apiKeys: apiKeys.map((key) => {
          // Flatten usage structure for frontend compatibility
          let flatUsage = {
            requests: 0,
            inputTokens: 0,
            outputTokens: 0,
            totalCost: 0
          }

          if (key.usage && key.usage.total) {
            flatUsage = {
              requests: key.usage.total.requests || 0,
              inputTokens: key.usage.total.inputTokens || 0,
              outputTokens: key.usage.total.outputTokens || 0,
              totalCost: key.totalCost || 0
            }
          }

          return {
            id: key.id,
            name: key.name,
            description: key.description,
            isActive: key.isActive,
            createdAt: key.createdAt,
            lastUsedAt: key.lastUsedAt,
            usage: flatUsage,
            keyPreview: key.key
              ? `${key.key.substring(0, 8)}...${key.key.substring(key.key.length - 4)}`
              : null
          }
        })
      },
      referral: referralInfo
    })
  } catch (error) {
    logger.error('❌ Get user details error:', error)
    res.status(500).json({
      error: 'User details error',
      message: 'Failed to retrieve user details'
    })
  }
})

// 🔄 更新用户状态（管理员）
router.patch('/:userId/status', authenticateUserOrAdmin, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params
    const { isActive } = req.body

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'isActive must be a boolean value'
      })
    }

    const updatedUser = await userService.updateUserStatus(userId, isActive)

    const adminUser = req.admin?.username || req.user?.username
    logger.info(
      `🔄 Admin ${adminUser} ${isActive ? 'enabled' : 'disabled'} user: ${updatedUser.username}`
    )

    res.json({
      success: true,
      message: `User ${isActive ? 'enabled' : 'disabled'} successfully`,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        isActive: updatedUser.isActive,
        updatedAt: updatedUser.updatedAt
      }
    })
  } catch (error) {
    logger.error('❌ Update user status error:', error)
    res.status(500).json({
      error: 'Update status error',
      message: error.message || 'Failed to update user status'
    })
  }
})

// 🔄 更新用户角色（管理员）
router.patch('/:userId/role', authenticateUserOrAdmin, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params
    const { role } = req.body

    const validRoles = ['user', 'admin']
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: `Role must be one of: ${validRoles.join(', ')}`
      })
    }

    const updatedUser = await userService.updateUserRole(userId, role)

    const adminUser = req.admin?.username || req.user?.username
    logger.info(`🔄 Admin ${adminUser} changed user ${updatedUser.username} role to: ${role}`)

    res.json({
      success: true,
      message: `User role updated to ${role} successfully`,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role,
        updatedAt: updatedUser.updatedAt
      }
    })
  } catch (error) {
    logger.error('❌ Update user role error:', error)
    res.status(500).json({
      error: 'Update role error',
      message: error.message || 'Failed to update user role'
    })
  }
})

// 🔑 禁用用户的所有API Keys（管理员）
router.post('/:userId/disable-keys', authenticateUserOrAdmin, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params

    const user = await userService.getUserById(userId)
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User not found'
      })
    }

    const result = await apiKeyService.disableUserApiKeys(userId)

    const adminUser = req.admin?.username || req.user?.username
    logger.info(`🔑 Admin ${adminUser} disabled all API keys for user: ${user.username}`)

    res.json({
      success: true,
      message: `Disabled ${result.count} API keys for user ${user.username}`,
      disabledCount: result.count
    })
  } catch (error) {
    logger.error('❌ Disable user API keys error:', error)
    res.status(500).json({
      error: 'Disable keys error',
      message: 'Failed to disable user API keys'
    })
  }
})

// 📊 获取用户使用统计（管理员）
router.get('/:userId/usage-stats', authenticateUserOrAdmin, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params
    const { period = 'week', model } = req.query

    const user = await userService.getUserById(userId)
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User not found'
      })
    }

    // 获取用户的API Keys（包括已删除的以保留统计数据）
    const userApiKeys = await apiKeyService.getUserApiKeys(userId, true)
    const apiKeyIds = userApiKeys.map((key) => key.id)

    if (apiKeyIds.length === 0) {
      return res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName
        },
        stats: {
          totalRequests: 0,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalCost: 0,
          dailyStats: [],
          modelStats: []
        }
      })
    }

    // 获取使用统计
    const stats = await apiKeyService.getAggregatedUsageStats(apiKeyIds, { period, model })

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName
      },
      stats
    })
  } catch (error) {
    logger.error('❌ Get user usage stats (admin) error:', error)
    res.status(500).json({
      error: 'Usage stats error',
      message: 'Failed to retrieve user usage statistics'
    })
  }
})

// 📊 获取用户管理统计（管理员）
router.get('/stats/overview', authenticateUserOrAdmin, requireAdmin, async (req, res) => {
  try {
    const stats = await userService.getUserStats()

    res.json({
      success: true,
      stats
    })
  } catch (error) {
    logger.error('❌ Get user stats overview error:', error)
    res.status(500).json({
      error: 'Stats error',
      message: 'Failed to retrieve user statistics'
    })
  }
})

// 🔧 测试LDAP连接（管理员）
router.get('/admin/ldap-test', authenticateUserOrAdmin, requireAdmin, async (req, res) => {
  try {
    const testResult = await ldapService.testConnection()

    res.json({
      success: true,
      ldapTest: testResult,
      config: ldapService.getConfigInfo()
    })
  } catch (error) {
    logger.error('❌ LDAP test error:', error)
    res.status(500).json({
      error: 'LDAP test error',
      message: 'Failed to test LDAP connection'
    })
  }
})

// === 密码重置和邮箱验证端点 ===

// 📧 请求密码重置
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown'

    // 初始化速率限制器
    const limiters = initRateLimiters()

    // 检查IP速率限制
    if (limiters.ipRateLimiter) {
      try {
        await limiters.ipRateLimiter.consume(clientIp)
      } catch (rateLimiterRes) {
        const retryAfter = Math.round(rateLimiterRes.msBeforeNext / 1000) || 900
        logger.security(`🚫 Password reset rate limit exceeded for IP: ${clientIp}`)
        res.set('Retry-After', String(retryAfter))
        return res.status(429).json({
          error: 'Too many requests',
          message: 'Too many password reset attempts. Please try again later.'
        })
      }
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        error: 'Missing email',
        message: 'Email address is required'
      })
    }

    // 验证邮箱格式
    try {
      inputValidator.validateEmail(email)
    } catch (validationError) {
      return res.status(400).json({
        error: 'Invalid email',
        message: validationError.message
      })
    }

    // 生成重置Token并发送邮件
    await userService.generatePasswordResetToken(email.trim())

    logger.info(`📧 Password reset requested for: ${email} from IP: ${clientIp}`)

    // 始终返回成功响应（安全考虑：不透露用户是否存在）
    res.json({
      success: true,
      message:
        'If a user account with that email exists, a password reset link has been sent to it.'
    })
  } catch (error) {
    logger.error('❌ Forgot password error:', error)

    // 如果是速率限制错误，返回具体错误信息
    if (error.message.includes('Too many')) {
      return res.status(429).json({
        error: 'Too many requests',
        message: error.message
      })
    }

    // 其他错误也返回通用成功消息（安全考虑）
    res.json({
      success: true,
      message:
        'If a user account with that email exists, a password reset link has been sent to it.'
    })
  }
})

// 🔓 重置密码
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown'

    if (!token || !newPassword) {
      return res.status(400).json({
        error: 'Missing fields',
        message: 'Reset token and new password are required'
      })
    }

    // 验证新密码格式
    try {
      inputValidator.validatePassword(newPassword)
    } catch (validationError) {
      return res.status(400).json({
        error: 'Invalid password',
        message: validationError.message
      })
    }

    // 使用Token重置密码
    await userService.resetPasswordWithToken(token, newPassword)

    logger.info(`🔓 Password reset successful from IP: ${clientIp}`)

    res.json({
      success: true,
      message: 'Password reset successfully. Please log in with your new password.'
    })
  } catch (error) {
    logger.error('❌ Reset password error:', error)

    if (
      error.message.includes('Invalid') ||
      error.message.includes('expired') ||
      error.message.includes('not found')
    ) {
      return res.status(400).json({
        error: 'Reset failed',
        message: error.message
      })
    }

    res.status(500).json({
      error: 'Reset password error',
      message: 'Failed to reset password. Please try again.'
    })
  }
})

// ✅ 验证邮箱
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown'

    if (!token) {
      return res.status(400).json({
        error: 'Missing token',
        message: 'Verification token is required'
      })
    }

    // 验证邮箱
    const result = await userService.verifyEmail(token)

    logger.info(
      `✅ Email verified successfully for user: ${result.user.username} from IP: ${clientIp}`
    )

    res.json({
      success: true,
      message: 'Email verified successfully',
      user: result.user
    })
  } catch (error) {
    logger.error('❌ Verify email error:', error)

    if (
      error.message.includes('Invalid') ||
      error.message.includes('expired') ||
      error.message.includes('not found')
    ) {
      return res.status(400).json({
        error: 'Verification failed',
        message: error.message
      })
    }

    res.status(500).json({
      error: 'Verification error',
      message: 'Failed to verify email. Please try again.'
    })
  }
})

// 🔄 重新发送验证邮件
router.post('/resend-verification', authenticateUser, async (req, res) => {
  try {
    const result = await userService.resendVerificationEmail(req.user.id)

    if (result.skipped) {
      return res.json({
        success: true,
        message: 'Email verification is not enabled'
      })
    }

    logger.info(`🔄 Verification email resent for user: ${req.user.username}`)

    res.json({
      success: true,
      message: 'Verification email sent successfully'
    })
  } catch (error) {
    logger.error('❌ Resend verification error:', error)

    if (error.message.includes('Too many')) {
      return res.status(429).json({
        error: 'Too many requests',
        message: error.message
      })
    }

    if (error.message.includes('already verified')) {
      return res.json({
        success: true,
        message: 'Email is already verified'
      })
    }

    res.status(500).json({
      error: 'Resend error',
      message: 'Failed to resend verification email'
    })
  }
})

// 🔓 管理员重置用户密码
router.post('/:userId/reset-password', authenticateUserOrAdmin, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params
    const { newPassword } = req.body

    if (!newPassword) {
      return res.status(400).json({
        error: 'Missing password',
        message: 'New password is required'
      })
    }

    // 验证新密码格式
    try {
      inputValidator.validatePassword(newPassword)
    } catch (validationError) {
      return res.status(400).json({
        error: 'Invalid password',
        message: validationError.message
      })
    }

    // 重置用户密码
    await userService.resetUserPassword(userId, newPassword)

    const adminUser = req.admin?.username || req.user?.username
    logger.info(`🔓 Admin ${adminUser} reset password for user ID: ${userId}`)

    res.json({
      success: true,
      message: 'User password reset successfully'
    })
  } catch (error) {
    logger.error('❌ Admin reset password error:', error)

    if (error.message.includes('not found') || error.message.includes('Only local users')) {
      return res.status(400).json({
        error: 'Reset failed',
        message: error.message
      })
    }

    res.status(500).json({
      error: 'Reset password error',
      message: 'Failed to reset user password'
    })
  }
})

module.exports = router
