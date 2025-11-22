<template>
  <div
    class="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F4F1EA] px-4 py-12 dark:bg-gray-900"
  >
    <!-- 装饰性背景元素 -->
    <div
      class="absolute left-1/4 top-1/4 h-96 w-96 animate-pulse rounded-full bg-[#D97757]/8 blur-3xl dark:bg-[#D97757]/5"
    ></div>
    <div
      class="absolute bottom-1/4 right-1/4 h-96 w-96 animate-pulse rounded-full bg-[#E6A87C]/8 blur-3xl dark:bg-[#E6A87C]/5"
      style="animation-delay: 1s"
    ></div>

    <!-- 主题切换按钮 -->
    <div class="fixed right-4 top-4 z-10">
      <ThemeToggle mode="dropdown" />
    </div>

    <div class="relative z-10 w-full max-w-md">
      <!-- Logo 和标题 -->
      <div class="mb-8 text-center">
        <div
          class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#D97757] shadow-lg shadow-[#D97757]/30 dark:shadow-[#D97757]/20"
        >
          <svg class="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            />
          </svg>
        </div>
        <h1 class="mb-2 font-serif text-3xl font-bold text-gray-900 dark:text-white">
          用户登录
        </h1>
        <p class="text-sm text-[#5f5f5f] dark:text-gray-400">登录您的账户以管理 API Keys</p>
      </div>

      <!-- 登录卡片 -->
      <div
        class="rounded-3xl border border-[#d8d5ce] bg-white p-8 shadow-xl dark:border-gray-700 dark:bg-gray-800"
      >
        <!-- 认证方式切换 Tab (Pill Style with Sliding Indicator) -->
        <!-- 只在 LDAP 启用时显示 Tab 切换 -->
        <div
          v-if="isLdapEnabled"
          class="relative mb-8 inline-flex w-full rounded-2xl bg-[#E6E2DA] p-1.5 dark:bg-gray-700/50"
        >
          <!-- 滑动指示器 -->
          <div
            class="absolute inset-y-1.5 left-1.5 w-[calc(50%-6px)] rounded-xl bg-white shadow-md transition-transform duration-300 dark:bg-gray-600"
            :style="{
              transform: authType === 'ldap' ? 'translateX(calc(100% + 12px))' : 'translateX(0)'
            }"
          ></div>
          <!-- Tab 按钮 -->
          <button
            class="relative z-10 flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
            :class="
              authType === 'local'
                ? 'text-[#D97757]'
                : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
            "
            type="button"
            @click="authType = 'local'"
          >
            本地登录
          </button>
          <button
            class="relative z-10 flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
            :class="
              authType === 'ldap'
                ? 'text-[#D97757]'
                : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
            "
            type="button"
            @click="authType = 'ldap'"
          >
            LDAP 登录
          </button>
        </div>

        <form class="space-y-6" @submit.prevent="handleLogin">
          <!-- 用户名输入 -->
          <div>
            <label
              class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
              for="username"
            >
              用户名
            </label>
            <div class="relative">
              <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <svg
                  class="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <input
                id="username"
                v-model="form.username"
                autocomplete="username"
                class="block w-full rounded-xl border-2 border-[#d8d5ce] bg-[#F5F2EB] py-3 pl-11 pr-4 text-gray-900 placeholder-gray-400 transition-all focus:border-[#D97757] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white dark:placeholder-gray-500 dark:focus:border-[#D97757] dark:focus:bg-gray-900 dark:focus:ring-[#D97757]/20"
                :disabled="loading"
                name="username"
                placeholder="请输入用户名"
                required
                type="text"
              />
            </div>
          </div>

          <!-- 密码输入 -->
          <div>
            <label
              class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
              for="password"
            >
              密码
            </label>
            <div class="relative">
              <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <svg
                  class="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <input
                id="password"
                v-model="form.password"
                autocomplete="current-password"
                class="block w-full rounded-xl border-2 border-[#d8d5ce] bg-[#F5F2EB] py-3 pl-11 pr-4 text-gray-900 placeholder-gray-400 transition-all focus:border-[#D97757] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white dark:placeholder-gray-500 dark:focus:border-[#D97757] dark:focus:bg-gray-900 dark:focus:ring-[#D97757]/20"
                :disabled="loading"
                name="password"
                placeholder="请输入密码"
                required
                type="password"
              />
            </div>
          </div>

          <!-- 错误提示 -->
          <div
            v-if="error"
            class="flex items-start space-x-3 rounded-xl border-2 border-red-200 bg-red-50 p-4 dark:border-red-800/50 dark:bg-red-900/20"
          >
            <div class="flex-shrink-0">
              <svg
                class="h-5 w-5 text-red-500 dark:text-red-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  clip-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  fill-rule="evenodd"
                />
              </svg>
            </div>
            <p class="text-sm font-medium text-red-700 dark:text-red-300">{{ error }}</p>
          </div>

          <!-- 登录按钮 -->
          <div>
            <button
              class="group relative flex w-full items-center justify-center overflow-hidden rounded-full bg-[#D97757] px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#D97757]/30 transition-all hover:scale-[1.02] hover:bg-[#c86847] hover:shadow-xl hover:shadow-[#D97757]/40 focus:outline-none focus:ring-2 focus:ring-[#D97757] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 dark:shadow-[#D97757]/20 dark:hover:shadow-[#D97757]/30 dark:focus:ring-offset-gray-800"
              :disabled="loading || !form.username || !form.password"
              type="submit"
            >
              <span v-if="loading" class="absolute inset-y-0 left-0 flex items-center pl-4">
                <svg
                  class="h-5 w-5 animate-spin text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
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
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    fill="currentColor"
                  ></path>
                </svg>
              </span>
              {{ loading ? '登录中...' : '登录' }}
            </button>
          </div>

          <!-- 快捷链接 -->
          <div v-if="authType === 'local'" class="space-y-3 pt-2">
            <div class="text-center">
              <router-link
                class="text-sm font-medium text-[#D97757] transition-colors hover:text-[#c86847] dark:text-[#E6A87C] dark:hover:text-[#D97757]"
                to="/forgot-password"
              >
                忘记密码？
              </router-link>
            </div>
            <div class="border-t border-[#d8d5ce] pt-4 text-left dark:border-gray-700">
              <router-link
                class="text-sm font-medium text-[#5f5f5f] transition-colors hover:text-[#D97757] dark:text-gray-400 dark:hover:text-[#E6A87C]"
                to="/user-register"
              >
                创建账户
              </router-link>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { showToast } from '@/utils/toast'
import ThemeToggle from '@/components/common/ThemeToggle.vue'

const router = useRouter()
const userStore = useUserStore()
const authStore = useAuthStore()
const themeStore = useThemeStore()

const loading = ref(false)
const error = ref('')
const authType = ref('local') // 默认本地登录

// 检查 LDAP 是否启用
const isLdapEnabled = computed(() => authStore.oemSettings?.ldapEnabled || false)

const form = reactive({
  username: '',
  password: ''
})

const handleLogin = async () => {
  if (!form.username || !form.password) {
    error.value = '请输入用户名和密码'
    return
  }

  loading.value = true
  error.value = ''

  try {
    await userStore.login({
      username: form.username,
      password: form.password,
      authType: authType.value
    })

    showToast('登录成功！', 'success')
    router.push('/user-dashboard')
  } catch (err) {
    console.error('Login error:', err)
    error.value = err.response?.data?.message || err.message || '登录失败'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  // 初始化主题（因为该页面不在 MainLayout 内）
  themeStore.initTheme()

  // 加载 OEM 设置以获取 LDAP 配置
  await authStore.loadOemSettings()
})
</script>

<style scoped>
/* 组件特定样式 */
</style>
