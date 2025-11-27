<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">使用统计</h1>
        <p class="mt-2 text-base text-gray-600 dark:text-gray-400">查看您的 API 使用统计和成本</p>
      </div>
      <div class="relative">
        <select
          v-model="selectedPeriod"
          class="block w-full appearance-none rounded-2xl border-2 border-gray-200 bg-white px-5 py-3 pr-10 text-sm font-semibold text-gray-900 transition-all focus:border-[#D97757] focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-[#D97757]"
          @change="loadUsageStats"
        >
          <option value="day">最近 24 小时</option>
          <option value="week">最近 7 天</option>
          <option value="month">最近 30 天</option>
          <option value="quarter">最近 90 天</option>
        </select>
        <div
          class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M19 9l-7 7-7-7"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            />
          </svg>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-16">
      <div class="relative">
        <div class="h-20 w-20 rounded-full border-4 border-[#E6E2DA] dark:border-gray-700"></div>
        <div
          class="absolute top-0 h-20 w-20 animate-spin rounded-full border-4 border-transparent border-t-[#D97757]"
        ></div>
      </div>
      <p class="mt-4 text-base font-medium text-gray-700 dark:text-gray-300">加载使用统计中...</p>
    </div>

    <!-- Stats Cards -->
    <div v-else class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      <!-- Total Requests Card -->
      <div
        class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#F4F1EA] to-[#E6E2DA] p-6 transition-all hover:-translate-y-1 hover:shadow-xl dark:from-gray-800/50 dark:to-gray-700/50"
      >
        <div
          class="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-[#D97757]/10 blur-3xl transition-all group-hover:bg-[#D97757]/20"
        ></div>
        <div class="relative">
          <div
            class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D97757] shadow-lg shadow-[#D97757]/30"
          >
            <svg class="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M13 10V3L4 14h7v7l9-11h-7z"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
              />
            </svg>
          </div>
          <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">总请求数</p>
          <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50">
            {{ formatNumber(usageStats?.totalRequests || 0) }}
          </p>
        </div>
      </div>

      <!-- Input Tokens Card -->
      <div
        class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#F4F1EA] to-[#E6E2DA] p-6 transition-all hover:-translate-y-1 hover:shadow-xl dark:from-gray-800/50 dark:to-gray-700/50"
      >
        <div
          class="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-[#D97757]/10 blur-3xl transition-all group-hover:bg-[#D97757]/20"
        ></div>
        <div class="relative">
          <div
            class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D97757] shadow-lg shadow-[#D97757]/30"
          >
            <svg class="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
              />
            </svg>
          </div>
          <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">输入令牌</p>
          <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50">
            {{ formatNumber(usageStats?.totalInputTokens || 0) }}
          </p>
        </div>
      </div>

      <!-- Output Tokens Card -->
      <div
        class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#F4F1EA] to-[#E6E2DA] p-6 transition-all hover:-translate-y-1 hover:shadow-xl dark:from-gray-800/50 dark:to-gray-700/50"
      >
        <div
          class="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-[#D97757]/10 blur-3xl transition-all group-hover:bg-[#D97757]/20"
        ></div>
        <div class="relative">
          <div
            class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D97757] shadow-lg shadow-[#D97757]/30"
          >
            <svg class="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
              />
            </svg>
          </div>
          <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">输出令牌</p>
          <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50">
            {{ formatNumber(usageStats?.totalOutputTokens || 0) }}
          </p>
        </div>
      </div>

      <!-- Total Cost Card -->
      <div
        class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 p-6 transition-all hover:-translate-y-1 hover:shadow-xl dark:from-amber-900/30 dark:to-yellow-900/30"
      >
        <div
          class="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-amber-500/10 blur-3xl transition-all group-hover:bg-amber-500/20"
        ></div>
        <div class="relative">
          <div
            class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 shadow-lg shadow-amber-500/30"
          >
            <svg class="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
              />
            </svg>
          </div>
          <p class="text-sm font-semibold text-amber-900 dark:text-amber-100">总成本</p>
          <p class="mt-2 text-3xl font-bold text-amber-900 dark:text-amber-50">
            ${{ (usageStats?.totalCost || 0).toFixed(4) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Daily Usage Chart -->
    <div
      v-if="!loading && usageStats"
      class="overflow-hidden rounded-3xl border border-gray-200/50 bg-white/80 shadow-xl backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-800/80"
    >
      <div class="bg-[#D97757] px-6 py-5">
        <h3 class="flex items-center text-xl font-bold text-white">
          <svg class="mr-3 h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            />
          </svg>
          每日使用趋势
        </h3>
      </div>
      <div class="p-6">
        <!-- 趋势图表 -->
        <div v-if="trendData.length > 0" class="relative" style="height: 300px">
          <canvas ref="chartCanvas" />
        </div>
        <!-- 无数据状态 -->
        <div
          v-else
          class="flex h-64 items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/50 dark:border-gray-600 dark:bg-gray-700/30"
        >
          <div class="text-center">
            <svg
              class="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
              />
            </svg>
            <h3 class="mt-4 text-base font-bold text-gray-900 dark:text-white">暂无使用数据</h3>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">该时间段内没有使用记录</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Model Usage Breakdown -->
    <div
      v-if="!loading && usageStats && usageStats.modelStats?.length > 0"
      class="overflow-hidden rounded-3xl border border-gray-200/50 bg-white/80 shadow-xl backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-800/80"
    >
      <div class="bg-[#D97757] px-6 py-5">
        <h3 class="flex items-center text-xl font-bold text-white">
          <svg class="mr-3 h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            />
          </svg>
          按模型统计
        </h3>
      </div>
      <div class="p-6">
        <div class="space-y-3">
          <div
            v-for="model in usageStats.modelStats"
            :key="model.name"
            class="flex items-center justify-between"
          >
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="h-2 w-2 rounded-full bg-[#D97757]"></div>
              </div>
              <div class="ml-3">
                <p class="text-sm font-medium text-gray-900">{{ model.name }}</p>
              </div>
            </div>
            <div class="text-right">
              <p class="text-sm text-gray-900">{{ formatNumber(model.requests) }} requests</p>
              <p class="text-xs text-gray-500">${{ model.cost.toFixed(4) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Detailed Usage Table -->
    <div
      v-if="!loading && userApiKeys.length > 0"
      class="overflow-hidden rounded-3xl border border-gray-200/50 bg-white/80 shadow-xl backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-800/80"
    >
      <div class="bg-[#D97757] px-6 py-5">
        <h3 class="flex items-center text-xl font-bold text-white">
          <svg class="mr-3 h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            />
          </svg>
          按 API Key 统计
        </h3>
      </div>
      <div class="p-6">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th
                  class="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300"
                  scope="col"
                >
                  API Key
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300"
                  scope="col"
                >
                  请求数
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300"
                  scope="col"
                >
                  输入令牌
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300"
                  scope="col"
                >
                  输出令牌
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300"
                  scope="col"
                >
                  成本
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300"
                  scope="col"
                >
                  状态
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white">
              <tr v-for="apiKey in userApiKeys" :key="apiKey.id">
                <td class="whitespace-nowrap px-6 py-4">
                  <div class="text-sm font-medium text-gray-900">{{ apiKey.name }}</div>
                  <div class="text-sm text-gray-500">{{ apiKey.keyPreview }}</div>
                </td>
                <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                  {{ formatNumber(apiKey.usage?.requests || 0) }}
                </td>
                <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                  {{ formatNumber(apiKey.usage?.inputTokens || 0) }}
                </td>
                <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                  {{ formatNumber(apiKey.usage?.outputTokens || 0) }}
                </td>
                <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                  ${{ (apiKey.usage?.totalCost || 0).toFixed(4) }}
                </td>
                <td class="whitespace-nowrap px-6 py-4">
                  <span
                    :class="[
                      'inline-flex items-center rounded-full px-3 py-1 text-xs font-bold',
                      apiKey.isDeleted === 'true' || apiKey.deletedAt
                        ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        : apiKey.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    ]"
                  >
                    {{
                      apiKey.isDeleted === 'true' || apiKey.deletedAt
                        ? '已删除'
                        : apiKey.isActive
                          ? '活跃'
                          : '已停用'
                    }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- No Data State - 仅在统计数据和趋势数据都为空时显示 -->
    <div
      v-if="!loading && (!usageStats || usageStats.totalRequests === 0) && trendData.length === 0"
      class="flex flex-col items-center justify-center py-20"
    >
      <div
        class="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800"
      >
        <svg
          class="h-12 w-12 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
          />
        </svg>
      </div>
      <h3 class="text-xl font-bold text-gray-900 dark:text-white">暂无使用数据</h3>
      <p class="mt-2 max-w-md text-center text-base text-gray-600 dark:text-gray-400">
        您还没有发起任何 API 请求。创建一个 API Key 并开始使用服务来查看使用统计。
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Chart } from 'chart.js/auto'
import { useUserStore } from '@/stores/user'
import { useChartConfig } from '@/composables/useChartConfig'
import { showToast } from '@/utils/toast'

const userStore = useUserStore()

const loading = ref(true)
const selectedPeriod = ref('week')
const usageStats = ref(null)
const userApiKeys = ref([])
const trendData = ref([])
const chartCanvas = ref(null)
let chart = null

const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

// 根据时间周期计算天数
const getPeriodDays = (period) => {
  const periodMap = {
    day: 1,
    week: 7,
    month: 30,
    quarter: 90
  }
  return periodMap[period] || 7
}

// 创建图表
const createChart = () => {
  if (!chartCanvas.value || !trendData.value.length) return

  if (chart) {
    chart.destroy()
  }

  const { getGradient } = useChartConfig()
  const ctx = chartCanvas.value.getContext('2d')

  const labels = trendData.value.map((item) => item.date)

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '请求次数',
          data: trendData.value.map((item) => item.requests),
          borderColor: '#D97757',
          backgroundColor: getGradient(ctx, '#D97757', 0.1),
          yAxisID: 'y',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Token使用量',
          data: trendData.value.map((item) => item.tokens),
          borderColor: '#667eea',
          backgroundColor: getGradient(ctx, '#667eea', 0.1),
          yAxisID: 'y1',
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function (context) {
              let label = context.dataset.label || ''
              if (label) {
                label += ': '
              }
              if (context.parsed.y !== null) {
                label += new Intl.NumberFormat('zh-CN').format(context.parsed.y)
              }
              return label
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          grid: {
            display: false
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: '请求次数'
          },
          ticks: {
            callback: function (value) {
              if (value >= 1000) {
                return (value / 1000).toFixed(0) + 'K'
              }
              return value
            }
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Token使用量'
          },
          grid: {
            drawOnChartArea: false
          },
          ticks: {
            callback: function (value) {
              if (value >= 1000000) {
                return (value / 1000000).toFixed(1) + 'M'
              } else if (value >= 1000) {
                return (value / 1000).toFixed(0) + 'K'
              }
              return value
            }
          }
        }
      }
    }
  })
}

const loadUsageStats = async () => {
  loading.value = true
  try {
    const days = getPeriodDays(selectedPeriod.value)
    const [stats, apiKeys, trend] = await Promise.all([
      userStore.getUserUsageStats({ period: selectedPeriod.value }),
      userStore.getUserApiKeys(true), // 包含已删除的 keys
      userStore.getUserUsageTrend({ days })
    ])

    usageStats.value = stats
    userApiKeys.value = apiKeys
    trendData.value = trend
  } catch (error) {
    console.error('Failed to load usage stats:', error)
    showToast('加载使用统计失败', 'error')
  } finally {
    loading.value = false
  }
}

// 监听趋势数据变化，更新图表（使用 nextTick 确保 DOM 已更新）
watch(
  () => trendData.value,
  (newVal) => {
    if (newVal && newVal.length > 0) {
      nextTick(() => {
        createChart()
      })
    }
  },
  { deep: true }
)

onMounted(() => {
  loadUsageStats()
})

onUnmounted(() => {
  if (chart) {
    chart.destroy()
  }
})
</script>

<style scoped>
/* 组件特定样式 */
</style>
