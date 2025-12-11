<template>
  <div
    class="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F4F1EA] px-4 py-12 dark:bg-gray-900"
  >
    <!-- 装饰性背景元素 -->
    <div
      class="bg-[#D97757]/8 absolute left-1/4 top-1/4 h-96 w-96 animate-pulse rounded-full blur-3xl dark:bg-[#D97757]/5"
    ></div>
    <div
      class="bg-[#E6A87C]/8 absolute bottom-1/4 right-1/4 h-96 w-96 animate-pulse rounded-full blur-3xl dark:bg-[#E6A87C]/5"
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
        <h1 class="mb-2 font-serif text-3xl font-bold text-gray-900 dark:text-white">创建账户</h1>
        <p class="text-sm text-[#5f5f5f] dark:text-gray-400">注册新账户以访问服务</p>
      </div>

      <!-- 注册卡片 -->
      <div
        class="rounded-3xl border border-[#d8d5ce] bg-white p-8 shadow-xl dark:border-gray-700 dark:bg-gray-800"
      >
        <form class="space-y-5" @submit.prevent="handleRegister">
          <!-- 用户名输入 -->
          <div>
            <label
              class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
              for="username"
            >
              用户名 <span class="text-red-500">*</span>
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
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
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
                placeholder="请选择用户名"
                required
                type="text"
              />
            </div>
          </div>

          <!-- 邮箱输入 -->
          <div>
            <label
              class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
              for="email"
            >
              邮箱 <span class="text-red-500">*</span>
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
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
              </div>
              <input
                id="email"
                v-model="form.email"
                autocomplete="email"
                class="block w-full rounded-xl border-2 border-[#d8d5ce] bg-[#F5F2EB] py-3 pl-11 pr-4 text-gray-900 placeholder-gray-400 transition-all focus:border-[#D97757] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white dark:placeholder-gray-500 dark:focus:border-[#D97757] dark:focus:bg-gray-900 dark:focus:ring-[#D97757]/20"
                :disabled="loading"
                name="email"
                placeholder="请输入邮箱"
                required
                type="email"
              />
            </div>
          </div>

          <!-- 密码输入 -->
          <div>
            <label
              class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
              for="password"
            >
              密码 <span class="text-red-500">*</span>
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
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
              </div>
              <input
                id="password"
                v-model="form.password"
                autocomplete="new-password"
                class="block w-full rounded-xl border-2 border-[#d8d5ce] bg-[#F5F2EB] py-3 pl-11 pr-4 text-gray-900 placeholder-gray-400 transition-all focus:border-[#D97757] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white dark:placeholder-gray-500 dark:focus:border-[#D97757] dark:focus:bg-gray-900 dark:focus:ring-[#D97757]/20"
                :disabled="loading"
                name="password"
                placeholder="请选择密码（至少8位字符）"
                required
                type="password"
              />
              <PasswordStrengthMeter :password="form.password" />
            </div>
          </div>

          <!-- 确认密码输入 -->
          <div>
            <label
              class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
              for="confirmPassword"
            >
              确认密码 <span class="text-red-500">*</span>
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
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
              </div>
              <input
                id="confirmPassword"
                v-model="form.confirmPassword"
                autocomplete="new-password"
                class="block w-full rounded-xl border-2 border-[#d8d5ce] bg-[#F5F2EB] py-3 pl-11 pr-4 text-gray-900 placeholder-gray-400 transition-all focus:border-[#D97757] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white dark:placeholder-gray-500 dark:focus:border-[#D97757] dark:focus:bg-gray-900 dark:focus:ring-[#D97757]/20"
                :disabled="loading"
                name="confirmPassword"
                placeholder="请确认密码"
                required
                type="password"
              />
            </div>
          </div>

          <!-- 显示名称输入 -->
          <div>
            <label
              class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
              for="displayName"
            >
              显示名称（可选）
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
                    d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
              </div>
              <input
                id="displayName"
                v-model="form.displayName"
                autocomplete="name"
                class="block w-full rounded-xl border-2 border-[#d8d5ce] bg-[#F5F2EB] py-3 pl-11 pr-4 text-gray-900 placeholder-gray-400 transition-all focus:border-[#D97757] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white dark:placeholder-gray-500 dark:focus:border-[#D97757] dark:focus:bg-gray-900 dark:focus:ring-[#D97757]/20"
                :disabled="loading"
                name="displayName"
                placeholder="请输入显示名称"
                type="text"
              />
            </div>
          </div>

          <!-- 邀请码输入 -->
          <div>
            <label
              class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
              for="referralCode"
            >
              邀请码 <span class="text-xs text-gray-400">(可选)</span>
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
                    d="M5 12h14m-7-7v14"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
              </div>
              <input
                id="referralCode"
                v-model="form.referralCode"
                class="block w-full rounded-xl border-2 border-dashed border-[#d8d5ce] bg-[#F5F2EB] py-3 pl-11 pr-4 text-gray-900 placeholder-gray-400 transition-all focus:border-[#D97757] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white dark:placeholder-gray-500 dark:focus:border-[#D97757] dark:focus:bg-gray-900 dark:focus:ring-[#D97757]/20"
                :disabled="loading"
                name="referralCode"
                placeholder="如果有邀请链接，请输入邀请码"
                type="text"
              />
            </div>
            <p
              v-if="form.referralCode"
              class="mt-1 text-xs text-amber-600 dark:text-amber-300"
            >
              已自动填入邀请信息，注册后将绑定邀请关系。
            </p>
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

          <!-- 成功提示 -->
          <div
            v-if="success"
            class="flex items-start space-x-3 rounded-xl border-2 border-green-200 bg-green-50 p-4 dark:border-green-800/50 dark:bg-green-900/20"
          >
            <div class="flex-shrink-0">
              <svg
                class="h-5 w-5 text-green-500 dark:text-green-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  clip-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  fill-rule="evenodd"
                />
              </svg>
            </div>
            <p class="text-sm font-medium text-green-700 dark:text-green-300">{{ success }}</p>
          </div>

          <!-- 创建账户按钮 -->
          <div class="pt-2">
            <button
              class="group relative flex w-full items-center justify-center overflow-hidden rounded-full bg-[#D97757] px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#D97757]/30 transition-all hover:scale-[1.02] hover:bg-[#c86847] hover:shadow-xl hover:shadow-[#D97757]/40 focus:outline-none focus:ring-2 focus:ring-[#D97757] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 dark:shadow-[#D97757]/20 dark:hover:shadow-[#D97757]/30 dark:focus:ring-offset-gray-800"
              :disabled="loading || !isFormValid"
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
              {{ loading ? '创建中...' : '创建账户' }}
            </button>
          </div>

          <!-- 快捷链接 -->
          <div class="border-t border-[#d8d5ce] pt-4 text-center dark:border-gray-700">
            <router-link
              class="text-sm font-medium text-[#5f5f5f] transition-colors hover:text-[#D97757] dark:text-gray-400 dark:hover:text-[#E6A87C]"
              to="/user-login"
            >
              已有账户？立即登录
            </router-link>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { useThemeStore } from '@/stores/theme'
import { showToast } from '@/utils/toast'
import ThemeToggle from '@/components/common/ThemeToggle.vue'
import PasswordStrengthMeter from '@/components/user/PasswordStrengthMeter.vue'
import { API_PREFIX } from '@/config/api'

const router = useRouter()
const route = useRoute()
const themeStore = useThemeStore()

const loading = ref(false)
const error = ref('')
const success = ref('')

const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  displayName: '',
  referralCode: ''
})

const isFormValid = computed(() => {
  return (
    form.username &&
    form.email &&
    form.password &&
    form.confirmPassword &&
    form.password === form.confirmPassword &&
    form.password.length >= 8
  )
})

const handleRegister = async () => {
  error.value = ''
  success.value = ''

  // 验证密码匹配
  if (form.password !== form.confirmPassword) {
    error.value = '密码不匹配'
    return
  }

  // 验证密码长度
  if (form.password.length < 8) {
    error.value = '密码至少需要8位字符'
    return
  }

  loading.value = true

  try {
    const response = await axios.post(`${API_PREFIX}/users/register`, {
      username: form.username,
      email: form.email,
      password: form.password,
      displayName: form.displayName || form.username,
      referralCode: form.referralCode ? form.referralCode.trim() : undefined
    })

    if (response.data.success) {
      success.value = '账户创建成功！请检查邮箱进行验证（如果启用）。正在跳转到登录页...'
      showToast('注册成功！请登录。', 'success')

      // 2秒后跳转到登录页
      setTimeout(() => {
        router.push('/user-login')
      }, 2000)
    }
  } catch (err) {
    console.error('Registration error:', err)
    error.value = err.response?.data?.message || err.message || '注册失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // 初始化主题
  themeStore.initTheme()

  const referralParam =
    route.query?.inviter || route.query?.referral || route.query?.ref || route.query?.code

  if (typeof referralParam === 'string' && referralParam.trim()) {
    form.referralCode = referralParam.trim()
  }
})
</script>

<style scoped>
/* 组件特定样式 */
</style>
