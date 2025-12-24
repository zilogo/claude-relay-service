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
                  <span class="text-2xl">🎁</span>
                  <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 sm:text-xl">
                    新用户专享·充值赠送活动
                  </h3>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    class="inline-flex items-center gap-1.5 rounded-xl bg-white/90 px-3 py-2 text-sm font-semibold text-orange-600 shadow-md transition-all hover:bg-white hover:shadow-lg dark:bg-white/20 dark:text-white dark:hover:bg-white/30"
                    @click="handleContactAdmin"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                      />
                    </svg>
                    联系管理员
                  </button>
                  <!-- 倒计时显示 -->
                  <div
                    v-if="remainingMinutes > 0"
                    class="flex items-center gap-1.5 rounded-lg bg-red-500/90 px-3 py-2 text-sm font-bold text-white shadow-md dark:bg-red-600/90"
                  >
                    <svg
                      class="h-4 w-4 animate-pulse"
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
                    <span>剩余 {{ remainingMinutes }} 分钟</span>
                  </div>
                </div>
              </div>

              <!-- 优惠信息网格 -->
              <div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div
                  v-for="tier in promotionTiers"
                  :key="tier.id"
                  class="rounded-xl bg-white/20 p-4 text-center backdrop-blur-sm transition-all hover:bg-white/30 dark:bg-white/10 dark:hover:bg-white/20"
                >
                  <div class="mb-2 text-2xl">💰</div>
                  <div class="mb-1 text-base font-bold text-gray-900 dark:text-gray-100 sm:text-lg">
                    {{ tier.label }}
                  </div>
                  <div class="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {{ tier.discount }}
                  </div>
                  <div class="mt-1 text-xs text-gray-600 dark:text-gray-300">
                    {{ tier.description }}
                  </div>
                </div>
              </div>

              <!-- 底部提醒 -->
              <div
                class="flex items-center justify-center gap-2 rounded-lg bg-white/30 p-3 text-center backdrop-blur-sm dark:bg-white/10"
              >
                <svg
                  class="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400"
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
                <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  限时福利：仅限注册后30分钟内有效（需联系管理员后台充值）
                </span>
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

const emit = defineEmits(['contact-admin'])

const PROMOTION_DURATION_MINUTES = 30
const currentTime = ref(Date.now())

const promotionTiers = [
  {
    id: 1,
    label: '充50¥得80$',
    discount: '60%优惠',
    description: '降低门槛'
  },
  {
    id: 2,
    label: '充100¥得150$',
    discount: '50%优惠',
    description: '加大力度'
  },
  {
    id: 3,
    label: '充200¥得300$',
    discount: '50%优惠',
    description: '鼓励多充'
  }
]

// 计算注册后经过的分钟数
const minutesSinceRegistration = computed(() => {
  if (!props.userCreatedAt) {
    return null
  }

  try {
    const registrationTime = new Date(props.userCreatedAt).getTime()
    const elapsed = (currentTime.value - registrationTime) / 1000 / 60
    return elapsed
  } catch (error) {
    console.error('Failed to parse userCreatedAt:', error)
    return null
  }
})

// 计算剩余分钟数
const remainingMinutes = computed(() => {
  if (minutesSinceRegistration.value === null) {
    return 0
  }

  const remaining = Math.max(
    0,
    Math.ceil(PROMOTION_DURATION_MINUTES - minutesSinceRegistration.value)
  )
  return remaining
})

// 判断是否应该显示横幅（仅在注册后30分钟内显示）
const shouldShowBanner = computed(() => {
  // 如果没有传入注册时间，不显示横幅
  if (!props.userCreatedAt) {
    return false
  }

  // 如果注册时间解析失败，不显示横幅
  if (minutesSinceRegistration.value === null) {
    return false
  }

  // 仅在注册后30分钟内显示
  return minutesSinceRegistration.value < PROMOTION_DURATION_MINUTES
})

// 定时器用于更新当前时间
let timer = null

onMounted(() => {
  // 每分钟更新一次当前时间，以更新剩余时间显示
  timer = setInterval(() => {
    currentTime.value = Date.now()
  }, 60000) // 60秒
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})

const handleContactAdmin = () => {
  emit('contact-admin')
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
