export const PAYMENT_SUCCESS_MESSAGE = '支付成功，余额已到账'
export const PAYMENT_INCOMPLETE_MESSAGE = '支付未完成，请重新发起或稍后重试'

export const PAYMENT_MESSAGE_TEMPLATES = Object.freeze({
  success: {
    type: 'success',
    message: PAYMENT_SUCCESS_MESSAGE,
    shouldRefresh: true
  },
  incomplete: {
    type: 'error',
    message: PAYMENT_INCOMPLETE_MESSAGE,
    shouldRefresh: false
  }
})

export const createPaymentStatusConfig = (templateKey, overrides = {}) => {
  const template = PAYMENT_MESSAGE_TEMPLATES[templateKey] || PAYMENT_MESSAGE_TEMPLATES.incomplete
  return Object.freeze({
    ...template,
    ...overrides
  })
}
