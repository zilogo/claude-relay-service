<template>
  <transition name="modal">
    <div
      v-if="show"
      class="fixed inset-0 z-50 overflow-y-auto"
      @click.self="handleClose"
    >
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-gray-600 bg-opacity-50 transition-opacity"></div>

      <!-- Modal -->
      <div class="relative flex min-h-screen items-center justify-center p-4">
        <div
          class="relative w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all dark:bg-gray-800"
          @click.stop
        >
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white">
              <i class="fas fa-cog mr-2 text-blue-500" />
              快速配置指南
            </h2>
            <button
              @click="handleClose"
              class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="max-h-[calc(100vh-200px)] overflow-y-auto px-6 py-6">
            <!-- API Key 信息 -->
            <div v-if="apiKey" class="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-950/30">
              <h3 class="mb-2 font-medium text-blue-800 dark:text-blue-300">
                <i class="fas fa-key mr-2" />
                当前 API Key
              </h3>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-blue-700 dark:text-blue-400">
                    {{ apiKey.name }}
                  </p>
                  <p class="mt-1 font-mono text-xs text-blue-600 dark:text-blue-500">
                    {{ apiKey.keyPreview || 'cr_****' }}
                  </p>
                </div>
                <div v-if="apiKey.key" class="flex items-center gap-2">
                  <button
                    @click="showFullKey = !showFullKey"
                    class="rounded-lg bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800 transition-colors"
                  >
                    <i :class="showFullKey ? 'fas fa-eye-slash' : 'fas fa-eye'" class="mr-1" />
                    {{ showFullKey ? '隐藏' : '显示' }}
                  </button>
                  <button
                    v-if="showFullKey"
                    @click="copyApiKey"
                    class="rounded-lg bg-green-100 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800 transition-colors"
                  >
                    <i class="fas fa-copy mr-1" />
                    复制密钥
                  </button>
                </div>
              </div>
              <div v-if="showFullKey && apiKey.key" class="mt-3">
                <code class="block break-all rounded bg-blue-100 p-2 font-mono text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {{ apiKey.key }}
                </code>
              </div>
            </div>

            <!-- 配置指南组件 -->
            <EnvironmentSetupGuide
              :api-key="apiKey?.key || ''"
              :base-url="baseUrl"
            />
          </div>

          <!-- Footer -->
          <div class="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
            <button
              @click="handleClose"
              class="rounded-lg bg-gray-100 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed } from 'vue'
import EnvironmentSetupGuide from '@/components/common/EnvironmentSetupGuide.vue'
import { showToast } from '@/utils/toast'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  apiKey: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close'])

const showFullKey = ref(false)

// 获取基础 URL
const baseUrl = computed(() => {
  // 优先使用环境变量配置
  const customPrefix = import.meta.env.VITE_API_BASE_PREFIX
  if (customPrefix) {
    return customPrefix.replace(/\/$/, '') + '/api'
  }
  // 使用当前页面的 origin
  return window.location.origin + '/api'
})

// 关闭弹窗
const handleClose = () => {
  showFullKey.value = false
  emit('close')
}

// 复制 API Key
const copyApiKey = async () => {
  if (!props.apiKey?.key) return

  try {
    await navigator.clipboard.writeText(props.apiKey.key)
    showToast('API Key 已复制到剪贴板', 'success')
  } catch (error) {
    console.error('复制失败:', error)
    showToast('复制失败，请手动复制', 'error')
  }
}
</script>

<style scoped>
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from, .modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative > div,
.modal-leave-active .relative > div {
  transition: all 0.3s ease;
}

.modal-enter-from .relative > div {
  transform: scale(0.95) translateY(20px);
  opacity: 0;
}

.modal-leave-to .relative > div {
  transform: scale(0.95) translateY(20px);
  opacity: 0;
}
</style>