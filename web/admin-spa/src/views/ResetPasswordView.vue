<template>
  <div
    class="relative flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900 sm:px-6 lg:px-8"
  >
    <!-- 主题切换按钮 -->
    <div class="fixed right-4 top-4 z-10">
      <ThemeToggle mode="dropdown" />
    </div>

    <div class="w-full max-w-md space-y-8">
      <div>
        <div class="mx-auto flex h-12 w-auto items-center justify-center">
          <svg
            class="h-8 w-8 text-blue-600 dark:text-blue-400"
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
          <span class="ml-2 text-xl font-bold text-gray-900 dark:text-white">Claude Relay</span>
        </div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Reset Your Password
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Enter your new password below
        </p>
      </div>

      <div class="rounded-lg bg-white px-6 py-8 shadow dark:bg-gray-800 dark:shadow-xl">
        <form v-if="!success" class="space-y-6" @submit.prevent="handleSubmit">
          <div>
            <label
              class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              for="password"
            >
              New Password <span class="text-red-500">*</span>
            </label>
            <div class="mt-1">
              <input
                id="password"
                v-model="form.password"
                autocomplete="new-password"
                class="relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400 sm:text-sm"
                :disabled="loading"
                name="password"
                placeholder="Choose a new password (min 8 characters)"
                required
                type="password"
              />
              <PasswordStrengthMeter :password="form.password" />
            </div>
          </div>

          <div>
            <label
              class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              for="confirmPassword"
            >
              Confirm New Password <span class="text-red-500">*</span>
            </label>
            <div class="mt-1">
              <input
                id="confirmPassword"
                v-model="form.confirmPassword"
                autocomplete="new-password"
                class="relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400 sm:text-sm"
                :disabled="loading"
                name="confirmPassword"
                placeholder="Confirm your new password"
                required
                type="password"
              />
            </div>
          </div>

          <div
            v-if="error"
            class="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
          >
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    clip-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    fill-rule="evenodd"
                  />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm text-red-700 dark:text-red-400">{{ error }}</p>
              </div>
            </div>
          </div>

          <div>
            <button
              class="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-800"
              :disabled="loading || !isFormValid"
              type="submit"
            >
              <span v-if="loading" class="absolute inset-y-0 left-0 flex items-center pl-3">
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
              {{ loading ? 'Resetting...' : 'Reset Password' }}
            </button>
          </div>
        </form>

        <div
          v-if="success"
          class="rounded-md border border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-900/20"
        >
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  clip-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  fill-rule="evenodd"
                />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-green-800 dark:text-green-400">
                Password Reset Successful
              </h3>
              <div class="mt-2 text-sm text-green-700 dark:text-green-300">
                <p>
                  Your password has been reset successfully. You can now log in with your new
                  password.
                </p>
                <p class="mt-4">
                  <router-link
                    class="font-medium text-green-800 underline hover:text-green-900 dark:text-green-300 dark:hover:text-green-200"
                    to="/user-login"
                  >
                    Go to Sign In
                  </router-link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { useThemeStore } from '@/stores/theme'
import { showToast } from '@/utils/toast'
import ThemeToggle from '@/components/common/ThemeToggle.vue'
import PasswordStrengthMeter from '@/components/user/PasswordStrengthMeter.vue'
import { API_PREFIX } from '@/config/api'

const route = useRoute()
const themeStore = useThemeStore()

const loading = ref(false)
const error = ref('')
const success = ref(false)

const form = reactive({
  password: '',
  confirmPassword: ''
})

const resetToken = computed(() => {
  return route.params.token || ''
})

const isFormValid = computed(() => {
  return (
    form.password &&
    form.confirmPassword &&
    form.password === form.confirmPassword &&
    form.password.length >= 8
  )
})

const handleSubmit = async () => {
  error.value = ''
  success.value = false

  // 验证密码匹配
  if (form.password !== form.confirmPassword) {
    error.value = 'Passwords do not match'
    return
  }

  // 验证密码长度
  if (form.password.length < 8) {
    error.value = 'Password must be at least 8 characters'
    return
  }

  if (!resetToken.value) {
    error.value = 'Invalid reset token. Please request a new password reset link.'
    return
  }

  loading.value = true

  try {
    const response = await axios.post(`${API_PREFIX}/users/reset-password`, {
      token: resetToken.value,
      newPassword: form.password
    })

    if (response.data.success) {
      success.value = true
      showToast('Password reset successfully! Please log in.', 'success')
    }
  } catch (err) {
    console.error('Reset password error:', err)
    error.value = err.response?.data?.message || err.message || 'Failed to reset password'
    showToast(error.value, 'error')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // 初始化主题
  themeStore.initTheme()

  // 检查是否有重置token
  if (!resetToken.value) {
    error.value = 'Invalid or missing reset token. Please request a new password reset link.'
  }
})
</script>

<style scoped>
/* 组件特定样式 */
</style>
