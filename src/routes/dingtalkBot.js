const express = require('express')
const crypto = require('crypto')
const logger = require('../utils/logger')
const config = require('../../config/config')
const userService = require('../services/userService')

const router = express.Router()

function createTextResponse(message) {
  return {
    msgtype: 'text',
    text: {
      content: message
    }
  }
}

function cleanContent(rawContent = '', atUsers = []) {
  let content = rawContent.replace(/\r?\n/g, ' ')

  if (Array.isArray(atUsers)) {
    for (const user of atUsers) {
      if (user?.staffId) {
        const pattern = new RegExp(`@${user.staffId}`, 'g')
        content = content.replace(pattern, ' ')
      }
      if (user?.dingtalkId) {
        const pattern = new RegExp(`@${user.dingtalkId}`, 'g')
        content = content.replace(pattern, ' ')
      }
    }
  }

  // 移除通用 @xxx 片段
  content = content.replace(/@\S+/g, ' ')
  return content.replace(/\s+/g, ' ').trim()
}

function extractCommandParts(content) {
  if (!content) {
    return { username: '', amountText: '' }
  }

  const bracketMatches = [...content.matchAll(/《([^》]+)》/g)]
  if (bracketMatches.length >= 2) {
    return {
      username: bracketMatches[0][1]?.trim() || '',
      amountText: bracketMatches[1][1]?.trim() || ''
    }
  }

  const parts = content.split(/\s+/).filter(Boolean)
  return {
    username: parts[0] || '',
    amountText: parts[1] || ''
  }
}

function parseAmount(amountText) {
  if (!amountText) {
    return NaN
  }
  const sanitized = amountText.replace(/[^0-9.,-]/g, '').replace(/,/g, '')
  return parseFloat(sanitized)
}

function verifySignature(secret, timestamp, providedSign) {
  if (!secret) {
    return true
  }
  if (!timestamp || !providedSign) {
    return false
  }

  try {
    const stringToSign = `${timestamp}\n${secret}`
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(stringToSign)
    const expected = hmac.digest('base64')
    const decodedProvided = decodeURIComponent(providedSign)
    return expected === decodedProvided || expected === providedSign
  } catch (error) {
    logger.error('❌ Failed to verify DingTalk signature:', error)
    return false
  }
}

router.post('/recharge', async (req, res) => {
  const botConfig = config.dingtalkBot || {}
  if (!botConfig.enabled) {
    return res.status(503).json(createTextResponse('钉钉机器人充值功能未启用'))
  }

  const tokenFromRequest = req.query.token || req.headers['x-dingtalk-token']
  if (botConfig.accessToken && tokenFromRequest !== botConfig.accessToken) {
    logger.warn('⚠️ DingTalk bot request rejected due to invalid access token')
    return res.status(401).json(createTextResponse('Token 无效'))
  }

  if (botConfig.signSecret) {
    const { timestamp, sign } = req.query
    if (!verifySignature(botConfig.signSecret, timestamp, sign)) {
      logger.warn('⚠️ DingTalk bot request rejected due to invalid signature')
      return res.status(401).json(createTextResponse('签名校验失败'))
    }
  }

  const {
    text = {},
    markdown = {},
    atUsers = [],
    senderNick,
    senderId,
    senderStaffId,
    conversationId
  } = req.body || {}

  const content = cleanContent(text.content || markdown.text || '', atUsers)
  if (!content) {
    return res.status(400).json(createTextResponse('请按照 “《用户名》 《金额》” 的格式发送消息'))
  }

  const { username, amountText } = extractCommandParts(content)
  if (!username || !amountText) {
    return res
      .status(400)
      .json(createTextResponse('解析失败，请提供用户名和金额，例如 《user》 《10》'))
  }

  const amount = parseAmount(amountText)
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json(createTextResponse('金额格式不正确，请输入大于0的数字'))
  }

  const senderIdentifier = senderStaffId || senderId || ''
  const allowedSenderIds = botConfig.allowedSenderIds || []
  if (allowedSenderIds.length > 0 && !allowedSenderIds.includes(senderIdentifier)) {
    logger.warn('⚠️ DingTalk bot request rejected due to sender not in allow-list', {
      senderIdentifier
    })
    return res.status(403).json(createTextResponse('当前钉钉账号无权执行充值'))
  }

  try {
    const user = await userService.getUserByUsername(username)
    if (!user) {
      return res.status(404).json(createTextResponse(`未找到用户 ${username}`))
    }

    const operatorName = senderNick || senderIdentifier || 'dingtalk-bot'
    const remarkParts = []
    if (botConfig.defaultRemark) {
      remarkParts.push(botConfig.defaultRemark)
    }
    remarkParts.push(`From:${operatorName}`)
    if (conversationId) {
      remarkParts.push(`Conv:${conversationId}`)
    }

    const rechargeResult = await userService.rechargeBalance(
      user.id,
      amount,
      {
        id: senderIdentifier || 'dingtalk-bot',
        name: operatorName
      },
      remarkParts.filter(Boolean).join(' / '),
      {
        recordType: 'manual',
        source: 'dingtalk-bot'
      }
    )

    logger.info(
      `🤖 DingTalk recharge success: ${username} +$${amount.toFixed(2)} by ${operatorName}`
    )

    return res.json(
      createTextResponse(
        `✅ 成功为 ${user.username} 充值 $${amount.toFixed(2)}，当前余额 $${(rechargeResult.balance || 0).toFixed(2)}`
      )
    )
  } catch (error) {
    logger.error('❌ DingTalk recharge error:', error)
    return res.status(500).json(createTextResponse('服务器处理失败，请稍后再试'))
  }
})

module.exports = router
