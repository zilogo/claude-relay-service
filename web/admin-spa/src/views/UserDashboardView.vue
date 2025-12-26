<template>
  <div class="min-h-screen bg-[#F4F1EA] dark:bg-gray-900">
    <!-- 玻璃态导航栏 -->
    <nav
      class="sticky top-0 z-50 border-b border-gray-200/50 bg-white/90 backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-800/90"
    >
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 items-center justify-between">
          <!-- Logo 和品牌 -->
          <div class="flex items-center space-x-8">
            <div class="flex items-center space-x-3">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D97757] shadow-md"
              >
                <svg
                  class="h-5 w-5 text-white"
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
              </div>
              <span class="text-xl font-bold text-gray-900 dark:text-white">{{ siteName }}</span>
            </div>

            <!-- Tab 导航（带滑动指示器） -->
            <div
              class="relative hidden items-center gap-2 rounded-2xl bg-gray-100/50 p-1.5 dark:bg-gray-700/50 lg:flex"
            >
              <!-- 滑动指示器 -->
              <div
                class="absolute left-1.5 top-1.5 h-[calc(100%-12px)] rounded-xl bg-white shadow-md transition-all duration-300 dark:bg-gray-600"
                :style="{
                  width: `calc((100% - 32px) / 5)`,
                  transform: `translateX(calc(${tabIndicatorPosition}% + ${tabIndicatorOffset}px))`
                }"
              ></div>

              <!-- Tab 按钮 -->
              <button
                class="relative z-10 flex-1 rounded-xl px-3 py-2 text-center text-sm font-semibold transition-colors whitespace-nowrap min-w-0"
                :class="
                  activeTab === 'overview'
                    ? 'text-[#D97757]'
                    : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                "
                @click="handleTabChange('overview')"
              >
                总览
              </button>
              <button
                class="relative z-10 flex-1 rounded-xl px-3 py-2 text-center text-sm font-semibold transition-colors whitespace-nowrap min-w-0"
                :class="
                  activeTab === 'api-keys'
                    ? 'text-[#D97757]'
                    : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                "
                @click="handleTabChange('api-keys')"
              >
                API Keys
              </button>
              <button
                class="relative z-10 flex-1 rounded-xl px-3 py-2 text-center text-sm font-semibold transition-colors whitespace-nowrap min-w-0"
                :class="
                  activeTab === 'usage'
                    ? 'text-[#D97757]'
                    : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                "
                @click="handleTabChange('usage')"
              >
                使用统计
              </button>
              <button
                class="relative z-10 flex-1 rounded-xl px-3 py-2 text-center text-sm font-semibold transition-colors whitespace-nowrap min-w-0"
                :class="
                  activeTab === 'recharge'
                    ? 'text-[#D97757]'
                    : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                "
                @click="handleTabChange('recharge')"
              >
                充值记录
              </button>
              <button
                class="relative z-10 flex-1 rounded-xl px-3 py-2 text-center text-sm font-semibold transition-colors whitespace-nowrap min-w-0"
                :class="
                  activeTab === 'tutorial'
                    ? 'text-[#D97757]'
                    : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                "
                @click="handleTabChange('tutorial')"
              >
                使用手册
              </button>
            </div>
          </div>

          <!-- 用户区域 -->
          <div class="flex items-center space-x-4">
            <!-- 联系我们按钮 -->
            <button
              class="flex items-center rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-100"
              @click="showContactUsModal = true"
              title="联系我们"
            >
              <svg class="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                />
              </svg>
              <span class="hidden lg:inline">联系我们</span>
            </button>

            <div class="hidden text-sm text-gray-700 dark:text-gray-300 sm:block">
              欢迎，<span class="font-semibold text-gray-900 dark:text-white">{{
                userStore.userName
              }}</span>
            </div>

            <!-- 主题切换按钮 -->
            <ThemeToggle mode="icon" />

            <!-- 登出按钮 -->
            <button
              class="rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-100"
              @click="handleLogout"
            >
              登出
            </button>
          </div>
        </div>
      </div>
    </nav>

    <!-- 活动横幅 -->
    <PromotionBanner
      @contact-admin="showContactUsModal = true"
      @recharge="handlePromotionRecharge"
      @status-change="handlePromotionStatusChange"
    />

    <!-- 主内容 -->
    <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <!-- Overview Tab -->
      <div v-if="activeTab === 'overview'" class="space-y-6">
        <!-- 标题和欢迎信息 -->
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">仪表板总览</h1>
            <p class="mt-2 text-base text-gray-600 dark:text-gray-400">
              欢迎回来，{{ userStore.userName }}
            </p>
          </div>
          <!-- 快捷操作按钮 -->
          <div class="hidden gap-3 md:flex">
            <button
              class="inline-flex items-center gap-2 rounded-xl bg-[#D97757] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#c86747] focus:outline-none focus:ring-2 focus:ring-[#D97757] focus:ring-offset-2"
              @click="handleTabChange('api-keys')"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M12 4v16m8-8H4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                />
              </svg>
              创建 API Key
            </button>
          </div>
        </div>

        <!-- 核心统计卡片 - 3大卡片 -->
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <!-- 可用余额卡片 - 最重要，加大尺寸 -->
          <div
            class="group relative cursor-pointer overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50 to-green-50 p-8 transition-all hover:-translate-y-1 hover:shadow-2xl dark:from-emerald-900/30 dark:to-green-900/30"
            @click="handleTabChange('recharge')"
          >
            <!-- 添加右上角充值按钮 -->
            <button
              v-if="balanceInfo"
              class="absolute right-4 top-4 z-20 inline-flex items-center gap-2 rounded-xl border border-emerald-500 bg-white/80 px-3 py-1.5 text-sm font-semibold text-emerald-700 backdrop-blur-sm transition-all hover:bg-emerald-50 dark:border-emerald-400 dark:bg-gray-800/80 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
              @click.stop="handleTabChange('recharge')"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                />
              </svg>
              立即充值
            </button>
            <div
              class="absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl transition-all group-hover:bg-emerald-500/20"
            ></div>
            <div class="relative">
              <div class="flex items-start justify-between">
                <div
                  class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30"
                >
                  <svg
                    class="h-8 w-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                </div>
                <span
                  v-if="(balanceInfo?.availableBalance || 0) < 1"
                  class="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/50 dark:text-red-300"
                >
                  余额不足
                </span>
              </div>
              <div>
                <p class="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                  当前可用余额
                </p>
                <p
                  class="mt-3 text-4xl font-bold"
                  :class="
                    (balanceInfo?.availableBalance || 0) > 0
                      ? 'text-emerald-900 dark:text-emerald-50'
                      : 'text-red-600 dark:text-red-400'
                  "
                >
                  ${{ (balanceInfo?.availableBalance || 0).toFixed(4) }}
                </p>
                <div class="mt-4 flex items-center justify-between text-sm">
                  <span class="text-emerald-700 dark:text-emerald-300">
                    累计充值: ${{ (balanceInfo?.totalRecharge || 0).toFixed(2) }}
                  </span>
                  <svg
                    class="h-5 w-5 text-emerald-500 transition-transform group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M9 5l7 7-7 7"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <!-- 总请求数卡片 -->
          <div
            class="group relative cursor-pointer overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 p-8 transition-all hover:-translate-y-1 hover:shadow-2xl dark:from-blue-900/30 dark:to-indigo-900/30"
            @click="handleTabChange('usage')"
          >
            <div
              class="absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl transition-all group-hover:bg-blue-500/20"
            ></div>
            <div class="relative">
              <div
                class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30"
              >
                <svg
                  class="h-8 w-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
              </div>
              <div>
                <p class="text-sm font-semibold text-blue-900 dark:text-blue-100">总请求数</p>
                <p class="mt-3 text-4xl font-bold text-blue-900 dark:text-blue-50">
                  {{ formatNumber(userProfile?.totalUsage?.requests || 0) }}
                </p>
                <div class="mt-4 flex items-center justify-between text-sm">
                  <span class="text-blue-700 dark:text-blue-300">查看详细统计</span>
                  <svg
                    class="h-5 w-5 text-blue-500 transition-transform group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M9 5l7 7-7 7"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <!-- 活动增额卡片 -->
          <div
            class="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-50 to-pink-50 p-8 transition-all hover:-translate-y-1 hover:shadow-2xl dark:from-purple-900/30 dark:to-pink-900/30"
          >
            <div
              class="absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl transition-all group-hover:bg-purple-500/20"
            ></div>
            <div class="relative">
              <!-- 右上角提示 -->
              <div class="absolute -top-2 -right-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 text-xs font-semibold text-white shadow-lg">
                节日活动，定期开启
              </div>
              <div
                class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/30"
              >
                <svg
                  class="h-8 w-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
              </div>
              <div>
                <template v-if="promotionHasUsed">
                  <p class="text-sm font-semibold text-purple-900 dark:text-purple-100">
                    活动赠额已到账
                  </p>
                  <p
                    class="mt-3 text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400"
                  >
                    +${{ promotionBonusReceived.toFixed(2) }}
                  </p>
                  <div class="mt-4 flex flex-wrap gap-2 text-sm">
                    <button
                      class="inline-flex items-center rounded-full bg-white/80 px-4 py-2 font-semibold text-purple-700 shadow-sm transition hover:bg-white"
                      @click.stop="handleTabChange('recharge')"
                    >
                      查看充值记录
                    </button>
                  </div>
                </template>
                <template v-else-if="promotionTeaserVisible">
                  <p class="text-sm font-semibold text-purple-900 dark:text-purple-100">
                    首充优惠倒计时
                  </p>
                  <p
                    class="mt-3 text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400"
                  >
                    {{ promotionCurrentBonus }}%
                  </p>
                  <p class="mt-2 text-sm text-purple-700 dark:text-purple-200">
                    {{ promotionCurrentTierLabel }} · 剩余 {{ promotionCountdown }}
                  </p>
                  <div class="mt-4 flex items-center justify-between text-sm">
                    <span class="text-purple-700 dark:text-purple-300">仅限注册 72 小时内首充</span>
                    <button
                      class="inline-flex items-center rounded-full bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-purple-500"
                      @click.stop="handleTabChange('recharge')"
                    >
                      立即首充
                    </button>
                  </div>
                </template>
                <template v-else>
                  <p class="text-sm font-semibold text-purple-900 dark:text-purple-100">
                    手动充值 · 活动增额
                  </p>
                  <p
                    class="mt-3 text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400"
                  >
                    ${{ (balanceInfo?.manualRechargeTotal || 0).toFixed(2) }}
                  </p>
                  <div class="mt-4 flex items-center justify-between text-sm">
                    <span class="text-purple-700 dark:text-purple-300">手动充值累计（含活动增额）</span>
                    <svg
                      class="h-5 w-5 text-purple-500 transition-transform group-hover:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M9 5l7 7-7 7"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                      />
                    </svg>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- 次要信息卡片 -->
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <!-- 活跃 API Keys -->
          <div
            class="group cursor-pointer rounded-2xl border border-gray-200/50 bg-white/80 p-6 shadow-sm transition-all hover:shadow-md dark:border-gray-700/50 dark:bg-gray-800/80"
            @click="handleTabChange('api-keys')"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">活跃 API Keys</p>
                <p class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                  {{ apiKeysStats.active }}
                </p>
              </div>
              <div
                class="flex h-12 w-12 items-center justify-center rounded-xl bg-[#D97757]/10 dark:bg-[#D97757]/20"
              >
                <svg
                  class="h-6 w-6 text-[#D97757]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2m-2-2h-6m6 0v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9a2 2 0 012-2h6z"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
              </div>
            </div>
          </div>

          <!-- 用户信息快捷卡片 -->
          <div
            class="rounded-2xl border border-gray-200/50 bg-white/80 p-6 shadow-sm dark:border-gray-700/50 dark:bg-gray-800/80"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">账户信息</p>
                <p class="mt-2 truncate text-lg font-semibold text-gray-900 dark:text-white">
                  {{ userProfile?.username }}
                </p>
              </div>
              <div
                class="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30"
              >
                <svg
                  class="h-6 w-6 text-purple-600 dark:text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
              </div>
            </div>
          </div>

          <!-- 注册时间 -->
          <div
            class="rounded-2xl border border-gray-200/50 bg-white/80 p-6 shadow-sm dark:border-gray-700/50 dark:bg-gray-800/80"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">注册时间</p>
                <p class="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                  {{ formatDate(userProfile?.createdAt) }}
                </p>
              </div>
              <div
                class="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700"
              >
                <svg
                  class="h-6 w-6 text-gray-600 dark:text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
              </div>
            </div>
          </div>

          <!-- 账户角色 -->
          <div
            class="rounded-2xl border border-gray-200/50 bg-white/80 p-6 shadow-sm dark:border-gray-700/50 dark:bg-gray-800/80"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">账户角色</p>
                <p class="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                  {{ userProfile?.role === 'admin' ? '管理员' : '用户' }}
                </p>
              </div>
              <div
                class="flex h-12 w-12 items-center justify-center rounded-xl bg-[#D97757]/10 dark:bg-[#D97757]/20"
              >
                <svg
                  class="h-6 w-6 text-[#D97757]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Referral Program Card -->
        <div
          v-if="referralInfo"
          class="overflow-hidden rounded-3xl border border-amber-200/60 bg-gradient-to-br from-amber-50/80 to-white/80 shadow-xl shadow-amber-100/60 backdrop-blur-xl dark:border-amber-500/30 dark:from-slate-800/70 dark:to-slate-900/60"
        >
          <div class="px-6 py-6">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p class="text-sm font-semibold text-amber-600 dark:text-amber-300">邀请返利</p>
                <h3 class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">分享获取额度</h3>
                <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  {{ referralInfo.rules }}
                </p>
              </div>
              <div class="flex flex-wrap gap-3">
                <button
                  class="inline-flex items-center rounded-full border border-amber-300 bg-white/80 px-4 py-2 text-sm font-semibold text-amber-700 shadow-sm transition hover:border-amber-400 hover:bg-white dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-200"
                  type="button"
                  @click="copyReferralCode"
                >
                  <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M8 7V5a2 2 0 012-2h7a2 2 0 012 2v11a2 2 0 01-2 2h-1"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                    <path
                      d="M16 7H7a2 2 0 00-2 2v10a2 2 0 002 2h9a2 2 0 002-2V7z"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                  复制邀请码
                </button>
                <button
                  class="inline-flex items-center rounded-full border border-amber-300 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-700 shadow-sm transition hover:border-amber-400 hover:bg-amber-500/20 dark:border-amber-500/30 dark:text-amber-100"
                  type="button"
                  @click="copyReferralLink"
                >
                  <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M13.828 10.172a4 4 0 010 5.656l-2 2a4 4 0 01-5.656-5.656l1.172-1.172"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                    <path
                      d="M10.172 13.828a4 4 0 010-5.656l2-2a4 4 0 115.656 5.656L16.656 13"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                  复制邀请链接
                </button>
              </div>
            </div>

            <div class="mt-6 grid gap-4 md:grid-cols-2">
              <div
                class="rounded-2xl border border-gray-200/60 bg-white/90 p-4 dark:border-gray-600/60 dark:bg-slate-800/80"
              >
                <label
                  class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                  >邀请链接</label
                >
                <div
                  class="mt-2 flex items-center rounded-xl border border-gray-200/70 bg-gray-50/70 px-3 py-2 text-sm font-medium text-gray-900 dark:border-gray-600/60 dark:bg-slate-800/80 dark:text-gray-100"
                >
                  <span class="truncate">{{ referralInfo.link }}</span>
                </div>
              </div>
              <div
                class="rounded-2xl border border-gray-200/60 bg-white/90 p-4 dark:border-gray-600/60 dark:bg-slate-800/80"
              >
                <label
                  class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                  >邀请码</label
                >
                <div
                  class="mt-2 flex items-center justify-between rounded-xl border border-gray-200/70 bg-gray-50/70 px-3 py-2 text-lg font-bold text-gray-900 dark:border-gray-600/60 dark:bg-slate-800/80 dark:text-gray-100"
                >
                  <span>{{ referralInfo.code }}</span>
                </div>
              </div>
            </div>

            <div class="mt-6 grid gap-4 sm:grid-cols-3">
              <div
                class="rounded-2xl border border-amber-100 bg-white/80 p-4 text-center dark:border-amber-500/30 dark:bg-slate-800/70"
              >
                <p class="text-sm font-semibold text-gray-500 dark:text-gray-300">累计邀请</p>
                <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                  {{ referralInfo.stats?.totalInvites || 0 }}
                </p>
              </div>
              <div
                class="rounded-2xl border border-blue-100 bg-white/80 p-4 text-center dark:border-blue-500/30 dark:bg-slate-800/70"
              >
                <p class="text-sm font-semibold text-gray-500 dark:text-gray-300">达标人数</p>
                <p class="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-200">
                  {{ referralInfo.stats?.qualifiedInvites || 0 }}
                </p>
              </div>
              <div
                class="rounded-2xl border border-emerald-100 bg-white/80 p-4 text-center dark:border-emerald-500/30 dark:bg-slate-800/70"
              >
                <p class="text-sm font-semibold text-gray-500 dark:text-gray-300">已获赠送额度</p>
                <p class="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-200">
                  ${{ (referralInfo.stats?.totalRewardUsd || 0).toFixed(2) }}
                </p>
              </div>
            </div>

            <div class="mt-6">
              <div class="flex items-center justify-between">
                <h4 class="text-base font-semibold text-gray-900 dark:text-white">最近邀请</h4>
                <span class="text-xs text-gray-500 dark:text-gray-400"
                  >已展示最近 {{ referralInfo.recentInvitees?.length || 0 }} 个邀请</span
                >
              </div>
              <div v-if="referralInfo.recentInvitees?.length" class="mt-3 space-y-3">
                <div
                  v-for="invite in referralInfo.recentInvitees"
                  :key="invite.inviteeId"
                  class="flex items-center justify-between rounded-2xl border border-gray-200/70 bg-white/80 px-4 py-3 dark:border-gray-600/70 dark:bg-slate-800/80"
                >
                  <div>
                    <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {{ invite.inviteeUsername || '未命名用户' }}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      注册时间：{{ formatDate(invite.createdAt) || '未知' }}
                    </p>
                  </div>
                  <div class="text-right">
                    <span
                      :class="[
                        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
                        getReferralStatusMeta(invite.status).classes
                      ]"
                    >
                      {{ getReferralStatusMeta(invite.status).label }}
                    </span>
                    <p
                      v-if="invite.status !== 'rewarded'"
                      class="mt-1 text-xs text-gray-500 dark:text-gray-400"
                    >
                      累计充值：${{ (invite.totalRechargeUsd || 0).toFixed(2) }}
                    </p>
                  </div>
                </div>
              </div>
              <div
                v-else
                class="mt-4 rounded-2xl border border-dashed border-gray-300/80 p-6 text-center text-sm text-gray-500 dark:border-gray-600/80 dark:text-gray-400"
              >
                还没有邀请记录，快复制邀请链接分享给好友吧～
              </div>
            </div>
          </div>
        </div>
        <div
          v-else-if="referralLoading"
          class="rounded-3xl border border-amber-100 bg-white/70 p-6 text-sm text-gray-500 shadow-sm dark:border-amber-500/30 dark:bg-slate-800/70"
        >
          正在加载邀请信息...
        </div>
      </div>

      <!-- API Keys Tab -->
      <div v-else-if="activeTab === 'api-keys'">
        <UserApiKeysManager />
      </div>

      <!-- Usage Stats Tab -->
      <div v-else-if="activeTab === 'usage'">
        <UserUsageStats />
      </div>

      <!-- Recharge Records Tab -->
      <div v-else-if="activeTab === 'recharge'">
        <UserRechargeRecords ref="rechargeRecordsRef" />
      </div>

      <!-- 使用手册 Tab -->
      <div v-else-if="activeTab === 'tutorial'" class="space-y-6">
        <UserManualView />
      </div>
    </main>

    <!-- 联系我们弹窗 -->
    <ContactUsModal :show="showContactUsModal" @close="showContactUsModal = false" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { showToast } from '@/utils/toast'
import { copyTextToClipboard } from '@/utils/clipboard'
import ThemeToggle from '@/components/common/ThemeToggle.vue'
import UserApiKeysManager from '@/components/user/UserApiKeysManager.vue'
import UserUsageStats from '@/components/user/UserUsageStats.vue'
import UserRechargeRecords from '@/components/user/UserRechargeRecords.vue'
import UserManualView from '@/components/user/UserManualView.vue'
import ContactUsModal from '@/components/user/ContactUsModal.vue'
import PromotionBanner from '@/components/user/PromotionBanner.vue'
import { createPaymentStatusConfig } from '@/constants/paymentMessages'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const authStore = useAuthStore()
const themeStore = useThemeStore()

// 获取站点名称配置
const siteName = computed(() => authStore.oemSettings?.siteName || 'Claude Relay')

const activeTab = ref('overview')
const rechargeRecordsRef = ref(null)
const showContactUsModal = ref(false)

// Tab 指示器位置计算（5 个 Tab）
const tabIndicatorPosition = computed(() => {
  const positions = {
    overview: 0,
    'api-keys': 100,
    usage: 200,
    recharge: 300,
    tutorial: 400
  }
  return positions[activeTab.value] || 0
})

const tabIndicatorOffset = computed(() => {
  const offsets = {
    overview: 0,
    'api-keys': 8,
    usage: 16,
    recharge: 24,
    tutorial: 32
  }
  return offsets[activeTab.value] || 0
})
const userProfile = ref(null)
const apiKeysStats = ref({ active: 0, deleted: 0 })
const balanceInfo = ref(null)
const referralInfo = ref(null)
const referralLoading = ref(false)
const promotionStatusState = ref(null)

const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

const formatDate = (dateString) => {
  if (!dateString) return null
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatSeconds = (seconds) => {
  if (!seconds || Number.isNaN(seconds)) {
    return '00:00'
  }
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  if (hrs > 0) {
    return `${hrs}h ${mins.toString().padStart(2, '0')}m`
  }
  return `${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`
}

const promotionCountdown = computed(() => {
  const seconds = promotionStatusState.value?.remainingSeconds
  return formatSeconds(seconds || 0)
})

const promotionCurrentTierLabel = computed(() => {
  return (
    promotionStatusState.value?.currentTierData?.windowLabel ||
    promotionStatusState.value?.currentTierData?.timeLabel ||
    '限时档位'
  )
})

const promotionCurrentBonus = computed(() => {
  return (
    promotionStatusState.value?.currentTierData?.bonus ||
    promotionStatusState.value?.currentBonus ||
    0
  )
})

const promotionHasUsed = computed(() => Boolean(promotionStatusState.value?.hasUsed))

const promotionTeaserVisible = computed(() => {
  const status = promotionStatusState.value
  if (!status) return false
  if (status.forceHide) return false
  if (status.hasUsed) return false
  return status.available !== false
})

const promotionTierWindow = computed(() => {
  return (
    promotionStatusState.value?.metadata?.tierWindow ||
    promotionStatusState.value?.currentTierData?.windowLabel ||
    promotionStatusState.value?.currentTierData?.timeLabel ||
    '限时档位'
  )
})

const promotionBonusReceived = computed(() => promotionStatusState.value?.bonusReceived || 0)

const promotionRechargeAmount = computed(() => promotionStatusState.value?.amountRecharged || 0)

const handlePromotionStatusChange = (status) => {
  promotionStatusState.value = status
}

const handleTabChange = (tab) => {
  activeTab.value = tab
  // 切换到总览标签时刷新 API Keys 统计
  if (tab === 'overview') {
    loadApiKeysStats()
  }
}

const handlePromotionRecharge = () => {
  // 切换到充值记录页面
  handleTabChange('recharge')
}

const handleLogout = async () => {
  try {
    await userStore.logout()
    showToast('登出成功', 'success')
    router.push('/user-login')
  } catch (error) {
    showToast('登出失败', 'error')
  }
}

const PAYMENT_RETURN_CONFIG = Object.freeze({
  stripe: {
    statuses: {
      success: createPaymentStatusConfig('success'),
      failed: createPaymentStatusConfig('incomplete'),
      fail: createPaymentStatusConfig('incomplete'),
      cancel: createPaymentStatusConfig('incomplete', { type: 'info' })
    },
    default: createPaymentStatusConfig('incomplete', { type: 'info' })
  },
  zpay: {
    statuses: {
      success: createPaymentStatusConfig('success'),
      trade_success: createPaymentStatusConfig('success'),
      trade_finished: createPaymentStatusConfig('success'),
      trade_closed: createPaymentStatusConfig('incomplete'),
      closed: createPaymentStatusConfig('incomplete'),
      fail: createPaymentStatusConfig('incomplete'),
      failed: createPaymentStatusConfig('incomplete')
    },
    default: createPaymentStatusConfig('incomplete', { type: 'info' })
  }
})

const normalizeReturnProvider = (tab, provider) => {
  if (provider) {
    return provider.toString().toLowerCase()
  }
  if (tab === 'recharge') {
    return 'zpay'
  }
  return ''
}

const normalizeStatusKey = (value) => (value || '').toString().trim().toLowerCase()

const clearPaymentReturnQuery = () => {
  const nextQuery = { ...route.query }
  const keys = ['tab', 'provider', 'status', 'trade_status', 'order']
  let shouldReplace = false

  keys.forEach((key) => {
    if (key in nextQuery) {
      delete nextQuery[key]
      shouldReplace = true
    }
  })

  if (!shouldReplace) {
    return
  }

  router.replace({
    path: route.path,
    query: nextQuery
  })
}

const handlePaymentReturnFeedback = async (providerKey, rawStatus) => {
  if (!providerKey) {
    return false
  }
  const config = PAYMENT_RETURN_CONFIG[providerKey]
  if (!config) {
    return false
  }

  const normalizedStatus = normalizeStatusKey(rawStatus)
  const toastConfig = config.statuses[normalizedStatus] || config.default
  showToast(toastConfig.message, toastConfig.type)

  if (toastConfig.shouldRefresh && rechargeRecordsRef.value?.reloadAfterReturn) {
    await rechargeRecordsRef.value.reloadAfterReturn()
  }

  return true
}

const resolvePaymentReturnStatus = (query) => {
  const candidateKeys = ['status', 'trade_status', 'tradeStatus', 'payment_status', 'result']
  for (const key of candidateKeys) {
    if (query[key]) {
      return query[key]
    }
  }
  return ''
}

const handlePaymentReturnParams = async () => {
  const { tab, provider } = route.query
  const normalizedProvider = normalizeReturnProvider(tab, provider)
  if (!normalizedProvider) {
    return
  }

  if (activeTab.value !== 'recharge') {
    handleTabChange('recharge')
  }

  const resolvedStatus = resolvePaymentReturnStatus(route.query)
  await handlePaymentReturnFeedback(normalizedProvider, resolvedStatus)
  clearPaymentReturnQuery()
}

const loadUserProfile = async () => {
  try {
    userProfile.value = await userStore.getUserProfile()
  } catch (error) {
    console.error('Failed to load user profile:', error)
    showToast('加载用户资料失败', 'error')
  }
}

const loadApiKeysStats = async () => {
  try {
    const allApiKeys = await userStore.getUserApiKeys(true) // Include deleted keys
    console.log('All API Keys received:', allApiKeys)

    const activeKeys = allApiKeys.filter(
      (key) => !(key.isDeleted === 'true' || key.deletedAt) && key.isActive
    )
    const deletedKeys = allApiKeys.filter((key) => key.isDeleted === 'true' || key.deletedAt)

    console.log('Active keys:', activeKeys)
    console.log('Deleted keys:', deletedKeys)
    console.log('Active count:', activeKeys.length)
    console.log('Deleted count:', deletedKeys.length)

    apiKeysStats.value = { active: activeKeys.length, deleted: deletedKeys.length }
  } catch (error) {
    console.error('Failed to load API keys stats:', error)
    apiKeysStats.value = { active: 0, deleted: 0 }
  }
}

const loadBalanceInfo = async () => {
  try {
    balanceInfo.value = await userStore.getUserBalance()
  } catch (error) {
    console.error('Failed to load balance info:', error)
    balanceInfo.value = null
  }
}

const loadReferralInfo = async () => {
  referralLoading.value = true
  try {
    referralInfo.value = await userStore.getReferralInfo()
  } catch (error) {
    if (error.response?.status !== 404) {
      console.error('Failed to load referral info:', error)
      showToast('加载邀请信息失败', 'error')
    }
    referralInfo.value = null
  } finally {
    referralLoading.value = false
  }
}

const copyReferralLink = async () => {
  if (!referralInfo.value?.link) {
    return
  }
  try {
    await copyTextToClipboard(referralInfo.value.link)
    showToast('邀请链接已复制', 'success')
  } catch (error) {
    console.error('Failed to copy referral link:', error)
    showToast('复制失败，请手动复制', 'error')
  }
}

const copyReferralCode = async () => {
  if (!referralInfo.value?.code) {
    return
  }
  try {
    await copyTextToClipboard(referralInfo.value.code)
    showToast('邀请码已复制', 'success')
  } catch (error) {
    console.error('Failed to copy referral code:', error)
    showToast('复制失败，请手动复制', 'error')
  }
}

const getReferralStatusMeta = (status) => {
  const mapping = {
    rewarded: {
      label: '已发放',
      classes:
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 border border-emerald-200/60'
    },
    qualified: {
      label: '待发放',
      classes:
        'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200 border border-sky-200/60'
    },
    pending: {
      label: '未达标',
      classes:
        'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-300 border border-gray-200/60'
    }
  }
  return mapping[status] || mapping.pending
}

watch(
  () => route.query,
  () => {
    handlePaymentReturnParams()
  },
  { immediate: true }
)

onMounted(async () => {
  // 初始化主题
  themeStore.initTheme()
  // 加载 OEM 设置以获取站点名称配置
  await authStore.loadOemSettings()
  loadUserProfile()
  loadApiKeysStats()
  loadBalanceInfo()
  loadReferralInfo()
})
</script>

<style scoped>
/* 组件特定样式 */
</style>
