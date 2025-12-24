<template>
  <div class="platform-code-snippet">
    <div class="relative">
      <!-- 代码区域 -->
      <div class="bg-gray-900 rounded-lg p-3 pr-16 font-mono text-sm overflow-x-auto">
        <!-- 注释行 -->
        <div v-if="comment" class="text-green-400 mb-2">{{ comment }}</div>
        <!-- 代码行 -->
        <div
          v-for="(line, index) in codeLines"
          :key="index"
          class="text-gray-300 whitespace-nowrap"
          :class="{ 'mt-2': line === '' }"
        >
          {{ line }}
        </div>
      </div>

      <!-- 复制按钮 -->
      <button
        @click="handleCopy"
        :class="[
          'absolute top-2 right-2 px-3 py-1 text-xs rounded transition-all duration-200',
          copied
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-white'
        ]"
      >
        <i :class="copied ? 'fas fa-check' : 'fas fa-copy'" class="mr-1" />
        {{ copied ? '已复制' : '复制' }}
      </button>
    </div>

    <!-- 提示信息 -->
    <div v-if="hint" class="mt-2 text-xs" :class="hintClass">
      <i :class="hintIcon" class="mr-1" />
      {{ hint }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  // 代码内容 - 可以是字符串或字符串数组
  code: {
    type: [String, Array],
    required: true
  },
  // 注释内容
  comment: {
    type: String,
    default: ''
  },
  // 提示信息
  hint: {
    type: String,
    default: ''
  },
  // 提示类型 (info, warning, success, error)
  hintType: {
    type: String,
    default: 'info',
    validator: (value) => ['info', 'warning', 'success', 'error'].includes(value)
  },
  // 复制时的处理函数（可选）
  onCopy: {
    type: Function,
    default: null
  }
})

const emit = defineEmits(['copied'])

// 复制状态
const copied = ref(false)

// 代码行数组
const codeLines = computed(() => {
  if (Array.isArray(props.code)) {
    return props.code
  }
  return props.code.split('\n')
})

// 提示样式类
const hintClass = computed(() => {
  const classes = {
    info: 'text-blue-600 dark:text-blue-400',
    warning: 'text-orange-600 dark:text-orange-400',
    success: 'text-green-600 dark:text-green-400',
    error: 'text-red-600 dark:text-red-400'
  }
  return classes[props.hintType]
})

// 提示图标
const hintIcon = computed(() => {
  const icons = {
    info: 'fas fa-info-circle',
    warning: 'fas fa-exclamation-triangle',
    success: 'fas fa-check-circle',
    error: 'fas fa-times-circle'
  }
  return icons[props.hintType]
})

// 处理复制
const handleCopy = async () => {
  try {
    // 获取要复制的文本
    let textToCopy = Array.isArray(props.code)
      ? props.code.join('\n')
      : props.code

    // 如果有自定义处理函数，使用它
    if (props.onCopy) {
      textToCopy = await props.onCopy(textToCopy)
    }

    // 复制到剪贴板
    await navigator.clipboard.writeText(textToCopy)

    // 显示复制成功状态
    copied.value = true
    emit('copied', textToCopy)

    // 2秒后恢复按钮状态
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (error) {
    console.error('复制失败:', error)
  }
}
</script>

<style scoped>
/* 代码块滚动条样式 */
.platform-code-snippet :deep(.overflow-x-auto::-webkit-scrollbar) {
  height: 6px;
}

.platform-code-snippet :deep(.overflow-x-auto::-webkit-scrollbar-track) {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.platform-code-snippet :deep(.overflow-x-auto::-webkit-scrollbar-thumb) {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.platform-code-snippet :deep(.overflow-x-auto::-webkit-scrollbar-thumb:hover) {
  background: rgba(255, 255, 255, 0.3);
}
</style>