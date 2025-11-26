<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">充值记录</h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">查看您的账户充值历史记录</p>
      </div>
      <!-- 导出按钮 -->
      <button
        class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="records.length === 0 || exporting"
        @click="exportRecords"
      >
        <svg
          v-if="exporting"
          class="h-4 w-4 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
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
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        {{ exporting ? '导出中...' : '导出 CSV' }}
      </button>
    </div>

    <!-- 余额概览卡片 -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <!-- 累计充值 -->
      <div
        class="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-5 dark:from-emerald-900/20 dark:to-teal-900/20"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">累计充值</p>
            <p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              ${{ balanceInfo?.totalRecharge?.toFixed(2) || '0.00' }}
            </p>
          </div>
        </div>
      </div>

      <!-- 已消费 -->
      <div
        class="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 p-5 dark:from-orange-900/20 dark:to-amber-900/20"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-500/30"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">已消费</p>
            <p class="text-2xl font-bold text-orange-600 dark:text-orange-400">
              ${{ balanceInfo?.totalCost?.toFixed(2) || '0.00' }}
            </p>
          </div>
        </div>
      </div>

      <!-- 可用余额 -->
      <div
        class="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-5 dark:from-blue-900/20 dark:to-indigo-900/20"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/30"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">可用余额</p>
            <p
              class="text-2xl font-bold"
              :class="
                (balanceInfo?.availableBalance || 0) >= 0
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-red-600 dark:text-red-400'
              "
            >
              ${{ balanceInfo?.availableBalance?.toFixed(2) || '0.00' }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 记录列表 -->
    <div
      class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
    >
      <!-- 加载状态 -->
      <div v-if="loading" class="flex items-center justify-center py-12">
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
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
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
        <svg class="mb-4 h-16 w-16 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24">
          <path
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p class="text-lg font-medium">暂无充值记录</p>
        <p class="mt-1 text-sm">您还没有任何充值记录</p>
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
                类型
              </th>
              <th
                class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                金额
              </th>
              <th
                class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                余额变化
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
                <span
                  class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                  :class="getTypeClass(record.type)"
                >
                  {{ getTypeName(record.type) }}
                </span>
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
                  {{ record.amount >= 0 ? '+' : '' }}${{ record.amount.toFixed(2) }}
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
import { useUserStore } from '@/stores/user'
import { showToast } from '@/utils/toast'

const userStore = useUserStore()

const loading = ref(true)
const exporting = ref(false)
const records = ref([])
const balanceInfo = ref(null)
const totalRecords = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

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
    payment: '在线支付',
    refund: '退款',
    adjustment: '调整'
  }
  return typeMap[type] || type
}

const getTypeClass = (type) => {
  const classMap = {
    manual: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    payment: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
    refund: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
    adjustment: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'
  }
  return classMap[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}

const loadRecords = async () => {
  loading.value = true
  try {
    const result = await userStore.getRechargeRecords({
      page: currentPage.value,
      pageSize: pageSize.value
    })
    records.value = result.records || []
    totalRecords.value = result.total || 0
  } catch (error) {
    console.error('Failed to load recharge records:', error)
    showToast('加载充值记录失败', 'error')
  } finally {
    loading.value = false
  }
}

const loadBalanceInfo = async () => {
  try {
    balanceInfo.value = await userStore.getUserBalance()
  } catch (error) {
    console.error('Failed to load balance info:', error)
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
    const headers = ['时间', '类型', '金额', '充值前余额', '充值后余额', '操作者', '备注']
    const rows = records.value.map((record) => [
      formatDate(record.createdAt),
      getTypeName(record.type),
      `$${record.amount.toFixed(2)}`,
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
    link.setAttribute('download', `充值记录_${new Date().toISOString().split('T')[0]}.csv`)
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
  loadBalanceInfo()
  loadRecords()
})
</script>
