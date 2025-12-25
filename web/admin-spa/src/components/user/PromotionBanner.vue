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
                <div class="flex items-center gap-2">
                  <span class="text-2xl animate-pulse">🔥</span>
                  <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 sm:text-xl">
                    限时充值优惠 - 优惠递减倒计时
                  </h3>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    class="inline-flex items-center gap-1.5 rounded-xl bg-white/90 px-4 py-2.5 text-sm font-semibold text-orange-600 shadow-md transition-all hover:bg-white hover:shadow-lg dark:bg-white/20 dark:text-white dark:hover:bg-white/30"
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
                    立即充值（享{{ currentTierData.bonus }}%赠送）
                  </button>
                </div>
              </div>

              <!-- 充值提醒 -->
              <div class="mb-3 flex items-center justify-center">
                <div class="inline-flex items-center gap-2 rounded-lg bg-yellow-100/90 px-4 py-2.5 shadow-sm border border-yellow-300/50 dark:bg-yellow-900/40 dark:border-yellow-700/50">
                  <svg class="h-5 w-5 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                  </svg>
                  <span class="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                    ⚠️ 充值后请联系客服后台赠送优惠额度
                  </span>
                  <svg class="h-5 w-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>

              <!-- 当前档位展示（高亮） -->
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
                    💡 温馨提示：充值成功后请联系客服申请赠送优惠额度
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

const props = defineProps({
  userCreatedAt: {
    type: String,
    default: null,
    required: false
  }
})

const emit = defineEmits(['recharge'])

// 配置项
const TOTAL_PROMOTION_HOURS = 72 // 总优惠时长
const tierDuration = 12 // 每个档位持续时间（小时）

const currentTime = ref(Date.now())

// 优惠档位配置
const promotionTiers = [
  {
    id: 1,
    hours: 24,
    bonus: 30,
    minAmount: 100,
    timeLabel: '24小时内',
    label: '充100得130',
    emoji: '💰💰💰'
  },
  {
    id: 2,
    hours: 36,
    bonus: 20,
    minAmount: 100,
    timeLabel: '36小时内',
    label: '充100得120',
    emoji: '💰💰'
  },
  {
    id: 3,
    hours: 48,
    bonus: 10,
    minAmount: 100,
    timeLabel: '48小时内',
    label: '充100得110',
    emoji: '💰'
  },
  {
    id: 4,
    hours: 72,
    bonus: 5,
    minAmount: 100,
    timeLabel: '72小时内',
    label: '充100得105',
    emoji: ''
  }
]

// 计算注册后经过的小时数
const hoursSinceRegistration = computed(() => {
  if (!props.userCreatedAt) {
    return 0
  }

  try {
    const registrationTime = new Date(props.userCreatedAt).getTime()
    const elapsed = (currentTime.value - registrationTime) / 1000 / 3600 // 转换为小时
    return elapsed
  } catch (error) {
    console.error('Failed to parse userCreatedAt:', error)
    return 0
  }
})

// 计算当前档位（0-3，-1表示已过期）
const currentTier = computed(() => {
  const hours = hoursSinceRegistration.value

  if (hours >= TOTAL_PROMOTION_HOURS) {
    return -1 // 已过期
  }

  // 根据经过的时间确定当前档位
  if (hours < 24) return 0
  if (hours < 36) return 1
  if (hours < 48) return 2
  if (hours < 72) return 3

  return -1
})

// 获取当前档位数据
const currentTierData = computed(() => {
  if (currentTier.value === -1) return null
  return promotionTiers[currentTier.value]
})

// 计算当前档位剩余秒数
const remainingSeconds = computed(() => {
  if (!props.userCreatedAt || currentTier.value === -1) {
    return 0
  }

  try {
    const registrationTime = new Date(props.userCreatedAt).getTime()
    const elapsed = currentTime.value - registrationTime
    const currentTierEndTime = currentTierData.value.hours * 3600 * 1000 // 转换为毫秒
    const remaining = Math.max(0, currentTierEndTime - elapsed)
    return Math.floor(remaining / 1000) // 转换为秒
  } catch (error) {
    console.error('Failed to calculate remaining time:', error)
    return 0
  }
})

// 格式化时间显示（小时:分钟:秒）
const formattedTime = computed(() => {
  const hours = Math.floor(remainingSeconds.value / 3600)
  const minutes = Math.floor((remainingSeconds.value % 3600) / 60)
  const seconds = remainingSeconds.value % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

// 判断是否应该显示横幅（在72小时内显示）
const shouldShowBanner = computed(() => {
  // 如果没有传入注册时间，显示横幅（新用户）
  if (!props.userCreatedAt) {
    return true
  }

  // 72小时内显示
  return hoursSinceRegistration.value < TOTAL_PROMOTION_HOURS
})

// 获取档位样式类
const getTierClass = (index) => {
  if (currentTier.value === -1) {
    // 已过期，所有档位置灰
    return 'bg-gray-200/50 opacity-50 dark:bg-gray-700/50'
  }

  if (index === currentTier.value) {
    // 当前档位高亮
    return 'bg-white/60 shadow-lg border-2 border-yellow-400 dark:bg-white/30 dark:border-yellow-500'
  }

  if (index < currentTier.value) {
    // 已过期档位
    return 'bg-gray-200/50 opacity-50 dark:bg-gray-700/50'
  }

  // 未来档位
  return 'bg-white/20 backdrop-blur-sm dark:bg-white/10'
}

// 获取档位表情
const getTierEmoji = (index) => {
  if (currentTier.value === -1 || index < currentTier.value) {
    return '⏰' // 已过期
  }
  return promotionTiers[index].emoji || '💰'
}

// 定时器用于更新当前时间
let timer = null

onMounted(() => {
  // 每秒更新一次当前时间，以更新剩余时间显示
  timer = setInterval(() => {
    currentTime.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})

const handleRecharge = () => {
  emit('recharge', {
    tier: currentTier.value,
    bonus: currentTierData.value?.bonus || 0,
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