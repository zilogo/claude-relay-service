const nodemailer = require('nodemailer')
const logger = require('../utils/logger')
const config = require('../../config/config')

class EmailService {
  constructor() {
    this.transporter = null
    this.isConfigured = false
  }

  // 初始化邮件传输器
  async initialize() {
    if (!config.email?.enabled) {
      logger.warn('⚠️ Email service is disabled in configuration')
      return false
    }

    if (!config.email.smtp?.host || !config.email.smtp?.auth?.user) {
      logger.warn('⚠️ Email service is enabled but SMTP configuration is incomplete')
      return false
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: config.email.smtp.host,
        port: config.email.smtp.port,
        secure: config.email.smtp.secure, // true for 465, false for other ports
        auth: {
          user: config.email.smtp.auth.user,
          pass: config.email.smtp.auth.pass
        },
        // 连接超时
        connectionTimeout: 10000,
        // 发送超时
        greetingTimeout: 10000,
        // 套接字超时
        socketTimeout: 10000
      })

      // 验证配置
      await this.transporter.verify()
      this.isConfigured = true
      logger.info('✅ Email service initialized successfully')
      return true
    } catch (error) {
      logger.error('❌ Email service initialization failed:', error)
      this.isConfigured = false
      return false
    }
  }

  // 检查邮件服务是否可用
  isAvailable() {
    return this.isConfigured && config.email?.enabled
  }

  // 发送邮件（基础方法）
  async sendEmail(options) {
    if (!this.isAvailable()) {
      // 如果服务未启用，先尝试初始化
      const initialized = await this.initialize()
      if (!initialized) {
        throw new Error('Email service is not available')
      }
    }

    const { to, subject, html, text } = options

    // 验证必需参数
    if (!to || !subject || (!html && !text)) {
      throw new Error('Missing required email parameters (to, subject, html/text)')
    }

    const mailOptions = {
      from: {
        name: config.email.from.name || 'Claude Relay Service',
        address: config.email.from.address
      },
      to,
      subject,
      html,
      text: text || this._stripHtml(html) // 如果没有纯文本，从HTML生成
    }

    try {
      const info = await this.transporter.sendMail(mailOptions)
      logger.info(`📧 Email sent successfully to ${to}: ${subject}`, {
        messageId: info.messageId,
        response: info.response
      })
      return {
        success: true,
        messageId: info.messageId
      }
    } catch (error) {
      logger.error(`❌ Failed to send email to ${to}:`, error)
      throw error
    }
  }

  // 发送密码重置邮件
  async sendPasswordResetEmail(email, resetToken, username) {
    if (!config.email?.features?.allowPasswordReset) {
      throw new Error('Password reset feature is disabled')
    }

    // 构建重置链接
    const resetUrl = `${config.email.baseUrl || 'http://localhost:3000'}/admin-next/#/reset-password/${resetToken}`

    // 计算过期时间
    const expiresIn = Math.floor(config.email.tokenTTL.passwordReset / 60) // 转换为分钟

    const html = this._renderPasswordResetTemplate({
      username,
      resetUrl,
      expiresIn
    })

    return await this.sendEmail({
      to: email,
      subject: '重置您的密码 - Claude Relay Service',
      html
    })
  }

  // 发送邮箱验证邮件
  async sendEmailVerificationEmail(email, verificationToken, username) {
    if (!config.email?.features?.requireEmailVerification) {
      logger.warn('Email verification is disabled, skipping verification email')
      return { success: true, skipped: true }
    }

    // 构建验证链接
    const verificationUrl = `${config.email.baseUrl || 'http://localhost:3000'}/admin-next/#/verify-email/${verificationToken}`

    // 计算过期时间
    const expiresIn = Math.floor(config.email.tokenTTL.emailVerification / 3600) // 转换为小时

    const html = this._renderEmailVerificationTemplate({
      username,
      verificationUrl,
      expiresIn
    })

    return await this.sendEmail({
      to: email,
      subject: '验证您的邮箱地址 - Claude Relay Service',
      html
    })
  }

  // 渲染密码重置邮件模板
  _renderPasswordResetTemplate({ username, resetUrl, expiresIn }) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>密码重置</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1f2937;">🔐 重置您的密码</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.5; color: #4b5563;">
                您好，<strong>${username}</strong>！
              </p>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.5; color: #4b5563;">
                我们收到了您的密码重置请求。请点击下方按钮重置密码：
              </p>

              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500;">
                      重置密码
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0; font-size: 14px; line-height: 1.5; color: #6b7280;">
                或者复制以下链接到浏览器：<br>
                <a href="${resetUrl}" style="color: #3b82f6; word-break: break-all;">${resetUrl}</a>
              </p>

              <!-- Warning -->
              <div style="margin: 30px 0; padding: 16px; background-color: #fef3c7; border-left: 4px solid: #f59e0b; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #92400e;">
                  <strong>⚠️ 重要提示：</strong><br>
                  • 此链接将在 <strong>${expiresIn} 分钟</strong>后过期<br>
                  • 如果您没有请求重置密码，请忽略此邮件<br>
                  • 为了您的账户安全，请勿将此邮件转发给他人
                </p>
              </div>

              <p style="margin: 20px 0 0; font-size: 14px; line-height: 1.5; color: #6b7280;">
                如有疑问，请联系我们的支持团队。
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #9ca3af; text-align: center;">
                此邮件由 Claude Relay Service 自动发送，请勿直接回复。<br>
                © ${new Date().getFullYear()} Claude Relay Service. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
  }

  // 渲染邮箱验证邮件模板
  _renderEmailVerificationTemplate({ username, verificationUrl, expiresIn }) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>验证邮箱</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1f2937;">📧 验证您的邮箱地址</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.5; color: #4b5563;">
                您好，<strong>${username}</strong>！
              </p>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.5; color: #4b5563;">
                感谢您注册 Claude Relay Service！请点击下方按钮验证您的邮箱地址：
              </p>

              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${verificationUrl}" style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500;">
                      验证邮箱
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0; font-size: 14px; line-height: 1.5; color: #6b7280;">
                或者复制以下链接到浏览器：<br>
                <a href="${verificationUrl}" style="color: #10b981; word-break: break-all;">${verificationUrl}</a>
              </p>

              <!-- Info -->
              <div style="margin: 30px 0; padding: 16px; background-color: #dbeafe; border-left: 4px solid #3b82f6; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #1e40af;">
                  <strong>ℹ️ 提示：</strong><br>
                  • 此链接将在 <strong>${expiresIn} 小时</strong>后过期<br>
                  • 验证邮箱后即可使用所有服务功能<br>
                  • 如果您没有注册账户，请忽略此邮件
                </p>
              </div>

              <p style="margin: 20px 0 0; font-size: 14px; line-height: 1.5; color: #6b7280;">
                如有疑问，请联系我们的支持团队。
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #9ca3af; text-align: center;">
                此邮件由 Claude Relay Service 自动发送，请勿直接回复。<br>
                © ${new Date().getFullYear()} Claude Relay Service. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
  }

  // 从HTML中提取纯文本（简单实现）
  _stripHtml(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }
}

// 导出单例
module.exports = new EmailService()
