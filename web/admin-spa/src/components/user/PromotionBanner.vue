<template>
  <Transition name="slide-fade">
    <div v-if="shouldShowBanner" class="w-full border-b border-gray-200/50 dark:border-gray-700/50">
      <div class="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <!-- 渐变卡片容器 -->
        <div class="relative overflow-hidden rounded-2xl shadow-lg">
          <!-- 渐变背景层 -->
          <div
            class="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 dark:from-orange-900/80 dark:via-red-900/80 dark:to-rose-900/80"
          >
            <!-- 装饰性底部边框 -->
            <div
              class="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 dark:from-yellow-600 dark:via-amber-700 dark:to-orange-700"
            ></div>

            <!-- 内容区 -->
            <div class="relative p-4 md:p-6">
              <!-- 头部：标题 + 按钮 -->
              <div
                class="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center"
              >
                <div class="flex flex-col gap-1">
                  <div class="flex items-center gap-2">
                    <span
                      class="text-2xl"
                      :class="promotionStatus?.hasUsed ? '' : 'animate-pulse'"
                    >🔥</span>
                    <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 sm:text-xl">
                      {{ statusHeadline }}
                    </h3>
                  </div>
                  <p v-if="statusSubtext" class="text-sm text-white/90 dark:text-white/70">
                    {{ statusSubtext }}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    class="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-md transition-all hover:shadow-lg"
                    :class="
                      promotionStatus?.hasUsed
                        ? 'bg-white/30 text-white hover:bg-white/40'
                        : 'bg-white/90 text-orange-600 hover:bg-white'
                    "
                    @click="handleRecharge"
                  >
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                      />
                    </svg>
                    {{ ctaText }}
                  </button>
                </div>
              </div>

              <!-- 自动发放提醒 -->
              <div class="mb-3 flex items-center justify-center">
                <div
                  class="inline-flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200/60 bg-emerald-50/90 px-4 py-2.5 text-sm font-semibold text-emerald-800 shadow-sm dark:border-emerald-600/40 dark:bg-emerald-900/40 dark:text-emerald-100"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>充值成功后系统自动发放赠额，无需联系客服</span>
                  <button
                    class="rounded-full border border-emerald-500/60 px-2 py-0.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-500/10 dark:border-emerald-400/60 dark:text-emerald-200"
                    @click="reloadPromotion"
                  >
                    刷新状态
                  </button>
                </div>
              </div>

              <!-- 当前档位展示（高亮） -->
              <div
                v-if="promotionStatus?.hasUsed"
                class="mb-4 rounded-xl bg-emerald-500/90 p-4 text-white shadow-lg backdrop-blur-sm dark:bg-emerald-500/70"
              >
                <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p class="text-sm font-semibold">赠额已到账</p>
                    <p class="text-2xl font-bold">
                      +${{ (promotionStatus?.bonusReceived || 0).toFixed(2) }}
                    </p>
                  </div>
                  <div class="text-sm text-white/80">
                    首充金额 ${{ (promotionStatus?.amountRecharged || 0).toFixed(2) }} · 档位
                    {{ renderTierLabel(promotionStatus?.tierUsed) }}
                  </div>
                </div>
              </div>

              <div
                v-if="currentTierData"
                class="mb-4 rounded-xl bg-white/40 p-4 backdrop-blur-sm shadow-lg dark:bg-white/20"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="text-3xl">💰💰💰</div>
                    <div>
                      <div class="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {{ currentTierData.label }}
                      </div>
                      <div class="text-sm font-medium text-gray-700 dark:text-gray-300">
                        当前档位 - {{ currentTierData.bonus }}%赠送
                      </div>
                    </div>
                  </div>
                  <!-- 倒计时显示 -->
                  <div
                    class="flex items-center gap-2 rounded-lg bg-red-500/90 px-4 py-3 text-white shadow-md dark:bg-red-600/90"
                  >
                    <svg
                      class="h-5 w-5 animate-pulse"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                      />
                    </svg>
                    <div class="text-center">
                      <div class="text-xs">⏰ 还剩</div>
                      <div class="text-lg font-bold">{{ formattedTime }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 优惠档位网格 -->
              <div class="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div
                  v-for="(tier, index) in promotionTiers"
                  :key="tier.id"
                  class="rounded-xl p-3 transition-all"
                  :class="getTierClass(index)"
                >
                  <div class="flex items-center gap-3">
                    <div class="text-xl">{{ getTierEmoji(index) }}</div>
                    <div class="flex-1">
                      <div class="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {{ tier.timeLabel }}
                      </div>
                      <div class="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {{ tier.label }}
                      </div>
                    </div>
                    <div
                      v-if="index === currentTier"
                      class="rounded-full bg-green-500 px-2 py-1 text-xs font-bold text-white"
                    >
                      当前
                    </div>
                  </div>
                </div>
              </div>

              <!-- 最近赠送记录 -->
              <div
                v-if="promotionRecords.length"
                class="mb-4 rounded-xl bg-white/40 p-4 backdrop-blur-sm shadow-lg dark:bg-white/15"
              >
                <div class="flex items-center justify-between">
                  <p class="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    最新赠送记录
                  </p>
                  <span class="text-xs text-gray-500">最近 {{ promotionRecords.length }} 条</span>
                </div>
                <div class="mt-3 space-y-2">
                  <div
                    v-for="record in promotionRecords"
                    :key="record.id"
                    class="flex items-center justify-between rounded-lg bg-white/80 px-3 py-2 shadow-sm dark:bg-gray-900/30"
                  >
                    <div>
                      <p class="text-sm font-semibold text-gray-900 dark:text-white">
                        +${{ formatBonus(record.bonus) }}
                      </p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                        {{ formatRecordTime(record.createdAt) }} · 档位
                        {{ renderTierLabel(record.tier) }}
                      </p>
                    </div>
                    <div class="text-right">
                      <span :class="getRecordStatusClass(record.status)" class="text-xs font-semibold">
                        {{ record.status === 'failed' ? '失败' : '已到账' }}
                      </span>
                      <p class="text-xs text-gray-500" v-if="record.bonusRate">
                        +{{ record.bonusRate }}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div
                v-else-if="promotionStatus?.available && !promotionRecords.length"
                class="mb-4 rounded-xl bg-white/30 p-3 text-sm text-gray-600 backdrop-blur-sm dark:bg-white/10 dark:text-gray-300"
              >
                尚未触发赠额，完成首充即可自动到账。
              </div>

              <!-- 底部提醒 -->
              <div
                class="flex items-center justify-center gap-2 rounded-lg bg-white/30 p-3 text-center backdrop-blur-sm dark:bg-white/10"
              >
                <svg
                  class="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div class="flex flex-col gap-1">
                  <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    🚨 早充越划算！优惠每{{ tierDuration }}小时递减 - 过期后恢复原价，不再享受赠送
                  </span>
                  <span class="text-xs font-medium text-gray-700 dark:text-gray-300">
                    💡 温馨提示：活动期间充值成功即刻自动发放赠额
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/user'

const props = defineProps({
  userCreatedAt: {
    type: String,
    default: null,
    required: false
  }
})

const emit = defineEmits(['recharge'])
const userStore = useUserStore()

const TOTAL_PROMOTION_HOURS = 72
const tierDuration = 12

const currentTime = ref(Date.now())
const promotionStatus = ref(null)
const promotionRecords = ref([])
const serverRemainingSeconds = ref(0)

const promotionTiers = [
  { id: 1, hours: 24, bonus: 30, minAmount: 100, timeLabel: '24小时内', label: '充100得130', emoji: '💰💰💰' },
  { id: 2, hours: 36, bonus: 20, minAmount: 100, timeLabel: '36小时内', label: '充100得120', emoji: '💰💰' },
  { id: 3, hours: 48, bonus: 10, minAmount: 100, timeLabel: '48小时内', label: '充100得110', emoji: '💰' },
  { id: 4, hours: 72, bonus: 5, minAmount: 100, timeLabel: '72小时内', label: '充100得105', emoji: '' }
]

const hoursSinceRegistration = computed(() => {
  if (!props.userCreatedAt) {
    return 0
  }

  try {
    const registrationTime = new Date(props.userCreatedAt).getTime()
    return (currentTime.value - registrationTime) / 1000 / 3600
  } catch (error) {
    console.error('Failed to parse userCreatedAt:', error)
    return 0
  }
})

const fallbackTier = computed(() => {
  const hours = hoursSinceRegistration.value
  if (hours >= TOTAL_PROMOTION_HOURS) return -1
  if (hours < 24) return 0
  if (hours < 36) return 1
  if (hours < 48) return 2
  if (hours < 72) return 3
  return -1
})

const currentTier = computed(() => {
  if (typeof promotionStatus.value?.currentTier === 'number') {
    return promotionStatus.value.currentTier
  }
  return fallbackTier.value
})

const currentTierData = computed(() => {
  if (promotionStatus.value?.currentTierData) {
    return promotionStatus.value.currentTierData
  }
  if (currentTier.value === -1) return null
  return promotionTiers[currentTier.value]
})

const fallbackRemainingSeconds = computed(() => {
  if (!props.userCreatedAt || currentTier.value === -1 || !currentTierData.value) {
    return 0
  }

  try {
    const registrationTime = new Date(props.userCreatedAt).getTime()
    const elapsed = currentTime.value - registrationTime
    const currentTierEndTime = currentTierData.value.hours * 3600 * 1000
    return Math.max(0, Math.floor((currentTierEndTime - elapsed) / 1000))
  } catch (error) {
    console.error('Failed to calculate remaining time:', error)
    return 0
  }
})

const remainingSeconds = computed(() => {
  if (promotionStatus.value) {
    return Math.max(0, serverRemainingSeconds.value)
  }
  return fallbackRemainingSeconds.value
})

const formattedTime = computed(() => {
  const seconds = remainingSeconds.value
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const restSeconds = seconds % 60

  if (seconds <= 0) {
    return '00:00'
  }

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${restSeconds
      .toString()
      .padStart(2, '0')}`
  }
  return `${minutes.toString().padStart(2, '0')}:${restSeconds.toString().padStart(2, '0')}`
})

const shouldShowBanner = computed(() => {
  if (promotionStatus.value) {
    if (promotionStatus.value.hasUsed) {
      return true
    }
    return !promotionStatus.value.isExpired
  }
  if (!props.userCreatedAt) {
    return true
  }
  return hoursSinceRegistration.value < TOTAL_PROMOTION_HOURS
})

const statusHeadline = computed(() => {
  if (promotionStatus.value?.hasUsed) {
    return '赠额已到账'
  }
  if (promotionStatus.value?.isExpired) {
    return '限时优惠已结束'
  }
  if (promotionStatus.value?.available) {
    return '限时充值优惠 - 优惠递减倒计时'
  }
  return '新用户限时活动'
})

const statusSubtext = computed(() => {
  if (promotionStatus.value?.hasUsed) {
    const bonus = (promotionStatus.value.bonusReceived || 0).toFixed(2)
    return `已获取 +$${bonus} 赠额，感谢首充支持`
  }
  if (promotionStatus.value?.available && currentTierData.value) {
    return `当前档位 ${currentTierData.value.label} · 剩余 ${formattedTime.value}`
  }
  if (promotionStatus.value?.isExpired) {
    return '72 小时活动窗口已结束，可关注后续活动通知'
  }
  return '首充即可享受 72 小时阶梯赠额，早充越划算'
})

const ctaText = computed(() => {
  if (promotionStatus.value?.hasUsed) {
    return '查看赠送记录'
  }
  if (promotionStatus.value?.available) {
    const bonus = currentTierData.value?.bonus || promotionStatus.value.currentBonus || 0
    return `立即充值（享${bonus}%赠送）`
  }
  return '立即充值'
})

const getTierClass = (index) => {
  if (promotionStatus.value?.hasUsed) {
    return 'bg-gray-200/50 dark:bg-gray-700/50'
  }

  if (currentTier.value === -1) {
    return 'bg-gray-200/50 opacity-50 dark:bg-gray-700/50'
  }

  if (index === currentTier.value) {
    return 'bg-white/60 shadow-lg border-2 border-yellow-400 dark:bg-white/30 dark:border-yellow-500'
  }

  if (index < currentTier.value) {
    return 'bg-gray-200/50 opacity-50 dark:bg-gray-700/50'
  }

  return 'bg-white/20 backdrop-blur-sm dark:bg-white/10'
}

const getTierEmoji = (index) => {
  if (currentTier.value === -1 || index < currentTier.value) {
    return '⏰'
  }
  return promotionTiers[index].emoji || '💰'
}

const formatBonus = (value) => Number(value || 0).toFixed(2)

const formatRecordTime = (value) => {
  if (!value) return ''
  try {
    return new Date(value).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    return value
  }
}

const renderTierLabel = (tierIndex) => {
  if (typeof tierIndex !== 'number' || tierIndex < 0) {
    return '无'
  }
  return promotionTiers[tierIndex]?.label || `Tier${tierIndex + 1}`
}

const getRecordStatusClass = (status) => {
  if (status === 'failed') {
    return 'rounded-full bg-red-100 px-2 py-0.5 text-red-700 dark:bg-red-900/30 dark:text-red-200'
  }
  return 'rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-100'
}

const loadPromotionStatus = async () => {
  try {
    const status = await userStore.getPromotionStatus()
    promotionStatus.value = status
    serverRemainingSeconds.value = status?.remainingSeconds || 0
  } catch (error) {
    console.error('Failed to load promotion status:', error)
  }
}

const loadPromotionRecords = async () => {
  try {
    const result = await userStore.getPromotionRecords({ limit: 3 })
    promotionRecords.value = result.records || []
  } catch (error) {
    console.error('Failed to load promotion records:', error)
    promotionRecords.value = []
  }
}

const reloadPromotion = () => {
  loadPromotionStatus()
  loadPromotionRecords()
}

let timer = null
let refreshTimer = null

onMounted(() => {
  reloadPromotion()

  timer = setInterval(() => {
    currentTime.value = Date.now()
    if (serverRemainingSeconds.value > 0) {
      serverRemainingSeconds.value = Math.max(0, serverRemainingSeconds.value - 1)
    }
  }, 1000)

  refreshTimer = setInterval(() => {
    reloadPromotion()
  }, 60000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})

const handleRecharge = () => {
  emit('recharge', {
    tier: currentTier.value,
    bonus: currentTierData.value?.bonus || promotionStatus.value?.currentBonus || 0,
    minAmount: currentTierData.value?.minAmount || 100
  })
}
</script>

<style scoped>
.slide-fade-enter-active {
  transition: all 0.4s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s ease-in;
}

.slide-fade-enter-from {
  transform: translateY(-20px);
  opacity: 0;
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
