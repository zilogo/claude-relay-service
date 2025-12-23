<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="modal fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="emit('close')"
    >
      <div
        class="modal-content mx-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800"
      >
        <!-- 标题和关闭按钮 -->
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-xl font-bold text-gray-900 dark:text-white">联系我们</h3>
          <button
            class="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
            @click="emit('close')"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M6 18L18 6M6 6l12 12"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
              />
            </svg>
          </button>
        </div>

        <!-- 内容区域 -->
        <div class="space-y-4">
          <!-- 提示文字 -->
          <p class="text-center text-sm text-gray-600 dark:text-gray-300">
            扫描下方二维码添加客服微信
          </p>

          <!-- 二维码图片 -->
          <div class="flex justify-center">
            <div
              class="rounded-lg border-2 border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
            >
              <img
                :src="qrCodeImage"
                alt="微信客服二维码"
                class="h-64 w-64 object-contain"
                @error="handleImageError"
              />
            </div>
          </div>

          <!-- 额外提示 -->
          <p class="text-center text-xs text-gray-500 dark:text-gray-400">
            工作时间：周一至周五 10:00-18:00
          </p>
        </div>

        <!-- 关闭按钮 -->
        <div class="mt-6 flex justify-center">
          <button
            class="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-2.5 font-medium text-white shadow-sm transition-colors hover:from-blue-600 hover:to-indigo-600"
            @click="emit('close')"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

// 获取正确的base路径（开发环境 /admin/ 或生产环境 /admin-next/）
const basePath = import.meta.env.BASE_URL || '/'

// 尝试加载 PNG，如果不存在则使用 SVG 占位符
const qrCodeImage = ref(`${basePath}images/wechat-qr.png`)

const handleImageError = (event) => {
  // 如果 PNG 加载失败，尝试 SVG 占位符
  if (qrCodeImage.value.endsWith('.png')) {
    qrCodeImage.value = `${basePath}images/wechat-qr.svg`
  }
}
</script>

<style scoped>
.modal {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
}

:global(.dark) .modal {
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
}
</style>
