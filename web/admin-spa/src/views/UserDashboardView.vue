<template>
  <div class="min-h-screen bg-[#F4F1EA] dark:bg-gray-900">
    <!-- 玻璃态导航栏 -->
    <nav
      class="sticky top-0 z-50 border-b border-gray-200/50 bg-white/90 backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-800/90"
    >
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 items-center justify-between">
          <!-- Logo 和品牌 -->
          <div class="flex items-center space-x-8">
            <div class="flex items-center space-x-3">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D97757] shadow-md"
              >
                <svg
                  class="h-5 w-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
              </div>
              <span class="text-xl font-bold text-gray-900 dark:text-white">{{ siteName }}</span>
            </div>

            <!-- Tab 导航（带滑动指示器） -->
            <div
              class="relative hidden items-center rounded-2xl bg-gray-100/50 p-1.5 dark:bg-gray-700/50 lg:flex"
            >
              <!-- 滑动指示器 -->
              <div
                class="absolute left-1.5 top-1.5 h-[calc(100%-12px)] rounded-xl bg-white shadow-md transition-all duration-300 dark:bg-gray-600"
                :style="{
                  width: `calc(${100 / 4}% - 6px)`,
                  transform: `translateX(calc(${
                    activeTab === 'overview'
                      ? 0
                      : activeTab === 'api-keys'
                        ? 100
                        : activeTab === 'usage'
                          ? 200
                          : 300
                  }% + ${
                    activeTab === 'overview'
                      ? 0
                      : activeTab === 'api-keys'
                        ? 6
                        : activeTab === 'usage'
                          ? 12
                          : 18
                  }px))`
                }"
              ></div>

              <!-- Tab 按钮 -->
              <button
                class="relative z-10 rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
                :class="
                  activeTab === 'overview'
                    ? 'text-[#D97757]'
                    : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                "
                @click="handleTabChange('overview')"
              >
                总览
              </button>
              <button
                class="relative z-10 rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
                :class="
                  activeTab === 'api-keys'
                    ? 'text-[#D97757]'
                    : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                "
                @click="handleTabChange('api-keys')"
              >
                API Keys
              </button>
              <button
                class="relative z-10 rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
                :class="
                  activeTab === 'usage'
                    ? 'text-[#D97757]'
                    : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                "
                @click="handleTabChange('usage')"
              >
                使用统计
              </button>
              <button
                class="relative z-10 rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
                :class="
                  activeTab === 'tutorial'
                    ? 'text-[#D97757]'
                    : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                "
                @click="handleTabChange('tutorial')"
              >
                教程
              </button>
            </div>
          </div>

          <!-- 用户区域 -->
          <div class="flex items-center space-x-4">
            <div class="hidden text-sm text-gray-700 dark:text-gray-300 sm:block">
              欢迎，<span class="font-semibold text-gray-900 dark:text-white">{{
                userStore.userName
              }}</span>
            </div>

            <!-- 主题切换按钮 -->
            <ThemeToggle mode="icon" />

            <!-- 登出按钮 -->
            <button
              class="rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-100"
              @click="handleLogout"
            >
              登出
            </button>
          </div>
        </div>
      </div>
    </nav>

    <!-- 主内容 -->
    <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <!-- Overview Tab -->
      <div v-if="activeTab === 'overview'" class="space-y-6">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">仪表板总览</h1>
          <p class="mt-2 text-base text-gray-600 dark:text-gray-400">
            欢迎来到您的 {{ siteName }} 仪表板
          </p>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
          <!-- 活跃的 API Keys 卡片 -->
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
                <svg
                  class="h-7 w-7 text-white"
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
              <div>
                <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  活跃的 API Keys
                </p>
                <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50">
                  {{ apiKeysStats.active }}
                </p>
              </div>
            </div>
          </div>

          <!-- 已删除的 API Keys 卡片 -->
          <div
            class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-50 to-slate-50 p-6 transition-all hover:-translate-y-1 hover:shadow-xl dark:from-gray-800/50 dark:to-slate-800/50"
          >
            <div
              class="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-gray-500/10 blur-3xl transition-all group-hover:bg-gray-500/20"
            ></div>
            <div class="relative">
              <div
                class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-500 to-slate-600 shadow-lg shadow-gray-500/30"
              >
                <svg
                  class="h-7 w-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  已删除的 API Keys
                </p>
                <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50">
                  {{ apiKeysStats.deleted }}
                </p>
              </div>
            </div>
          </div>

          <!-- 总请求数卡片 -->
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
                <svg
                  class="h-7 w-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">总请求数</p>
                <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50">
                  {{ formatNumber(userProfile?.totalUsage?.requests || 0) }}
                </p>
              </div>
            </div>
          </div>

          <!-- 输入令牌卡片 -->
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
                <svg
                  class="h-7 w-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">输入令牌</p>
                <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50">
                  {{ formatNumber(userProfile?.totalUsage?.inputTokens || 0) }}
                </p>
              </div>
            </div>
          </div>

          <!-- 总成本卡片 -->
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
                <svg
                  class="h-7 w-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
              </div>
              <div>
                <p class="text-sm font-semibold text-amber-900 dark:text-amber-100">总成本</p>
                <p class="mt-2 text-3xl font-bold text-amber-900 dark:text-amber-50">
                  ${{ (userProfile?.totalUsage?.totalCost || 0).toFixed(4) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- User Info -->
        <div
          class="overflow-hidden rounded-3xl border border-gray-200/50 bg-white/80 shadow-xl backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-800/80"
        >
          <div class="bg-[#D97757] px-6 py-5">
            <h3 class="flex items-center text-xl font-bold text-white">
              <svg class="mr-3 h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                />
              </svg>
              账户信息
            </h3>
          </div>
          <div class="px-6 py-6">
            <dl class="space-y-4">
              <div
                class="flex items-center justify-between rounded-2xl bg-gray-50 px-5 py-4 dark:bg-gray-700/50"
              >
                <dt
                  class="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  <svg
                    class="mr-3 h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                  用户名
                </dt>
                <dd class="text-base font-bold text-gray-900 dark:text-white">
                  {{ userProfile?.username }}
                </dd>
              </div>
              <div
                class="flex items-center justify-between rounded-2xl bg-gray-50 px-5 py-4 dark:bg-gray-700/50"
              >
                <dt
                  class="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  <svg
                    class="mr-3 h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                  显示名称
                </dt>
                <dd class="text-base font-bold text-gray-900 dark:text-white">
                  {{ userProfile?.displayName || '未设置' }}
                </dd>
              </div>
              <div
                class="flex items-center justify-between rounded-2xl bg-gray-50 px-5 py-4 dark:bg-gray-700/50"
              >
                <dt
                  class="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  <svg
                    class="mr-3 h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                  邮箱
                </dt>
                <dd class="text-base font-bold text-gray-900 dark:text-white">
                  {{ userProfile?.email || '未设置' }}
                </dd>
              </div>
              <div
                class="flex items-center justify-between rounded-2xl bg-gray-50 px-5 py-4 dark:bg-gray-700/50"
              >
                <dt
                  class="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  <svg
                    class="mr-3 h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                  角色
                </dt>
                <dd>
                  <span
                    class="inline-flex items-center rounded-full bg-[#D97757] px-4 py-1.5 text-sm font-bold text-white shadow-md"
                  >
                    {{ userProfile?.role === 'admin' ? '管理员' : '用户' }}
                  </span>
                </dd>
              </div>
              <div
                class="flex items-center justify-between rounded-2xl bg-gray-50 px-5 py-4 dark:bg-gray-700/50"
              >
                <dt
                  class="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  <svg
                    class="mr-3 h-5 w-5 text-gray-400"
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
                  注册时间
                </dt>
                <dd class="text-base font-bold text-gray-900 dark:text-white">
                  {{ formatDate(userProfile?.createdAt) }}
                </dd>
              </div>
              <div
                class="flex items-center justify-between rounded-2xl bg-gray-50 px-5 py-4 dark:bg-gray-700/50"
              >
                <dt
                  class="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  <svg
                    class="mr-3 h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                  最后登录
                </dt>
                <dd class="text-base font-bold text-gray-900 dark:text-white">
                  {{ formatDate(userProfile?.lastLoginAt) || '未记录' }}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <!-- API Keys Tab -->
      <div v-else-if="activeTab === 'api-keys'">
        <UserApiKeysManager />
      </div>

      <!-- Usage Stats Tab -->
      <div v-else-if="activeTab === 'usage'">
        <UserUsageStats />
      </div>

      <!-- Tutorial Tab -->
      <div v-else-if="activeTab === 'tutorial'" class="space-y-6">
        <TutorialView />
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { showToast } from '@/utils/toast'
import ThemeToggle from '@/components/common/ThemeToggle.vue'
import UserApiKeysManager from '@/components/user/UserApiKeysManager.vue'
import UserUsageStats from '@/components/user/UserUsageStats.vue'
import TutorialView from '@/views/TutorialView.vue'

const router = useRouter()
const userStore = useUserStore()
const authStore = useAuthStore()
const themeStore = useThemeStore()

// 获取站点名称配置
const siteName = computed(() => authStore.oemSettings?.siteName || 'Claude Relay')

const activeTab = ref('overview')
const userProfile = ref(null)
const apiKeysStats = ref({ active: 0, deleted: 0 })

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

const handleTabChange = (tab) => {
  activeTab.value = tab
  // 切换到总览标签时刷新 API Keys 统计
  if (tab === 'overview') {
    loadApiKeysStats()
  }
}

const handleLogout = async () => {
  try {
    await userStore.logout()
    showToast('登出成功', 'success')
    router.push('/user-login')
  } catch (error) {
    showToast('登出失败', 'error')
  }
}

const loadUserProfile = async () => {
  try {
    userProfile.value = await userStore.getUserProfile()
  } catch (error) {
    console.error('Failed to load user profile:', error)
    showToast('加载用户资料失败', 'error')
  }
}

const loadApiKeysStats = async () => {
  try {
    const allApiKeys = await userStore.getUserApiKeys(true) // Include deleted keys
    console.log('All API Keys received:', allApiKeys)

    const activeKeys = allApiKeys.filter(
      (key) => !(key.isDeleted === 'true' || key.deletedAt) && key.isActive
    )
    const deletedKeys = allApiKeys.filter((key) => key.isDeleted === 'true' || key.deletedAt)

    console.log('Active keys:', activeKeys)
    console.log('Deleted keys:', deletedKeys)
    console.log('Active count:', activeKeys.length)
    console.log('Deleted count:', deletedKeys.length)

    apiKeysStats.value = { active: activeKeys.length, deleted: deletedKeys.length }
  } catch (error) {
    console.error('Failed to load API keys stats:', error)
    apiKeysStats.value = { active: 0, deleted: 0 }
  }
}

onMounted(async () => {
  // 初始化主题
  themeStore.initTheme()
  // 加载 OEM 设置以获取站点名称配置
  await authStore.loadOemSettings()
  loadUserProfile()
  loadApiKeysStats()
})
</script>

<style scoped>
/* 组件特定样式 */
</style>
