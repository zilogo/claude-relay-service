const path = require('path')
require('dotenv').config()

const pickEnv = (...names) => {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(process.env, name)) {
      const value = process.env[name]
      if (value !== '') {
        return value
      }
    }
  }
  return undefined
}

const getIntEnv = (defaultValue, ...names) => {
  const raw = pickEnv(...names)
  if (raw === undefined) return defaultValue
  const value = parseInt(raw, 10)
  return Number.isFinite(value) ? value : defaultValue
}

const getFloatEnv = (defaultValue, ...names) => {
  const raw = pickEnv(...names)
  if (raw === undefined) return defaultValue
  const value = parseFloat(raw)
  return Number.isFinite(value) ? value : defaultValue
}

const serverPort = parseInt(process.env.PORT, 10) || 3000
const defaultBaseUrl = process.env.BASE_URL || `http://localhost:${serverPort}`

const resolvedDefaultCurrency =
  (pickEnv('PAYMENT_DEFAULT_CURRENCY', 'DEFAULT_CURRENCY') || 'CNY').toUpperCase()
const resolvedDisplayCurrency = (() => {
  const raw = pickEnv('PAYMENT_DISPLAY_CURRENCY')
  return raw ? raw.toUpperCase() : resolvedDefaultCurrency
})()

const config = {
  // 🌐 服务器配置
  server: {
    port: serverPort,
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'development',
    trustProxy: process.env.TRUST_PROXY === 'true'
  },

  // 🔐 安全配置
  security: {
    jwtSecret: process.env.JWT_SECRET || 'CHANGE-THIS-JWT-SECRET-IN-PRODUCTION',
    adminSessionTimeout: parseInt(process.env.ADMIN_SESSION_TIMEOUT) || 86400000, // 24小时
    apiKeyPrefix: process.env.API_KEY_PREFIX || 'cr_',
    encryptionKey: process.env.ENCRYPTION_KEY || 'CHANGE-THIS-32-CHARACTER-KEY-NOW'
  },

  // 📊 Redis配置
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB) || 0,
    connectTimeout: 10000,
    commandTimeout: 5000,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    enableTLS: process.env.REDIS_ENABLE_TLS === 'true'
  },

  // 🔗 会话管理配置
  session: {
    // 粘性会话TTL配置（小时），默认1小时
    stickyTtlHours: parseFloat(process.env.STICKY_SESSION_TTL_HOURS) || 1,
    // 续期阈值（分钟），默认0分钟（不续期）
    renewalThresholdMinutes: parseInt(process.env.STICKY_SESSION_RENEWAL_THRESHOLD_MINUTES) || 0
  },

  // 🎯 Claude API配置
  claude: {
    apiUrl: process.env.CLAUDE_API_URL || 'https://api.anthropic.com/v1/messages',
    apiVersion: process.env.CLAUDE_API_VERSION || '2023-06-01',
    betaHeader:
      process.env.CLAUDE_BETA_HEADER ||
      'claude-code-20250219,oauth-2025-04-20,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14',
    overloadHandling: {
      enabled: (() => {
        const minutes = parseInt(process.env.CLAUDE_OVERLOAD_HANDLING_MINUTES) || 0
        // 验证配置值：限制在0-1440分钟(24小时)内
        return Math.max(0, Math.min(minutes, 1440))
      })()
    }
  },

  // ☁️ Bedrock API配置
  bedrock: {
    enabled: process.env.CLAUDE_CODE_USE_BEDROCK === '1',
    defaultRegion: process.env.AWS_REGION || 'us-east-1',
    smallFastModelRegion: process.env.ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION,
    defaultModel: process.env.ANTHROPIC_MODEL || 'us.anthropic.claude-sonnet-4-20250514-v1:0',
    smallFastModel:
      process.env.ANTHROPIC_SMALL_FAST_MODEL || 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
    maxOutputTokens: parseInt(process.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS) || 4096,
    maxThinkingTokens: parseInt(process.env.MAX_THINKING_TOKENS) || 1024,
    enablePromptCaching: process.env.DISABLE_PROMPT_CACHING !== '1'
  },

  // 🌐 代理配置
  proxy: {
    timeout: parseInt(process.env.DEFAULT_PROXY_TIMEOUT) || 600000, // 10分钟
    maxRetries: parseInt(process.env.MAX_PROXY_RETRIES) || 3,
    // IP协议族配置：true=IPv4, false=IPv6, 默认IPv4（兼容性更好）
    useIPv4: process.env.PROXY_USE_IPV4 !== 'false' // 默认 true，只有明确设置为 'false' 才使用 IPv6
  },

  // ⏱️ 请求超时配置
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 600000, // 默认 10 分钟

  // 📈 使用限制
  limits: {
    defaultTokenLimit: parseInt(process.env.DEFAULT_TOKEN_LIMIT) || 1000000
  },

  // 📝 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dirname: path.join(__dirname, '..', 'logs'),
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5
  },

  // 🔧 系统配置
  system: {
    cleanupInterval: parseInt(process.env.CLEANUP_INTERVAL) || 3600000, // 1小时
    tokenUsageRetention: parseInt(process.env.TOKEN_USAGE_RETENTION) || 2592000000, // 30天
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 60000, // 1分钟
    timezone: process.env.SYSTEM_TIMEZONE || 'Asia/Shanghai', // 默认UTC+8（中国时区）
    timezoneOffset: parseInt(process.env.TIMEZONE_OFFSET) || 8, // UTC偏移小时数，默认+8
    metricsWindow: (() => {
      const minutes = getIntEnv(5, 'METRICS_WINDOW')
      return Math.min(Math.max(minutes, 1), 60)
    })(), // 实时指标窗口（分钟，限制在1-60之间）
    apiKeyMinuteRetentionMinutes: (() => {
      const minutes = getIntEnv(1440, 'API_KEY_MINUTE_RETENTION_MINUTES')
      // 最短保留 30 分钟，最长 7 天（10080 分钟）
      return Math.min(Math.max(minutes, 30), 10080)
    })() // API Key 分钟级调用统计保留时长
  },

  // 🛡️ 管理功能开关
  adminFeatures: {
    apiKeyReveal: {
      enabled: process.env.ADMIN_ENABLE_API_KEY_REVEAL === 'true',
      requirePassword: process.env.ADMIN_REVEAL_REQUIRE_PASSWORD !== 'false',
      requireReason: process.env.ADMIN_REVEAL_REQUIRE_REASON === 'true',
      rateLimit: getIntEnv(5, 'ADMIN_REVEAL_RATE_LIMIT'),
      rateLimitWindowSeconds: getIntEnv(300, 'ADMIN_REVEAL_RATE_WINDOW_SECONDS'),
      auditRetentionDays: getIntEnv(30, 'ADMIN_REVEAL_AUDIT_TTL'),
      encryptionAlgorithm:
        process.env.ADMIN_REVEAL_ENCRYPTION_ALGO || process.env.API_KEY_REVEAL_ALGO || 'aes-256-gcm',
      encryptionSalt:
        process.env.ADMIN_REVEAL_ENCRYPTION_SALT ||
        process.env.API_KEY_REVEAL_SALT ||
        'api-key-reveal-v1'
    }
  },

  // 🎨 Web界面配置
  web: {
    title: process.env.WEB_TITLE || 'Claude Relay Service',
    description:
      process.env.WEB_DESCRIPTION ||
      'Multi-account Claude API relay service with beautiful management interface',
    logoUrl: process.env.WEB_LOGO_URL || '/assets/logo.png',
    enableCors: process.env.ENABLE_CORS === 'true',
    sessionSecret: process.env.WEB_SESSION_SECRET || 'CHANGE-THIS-SESSION-SECRET'
  },

  // 🔐 LDAP 认证配置
  ldap: {
    enabled: process.env.LDAP_ENABLED === 'true',
    server: {
      url: process.env.LDAP_URL || 'ldap://localhost:389',
      bindDN: process.env.LDAP_BIND_DN || 'cn=admin,dc=example,dc=com',
      bindCredentials: process.env.LDAP_BIND_PASSWORD || 'admin',
      searchBase: process.env.LDAP_SEARCH_BASE || 'dc=example,dc=com',
      searchFilter: process.env.LDAP_SEARCH_FILTER || '(uid={{username}})',
      searchAttributes: process.env.LDAP_SEARCH_ATTRIBUTES
        ? process.env.LDAP_SEARCH_ATTRIBUTES.split(',')
        : ['dn', 'uid', 'cn', 'mail', 'givenName', 'sn'],
      timeout: parseInt(process.env.LDAP_TIMEOUT) || 5000,
      connectTimeout: parseInt(process.env.LDAP_CONNECT_TIMEOUT) || 10000,
      // TLS/SSL 配置
      tls: {
        // 是否忽略证书错误 (用于自签名证书)
        rejectUnauthorized: process.env.LDAP_TLS_REJECT_UNAUTHORIZED !== 'false', // 默认验证证书，设置为false则忽略
        // CA证书文件路径 (可选，用于自定义CA证书)
        ca: process.env.LDAP_TLS_CA_FILE
          ? require('fs').readFileSync(process.env.LDAP_TLS_CA_FILE)
          : undefined,
        // 客户端证书文件路径 (可选，用于双向认证)
        cert: process.env.LDAP_TLS_CERT_FILE
          ? require('fs').readFileSync(process.env.LDAP_TLS_CERT_FILE)
          : undefined,
        // 客户端私钥文件路径 (可选，用于双向认证)
        key: process.env.LDAP_TLS_KEY_FILE
          ? require('fs').readFileSync(process.env.LDAP_TLS_KEY_FILE)
          : undefined,
        // 服务器名称 (用于SNI，可选)
        servername: process.env.LDAP_TLS_SERVERNAME || undefined
      }
    },
    userMapping: {
      username: process.env.LDAP_USER_ATTR_USERNAME || 'uid',
      displayName: process.env.LDAP_USER_ATTR_DISPLAY_NAME || 'cn',
      email: process.env.LDAP_USER_ATTR_EMAIL || 'mail',
      firstName: process.env.LDAP_USER_ATTR_FIRST_NAME || 'givenName',
      lastName: process.env.LDAP_USER_ATTR_LAST_NAME || 'sn'
    }
  },

  // 👥 用户管理配置
  userManagement: {
    enabled: process.env.USER_MANAGEMENT_ENABLED === 'true',
    defaultUserRole: process.env.DEFAULT_USER_ROLE || 'user',
    userSessionTimeout: parseInt(process.env.USER_SESSION_TIMEOUT) || 86400000, // 24小时
    maxApiKeysPerUser: parseInt(process.env.MAX_API_KEYS_PER_USER) || 1,
    allowUserDeleteApiKeys: process.env.ALLOW_USER_DELETE_API_KEYS === 'true' // 默认不允许用户删除自己的API Keys
  },

  // 🎁 新用户注册赠送配置
  signupBonus: {
    enabled: process.env.SIGNUP_BONUS_ENABLED === 'true',
    amountUsd: getFloatEnv(2.0, 'SIGNUP_BONUS_AMOUNT_USD'), // 默认赠送 2 美元
    remark: process.env.SIGNUP_BONUS_REMARK || '新用户注册测试金'
  },

  // 🔑 本地认证配置
  localAuth: {
    enabled: process.env.LOCAL_AUTH_ENABLED === 'true',
    allowSelfRegistration: process.env.ALLOW_SELF_REGISTRATION !== 'false', // 默认允许自助注册
    passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH) || 8,
    passwordMaxLength: parseInt(process.env.PASSWORD_MAX_LENGTH) || 128,
    requirePasswordChange: process.env.REQUIRE_PASSWORD_CHANGE === 'true' // 首次登录是否强制修改密码
  },

  // 🎁 邀请返利配置
  referralProgram: {
    enabled: process.env.REFERRAL_PROGRAM_ENABLED === 'true',
    linkBaseUrl: process.env.REFERRAL_LINK_BASE_URL || `${defaultBaseUrl}/user-register`,
    rewardUsd: getFloatEnv(10, 'REFERRAL_REWARD_USD'),
    qualifiedRechargeCny: getFloatEnv(20, 'REFERRAL_QUALIFIED_RECHARGE_CNY'),
    qualifiedRechargeUsd: getFloatEnv(undefined, 'REFERRAL_QUALIFIED_RECHARGE_USD'),
    qualifiedRechargeTypes: process.env.REFERRAL_QUALIFIED_RECHARGE_TYPES
      ? process.env.REFERRAL_QUALIFIED_RECHARGE_TYPES.split(',')
          .map((type) => type.trim())
          .filter(Boolean)
      : ['payment'],
    maxRewardsPerInvitee: getIntEnv(1, 'REFERRAL_MAX_REWARDS_PER_INVITEE'),
    maxInviteesPerUser: getIntEnv(0, 'REFERRAL_MAX_INVITEES_PER_USER'),
    codeLength: getIntEnv(8, 'REFERRAL_CODE_LENGTH'),
    rulesDescription:
      process.env.REFERRAL_RULES_DESCRIPTION ||
      '所有注册的用户都具备资格，当推荐的客户通过您的链接完成账号的注册，并通过在线支付充值20元以上时，我们赠送您10美金的使用额度，该额度将直接存入您的账户中；该赠送额度没有使用期限；注意：只有在线支付充值(ZPAY/Stripe)才计入邀请奖励条件，管理员手动充值不计入；'
  },

  // 🤖 钉钉机器人（入站）配置
  dingtalkBot: {
    enabled: process.env.DINGTALK_BOT_ENABLED === 'true',
    accessToken: process.env.DINGTALK_BOT_ACCESS_TOKEN || '',
    signSecret: process.env.DINGTALK_BOT_SIGN_SECRET || '',
    allowedSenderIds: process.env.DINGTALK_BOT_ALLOWED_SENDERS
      ? process.env.DINGTALK_BOT_ALLOWED_SENDERS.split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      : [],
    defaultRemark: process.env.DINGTALK_BOT_DEFAULT_REMARK || '钉钉机器人充值'
  },

  // 📧 邮件服务配置
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    serviceType: process.env.EMAIL_SERVICE_TYPE || 'smtp', // smtp / sendgrid / mailgun
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    },
    from: {
      name: process.env.EMAIL_FROM_NAME || 'Claude Relay Service',
      address: process.env.EMAIL_FROM_ADDRESS || 'noreply@example.com'
    },
    baseUrl: process.env.BASE_URL || 'http://localhost:3000', // 用于生成邮件中的链接
    features: {
      requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === 'true', // 是否要求邮箱验证
      allowPasswordReset: process.env.ALLOW_PASSWORD_RESET !== 'false' // 是否允许密码找回，默认允许
    },
    rateLimit: {
      window: parseInt(process.env.EMAIL_RATE_LIMIT_WINDOW) || 600, // 10分钟（秒）
      max: parseInt(process.env.EMAIL_RATE_LIMIT_MAX) || 3 // 窗口期内最多发送次数
    },
    tokenTTL: {
      emailVerification: parseInt(process.env.EMAIL_VERIFICATION_TOKEN_TTL) || 86400, // 24小时（秒）
      passwordReset: parseInt(process.env.PASSWORD_RESET_TOKEN_TTL) || 3600 // 1小时（秒）
    }
  },

  // 💳 支付系统配置
  payment: {
    enabled: process.env.PAYMENT_ENABLED === 'true',
    baseUrl: defaultBaseUrl,

    // 充值金额限制
    minAmount: getFloatEnv(1, 'PAYMENT_MIN_AMOUNT', 'RECHARGE_MIN_AMOUNT'),
    maxAmount: getFloatEnv(10000, 'PAYMENT_MAX_AMOUNT', 'RECHARGE_MAX_AMOUNT'),
    allowCustomAmount: (() => {
      const flag = pickEnv('ALLOW_CUSTOM_AMOUNT', 'PAYMENT_ALLOW_CUSTOM_AMOUNT')
      return flag === undefined ? true : flag !== 'false'
    })(),

    // 货币配置
    defaultCurrency: resolvedDefaultCurrency,
    displayCurrency: resolvedDisplayCurrency,
    exchangeRate: getFloatEnv(7.1, 'PAYMENT_EXCHANGE_RATE', 'EXCHANGE_RATE'),
    discountRate: getFloatEnv(1, 'PAYMENT_DISCOUNT_RATE', 'DISCOUNT_RATE'),

    // 订单配置
    orderExpireMinutes: getIntEnv(30, 'PAYMENT_ORDER_EXPIRE_MINUTES', 'ZPAY_ORDER_EXPIRE_MINUTES'),
    maxOrdersPerMinute: getIntEnv(3, 'MAX_ORDERS_PER_MINUTE'),

    // 充值套餐（JSON格式）
    packages: (() => {
      const raw = pickEnv('PAYMENT_PACKAGES')
      return raw ? JSON.parse(raw) : []
    })(),

    // ZPay 配置
    zpay: {
      enabled: process.env.ZPAY_ENABLED === 'true',
      pid: process.env.ZPAY_PID || '',
      key: process.env.ZPAY_KEY || '',
      apiUrl: process.env.ZPAY_API_URL || 'https://zpayz.cn',
      submitUrl: process.env.ZPAY_SUBMIT_URL || 'https://zpayz.cn/submit.php',
      queryUrl: process.env.ZPAY_QUERY_URL || 'https://zpayz.cn/api.php',
      paymentMethods: process.env.ZPAY_PAYMENT_METHODS
        ? process.env.ZPAY_PAYMENT_METHODS.split(',').map((m) => m.trim())
        : ['alipay', 'wxpay'],
      orderPrefix: process.env.ZPAY_ORDER_PREFIX || 'ORD_',
      notifyUrl: process.env.ZPAY_NOTIFY_URL || '',
      returnUrl: process.env.ZPAY_RETURN_URL || '',
      notifyUser: process.env.ZPAY_NOTIFY_USER === 'true',
      ipWhitelist: process.env.ZPAY_IP_WHITELIST
        ? process.env.ZPAY_IP_WHITELIST.split(',').map((ip) => ip.trim()).filter(Boolean)
        : [],
      requireHttps:
        process.env.ZPAY_REQUIRE_HTTPS !== 'false' && process.env.NODE_ENV === 'production'
    },

    // Stripe 配置
    stripe: {
      enabled: process.env.STRIPE_ENABLED === 'true',
      apiKey: pickEnv('STRIPE_SECRET_KEY', 'STRIPE_API_KEY') || '',
      apiVersion: process.env.STRIPE_API_VERSION || '2024-06-20',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
      paymentMethods: process.env.STRIPE_PAYMENT_METHODS
        ? process.env.STRIPE_PAYMENT_METHODS.split(',').map((m) => m.trim()).filter(Boolean)
        : ['wechat_pay'],
      currency: (process.env.STRIPE_CURRENCY || 'CNY').toLowerCase(),
      successUrl:
        process.env.STRIPE_SUCCESS_URL ||
        `${defaultBaseUrl}/payment/return/stripe?order={ORDER_ID}&status=success`,
      cancelUrl:
        process.env.STRIPE_CANCEL_URL ||
        `${defaultBaseUrl}/payment/return/stripe?order={ORDER_ID}&status=cancel`,
      wechatPay: {
        client: process.env.STRIPE_WECHAT_CLIENT || 'web',
        appId: process.env.STRIPE_WECHAT_APP_ID || ''
      }
    }
  },

  // 📢 Webhook通知配置
  webhook: {
    enabled: process.env.WEBHOOK_ENABLED !== 'false', // 默认启用
    urls: process.env.WEBHOOK_URLS
      ? process.env.WEBHOOK_URLS.split(',').map((url) => url.trim())
      : [],
    timeout: parseInt(process.env.WEBHOOK_TIMEOUT) || 10000, // 10秒超时
    retries: parseInt(process.env.WEBHOOK_RETRIES) || 3 // 重试3次
  },

  // 🏠 Frontpage 入口页面配置
  frontpage: {
    enabled: process.env.FRONTPAGE_ENABLED === 'true', // 默认禁用，需显式启用
    geminiApiKey: process.env.GEMINI_API_KEY || ''
  },

  // 🛠️ 开发配置
  development: {
    debug: process.env.DEBUG === 'true',
    hotReload: process.env.HOT_RELOAD === 'true'
  }
}

module.exports = config
