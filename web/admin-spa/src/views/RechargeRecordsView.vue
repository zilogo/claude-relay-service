<template>
  <div class="space-y-6">
    <!-- 页面标题和操作 -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">充值记录管理</h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">查看和管理所有用户的充值记录</p>
      </div>
      <button
        class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="records.length === 0 || exporting"
        @click="exportRecords"
      >
        <svg v-if="exporting" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            fill="currentColor"
          ></path>
        </svg>
        <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
          />
        </svg>
        {{ exporting ? '导出中...' : '导出 CSV' }}
      </button>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-4">
      <div
        class="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-5 dark:from-emerald-900/20 dark:to-teal-900/20"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
              />
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">总充值金额</p>
            <p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              ${{ stats.totalAmount?.toFixed(2) || '0.00' }}
            </p>
          </div>
        </div>
      </div>

      <div
        class="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-5 dark:from-blue-900/20 dark:to-indigo-900/20"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/30"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
              />
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">充值次数</p>
            <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {{ stats.totalCount || 0 }}
            </p>
          </div>
        </div>
      </div>

      <div
        class="rounded-2xl bg-gradient-to-br from-purple-50 to-violet-50 p-5 dark:from-purple-900/20 dark:to-violet-900/20"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500 text-white shadow-lg shadow-purple-500/30"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
              />
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">充值用户数</p>
            <p class="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {{ stats.userCount || 0 }}
            </p>
          </div>
        </div>
      </div>

      <div
        class="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 p-5 dark:from-orange-900/20 dark:to-amber-900/20"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-500/30"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
              />
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">平均充值金额</p>
            <p class="text-2xl font-bold text-orange-600 dark:text-orange-400">
              ${{ stats.avgAmount?.toFixed(2) || '0.00' }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 筛选器 -->
    <div
      class="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-center"
    >
      <!-- 用户搜索 -->
      <div class="flex-1">
        <label class="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400"
          >搜索用户</label
        >
        <input
          v-model="filters.username"
          class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
          placeholder="输入用户名搜索..."
          type="text"
          @input="debounceSearch"
        />
      </div>

      <!-- 类型筛选 -->
      <div class="w-full sm:w-40">
        <label class="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400"
          >充值类型</label
        >
        <select
          v-model="filters.type"
          class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          @change="loadRecords"
        >
          <option value="">全部类型</option>
          <option value="manual">手动充值</option>
          <option value="payment">在线充值</option>
          <option value="reward">邀请奖励</option>
          <option value="refund">退款</option>
          <option value="adjustment">调整</option>
        </select>
      </div>

      <!-- 时间范围 -->
      <div class="w-full sm:w-40">
        <label class="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400"
          >时间范围</label
        >
        <select
          v-model="filters.timeRange"
          class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          @change="loadRecords"
        >
          <option value="">全部时间</option>
          <option value="today">今天</option>
          <option value="week">最近7天</option>
          <option value="month">最近30天</option>
        </select>
      </div>

      <!-- 刷新按钮 -->
      <div class="flex items-end">
        <button
          class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          :disabled="loading"
          @click="loadRecords"
        >
          <svg
            class="h-4 w-4"
            :class="{ 'animate-spin': loading }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            />
          </svg>
          刷新
        </button>
      </div>
    </div>

    <!-- 记录列表 -->
    <div
      class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
    >
      <!-- 加载状态 -->
      <div v-if="loading" class="flex items-center justify-center py-16">
        <div class="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          <svg class="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              fill="currentColor"
            ></path>
          </svg>
          <span>加载中...</span>
        </div>
      </div>

      <!-- 空状态 -->
      <div
        v-else-if="records.length === 0"
        class="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400"
      >
        <svg
          class="mb-4 h-16 w-16 text-gray-300 dark:text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
          />
        </svg>
        <p class="text-lg font-medium">暂无充值记录</p>
        <p class="mt-1 text-sm">还没有任何充值记录</p>
      </div>

      <!-- 表格 -->
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th
                class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                时间
              </th>
              <th
                class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                用户
              </th>
              <th
                class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                类型
              </th>
              <th
                class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                支付金额
              </th>
              <th
                class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                充值额度
              </th>
              <th
                class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                充值额度变化
              </th>
              <th
                class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                操作者
              </th>
              <th
                class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                备注
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            <tr
              v-for="record in records"
              :key="record.id"
              class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <td class="whitespace-nowrap px-6 py-4">
                <div class="text-sm text-gray-900 dark:text-gray-100">
                  {{ formatDate(record.createdAt) }}
                </div>
              </td>
              <td class="whitespace-nowrap px-6 py-4">
                <div class="flex items-center gap-2">
                  <div
                    class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  >
                    {{ (record.username || '?').charAt(0).toUpperCase() }}
                  </div>
                  <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {{ record.username || record.userId }}
                  </span>
                </div>
              </td>
              <td class="whitespace-nowrap px-6 py-4">
                <span
                  class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                  :class="getTypeClass(record.type)"
                >
                  {{ getTypeName(record.type) }}
                </span>
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-right">
                <span
                  v-if="hasPaymentAmount(record)"
                  class="text-sm font-semibold"
                  :class="getAmountColorClass(record.paymentAmount)"
                >
                  {{ getRecordPaymentAmountText(record) }}
                </span>
                <span v-else class="text-sm text-gray-400 dark:text-gray-500">-</span>
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-right">
                <span
                  class="text-sm font-semibold"
                  :class="
                    record.amount >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  "
                >
                  {{ record.amount >= 0 ? '+' : '' }}${{ record.amount?.toFixed(2) || '0.00' }}
                </span>
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-right">
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  ${{ record.balanceBefore?.toFixed(2) || '0.00' }}
                  <span class="mx-1">→</span>
                  <span class="font-medium text-gray-900 dark:text-gray-100">
                    ${{ record.balanceAfter?.toFixed(2) || '0.00' }}
                  </span>
                </div>
              </td>
              <td class="whitespace-nowrap px-6 py-4">
                <div class="text-sm text-gray-600 dark:text-gray-400">
                  {{ record.operatorName || '-' }}
                </div>
              </td>
              <td class="max-w-xs truncate px-6 py-4">
                <div class="text-sm text-gray-600 dark:text-gray-400" :title="record.remark">
                  {{ record.remark || '-' }}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div
        v-if="totalRecords > pageSize"
        class="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-900/50"
      >
        <div class="text-sm text-gray-600 dark:text-gray-400">
          共 {{ totalRecords }} 条记录，第 {{ currentPage }} / {{ totalPages }} 页
        </div>
        <div class="flex items-center gap-2">
          <button
            class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            :disabled="currentPage <= 1"
            @click="goToPage(currentPage - 1)"
          >
            上一页
          </button>
          <button
            class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            :disabled="currentPage >= totalPages"
            @click="goToPage(currentPage + 1)"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiClient } from '@/config/api'
import { showToast } from '@/utils/toast'

const loading = ref(true)
const exporting = ref(false)
const records = ref([])
const totalRecords = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const stats = ref({
  totalAmount: 0,
  totalCount: 0,
  userCount: 0,
  avgAmount: 0
})
const filters = ref({
  username: '',
  type: '',
  timeRange: ''
})

let searchTimeout = null

const totalPages = computed(() => Math.ceil(totalRecords.value / pageSize.value))

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getTypeName = (type) => {
  const typeMap = {
    manual: '手动充值',
    payment: '在线充值',
    reward: '邀请奖励',
    refund: '退款',
    adjustment: '调整'
  }
  return typeMap[type] || type
}

const getTypeClass = (type) => {
  const classMap = {
    manual: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    payment: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
    reward: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
    refund: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
    adjustment: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'
  }
  return classMap[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}

const formatNumber = (value, fractionDigits = 2) => {
  const numeric = Number.parseFloat(value)
  if (!Number.isFinite(numeric)) {
    return (0).toFixed(fractionDigits)
  }
  return numeric.toFixed(fractionDigits)
}

const resolveCurrencySymbol = (currencyCode) => {
  const normalized = (currencyCode || '').toUpperCase()
  if (normalized === 'USD') return '$'
  if (normalized === 'CNY') return '¥'
  if (normalized === 'EUR') return '€'
  return normalized || '$'
}

const formatSignedCurrency = (value, currencyCode = 'CNY') => {
  const numeric = Number.parseFloat(value)
  if (!Number.isFinite(numeric)) {
    return ''
  }
  const symbol = resolveCurrencySymbol(currencyCode)
  const sign = numeric >= 0 ? '+' : '-'
  return `${sign}${symbol}${formatNumber(Math.abs(numeric))}`
}

const hasPaymentAmount = (record) => {
  if (!record) return false
  const raw = record.paymentAmount
  if (raw === undefined || raw === null) {
    return false
  }
  const numeric = Number.parseFloat(raw)
  return Number.isFinite(numeric)
}

const getRecordPaymentAmountText = (record) => {
  if (!hasPaymentAmount(record)) {
    return ''
  }
  return formatSignedCurrency(record.paymentAmount, record.paymentCurrency || 'CNY')
}

const getAmountColorClass = (value) => {
  const numeric = Number.parseFloat(value)
  if (!Number.isFinite(numeric)) {
    return 'text-gray-500 dark:text-gray-400'
  }
  return numeric >= 0
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-red-600 dark:text-red-400'
}

const debounceSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    loadRecords()
  }, 300)
}

const loadRecords = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value
    }

    if (filters.value.username) {
      params.username = filters.value.username
    }
    if (filters.value.type) {
      params.type = filters.value.type
    }
    if (filters.value.timeRange) {
      const now = new Date()
      if (filters.value.timeRange === 'today') {
        params.startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString()
      } else if (filters.value.timeRange === 'week') {
        params.startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      } else if (filters.value.timeRange === 'month') {
        params.startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    }

    const response = await apiClient.get('/admin/recharge-records', { params })

    if (response.success) {
      records.value = response.data.records || []
      totalRecords.value = response.data.total || 0
      stats.value = response.data.stats || {
        totalAmount: 0,
        totalCount: 0,
        userCount: 0,
        avgAmount: 0
      }
    }
  } catch (error) {
    console.error('Failed to load recharge records:', error)
    showToast('加载充值记录失败', 'error')
  } finally {
    loading.value = false
  }
}

const goToPage = (page) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  loadRecords()
}

const exportRecords = async () => {
  if (records.value.length === 0) {
    showToast('没有可导出的记录', 'warning')
    return
  }

  exporting.value = true
  try {
    // 构建 CSV 内容
    const headers = ['时间', '用户', '类型', '支付金额', '充值额度', '充值前余额', '充值后余额', '操作者', '备注']
    const rows = records.value.map((record) => [
      formatDate(record.createdAt),
      record.username || record.userId,
      getTypeName(record.type),
      getRecordPaymentAmountText(record) || '-',
      `$${record.amount?.toFixed(2) || '0.00'}`,
      `$${record.balanceBefore?.toFixed(2) || '0.00'}`,
      `$${record.balanceAfter?.toFixed(2) || '0.00'}`,
      record.operatorName || '-',
      record.remark || '-'
    ])

    // 添加 BOM 以支持 Excel 正确识别 UTF-8
    const BOM = '\uFEFF'
    const csvContent = BOM + [headers, ...rows].map((row) => row.join(',')).join('\n')

    // 创建下载
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `充值记录_管理员_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    showToast('导出成功', 'success')
  } catch (error) {
    console.error('Export failed:', error)
    showToast('导出失败', 'error')
  } finally {
    exporting.value = false
  }
}

onMounted(() => {
  loadRecords()
})
</script>
