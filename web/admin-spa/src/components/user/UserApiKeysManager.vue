<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">我的 API Keys</h1>
        <p class="mt-2 text-base text-gray-600 dark:text-gray-400">
          管理您的 API 密钥以访问 {{ siteName }} 服务
        </p>
      </div>
      <button
        class="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:scale-105 hover:shadow-xl hover:shadow-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 dark:shadow-blue-500/20 dark:hover:shadow-blue-500/30"
        :disabled="activeApiKeysCount >= maxApiKeys"
        @click="showCreateModal = true"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
          />
        </svg>
        创建 API Key
      </button>
    </div>

    <!-- API Keys 数量限制提示 -->
    <div
      v-if="activeApiKeysCount >= maxApiKeys"
      class="flex items-start space-x-4 rounded-2xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-5 dark:border-amber-800/50 dark:from-amber-900/20 dark:to-yellow-900/20"
    >
      <div class="flex-shrink-0">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 dark:bg-amber-600"
        >
          <svg class="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              clip-rule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              fill-rule="evenodd"
            />
          </svg>
        </div>
      </div>
      <div class="flex-1">
        <h3 class="text-sm font-bold text-amber-900 dark:text-amber-200">
          已达到 API Key 数量上限
        </h3>
        <p class="mt-1 text-sm text-amber-800 dark:text-amber-300">
          您已达到 API Key 的最大数量 ({{ maxApiKeys }})。请删除现有的 Key 以创建新的。
        </p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-16">
      <div class="relative">
        <div class="h-20 w-20 rounded-full border-4 border-blue-200 dark:border-blue-900"></div>
        <div
          class="absolute top-0 h-20 w-20 animate-spin rounded-full border-4 border-transparent border-t-blue-600 dark:border-t-blue-400"
        ></div>
      </div>
      <p class="mt-4 text-base font-medium text-gray-700 dark:text-gray-300">加载 API Keys 中...</p>
    </div>

    <!-- API Keys List -->
    <div v-else-if="sortedApiKeys.length > 0" class="grid grid-cols-1 gap-6">
      <div
        v-for="apiKey in sortedApiKeys"
        :key="apiKey.id"
        class="group relative overflow-hidden rounded-3xl border border-gray-200/50 bg-white/80 p-6 shadow-lg backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-2xl dark:border-gray-700/50 dark:bg-gray-800/80"
      >
        <!-- 装饰性背景 -->
        <div
          class="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-20 transition-opacity group-hover:opacity-30"
          :class="
            apiKey.isDeleted === 'true' || apiKey.deletedAt
              ? 'bg-gray-400'
              : apiKey.isActive
                ? 'bg-green-400'
                : 'bg-red-400'
          "
        ></div>

        <div class="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <!-- Left Section: Key Info -->
          <div class="flex flex-1 items-start gap-4">
            <!-- Status Indicator -->
            <div class="flex-shrink-0 pt-1">
              <div
                class="flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg"
                :class="
                  apiKey.isDeleted === 'true' || apiKey.deletedAt
                    ? 'bg-gradient-to-br from-gray-400 to-gray-500'
                    : apiKey.isActive
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                      : 'bg-gradient-to-br from-red-500 to-rose-600'
                "
              >
                <svg
                  class="h-6 w-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2m-2-2h-6m6 0v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9a2 2 0 012-2h6z"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
              </div>
            </div>

            <!-- Key Details -->
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ apiKey.name }}</h3>
                <span
                  v-if="apiKey.isDeleted === 'true' || apiKey.deletedAt"
                  class="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                >
                  已删除
                </span>
                <span
                  v-else-if="apiKey.isActive"
                  class="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800 dark:bg-green-900 dark:text-green-200"
                >
                  活跃
                </span>
                <span
                  v-else
                  class="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800 dark:bg-red-900 dark:text-red-200"
                >
                  已停用
                </span>
              </div>

              <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {{ apiKey.description || '无描述' }}
              </p>

              <!-- Metadata -->
              <div class="mt-3 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span class="flex items-center gap-1">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                  创建：{{ formatDate(apiKey.createdAt) }}
                </span>
                <span
                  v-if="apiKey.isDeleted === 'true' || apiKey.deletedAt"
                  class="flex items-center gap-1"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                  删除：{{ formatDate(apiKey.deletedAt) }}
                </span>
                <span v-else-if="apiKey.lastUsedAt" class="flex items-center gap-1">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                  最后使用：{{ formatDate(apiKey.lastUsedAt) }}
                </span>
                <span v-else class="flex items-center gap-1">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                  从未使用
                </span>
                <span
                  v-if="apiKey.expiresAt && !(apiKey.isDeleted === 'true' || apiKey.deletedAt)"
                  class="flex items-center gap-1"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                  过期：{{ formatDate(apiKey.expiresAt) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Right Section: Stats & Actions -->
          <div class="flex flex-row items-center gap-4 lg:flex-col lg:items-end">
            <!-- Usage Stats -->
            <div class="rounded-2xl bg-gray-50 px-4 py-3 text-center dark:bg-gray-700/50">
              <p class="text-xs font-semibold text-gray-600 dark:text-gray-400">请求数</p>
              <p class="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                {{ formatNumber(apiKey.usage?.requests || 0) }}
              </p>
              <p
                v-if="apiKey.usage?.totalCost"
                class="mt-1 text-xs text-gray-500 dark:text-gray-400"
              >
                ${{ apiKey.usage.totalCost.toFixed(4) }}
              </p>
            </div>

            <!-- Actions -->
            <div class="flex gap-2">
              <button
                class="rounded-xl bg-blue-100 p-2 text-blue-600 transition-all hover:scale-110 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-400 dark:hover:bg-blue-900"
                title="查看 API Key"
                @click="showApiKey(apiKey)"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                  <path
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
              </button>

              <button
                v-if="
                  !(apiKey.isDeleted === 'true' || apiKey.deletedAt) &&
                  apiKey.isActive &&
                  allowUserDeleteApiKeys
                "
                class="rounded-xl bg-red-100 p-2 text-red-600 transition-all hover:scale-110 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-400 dark:hover:bg-red-900"
                title="删除 API Key"
                @click="deleteApiKey(apiKey)"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="flex flex-col items-center justify-center py-20">
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
            d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2m-2-2h-6m6 0v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9a2 2 0 012-2h6z"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
          />
        </svg>
      </div>
      <h3 class="text-xl font-bold text-gray-900 dark:text-white">还没有 API Keys</h3>
      <p class="mt-2 text-base text-gray-600 dark:text-gray-400">
        创建您的第一个 API Key 来开始使用服务
      </p>
      <button
        class="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:scale-105 hover:shadow-xl hover:shadow-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        @click="showCreateModal = true"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
          />
        </svg>
        创建 API Key
      </button>
    </div>

    <!-- Create API Key Modal -->
    <CreateApiKeyModal
      :show="showCreateModal"
      @close="showCreateModal = false"
      @created="handleApiKeyCreated"
    />

    <!-- View API Key Modal -->
    <ViewApiKeyModal
      :api-key="selectedApiKey"
      :show="showViewModal"
      @close="showViewModal = false"
    />

    <!-- Confirm Delete Modal -->
    <ConfirmModal
      confirm-class="bg-red-600 hover:bg-red-700"
      confirm-text="删除"
      :message="`确定要删除 '${selectedApiKey?.name}' 吗？此操作无法撤销。`"
      :show="showDeleteModal"
      title="删除 API Key"
      @cancel="showDeleteModal = false"
      @confirm="handleDeleteConfirm"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useAuthStore } from '@/stores/auth'
import { showToast } from '@/utils/toast'
import CreateApiKeyModal from './CreateApiKeyModal.vue'
import ViewApiKeyModal from './ViewApiKeyModal.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'

const userStore = useUserStore()
const authStore = useAuthStore()

// 获取站点名称配置
const siteName = computed(() => authStore.oemSettings?.siteName || 'Claude Relay')

const loading = ref(true)
const apiKeys = ref([])
const maxApiKeys = computed(() => userStore.config?.maxApiKeysPerUser || 5)
const allowUserDeleteApiKeys = computed(() => userStore.config?.allowUserDeleteApiKeys === true)

const showCreateModal = ref(false)
const showViewModal = ref(false)
const showDeleteModal = ref(false)
const selectedApiKey = ref(null)

// Computed property to sort API keys by creation time (descending - newest first)
const sortedApiKeys = computed(() => {
  return [...apiKeys.value].sort((a, b) => {
    const dateA = new Date(a.createdAt)
    const dateB = new Date(b.createdAt)
    return dateB - dateA // Descending order
  })
})

// Computed property to count only active (non-deleted) API keys
const activeApiKeysCount = computed(() => {
  return apiKeys.value.filter((key) => !(key.isDeleted === 'true' || key.deletedAt)).length
})

const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

const formatDate = (dateString) => {
  if (!dateString) return null
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const loadApiKeys = async () => {
  loading.value = true
  try {
    apiKeys.value = await userStore.getUserApiKeys(true) // 包含已删除的 keys
  } catch (error) {
    console.error('Failed to load API keys:', error)
    showToast('加载 API Keys 失败', 'error')
  } finally {
    loading.value = false
  }
}

const showApiKey = (apiKey) => {
  selectedApiKey.value = apiKey
  showViewModal.value = true
}

const deleteApiKey = (apiKey) => {
  selectedApiKey.value = apiKey
  showDeleteModal.value = true
}

const handleDeleteConfirm = async () => {
  try {
    const result = await userStore.deleteApiKey(selectedApiKey.value.id)

    if (result.success) {
      showToast('API Key 删除成功', 'success')
      await loadApiKeys()
    }
  } catch (error) {
    console.error('Failed to delete API key:', error)
    showToast('删除 API Key 失败', 'error')
  } finally {
    showDeleteModal.value = false
    selectedApiKey.value = null
  }
}

const handleApiKeyCreated = async () => {
  showCreateModal.value = false
  await loadApiKeys()
}

onMounted(async () => {
  // 加载 OEM 设置以获取站点名称配置
  await authStore.loadOemSettings()
  loadApiKeys()
})
</script>

<style scoped>
/* 组件特定样式 */
</style>
