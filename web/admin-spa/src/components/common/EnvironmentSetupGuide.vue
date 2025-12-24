<template>
  <div class="environment-setup-guide">
    <!-- 客户端选择 -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        选择客户端
      </label>
      <div class="flex gap-2">
        <button
          v-for="client in clients"
          :key="client.key"
          @click="activeClient = client.key"
          :class="[
            'px-4 py-2 rounded-lg transition-colors font-medium',
            activeClient === client.key
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          ]"
        >
          <i :class="[client.icon, 'mr-2']" />
          {{ client.name }}
        </button>
      </div>
    </div>

    <!-- 平台选择 -->
    <div class="mb-6">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        选择操作系统
      </label>
      <div class="flex gap-2">
        <button
          v-for="platform in platforms"
          :key="platform.key"
          @click="activePlatform = platform.key"
          :class="[
            'px-4 py-2 rounded-lg transition-colors font-medium',
            activePlatform === platform.key
              ? 'bg-purple-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          ]"
        >
          <i :class="[platform.icon, 'mr-2']" />
          {{ platform.name }}
        </button>
      </div>
    </div>

    <!-- Claude Code 配置 -->
    <div v-if="activeClient === 'claudecode'" class="space-y-4">
      <!-- Windows 配置 -->
      <div v-if="activePlatform === 'windows'" class="space-y-4">
        <!-- PowerShell 临时设置 -->
        <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <h3 class="font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center">
            <i class="fas fa-terminal mr-2 text-blue-500" />
            PowerShell 快速配置（当前会话）
          </h3>
          <div class="space-y-3">
            <div class="relative">
              <div class="bg-gray-900 rounded-lg p-3 font-mono text-sm overflow-x-auto">
                <div class="text-gray-300">$env:ANTHROPIC_BASE_URL = "{{ baseUrl }}"</div>
                <div class="text-gray-300">$env:ANTHROPIC_AUTH_TOKEN = "{{ apiKey || '你的API密钥' }}"</div>
              </div>
              <button
                @click="copyToClipboard('powershell-temp')"
                class="absolute top-2 right-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
              >
                <i class="fas fa-copy mr-1" />
                复制
              </button>
            </div>
            <p class="text-xs text-gray-600 dark:text-gray-400">
              <i class="fas fa-info-circle mr-1" />
              此配置仅对当前 PowerShell 窗口有效
            </p>
          </div>
        </div>

        <!-- PowerShell 永久设置 -->
        <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <h3 class="font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center">
            <i class="fas fa-save mr-2 text-green-500" />
            PowerShell 永久配置（用户级）
          </h3>
          <div class="space-y-3">
            <div class="relative">
              <div class="bg-gray-900 rounded-lg p-3 font-mono text-sm overflow-x-auto">
                <div class="text-green-400 mb-2"># 设置用户级环境变量（永久生效）</div>
                <div class="text-gray-300">[System.Environment]::SetEnvironmentVariable("ANTHROPIC_BASE_URL", "{{ baseUrl }}", [System.EnvironmentVariableTarget]::User)</div>
                <div class="text-gray-300">[System.Environment]::SetEnvironmentVariable("ANTHROPIC_AUTH_TOKEN", "{{ apiKey || '你的API密钥' }}", [System.EnvironmentVariableTarget]::User)</div>
              </div>
              <button
                @click="copyToClipboard('powershell-perm')"
                class="absolute top-2 right-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
              >
                <i class="fas fa-copy mr-1" />
                复制
              </button>
            </div>
            <p class="text-xs text-orange-600 dark:text-orange-400">
              <i class="fas fa-exclamation-triangle mr-1" />
              设置后需要重新打开 PowerShell 窗口才能生效
            </p>
          </div>
        </div>
      </div>

      <!-- macOS/Linux 配置 -->
      <div v-else class="space-y-4">
        <!-- 临时设置 -->
        <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <h3 class="font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center">
            <i class="fas fa-terminal mr-2 text-blue-500" />
            Terminal 快速配置（当前会话）
          </h3>
          <div class="space-y-3">
            <div class="relative">
              <div class="bg-gray-900 rounded-lg p-3 font-mono text-sm overflow-x-auto">
                <div class="text-gray-300">export ANTHROPIC_BASE_URL="{{ baseUrl }}"</div>
                <div class="text-gray-300">export ANTHROPIC_AUTH_TOKEN="{{ apiKey || '你的API密钥' }}"</div>
              </div>
              <button
                @click="copyToClipboard('unix-temp')"
                class="absolute top-2 right-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
              >
                <i class="fas fa-copy mr-1" />
                复制
              </button>
            </div>
            <p class="text-xs text-gray-600 dark:text-gray-400">
              <i class="fas fa-info-circle mr-1" />
              此配置仅对当前 Terminal 窗口有效
            </p>
          </div>
        </div>

        <!-- 永久设置 -->
        <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <h3 class="font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center">
            <i class="fas fa-save mr-2 text-green-500" />
            Shell 永久配置
          </h3>
          <div class="space-y-3">
            <div class="relative">
              <div class="bg-gray-900 rounded-lg p-3 font-mono text-sm overflow-x-auto">
                <div class="text-green-400 mb-2"># {{ activePlatform === 'macos' ? '对于 zsh (macOS 默认)' : '对于 bash (Linux 默认)' }}</div>
                <div class="text-gray-300">echo 'export ANTHROPIC_BASE_URL="{{ baseUrl }}"' >> ~/{{ shellConfigFile }}</div>
                <div class="text-gray-300">echo 'export ANTHROPIC_AUTH_TOKEN="{{ apiKey || '你的API密钥' }}"' >> ~/{{ shellConfigFile }}</div>
                <div class="text-gray-300">source ~/{{ shellConfigFile }}</div>
              </div>
              <button
                @click="copyToClipboard('unix-perm')"
                class="absolute top-2 right-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
              >
                <i class="fas fa-copy mr-1" />
                复制
              </button>
            </div>
            <p class="text-xs text-orange-600 dark:text-orange-400">
              <i class="fas fa-exclamation-triangle mr-1" />
              如果使用其他 Shell，请相应修改配置文件路径
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Codex 配置 -->
    <div v-else-if="activeClient === 'codex'" class="space-y-4">
      <div class="rounded-lg border border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-950/30 p-4">
        <h3 class="font-medium text-yellow-800 dark:text-yellow-300 mb-3 flex items-center">
          <i class="fas fa-cog mr-2" />
          Codex 配置文件
        </h3>

        <!-- config.toml -->
        <div class="space-y-4">
          <div>
            <p class="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
              1. 编辑 <code class="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">{{ codexConfigPath }}/config.toml</code>
            </p>
            <div class="relative">
              <div class="bg-gray-900 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                <div v-for="line in codexConfigToml" :key="line" class="text-gray-300">{{ line }}</div>
              </div>
              <button
                @click="copyToClipboard('codex-config')"
                class="absolute top-2 right-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
              >
                <i class="fas fa-copy mr-1" />
                复制
              </button>
            </div>
          </div>

          <!-- auth.json -->
          <div>
            <p class="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
              2. 编辑 <code class="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">{{ codexConfigPath }}/auth.json</code>
            </p>
            <div class="relative">
              <div class="bg-gray-900 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                <div class="text-gray-300">{</div>
                <div class="text-gray-300">  "OPENAI_API_KEY": null</div>
                <div class="text-gray-300">}</div>
              </div>
              <button
                @click="copyToClipboard('codex-auth')"
                class="absolute top-2 right-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
              >
                <i class="fas fa-copy mr-1" />
                复制
              </button>
            </div>
          </div>

          <!-- 环境变量 -->
          <div>
            <p class="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
              3. 设置环境变量 CRS_OAI_KEY
            </p>
            <div class="relative">
              <div class="bg-gray-900 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                <div class="text-gray-300">{{ codexEnvCommand }}</div>
              </div>
              <button
                @click="copyToClipboard('codex-env')"
                class="absolute top-2 right-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
              >
                <i class="fas fa-copy mr-1" />
                复制
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 验证配置 -->
    <div class="mt-6 rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30 p-4">
      <h3 class="font-medium text-blue-800 dark:text-blue-300 mb-3 flex items-center">
        <i class="fas fa-check-circle mr-2" />
        验证配置
      </h3>
      <div class="space-y-3">
        <p class="text-sm text-blue-700 dark:text-blue-300">
          配置完成后，运行以下命令验证：
        </p>
        <div class="bg-gray-900 rounded-lg p-3 font-mono text-sm">
          <div v-if="activeClient === 'claudecode'" class="text-gray-300">
            {{ activePlatform === 'windows' ? 'echo $env:ANTHROPIC_AUTH_TOKEN' : 'echo $ANTHROPIC_AUTH_TOKEN' }}
          </div>
          <div v-else class="text-gray-300">
            {{ activePlatform === 'windows' ? 'echo %CRS_OAI_KEY%' : 'echo $CRS_OAI_KEY' }}
          </div>
        </div>
        <p class="text-xs text-blue-600 dark:text-blue-400">
          <i class="fas fa-info-circle mr-1" />
          如果显示你的 API 密钥，说明配置成功
        </p>
      </div>
    </div>

    <!-- 复制成功提示 -->
    <transition name="fade">
      <div v-if="showCopySuccess" class="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center">
        <i class="fas fa-check-circle mr-2" />
        已复制到剪贴板
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// Props
const props = defineProps({
  apiKey: {
    type: String,
    default: ''
  },
  baseUrl: {
    type: String,
    default: ''
  }
})

// 客户端列表
const clients = [
  { key: 'claudecode', name: 'Claude Code', icon: 'fas fa-robot' },
  { key: 'codex', name: 'Codex', icon: 'fas fa-code' }
]

// 平台列表
const platforms = [
  { key: 'windows', name: 'Windows', icon: 'fab fa-windows' },
  { key: 'macos', name: 'macOS', icon: 'fab fa-apple' },
  { key: 'linux', name: 'Linux', icon: 'fab fa-linux' }
]

// 当前选择
const activeClient = ref('claudecode')
const activePlatform = ref('windows')

// 复制成功提示
const showCopySuccess = ref(false)

// 计算属性
const baseUrl = computed(() => {
  if (props.baseUrl) return props.baseUrl
  // 使用当前页面的 origin
  return window.location.origin + '/api'
})

const openaiBaseUrl = computed(() => {
  if (props.baseUrl) return props.baseUrl.replace('/api', '/openai')
  return window.location.origin + '/openai'
})

const shellConfigFile = computed(() => {
  if (activePlatform.value === 'macos') return '.zshrc'
  return '.bashrc'
})

const codexConfigPath = computed(() => {
  return activePlatform.value === 'windows' ? '%USERPROFILE%\\.codex' : '~/.codex'
})

const codexConfigToml = computed(() => [
  'model_provider = "crs"',
  'model = "gpt-5-codex"',
  'model_reasoning_effort = "high"',
  'disable_response_storage = true',
  'preferred_auth_method = "apikey"',
  '',
  '[model_providers.crs]',
  'name = "crs"',
  `base_url = "${openaiBaseUrl.value}"`,
  'wire_api = "responses"',
  'requires_openai_auth = true',
  'env_key = "CRS_OAI_KEY"'
])

const codexEnvCommand = computed(() => {
  const key = props.apiKey || 'cr_xxxxxxxxxx'
  if (activePlatform.value === 'windows') {
    return `set CRS_OAI_KEY=${key}`
  }
  return `export CRS_OAI_KEY=${key}`
})

// 复制到剪贴板
const copyToClipboard = async (type) => {
  let text = ''
  const key = props.apiKey || '你的API密钥'

  switch (type) {
    case 'powershell-temp':
      text = `$env:ANTHROPIC_BASE_URL = "${baseUrl.value}"\n$env:ANTHROPIC_AUTH_TOKEN = "${key}"`
      break
    case 'powershell-perm':
      text = `[System.Environment]::SetEnvironmentVariable("ANTHROPIC_BASE_URL", "${baseUrl.value}", [System.EnvironmentVariableTarget]::User)\n[System.Environment]::SetEnvironmentVariable("ANTHROPIC_AUTH_TOKEN", "${key}", [System.EnvironmentVariableTarget]::User)`
      break
    case 'unix-temp':
      text = `export ANTHROPIC_BASE_URL="${baseUrl.value}"\nexport ANTHROPIC_AUTH_TOKEN="${key}"`
      break
    case 'unix-perm':
      text = `echo 'export ANTHROPIC_BASE_URL="${baseUrl.value}"' >> ~/${shellConfigFile.value}\necho 'export ANTHROPIC_AUTH_TOKEN="${key}"' >> ~/${shellConfigFile.value}\nsource ~/${shellConfigFile.value}`
      break
    case 'codex-config':
      text = codexConfigToml.value.join('\n')
      break
    case 'codex-auth':
      text = '{\n  "OPENAI_API_KEY": null\n}'
      break
    case 'codex-env':
      text = codexEnvCommand.value
      break
  }

  try {
    await navigator.clipboard.writeText(text)
    showCopySuccess.value = true
    setTimeout(() => {
      showCopySuccess.value = false
    }, 2000)
  } catch (error) {
    console.error('复制失败:', error)
  }
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>