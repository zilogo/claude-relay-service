<template>
  <div
    class="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-12 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800"
  >
    <!-- 装饰性背景元素 -->
    <div
      class="absolute left-1/4 top-1/4 h-96 w-96 animate-pulse rounded-full bg-blue-400/10 blur-3xl dark:bg-blue-500/5"
    ></div>
    <div
      class="absolute bottom-1/4 right-1/4 h-96 w-96 animate-pulse rounded-full bg-purple-400/10 blur-3xl dark:bg-purple-500/5"
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
          class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30 dark:shadow-blue-500/20"
        >
          <svg class="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            />
          </svg>
        </div>
        <h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">忘记密码</h1>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          输入您的邮箱地址，我们将发送密码重置链接
        </p>
      </div>

      <!-- 忘记密码卡片 -->
      <div
        class="rounded-3xl border border-gray-200/50 bg-white/80 p-8 shadow-2xl shadow-blue-500/10 backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-800/80 dark:shadow-blue-500/5"
      >
        <form v-if="!success" class="space-y-6" @submit.prevent="handleSubmit">
          <!-- 邮箱输入 -->
          <div>
            <label
              class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
              for="email"
            >
              邮箱地址 <span class="text-red-500">*</span>
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
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <input
                id="email"
                v-model="form.email"
                autocomplete="email"
                class="block w-full rounded-xl border-2 border-gray-200 bg-gray-50/50 py-3 pl-11 pr-4 text-gray-900 placeholder-gray-400 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-400 dark:focus:bg-gray-900 dark:focus:ring-blue-400/20"
                :disabled="loading"
                name="email"
                placeholder="请输入邮箱地址"
                required
                type="email"
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

          <!-- 发送按钮 -->
          <div class="pt-2">
            <button
              class="group relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 dark:shadow-blue-500/20 dark:hover:shadow-blue-500/30 dark:focus:ring-offset-gray-800"
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
              {{ loading ? '发送中...' : '发送重置链接' }}
            </button>
          </div>
        </form>

        <!-- 成功提示 -->
        <div
          v-if="success"
          class="flex items-start space-x-4 rounded-xl border-2 border-green-200 bg-green-50 p-6 dark:border-green-800/50 dark:bg-green-900/20"
        >
          <div class="flex-shrink-0">
            <div
              class="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500 dark:bg-green-600"
            >
              <svg class="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path
                  clip-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  fill-rule="evenodd"
                />
              </svg>
            </div>
          </div>
          <div class="flex-1">
            <h3 class="text-base font-bold text-green-800 dark:text-green-300">重置链接已发送</h3>
            <p class="mt-2 text-sm text-green-700 dark:text-green-400">
              如果该邮箱存在用户账户，密码重置链接已发送。请检查您的邮箱并按照说明重置密码。
            </p>
          </div>
        </div>

        <!-- 快捷链接 -->
        <div class="mt-6 border-t border-gray-200 pt-4 text-center dark:border-gray-700">
          <router-link
            class="text-sm font-medium text-gray-600 transition-colors hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
            to="/user-login"
          >
            返回登录
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import axios from 'axios'
import { useThemeStore } from '@/stores/theme'
import { showToast } from '@/utils/toast'
import ThemeToggle from '@/components/common/ThemeToggle.vue'
import { API_PREFIX } from '@/config/api'

const themeStore = useThemeStore()

const loading = ref(false)
const error = ref('')
const success = ref(false)

const form = reactive({
  email: ''
})

const isFormValid = computed(() => {
  return form.email && form.email.includes('@')
})

const handleSubmit = async () => {
  error.value = ''
  success.value = false

  if (!form.email || !form.email.trim()) {
    error.value = '邮箱地址为必填项'
    return
  }

  loading.value = true

  try {
    const response = await axios.post(`${API_PREFIX}/users/forgot-password`, {
      email: form.email.trim()
    })

    if (response.data.success) {
      success.value = true
      showToast('密码重置邮件发送成功', 'success')
    }
  } catch (err) {
    console.error('Forgot password error:', err)
    // 即使发生错误,也显示成功消息(安全考虑)
    success.value = true
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // 初始化主题
  themeStore.initTheme()
})
</script>

<style scoped>
/* 组件特定样式 */
</style>
