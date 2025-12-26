const crypto = require('crypto')
const redis = require('../models/redis')
const logger = require('../utils/logger')

class PromotionService {
  constructor() {
    this.promotionPrefix = 'user_promotion:'
    this.promotionStatsPrefix = 'promotion_stats:'
    this.promotionRecordPrefix = 'promotion_record:'
    this.userPromotionRecordsPrefix = 'promotion_records:user:'
    this.globalPromotionRecordsKey = 'promotion_records:all'

    // 优惠档位配置
    this.tiers = [
      {
        id: 1,
        hours: 24,
        bonus: parseInt(process.env.PROMOTION_TIER1_BONUS) || 30,
        minAmount: parseInt(process.env.PROMOTION_MIN_AMOUNT) || 100,
        label: '充100得130',
        timeLabel: '24小时内'
      },
      {
        id: 2,
        hours: 36,
        bonus: parseInt(process.env.PROMOTION_TIER2_BONUS) || 20,
        minAmount: parseInt(process.env.PROMOTION_MIN_AMOUNT) || 100,
        label: '充100得120',
        timeLabel: '36小时内'
      },
      {
        id: 3,
        hours: 48,
        bonus: parseInt(process.env.PROMOTION_TIER3_BONUS) || 10,
        minAmount: parseInt(process.env.PROMOTION_MIN_AMOUNT) || 100,
        label: '充100得110',
        timeLabel: '48小时内'
      },
      {
        id: 4,
        hours: 72,
        bonus: parseInt(process.env.PROMOTION_TIER4_BONUS) || 5,
        minAmount: parseInt(process.env.PROMOTION_MIN_AMOUNT) || 100,
        label: '充100得105',
        timeLabel: '72小时内'
      }
    ]

    // 配置
    this.enabled = process.env.PROMOTION_ENABLED !== 'false' // 默认启用
    this.autoStartForNewUsers = process.env.PROMOTION_AUTO_START_NEW_USER !== 'false' // 默认启用
    this.durationHours = parseInt(process.env.PROMOTION_DURATION_HOURS) || 72
  }

  /**
   * 检查优惠功能是否启用
   */
  isEnabled() {
    return this.enabled
  }

  /**
   * 初始化用户优惠（注册时调用）
   */
  async initUserPromotion(userId, username = '') {
    try {
      if (!this.enabled) {
        logger.info('❌ Promotion feature is disabled')
        return null
      }

      const key = `${this.promotionPrefix}${userId}`

      // 检查是否已存在
      const existing = await redis.getClientSafe().get(key)
      if (existing) {
        logger.info(`ℹ️ Promotion already exists for user ${userId}`)
        return JSON.parse(existing)
      }

      const promotionData = {
        userId,
        username,
        startTime: new Date().toISOString(),
        hasUsed: false,
        usedAt: null,
        tierUsed: null,
        expiresAt: new Date(Date.now() + this.durationHours * 3600 * 1000).toISOString(),
        createdAt: new Date().toISOString()
      }

      // 设置过期时间（比活动时间多1天，用于历史记录）
      const ttl = (this.durationHours + 24) * 3600
      await redis.getClientSafe().setex(key, ttl, JSON.stringify(promotionData))

      logger.success(`🎁 Promotion initialized for user ${username} (${userId})`)

      // 更新统计
      await this.incrementStats('promotionActivated')

      return promotionData
    } catch (error) {
      logger.error('❌ Error initializing promotion:', error)
      throw error
    }
  }

  /**
   * 获取用户当前优惠状态
   */
  async getUserPromotion(userId) {
    try {
      const key = `${this.promotionPrefix}${userId}`
      const data = await redis.getClientSafe().get(key)

      if (!data) {
        return null
      }

      const promotion = JSON.parse(data)
      const now = Date.now()
      const startTime = new Date(promotion.startTime).getTime()
      const elapsed = now - startTime
      const hours = elapsed / (1000 * 3600)

      // 确定当前档位
      let currentTier = -1
      let currentTierData = null
      let currentBonus = 0
      let remainingSeconds = 0

      if (!promotion.hasUsed && hours < this.durationHours) {
        // 根据经过的时间确定当前档位
        for (let i = 0; i < this.tiers.length; i++) {
          if (hours < this.tiers[i].hours) {
            currentTier = i
            currentTierData = this.tiers[i]
            currentBonus = this.tiers[i].bonus

            // 计算当前档位剩余秒数
            const tierEndTime = startTime + this.tiers[i].hours * 3600 * 1000
            remainingSeconds = Math.max(0, Math.floor((tierEndTime - now) / 1000))
            break
          }
        }
      }

      return {
        ...promotion,
        currentTier,
        currentTierData,
        currentBonus,
        remainingSeconds,
        remainingHours: Math.max(0, this.durationHours - hours),
        hoursElapsed: hours,
        isExpired: hours >= this.durationHours,
        isAvailable: !promotion.hasUsed && hours < this.durationHours
      }
    } catch (error) {
      logger.error('❌ Error getting user promotion:', error)
      return null
    }
  }

  /**
   * 计算充值赠送金额
   */
  calculateBonus(amount, bonusRate) {
    return amount * (bonusRate / 100)
  }

  /**
   * 评估优惠可用性
   */
  async applyPromotion(userId, amount) {
    try {
      return await this.evaluatePromotion(userId, amount)
    } catch (error) {
      logger.error('❌ Error evaluating promotion:', error)
      return {
        amount,
        bonus: 0,
        total: amount,
        applied: false,
        message: 'Error applying promotion'
      }
    }
  }

  async evaluatePromotion(userId, amount) {
    if (!this.enabled) {
      return {
        amount,
        bonus: 0,
        total: amount,
        applied: false,
        message: 'Promotion feature is disabled'
      }
    }

    const promotion = await this.getUserPromotion(userId)

    if (!promotion) {
      return {
        amount,
        bonus: 0,
        total: amount,
        applied: false,
        message: 'No promotion available for this user'
      }
    }

    if (promotion.hasUsed) {
      return {
        amount,
        bonus: 0,
        total: amount,
        applied: false,
        message: 'Promotion has already been used'
      }
    }

    if (promotion.isExpired) {
      return {
        amount,
        bonus: 0,
        total: amount,
        applied: false,
        message: 'Promotion has expired'
      }
    }

    if (promotion.currentTier === -1) {
      return {
        amount,
        bonus: 0,
        total: amount,
        applied: false,
        message: 'No valid tier available'
      }
    }

    const minAmount = promotion.currentTierData.minAmount
    if (amount < minAmount) {
      return {
        amount,
        bonus: 0,
        total: amount,
        applied: false,
        message: `Minimum recharge amount is ${minAmount} to enjoy promotion`
      }
    }

    const bonus = this.calculateBonus(amount, promotion.currentBonus)

    return {
      amount,
      bonus,
      total: amount + bonus,
      applied: true,
      tier: promotion.currentTier,
      tierData: promotion.currentTierData,
      bonusRate: promotion.currentBonus,
      message: `Eligible for ${promotion.currentBonus}% bonus`
    }
  }

  /**
   * 标记优惠已使用
   */
  async markPromotionUsed(userId, tier, amount, bonus, metadata = {}) {
    try {
      const key = `${this.promotionPrefix}${userId}`
      const data = await redis.getClientSafe().get(key)

      if (data) {
        const promotion = JSON.parse(data)
        promotion.hasUsed = true
        promotion.usedAt = new Date().toISOString()
        promotion.tierUsed = tier
        promotion.amountRecharged = amount
        promotion.bonusReceived = bonus
        promotion.totalReceived = amount + bonus
        promotion.metadata = metadata

        // 更新数据，保持原有的TTL
        const ttl = await redis.getClientSafe().ttl(key)
        if (ttl > 0) {
          await redis.getClientSafe().setex(key, ttl, JSON.stringify(promotion))
        } else {
          await redis.getClientSafe().set(key, JSON.stringify(promotion))
        }

        // 更新统计
        await this.incrementStats(`tier${tier + 1}Used`)
        await this.incrementStats('totalBonusAmount', bonus)
        await this.incrementStats('totalRechargeAmount', amount)

        const tierData = this.tiers[tier] || null
        await this.recordPromotionEvent(userId, {
          tier,
          bonusRate: tierData?.bonus || metadata.bonusRate,
          amount,
          bonus,
          status: metadata.status || 'completed',
          source: metadata.source || 'system',
          metadata
        })

        logger.info(`✅ Marked promotion as used for user ${userId}`)
      }
    } catch (error) {
      logger.error('❌ Error marking promotion as used:', error)
      throw error
    }
  }

  async recordPromotionEvent(userId, event = {}) {
    try {
      const client = redis.getClientSafe()
      const recordId = event.id || `promo_${crypto.randomBytes(8).toString('hex')}`
      const record = {
        id: recordId,
        userId,
        tier: typeof event.tier === 'number' ? event.tier : null,
        bonusRate:
          typeof event.bonusRate === 'number' ? event.bonusRate : event.metadata?.bonusRate || null,
        amount: Number.isFinite(event.amount) ? Number(event.amount) : 0,
        bonus: Number.isFinite(event.bonus) ? Number(event.bonus) : 0,
        status: event.status || 'completed',
        source: event.source || 'system',
        message: event.message || '',
        metadata: event.metadata || {},
        createdAt: event.createdAt || new Date().toISOString()
      }

      await client.set(`${this.promotionRecordPrefix}${recordId}`, JSON.stringify(record))
      await client.lpush(`${this.userPromotionRecordsPrefix}${userId}`, recordId)
      await client.lpush(this.globalPromotionRecordsKey, recordId)

      return record
    } catch (error) {
      logger.error('❌ Error recording promotion event:', error)
      return null
    }
  }

  async getUserPromotionRecords(userId, options = {}) {
    try {
      const limit = Math.max(1, parseInt(options.limit, 10) || 10)
      const client = redis.getClientSafe()
      const listKey = `${this.userPromotionRecordsPrefix}${userId}`
      const total = await client.llen(listKey)
      const recordIds = await client.lrange(listKey, 0, limit - 1)

      if (!recordIds || recordIds.length === 0) {
        return { total, records: [] }
      }

      const records = []
      for (const recordId of recordIds) {
        const data = await client.get(`${this.promotionRecordPrefix}${recordId}`)
        if (data) {
          records.push(JSON.parse(data))
        }
      }

      return { total, records }
    } catch (error) {
      logger.error('❌ Error getting promotion records:', error)
      return { total: 0, records: [] }
    }
  }

  /**
   * 手动为用户开启优惠（管理员功能）
   */
  async activatePromotionForUser(userId, username = '', adminId = null) {
    try {
      const existing = await this.getUserPromotion(userId)

      if (existing && !existing.isExpired) {
        return {
          success: false,
          message: 'User already has an active promotion'
        }
      }

      const result = await this.initUserPromotion(userId, username)

      if (result) {
        logger.info(`🎁 Admin ${adminId} activated promotion for user ${username} (${userId})`)
        return {
          success: true,
          data: result,
          message: 'Promotion activated successfully'
        }
      }

      return {
        success: false,
        message: 'Failed to activate promotion'
      }
    } catch (error) {
      logger.error('❌ Error activating promotion:', error)
      return {
        success: false,
        message: error.message
      }
    }
  }

  /**
   * 获取优惠统计数据
   */
  async getPromotionStats() {
    try {
      const client = redis.getClientSafe()
      const keys = await client.keys(`${this.promotionStatsPrefix}*`)
      const stats = {}

      for (const key of keys) {
        const statName = key.replace(this.promotionStatsPrefix, '')
        const value = await client.get(key)
        stats[statName] = parseInt(value) || 0
      }

      // 计算转化率
      if (stats.promotionActivated && stats.promotionActivated > 0) {
        const usedCount =
          (stats.tier1Used || 0) +
          (stats.tier2Used || 0) +
          (stats.tier3Used || 0) +
          (stats.tier4Used || 0)
        stats.conversionRate = `${((usedCount / stats.promotionActivated) * 100).toFixed(2)}%`
      } else {
        stats.conversionRate = '0%'
      }

      // 计算平均充值金额
      if (stats.totalRechargeAmount && stats.totalRechargeAmount > 0) {
        const totalUsed =
          (stats.tier1Used || 0) +
          (stats.tier2Used || 0) +
          (stats.tier3Used || 0) +
          (stats.tier4Used || 0)
        if (totalUsed > 0) {
          stats.avgRechargeAmount = (stats.totalRechargeAmount / totalUsed).toFixed(2)
        }
      }

      return stats
    } catch (error) {
      logger.error('❌ Error getting promotion stats:', error)
      return {}
    }
  }

  /**
   * 增加统计计数
   */
  async incrementStats(statName, value = 1) {
    try {
      const key = `${this.promotionStatsPrefix}${statName}`
      const client = redis.getClientSafe()

      if (value === 1) {
        await client.incr(key)
      } else {
        await client.incrby(key, value)
      }
    } catch (error) {
      logger.error(`❌ Error incrementing stat ${statName}:`, error)
    }
  }

  /**
   * 清理过期的优惠数据（定期任务）
   */
  async cleanupExpiredPromotions() {
    try {
      const client = redis.getClientSafe()
      const keys = await client.keys(`${this.promotionPrefix}*`)
      let cleanedCount = 0

      for (const key of keys) {
        const ttl = await client.ttl(key)
        // TTL为-1表示没有过期时间，检查是否应该删除
        if (ttl === -1) {
          const data = await client.get(key)
          if (data) {
            const promotion = JSON.parse(data)
            const expiresAt = new Date(promotion.expiresAt).getTime()
            const dayAfterExpiry = expiresAt + 24 * 3600 * 1000

            if (Date.now() > dayAfterExpiry) {
              await client.del(key)
              cleanedCount++
            }
          }
        }
      }

      if (cleanedCount > 0) {
        logger.info(`🧹 Cleaned up ${cleanedCount} expired promotions`)
      }

      return cleanedCount
    } catch (error) {
      logger.error('❌ Error cleaning up expired promotions:', error)
      return 0
    }
  }
}

module.exports = new PromotionService()
