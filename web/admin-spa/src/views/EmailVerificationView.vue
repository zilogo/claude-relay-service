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
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            />
          </svg>
        </div>
        <h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">邮箱验证</h1>
        <p class="text-sm text-gray-600 dark:text-gray-400">正在验证您的邮箱地址...</p>
      </div>

      <!-- 验证卡片 -->
      <div
        class="rounded-3xl border border-gray-200/50 bg-white/80 p-8 shadow-2xl shadow-blue-500/10 backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-800/80 dark:shadow-blue-500/5"
      >
        <!-- 加载中状态 -->
        <div v-if="loading" class="flex flex-col items-center justify-center space-y-6 py-8">
          <div class="relative">
            <div class="h-20 w-20 rounded-full border-4 border-blue-200 dark:border-blue-900"></div>
            <div
              class="absolute top-0 h-20 w-20 animate-spin rounded-full border-4 border-transparent border-t-blue-600 dark:border-t-blue-400"
            ></div>
          </div>
          <p class="text-base font-medium text-gray-700 dark:text-gray-300">正在验证邮箱...</p>
          <p class="text-sm text-gray-500 dark:text-gray-400">请稍候片刻</p>
        </div>

        <!-- 验证成功 -->
        <div
          v-if="success && !loading"
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
            <h3 class="text-base font-bold text-green-800 dark:text-green-300">邮箱验证成功</h3>
            <p class="mt-2 text-sm text-green-700 dark:text-green-400">
              您的邮箱地址已成功验证。现在您可以使用服务的所有功能了。
            </p>
            <div
              v-if="verifiedUser"
              class="mt-4 space-y-2 rounded-lg bg-green-100/50 p-3 dark:bg-green-900/30"
            >
              <p class="text-sm text-green-800 dark:text-green-300">
                <span class="font-semibold">用户名：</span>{{ verifiedUser.username }}
              </p>
              <p class="text-sm text-green-800 dark:text-green-300">
                <span class="font-semibold">邮箱：</span>{{ verifiedUser.email }}
              </p>
            </div>
            <div class="mt-6">
              <router-link
                class="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                to="/user-login"
              >
                前往登录
              </router-link>
            </div>
          </div>
        </div>

        <!-- 验证失败 -->
        <div
          v-if="error && !loading"
          class="flex items-start space-x-4 rounded-xl border-2 border-red-200 bg-red-50 p-6 dark:border-red-800/50 dark:bg-red-900/20"
        >
          <div class="flex-shrink-0">
            <div
              class="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500 dark:bg-red-600"
            >
              <svg class="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path
                  clip-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  fill-rule="evenodd"
                />
              </svg>
            </div>
          </div>
          <div class="flex-1">
            <h3 class="text-base font-bold text-red-800 dark:text-red-300">验证失败</h3>
            <p class="mt-2 text-sm font-medium text-red-700 dark:text-red-400">{{ error }}</p>
            <p class="mt-3 text-sm text-red-700 dark:text-red-400">
              验证链接可能已过期或无效。请重新申请验证邮件。
            </p>
            <div class="mt-6">
              <router-link
                class="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                to="/user-login"
              >
                返回登录
              </router-link>
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
    error.value = '无效或缺失的验证令牌'
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
      showToast('邮箱验证成功！', 'success')
    }
  } catch (err) {
    console.error('Email verification error:', err)
    error.value = err.response?.data?.message || err.message || '邮箱验证失败'
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
