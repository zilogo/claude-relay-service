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
          Email Verification
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Verifying your email address...
        </p>
      </div>

      <div class="rounded-lg bg-white px-6 py-8 shadow dark:bg-gray-800 dark:shadow-xl">
        <!-- 加载中状态 -->
        <div v-if="loading" class="flex flex-col items-center justify-center space-y-4 py-8">
          <svg
            class="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400"
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
          <p class="text-sm text-gray-600 dark:text-gray-400">Verifying your email...</p>
        </div>

        <!-- 验证成功 -->
        <div
          v-if="success && !loading"
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
                Email Verified Successfully
              </h3>
              <div class="mt-2 text-sm text-green-700 dark:text-green-300">
                <p>
                  Your email address has been verified successfully. You can now use all features of
                  the service.
                </p>
                <div v-if="verifiedUser" class="mt-3 space-y-1">
                  <p><strong>Username:</strong> {{ verifiedUser.username }}</p>
                  <p><strong>Email:</strong> {{ verifiedUser.email }}</p>
                </div>
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

        <!-- 验证失败 -->
        <div
          v-if="error && !loading"
          class="rounded-md border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20"
        >
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  clip-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  fill-rule="evenodd"
                />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800 dark:text-red-400">
                Verification Failed
              </h3>
              <div class="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>{{ error }}</p>
                <p class="mt-3">
                  The verification link may have expired or is invalid. Please request a new
                  verification email.
                </p>
                <p class="mt-4">
                  <router-link
                    class="font-medium text-red-800 underline hover:text-red-900 dark:text-red-300 dark:hover:text-red-200"
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
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { useThemeStore } from '@/stores/theme'
import { showToast } from '@/utils/toast'
import ThemeToggle from '@/components/common/ThemeToggle.vue'
import { API_PREFIX } from '@/config/api'

const route = useRoute()
const themeStore = useThemeStore()

const loading = ref(false)
const error = ref('')
const success = ref(false)
const verifiedUser = ref(null)

const verificationToken = computed(() => {
  return route.params.token || ''
})

const verifyEmail = async () => {
  if (!verificationToken.value) {
    error.value = 'Invalid or missing verification token'
    return
  }

  loading.value = true
  error.value = ''
  success.value = false

  try {
    const response = await axios.post(`${API_PREFIX}/users/verify-email`, {
      token: verificationToken.value
    })

    if (response.data.success) {
      success.value = true
      verifiedUser.value = response.data.user
      showToast('Email verified successfully!', 'success')
    }
  } catch (err) {
    console.error('Email verification error:', err)
    error.value = err.response?.data?.message || err.message || 'Failed to verify email'
    showToast(error.value, 'error')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  // 初始化主题
  themeStore.initTheme()

  // 自动开始验证
  await verifyEmail()
})
</script>

<style scoped>
/* 组件特定样式 */
</style>
