<template>
  <transition name="fade">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        class="w-full max-w-2xl rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-gray-900 dark:ring-gray-700"
      >
        <div
          class="flex items-start justify-between border-b border-gray-100 px-6 py-5 dark:border-gray-800"
        >
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
              安全操作
            </p>
            <h3 class="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
              二次查看 API Key
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              仅用于紧急排障和安全审计，所有操作都会被记录
            </p>
          </div>
          <button
            class="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            @click="handleClose"
          >
            <i class="fas fa-times" />
          </button>
        </div>

        <div class="px-6 py-6">
          <div
            class="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 shadow-inner dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
          >
            <div class="flex items-start gap-3">
              <i class="fas fa-shield-alt mt-0.5 text-base"></i>
              <div>
                <p class="font-semibold">谨慎操作</p>
                <p>
                  管理员密码与操作理由会被校验并写入审计日志。明文只会在本窗口显示一次，请妥善保存。
                </p>
                <p class="mt-1 text-xs opacity-80">
                  目标 Key:
                  <span class="font-mono text-amber-700 dark:text-amber-200">
                    {{ keyDisplayName }} ({{ keyIdentifier }})
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div v-if="!revealResult" class="mt-6 space-y-5">
            <div>
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                  管理员密码
              </label>
              <div class="relative mt-2 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <input
                  :type="showPassword ? 'text' : 'password'"
                  v-model="form.password"
                  class="block w-full rounded-xl border-none bg-transparent px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-gray-100"
                  placeholder="请输入当前管理员密码"
                  autocomplete="off"
                  spellcheck="false"
                />
                <button
                  type="button"
                  class="absolute inset-y-0 right-0 flex items-center px-4 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-white"
                  @click="showPassword = !showPassword"
                >
                  <i :class="['fas', showPassword ? 'fa-eye-slash' : 'fa-eye']" />
                </button>
              </div>
            </div>

            <div>
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                操作理由（可选，用于审计）
              </label>
              <textarea
                v-model="form.reason"
                rows="3"
                class="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                placeholder="例如：工单 #1832，确认客户 API Key 泄露风险"
              ></textarea>
            </div>

            <p
              v-if="errorMessage"
              class="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100"
            >
              <i class="fas fa-circle-exclamation mr-2"></i>{{ errorMessage }}
            </p>

            <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span class="flex items-center gap-1">
                <i class="fas fa-info-circle"></i>
                本操作将计入安全审计，频繁请求会触发速率限制
              </span>
                <span>安全审计 ID: {{ auditPreview }}</span>
            </div>

            <div class="mt-4 flex items-center justify-end gap-3">
              <button
                class="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                @click="handleClose"
              >
                取消
              </button>
              <button
                :disabled="!currentKey.id || loading"
                class="inline-flex items-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                @click="submitReveal"
              >
                <i :class="['fas mr-2', loading ? 'fa-spinner fa-spin' : 'fa-key']" />
                <span>{{ loading ? '正在验证...' : '确认查看' }}</span>
              </button>
            </div>
          </div>

          <div v-else class="mt-6 space-y-6">
            <div class="rounded-2xl bg-gray-900 px-5 py-4 text-white shadow-inner dark:bg-gray-950">
              <div class="flex items-center justify-between text-xs uppercase tracking-widest text-gray-400">
                <span>一次性显示</span>
                <button
                  class="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/10"
                  @click="copyKey"
                >
                  <i class="fas fa-copy"></i> 复制
                </button>
              </div>
              <p class="mt-3 break-all font-mono text-lg text-emerald-300">
                {{ revealResult.apiKey }}
              </p>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div class="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Key ID
                </p>
                <p class="mt-1 font-mono text-sm text-gray-900 dark:text-gray-100">
                  {{ revealResult.keyId }}
                </p>
              </div>
              <div class="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  所属用户
                </p>
                <p class="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {{ revealResult.owner?.username || 'Admin' }}
                </p>
                <p
                  v-if="revealResult.owner?.userId"
                  class="text-xs text-gray-500 dark:text-gray-400"
                >
                  ID: {{ revealResult.owner.userId }}
                </p>
              </div>
              <div class="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  权限
                </p>
                <p class="mt-1 font-semibold text-blue-600 dark:text-blue-300">
                  {{ permissionLabel }}
                </p>
              </div>
              <div class="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  创建时间
                </p>
                <p class="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {{ formatDate(revealResult.createdAt) }}
                </p>
              </div>
            </div>

            <div v-if="revealResult.tags?.length" class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                标签
              </p>
              <div class="mt-2 flex flex-wrap gap-2">
                <span
                  v-for="tag in revealResult.tags"
                  :key="tag"
                  class="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-200"
                >
                  <i class="fas fa-tag mr-1 text-[10px]" /> {{ tag }}
                </span>
              </div>
            </div>

            <p class="text-xs text-amber-500 dark:text-amber-200">
              关闭窗口后将无法再次查看。请立即复制并存放到安全位置，转发给用户前请确认接收者身份。
            </p>

            <div class="flex justify-end">
              <button
                class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-700"
                @click="handleClose"
              >
                <i class="fas fa-shield-check"></i>
                已保存，关闭
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { apiClient } from '@/config/api'
import { showToast } from '@/utils/toast'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  apiKey: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['close'])

const form = reactive({
  password: '',
  reason: ''
})
const revealResult = ref(null)
const loading = ref(false)
const errorMessage = ref('')
const showPassword = ref(false)

const currentKey = computed(() => props.apiKey || {})
const keyDisplayName = computed(() => currentKey.value.name || '未命名 Key')
const keyIdentifier = computed(() => currentKey.value.id || '未绑定 Key')
const auditPreview = computed(() => {
  if (!currentKey.value.id) return '未绑定 Key'
  return `${currentKey.value.id.slice(0, 6)}...${currentKey.value.id.slice(-4)}`
})

const permissionLabel = computed(() => {
  const permission = revealResult.value?.permissions || currentKey.value.permissions || 'all'
  const map = {
    all: '全部服务',
    claude: '仅 Claude',
    gemini: '仅 Gemini',
    openai: '仅 OpenAI',
    droid: '仅 Droid'
  }
  return map[permission] || permission
})

const formatDate = (value) => {
  if (!value) return '未知'
  try {
    const date = new Date(value)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(
      date.getMinutes()
    ).padStart(2, '0')}`
  } catch (error) {
    return value
  }
}

watch(
  () => props.show,
  (visible) => {
    if (visible) {
      resetState()
    }
  }
)

watch(
  () => currentKey.value.id,
  () => {
    if (props.show) {
      resetState()
    }
  }
)

const resetState = () => {
  form.password = ''
  form.reason = ''
  revealResult.value = null
  errorMessage.value = ''
  showPassword.value = false
}

const submitReveal = async () => {
  if (!currentKey.value.id || loading.value) {
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const payload = {}
    if (form.password) {
      payload.adminPassword = form.password
    }
    if (form.reason && form.reason.trim().length > 0) {
      payload.reason = form.reason.trim()
    }

    const data = await apiClient.post(`/admin/api-keys/${currentKey.value.id}/reveal`, payload)
    if (!data.success) {
      throw new Error(data.message || 'Reveal failed')
    }

    const ownerInfo = {
      userId: data.data?.owner?.userId || data.data?.owner?.id || '',
      username: data.data?.owner?.username || data.data?.owner?.name || data.data?.owner || ''
    }

    revealResult.value = {
      apiKey: data.data?.apiKey,
      keyId: data.data?.keyId || currentKey.value.id,
      keyName: data.data?.keyName || currentKey.value.name,
      owner: ownerInfo,
      permissions: data.data?.permissions || data.data?.key?.permissions || currentKey.value.permissions || 'all',
      tags: data.data?.tags || data.data?.key?.tags || currentKey.value.tags || [],
      createdAt:
        data.data?.createdAt || data.data?.key?.createdAt || currentKey.value.createdAt
    }

    showToast('已获取 API Key 明文', 'success')
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      '二次查看失败'
    showToast(error.response?.data?.error || '二次查看失败', 'error')
  } finally {
    loading.value = false
  }
}

const copyKey = async () => {
  if (!revealResult.value?.apiKey) return
  try {
    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      await navigator.clipboard.writeText(revealResult.value.apiKey)
      showToast('API Key 已复制', 'success')
    } else {
      throw new Error('clipboard unavailable')
    }
  } catch (error) {
    showToast('复制失败，请手动复制', 'error')
  }
}

const handleClose = () => {
  resetState()
  emit('close')
}
</script>
