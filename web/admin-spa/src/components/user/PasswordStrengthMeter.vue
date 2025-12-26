<template>
  <div v-if="password" class="password-strength-meter">
    <div class="strength-bar-container">
      <div class="strength-bar" :class="strengthClass" :style="{ width: barWidth }"></div>
    </div>
    <div class="strength-info">
      <span class="strength-label" :class="strengthClass">
        {{ strengthLabel }}
      </span>
      <ul v-if="feedback && feedback.length > 0" class="strength-feedback">
        <li v-for="(item, index) in feedback" :key="index" class="feedback-item">
          {{ item }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PasswordStrengthMeter',
  props: {
    password: {
      type: String,
      default: ''
    }
  },
  computed: {
    strengthInfo() {
      if (!this.password) {
        return { score: 0, level: 'none', feedback: [] }
      }

      let score = 0
      const feedback = []

      // 长度检查
      if (this.password.length >= 8) score++
      else feedback.push('至少需要8个字符')

      if (this.password.length >= 12) score++

      // 包含小写字母
      if (/[a-z]/.test(this.password)) score++
      else feedback.push('需要小写字母')

      // 包含大写字母
      if (/[A-Z]/.test(this.password)) score++
      else feedback.push('需要大写字母')

      // 包含数字
      if (/[0-9]/.test(this.password)) score++
      else feedback.push('需要数字')

      // 包含特殊字符
      // eslint-disable-next-line no-useless-escape
      if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(this.password)) score++
      else feedback.push('需要特殊字符')

      // 确定强度等级
      let level = 'weak'
      if (score >= 5) level = 'strong'
      else if (score >= 4) level = 'medium'
      else if (score >= 2) level = 'weak'
      else level = 'very-weak'

      return { score, level, feedback }
    },
    strengthClass() {
      return `strength-${this.strengthInfo.level}`
    },
    strengthLabel() {
      const labels = {
        'very-weak': '非常弱',
        weak: '弱',
        medium: '中等',
        strong: '强'
      }
      return labels[this.strengthInfo.level] || ''
    },
    barWidth() {
      const maxScore = 6
      return `${(this.strengthInfo.score / maxScore) * 100}%`
    },
    feedback() {
      return this.strengthInfo.feedback
    }
  }
}
</script>

<style scoped>
.password-strength-meter {
  margin-top: 8px;
}

.strength-bar-container {
  width: 100%;
  height: 4px;
  background-color: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
}

.dark .strength-bar-container {
  background-color: #374151;
}

.strength-bar {
  height: 100%;
  transition: all 0.3s ease;
  border-radius: 2px;
}

.strength-bar.strength-very-weak {
  background-color: #ef4444;
}

.strength-bar.strength-weak {
  background-color: #f59e0b;
}

.strength-bar.strength-medium {
  background-color: #eab308;
}

.strength-bar.strength-strong {
  background-color: #22c55e;
}

.strength-info {
  margin-top: 8px;
}

.strength-label {
  font-size: 12px;
  font-weight: 600;
}

.strength-label.strength-very-weak {
  color: #ef4444;
}

.strength-label.strength-weak {
  color: #f59e0b;
}

.strength-label.strength-medium {
  color: #eab308;
}

.strength-label.strength-strong {
  color: #22c55e;
}

.strength-feedback {
  margin: 4px 0 0 0;
  padding: 0;
  list-style: none;
  font-size: 11px;
  color: #6b7280;
}

.dark .strength-feedback {
  color: #9ca3af;
}

.feedback-item {
  margin: 2px 0;
}

.feedback-item:before {
  content: '• ';
  margin-right: 4px;
}
</style>
