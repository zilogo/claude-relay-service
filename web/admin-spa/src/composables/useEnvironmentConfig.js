import { computed } from 'vue'

/**
 * 环境配置 Composable
 * 提供不同客户端和平台的环境变量配置生成逻辑
 */
export function useEnvironmentConfig(options = {}) {
  const { baseUrl, apiKey, platform = 'windows', client = 'claudecode' } = options

  // 获取基础 URL
  const getBaseUrl = () => {
    if (baseUrl) return baseUrl
    // 使用当前页面的 origin
    return window.location.origin + '/api'
  }

  // 获取 OpenAI 兼容的 URL
  const getOpenAIBaseUrl = () => {
    const base = getBaseUrl()
    return base.replace('/api', '/openai')
  }

  // 获取 Droid Claude URL
  const getDroidClaudeBaseUrl = () => {
    const base = getBaseUrl()
    return base.replace('/api', '/droid/claude')
  }

  // 获取 Droid OpenAI URL
  const getDroidOpenAIBaseUrl = () => {
    const base = getBaseUrl()
    return base.replace('/api', '/droid/openai')
  }

  /**
   * 生成 Claude Code 配置
   */
  const generateClaudeCodeConfig = () => {
    const url = getBaseUrl()
    const key = apiKey || '你的API密钥'

    const configs = {
      windows: {
        temporary: {
          name: 'PowerShell 临时设置',
          commands: [`$env:ANTHROPIC_BASE_URL = "${url}"`, `$env:ANTHROPIC_AUTH_TOKEN = "${key}"`],
          hint: '此配置仅对当前 PowerShell 窗口有效'
        },
        permanent: {
          name: 'PowerShell 永久设置',
          commands: [
            `[System.Environment]::SetEnvironmentVariable("ANTHROPIC_BASE_URL", "${url}", [System.EnvironmentVariableTarget]::User)`,
            `[System.Environment]::SetEnvironmentVariable("ANTHROPIC_AUTH_TOKEN", "${key}", [System.EnvironmentVariableTarget]::User)`
          ],
          hint: '设置后需要重新打开 PowerShell 窗口才能生效'
        },
        verify: 'echo $env:ANTHROPIC_AUTH_TOKEN'
      },
      macos: {
        temporary: {
          name: 'Terminal 临时设置',
          commands: [`export ANTHROPIC_BASE_URL="${url}"`, `export ANTHROPIC_AUTH_TOKEN="${key}"`],
          hint: '此配置仅对当前 Terminal 窗口有效'
        },
        permanent: {
          name: 'Shell 永久设置 (zsh)',
          commands: [
            `echo 'export ANTHROPIC_BASE_URL="${url}"' >> ~/.zshrc`,
            `echo 'export ANTHROPIC_AUTH_TOKEN="${key}"' >> ~/.zshrc`,
            'source ~/.zshrc'
          ],
          hint: '如果使用 bash，请将 .zshrc 替换为 .bash_profile'
        },
        verify: 'echo $ANTHROPIC_AUTH_TOKEN'
      },
      linux: {
        temporary: {
          name: 'Terminal 临时设置',
          commands: [`export ANTHROPIC_BASE_URL="${url}"`, `export ANTHROPIC_AUTH_TOKEN="${key}"`],
          hint: '此配置仅对当前 Terminal 窗口有效'
        },
        permanent: {
          name: 'Shell 永久设置 (bash)',
          commands: [
            `echo 'export ANTHROPIC_BASE_URL="${url}"' >> ~/.bashrc`,
            `echo 'export ANTHROPIC_AUTH_TOKEN="${key}"' >> ~/.bashrc`,
            'source ~/.bashrc'
          ],
          hint: '如果使用 zsh，请将 .bashrc 替换为 .zshrc'
        },
        verify: 'echo $ANTHROPIC_AUTH_TOKEN'
      }
    }

    return configs[platform] || configs.windows
  }

  /**
   * 生成 Codex 配置
   */
  const generateCodexConfig = () => {
    const url = getOpenAIBaseUrl()
    const key = apiKey || 'cr_xxxxxxxxxx'

    const configToml = [
      'model_provider = "crs"',
      'model = "gpt-5-codex"',
      'model_reasoning_effort = "high"',
      'disable_response_storage = true',
      'preferred_auth_method = "apikey"',
      '',
      '[model_providers.crs]',
      'name = "crs"',
      `base_url = "${url}"`,
      'wire_api = "responses"',
      'requires_openai_auth = true',
      'env_key = "CRS_OAI_KEY"'
    ]

    const authJson = {
      OPENAI_API_KEY: null
    }

    const envCommands = {
      windows: `set CRS_OAI_KEY=${key}`,
      macos: `export CRS_OAI_KEY=${key}`,
      linux: `export CRS_OAI_KEY=${key}`
    }

    const configPaths = {
      windows: '%USERPROFILE%\\.codex',
      macos: '~/.codex',
      linux: '~/.codex'
    }

    return {
      configPath: configPaths[platform],
      configToml: configToml.join('\n'),
      authJson: JSON.stringify(authJson, null, 2),
      envCommand: envCommands[platform],
      verify: platform === 'windows' ? 'echo %CRS_OAI_KEY%' : 'echo $CRS_OAI_KEY'
    }
  }

  /**
   * 生成 Droid CLI 配置
   */
  const generateDroidConfig = () => {
    const claudeUrl = getDroidClaudeBaseUrl()
    const openaiUrl = getDroidOpenAIBaseUrl()
    const key = apiKey || '你的API密钥'

    const config = {
      custom_models: [
        {
          model_display_name: 'Sonnet 4.5 [crs]',
          model: 'claude-sonnet-4-5-20250929',
          base_url: claudeUrl,
          api_key: key,
          provider: 'anthropic',
          max_tokens: 8192
        },
        {
          model_display_name: 'GPT5-Codex [crs]',
          model: 'gpt-5-codex',
          base_url: openaiUrl,
          api_key: key,
          provider: 'openai',
          max_tokens: 16384
        }
      ]
    }

    return {
      config: JSON.stringify(config, null, 2),
      configPath: platform === 'windows' ? '%APPDATA%\\droid\\config.json' : '~/.droid/config.json'
    }
  }

  /**
   * 生成 Cherry Studio 配置
   */
  const generateCherryStudioConfig = () => {
    const claudeUrl = getBaseUrl()
    const openaiUrl = getOpenAIBaseUrl()
    const geminiUrl = getBaseUrl().replace('/api', '/gemini')
    const key = apiKey || '你的API密钥'

    return {
      claude: {
        name: 'Claude (CRS)',
        baseUrl: claudeUrl,
        apiKey: key,
        hint: '在 Cherry Studio 中添加 Anthropic 服务商时使用'
      },
      openai: {
        name: 'OpenAI (CRS)',
        baseUrl: openaiUrl,
        apiKey: key,
        hint: '在 Cherry Studio 中添加 OpenAI 服务商时使用'
      },
      gemini: {
        name: 'Gemini (CRS)',
        baseUrl: geminiUrl,
        apiKey: key,
        hint: '在 Cherry Studio 中添加 Google 服务商时使用'
      }
    }
  }

  /**
   * 获取当前客户端的配置
   */
  const getConfig = computed(() => {
    switch (client) {
      case 'claudecode':
        return generateClaudeCodeConfig()
      case 'codex':
        return generateCodexConfig()
      case 'droid':
        return generateDroidConfig()
      case 'cherrystudio':
        return generateCherryStudioConfig()
      default:
        return generateClaudeCodeConfig()
    }
  })

  /**
   * 复制配置到剪贴板
   */
  const copyConfig = async (content) => {
    try {
      await navigator.clipboard.writeText(content)
      return true
    } catch (error) {
      console.error('复制失败:', error)
      return false
    }
  }

  /**
   * 生成一键复制命令
   */
  const generateQuickCopyCommand = () => {
    if (client === 'claudecode') {
      const config = generateClaudeCodeConfig()
      return config.temporary.commands.join('\n')
    } else if (client === 'codex') {
      const config = generateCodexConfig()
      return config.envCommand
    }
    return ''
  }

  return {
    // 数据
    baseUrl: computed(() => getBaseUrl()),
    openaiBaseUrl: computed(() => getOpenAIBaseUrl()),
    droidClaudeBaseUrl: computed(() => getDroidClaudeBaseUrl()),
    droidOpenAIBaseUrl: computed(() => getDroidOpenAIBaseUrl()),

    // 配置生成
    config: getConfig,
    claudeCodeConfig: generateClaudeCodeConfig,
    codexConfig: generateCodexConfig,
    droidConfig: generateDroidConfig,
    cherryStudioConfig: generateCherryStudioConfig,

    // 工具方法
    copyConfig,
    generateQuickCopyCommand
  }
}
