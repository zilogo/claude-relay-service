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

              <!-- 重点提醒 -->
              <div v-if="!promotionStatus?.hasUsed" class="mb-4 grid gap-3 lg:grid-cols-2">
                <div
                  class="rounded-2xl bg-white/40 p-4 backdrop-blur-sm shadow-lg dark:bg-white/15"
                >
                  <p class="text-xs font-semibold uppercase tracking-widest text-orange-600">
                    新注册用户 · 首充优惠
                  </p>
                  <p class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                    充得越多 · 送得越多 · 仅此一次
                  </p>
                  <ul class="mt-3 space-y-1 text-sm text-gray-700 dark:text-gray-200">
                    <li class="flex items-center gap-2">
                      <span class="text-orange-500">•</span> 注册 72 小时内完成首充立即锁定赠额
                    </li>
                    <li class="flex items-center gap-2">
                      <span class="text-orange-500">•</span> 4 个档位递减，当前档位结束后自动降级
                    </li>
                    <li class="flex items-center gap-2">
                      <span class="text-orange-500">•</span> 系统自动发放至账户余额，无需联系客服
                    </li>
                  </ul>
                </div>
                <div
                  class="rounded-2xl border border-white/40 bg-amber-50/80 p-4 text-sm font-semibold text-amber-900 shadow-inner dark:border-amber-100/10 dark:bg-amber-900/40 dark:text-amber-100"
                >
                  <div class="flex items-center justify-between">
                    <p>当前优惠</p>
                    <span class="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700 dark:bg-amber-800/60 dark:text-amber-100">
                      只有一次机会
                    </span>
                  </div>
                  <p class="mt-2 text-3xl font-bold">
                    {{ currentTierData?.bonus || promotionStatus?.currentBonus || 0 }}%
                  </p>
                  <p class="text-sm text-amber-800 dark:text-amber-100">
                    {{ currentTierData?.windowLabel || '限时档位' }} · 充 100 送
                    {{ currentTierData ? Math.round((currentTierData.bonus / 100) * 100) : 30 }}
                  </p>
                  <p class="mt-3 text-xs text-amber-700 dark:text-amber-100/80">
                    下一档将在 {{ formattedTime }} 后开启，赠额比例将下降。
                  </p>
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
                    {{ renderTierLabel(promotionStatus?.tierUsed, promotionStatus?.metadata?.tierWindow) }}
                  </div>
                </div>
              </div>

              <div
                v-else-if="currentTierData"
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
              <div
                v-if="!promotionStatus?.hasUsed"
                class="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4"
              >
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

              <!-- 活动说明 -->
              <div
                v-if="!promotionStatus?.hasUsed"
                class="mb-4 rounded-2xl bg-white/30 p-4 backdrop-blur-sm shadow-lg dark:bg-white/10"
              >
                <div class="flex items-center justify-between">
                  <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">活动说明</p>
                  <span class="text-xs text-gray-500">仅一次机会 · 超过 72 小时自动结束</span>
                </div>
                <div class="mt-3 space-y-2">
                  <div
                    v-for="(tier, index) in promotionTiers"
                    :key="`timeline-${tier.id}`"
                    class="flex flex-wrap items-center justify-between rounded-xl bg-white/70 px-3 py-2 text-sm shadow-sm dark:bg-gray-900/30"
                  >
                    <div>
                      <p class="font-semibold text-gray-900 dark:text-white">{{ tier.windowLabel }}</p>
                      <p class="text-xs text-gray-500 dark:text-gray-300">{{ tier.label }}</p>
                    </div>
                    <div class="text-right">
                      <span
                        :class="getTierStatusMeta(index).classes"
                        class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                      >
                        {{ getTierStatusMeta(index).text }}
                      </span>
                      <p class="text-xs text-gray-500">{{ tier.example }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 最近赠送记录 -->
              <div
                v-if="!promotionStatus?.hasUsed && promotionRecords.length"
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
                        {{ renderTierLabel(record.tier, record.tierWindow || record.metadata?.tierWindow) }}
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
              <!-- 底部提醒 -->
              <div
                v-if="!promotionStatus?.hasUsed"
                class="flex items-center justify-center gap-2 rounded-lg bg-white/30 p-3 text-center backdrop-blur-sm dark:bg-white/10"
              >
                <svg
                  class="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div class="flex flex-col gap-1">
                  <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    🚨 早充越划算！优惠在 {{ totalPromotionHours }} 小时内阶梯递减，结束后恢复原价
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

const emit = defineEmits(['recharge', 'status-change'])
const userStore = useUserStore()

const DEFAULT_TOTAL_PROMOTION_HOURS = 72

const defaultTierTemplates = [
  { id: 1, startHour: 0, endHour: 24, bonus: 30, minAmount: 100, label: '充100得130', timeLabel: '0-24小时', example: '充100送30', emoji: '💰💰💰' },
  { id: 2, startHour: 24, endHour: 36, bonus: 20, minAmount: 100, label: '充100得120', timeLabel: '24-36小时', example: '充100送20', emoji: '💰💰' },
  { id: 3, startHour: 36, endHour: 48, bonus: 10, minAmount: 100, label: '充100得110', timeLabel: '36-48小时', example: '充100送10', emoji: '💰' },
  { id: 4, startHour: 48, endHour: 72, bonus: 5, minAmount: 100, label: '充100得105', timeLabel: '48-72小时', example: '充100送5', emoji: '' }
]

const normalizeTiers = (tiers = []) => {
  const normalized = []
  let previousEnd = 0

  tiers.forEach((tier, index) => {
    const startHour =
      typeof tier.startHour === 'number' ? tier.startHour : index === 0 ? 0 : previousEnd
    const rawEnd =
      typeof tier.endHour === 'number'
        ? tier.endHour
        : typeof tier.hours === 'number'
          ? tier.hours
          : startHour
    const endHour = Math.max(rawEnd, startHour)
    const bonus = typeof tier.bonus === 'number' ? tier.bonus : 0
    const exampleBonus = Math.round((bonus / 100) * 100)

    normalized.push({
      id: tier.id || index + 1,
      index,
      startHour,
      endHour,
      hours: endHour,
      bonus,
      minAmount: tier.minAmount || 100,
      label: tier.label || `充100得${100 + exampleBonus}`,
      timeLabel: tier.timeLabel || tier.windowLabel || `${startHour}-${endHour}小时`,
      windowLabel: tier.windowLabel || `${startHour}-${endHour}小时`,
      example: tier.example || `充100送${exampleBonus}`,
      emoji: tier.emoji || defaultTierTemplates[index]?.emoji || '💰'
    })

    previousEnd = endHour
  })

  return normalized
}

const defaultNormalizedTiers = normalizeTiers(defaultTierTemplates)
const promotionTiers = ref(defaultNormalizedTiers)
const promotionStatus = ref(null)
const promotionRecords = ref([])
const currentTime = ref(Date.now())
const serverRemainingSeconds = ref(0)

const totalPromotionHours = computed(() => {
  const tiers = promotionTiers.value
  if (!tiers.length) {
    return DEFAULT_TOTAL_PROMOTION_HOURS
  }
  return tiers[tiers.length - 1].endHour || DEFAULT_TOTAL_PROMOTION_HOURS
})

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
  const totalHours = totalPromotionHours.value

  if (hours >= totalHours) {
    return -1
  }

  const tiers = promotionTiers.value
  for (let i = 0; i < tiers.length; i += 1) {
    if (hours < tiers[i].endHour) {
      return i
    }
  }
  return -1
})

const currentTier = computed(() => {
  if (typeof promotionStatus.value?.currentTier === 'number') {
    return promotionStatus.value.currentTier
  }
  if (typeof promotionStatus.value?.currentTierIndex === 'number') {
    return promotionStatus.value.currentTierIndex
  }
  return fallbackTier.value
})

const currentTierData = computed(() => {
  if (promotionStatus.value?.currentTierData) {
    return promotionStatus.value.currentTierData
  }
  if (currentTier.value === -1) return null
  return promotionTiers.value[currentTier.value] || null
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
  if (promotionStatus.value?.forceHide) {
    return false
  }

  if (promotionStatus.value) {
    if (promotionStatus.value.hasUsed) {
      return true
    }
    return !promotionStatus.value.isExpired
  }
  if (!props.userCreatedAt) {
    return true
  }
  return hoursSinceRegistration.value < totalPromotionHours.value
})

const statusHeadline = computed(() => {
  if (promotionStatus.value?.hasUsed) {
    return '赠额已到账'
  }
  if (promotionStatus.value?.isExpired) {
    return '限时优惠已结束'
  }
  if (promotionStatus.value?.available) {
    return '新用户首充限时优惠（仅一次）'
  }
  return '新用户首充优惠'
})

const statusSubtext = computed(() => {
  if (promotionStatus.value?.hasUsed) {
    const bonus = (promotionStatus.value.bonusReceived || 0).toFixed(2)
    return `已获取 +$${bonus} 赠额，感谢首充支持`
  }
  if (promotionStatus.value?.available && currentTierData.value) {
    const windowLabel = currentTierData.value.windowLabel || currentTierData.value.timeLabel
    return `${windowLabel} · 剩余 ${formattedTime.value}`
  }
  if (promotionStatus.value?.isExpired) {
    return `活动已结束（超过 ${promotionStatus.value.totalDurationHours || totalPromotionHours.value} 小时窗口）`
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
  return promotionTiers.value[index]?.emoji || '💰'
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

const renderTierLabel = (tierIndex, fallbackWindow = '') => {
  if (typeof tierIndex === 'number' && tierIndex >= 0) {
    const tier = promotionTiers.value[tierIndex]
    if (tier) {
      return tier.windowLabel || tier.label
    }
  }
  return fallbackWindow || '无'
}

const getRecordStatusClass = (status) => {
  if (status === 'failed') {
    return 'rounded-full bg-red-100 px-2 py-0.5 text-red-700 dark:bg-red-900/30 dark:text-red-200'
  }
  return 'rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-100'
}

const getTierStatusMeta = (index) => {
  if (promotionStatus.value?.hasUsed) {
    return {
      text: '已到账',
      classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100'
    }
  }

  if (promotionStatus.value?.isExpired || promotionStatus.value?.forceHide) {
    return {
      text: '已结束',
      classes: 'bg-gray-200 text-gray-600 dark:bg-gray-700/60 dark:text-gray-300'
    }
  }

  if (index === currentTier.value) {
    return {
      text: '当前档位',
      classes: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-100'
    }
  }

  if (index < currentTier.value) {
    return {
      text: '已过期',
      classes: 'bg-gray-100 text-gray-500 dark:bg-gray-800/40 dark:text-gray-300'
    }
  }

  return {
    text: '即将下降',
    classes: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-100'
  }
}

const applyPromotionTiers = (status) => {
  if (Array.isArray(status?.tiers) && status.tiers.length) {
    promotionTiers.value = normalizeTiers(status.tiers)
  } else {
    promotionTiers.value = defaultNormalizedTiers
  }
}

const loadPromotionStatus = async () => {
  try {
    const status = await userStore.getPromotionStatus()
    promotionStatus.value = status
    serverRemainingSeconds.value = status?.remainingSeconds || 0
    applyPromotionTiers(status)
    emit('status-change', status)
  } catch (error) {
    console.error('Failed to load promotion status:', error)
    promotionStatus.value = null
    promotionTiers.value = defaultNormalizedTiers
    emit('status-change', null)
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
