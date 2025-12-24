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
        <!-- PowerShell 永久设置 -->
        <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <h3 class="font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center">
            <i class="fas fa-save mr-2 text-green-500" />
            PowerShell 环境变量配置
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

        <!-- 查看已设置的环境变量 -->
        <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <h3 class="font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center">
            <i class="fas fa-check-circle mr-2 text-blue-500" />
            验证配置
          </h3>
          <div class="space-y-3">
            <p class="text-sm text-gray-600 dark:text-gray-400">查看已设置的环境变量：</p>
            <div class="relative">
              <div class="bg-gray-900 rounded-lg p-3 font-mono text-sm overflow-x-auto">
                <div class="text-green-400 mb-2"># 查看用户级环境变量</div>
                <div class="text-gray-300">[System.Environment]::GetEnvironmentVariable("ANTHROPIC_BASE_URL", [System.EnvironmentVariableTarget]::User)</div>
                <div class="text-gray-300">[System.Environment]::GetEnvironmentVariable("ANTHROPIC_AUTH_TOKEN", [System.EnvironmentVariableTarget]::User)</div>
              </div>
              <button
                @click="copyToClipboard('powershell-verify')"
                class="absolute top-2 right-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
              >
                <i class="fas fa-copy mr-1" />
                复制
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- macOS/Linux 配置 -->
      <div v-else class="space-y-4">
        <!-- 永久设置 -->
        <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <h3 class="font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center">
            <i class="fas fa-save mr-2 text-green-500" />
            Shell 环境变量配置
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

        <!-- 验证配置 -->
        <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <h3 class="font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center">
            <i class="fas fa-check-circle mr-2 text-blue-500" />
            验证配置
          </h3>
          <div class="space-y-3">
            <p class="text-sm text-gray-600 dark:text-gray-400">重新打开终端后，运行以下命令验证：</p>
            <div class="relative">
              <div class="bg-gray-900 rounded-lg p-3 font-mono text-sm overflow-x-auto">
                <div class="text-gray-300">echo $ANTHROPIC_BASE_URL</div>
                <div class="text-gray-300">echo $ANTHROPIC_AUTH_TOKEN</div>
              </div>
              <button
                @click="copyToClipboard('unix-verify')"
                class="absolute top-2 right-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
              >
                <i class="fas fa-copy mr-1" />
                复制
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Codex 配置 -->
    <div v-else-if="activeClient === 'codex'" class="space-y-4">
      <!-- 配置文件设置 -->
      <div class="rounded-lg border border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-950/30 p-4">
        <h3 class="font-medium text-yellow-800 dark:text-yellow-300 mb-3 flex items-center">
          <i class="fas fa-cog mr-2" />
          Codex 配置步骤
        </h3>

        <!-- config.toml -->
        <div class="space-y-4">
          <div>
            <p class="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">
              步骤 1：创建配置文件
            </p>
            <p class="text-xs text-yellow-700 dark:text-yellow-400 mb-2">
              路径: <code class="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">{{ codexConfigPath }}/config.toml</code>
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
            <p class="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">
              步骤 2：设置认证文件
            </p>
            <p class="text-xs text-yellow-700 dark:text-yellow-400 mb-2">
              路径: <code class="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">{{ codexConfigPath }}/auth.json</code>
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
            <p class="text-xs text-orange-600 dark:text-orange-400 mt-1">
              <i class="fas fa-info-circle mr-1" />
              必须设置为 null，API Key 通过环境变量提供
            </p>
          </div>
        </div>
      </div>

      <!-- 环境变量设置 -->
      <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <h3 class="font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center">
          <i class="fas fa-save mr-2 text-green-500" />
          步骤 3：设置环境变量
        </h3>

        <!-- Windows -->
        <div v-if="activePlatform === 'windows'" class="space-y-3">
          <div class="relative">
            <div class="bg-gray-900 rounded-lg p-3 font-mono text-sm overflow-x-auto">
              <div class="text-green-400 mb-2"># PowerShell 中设置永久环境变量</div>
              <div class="text-gray-300">[System.Environment]::SetEnvironmentVariable("CRS_OAI_KEY", "{{ apiKey || 'cr_xxxxxxxxxx' }}", [System.EnvironmentVariableTarget]::User)</div>
            </div>
            <button
              @click="copyToClipboard('codex-env-perm')"
              class="absolute top-2 right-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
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

        <!-- macOS/Linux -->
        <div v-else class="space-y-3">
          <div class="relative">
            <div class="bg-gray-900 rounded-lg p-3 font-mono text-sm overflow-x-auto">
              <div class="text-green-400 mb-2"># {{ activePlatform === 'macos' ? '添加到 ~/.zshrc' : '添加到 ~/.bashrc' }}</div>
              <div class="text-gray-300">echo 'export CRS_OAI_KEY="{{ apiKey || 'cr_xxxxxxxxxx' }}"' >> ~/{{ shellConfigFile }}</div>
              <div class="text-gray-300">source ~/{{ shellConfigFile }}</div>
            </div>
            <button
              @click="copyToClipboard('codex-env-perm')"
              class="absolute top-2 right-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
            >
              <i class="fas fa-copy mr-1" />
              复制
            </button>
          </div>
        </div>
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


// 复制到剪贴板
const copyToClipboard = async (type) => {
  let text = ''
  const key = props.apiKey || '你的API密钥'

  switch (type) {
    case 'powershell-perm':
      text = `[System.Environment]::SetEnvironmentVariable("ANTHROPIC_BASE_URL", "${baseUrl.value}", [System.EnvironmentVariableTarget]::User)\n[System.Environment]::SetEnvironmentVariable("ANTHROPIC_AUTH_TOKEN", "${key}", [System.EnvironmentVariableTarget]::User)`
      break
    case 'powershell-verify':
      text = `[System.Environment]::GetEnvironmentVariable("ANTHROPIC_BASE_URL", [System.EnvironmentVariableTarget]::User)\n[System.Environment]::GetEnvironmentVariable("ANTHROPIC_AUTH_TOKEN", [System.EnvironmentVariableTarget]::User)`
      break
    case 'unix-perm':
      text = `echo 'export ANTHROPIC_BASE_URL="${baseUrl.value}"' >> ~/${shellConfigFile.value}\necho 'export ANTHROPIC_AUTH_TOKEN="${key}"' >> ~/${shellConfigFile.value}\nsource ~/${shellConfigFile.value}`
      break
    case 'unix-verify':
      text = `echo $ANTHROPIC_BASE_URL\necho $ANTHROPIC_AUTH_TOKEN`
      break
    case 'codex-config':
      text = codexConfigToml.value.join('\n')
      break
    case 'codex-auth':
      text = '{\n  "OPENAI_API_KEY": null\n}'
      break
    case 'codex-env-perm':
      if (activePlatform.value === 'windows') {
        text = `[System.Environment]::SetEnvironmentVariable("CRS_OAI_KEY", "${key}", [System.EnvironmentVariableTarget]::User)`
      } else {
        text = `echo 'export CRS_OAI_KEY="${key}"' >> ~/${shellConfigFile.value}\nsource ~/${shellConfigFile.value}`
      }
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