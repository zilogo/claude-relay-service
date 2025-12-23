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
              class="relative hidden items-center rounded-2xl bg-gray-100/50 p-1.5 dark:bg-gray-700/50 lg:flex"
            >
              <!-- 滑动指示器 -->
              <div
                class="absolute left-1.5 top-1.5 h-[calc(100%-12px)] rounded-xl bg-white shadow-md transition-all duration-300 dark:bg-gray-600"
                :style="{
                  width: `calc(${100 / 5}% - 6px)`,
                  transform: `translateX(calc(${tabIndicatorPosition}% + ${tabIndicatorOffset}px))`
                }"
              ></div>

              <!-- Tab 按钮 -->
              <button
                class="relative z-10 rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
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
                class="relative z-10 rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
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
                class="relative z-10 rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
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
                class="relative z-10 rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
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
                class="relative z-10 rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
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

    <!-- 主内容 -->
    <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <!-- Overview Tab -->
      <div v-if="activeTab === 'overview'" class="space-y-6">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">仪表板总览</h1>
          <p class="mt-2 text-base text-gray-600 dark:text-gray-400">
            欢迎来到您的 {{ siteName }} 仪表板
          </p>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <!-- 活跃的 API Keys 卡片 -->
          <div
            class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#F4F1EA] to-[#E6E2DA] p-6 transition-all hover:-translate-y-1 hover:shadow-xl dark:from-gray-800/50 dark:to-gray-700/50"
          >
            <div
              class="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-[#D97757]/10 blur-3xl transition-all group-hover:bg-[#D97757]/20"
            ></div>
            <div class="relative">
              <div
                class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D97757] shadow-lg shadow-[#D97757]/30"
              >
                <svg
                  class="h-7 w-7 text-white"
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
              <div>
                <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  活跃的 API Keys
                </p>
                <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50">
                  {{ apiKeysStats.active }}
                </p>
              </div>
            </div>
          </div>

          <!-- 已删除的 API Keys 卡片 -->
          <div
            class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-50 to-slate-50 p-6 transition-all hover:-translate-y-1 hover:shadow-xl dark:from-gray-800/50 dark:to-slate-800/50"
          >
            <div
              class="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-gray-500/10 blur-3xl transition-all group-hover:bg-gray-500/20"
            ></div>
            <div class="relative">
              <div
                class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-500 to-slate-600 shadow-lg shadow-gray-500/30"
              >
                <svg
                  class="h-7 w-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  已删除的 API Keys
                </p>
                <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50">
                  {{ apiKeysStats.deleted }}
                </p>
              </div>
            </div>
          </div>

          <!-- 总请求数卡片 -->
          <div
            class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#F4F1EA] to-[#E6E2DA] p-6 transition-all hover:-translate-y-1 hover:shadow-xl dark:from-gray-800/50 dark:to-gray-700/50"
          >
            <div
              class="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-[#D97757]/10 blur-3xl transition-all group-hover:bg-[#D97757]/20"
            ></div>
            <div class="relative">
              <div
                class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D97757] shadow-lg shadow-[#D97757]/30"
              >
                <svg
                  class="h-7 w-7 text-white"
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
                <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">总请求数</p>
                <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50">
                  {{ formatNumber(userProfile?.totalUsage?.requests || 0) }}
                </p>
              </div>
            </div>
          </div>

          <!-- 总成本卡片 -->
          <div
            class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 p-6 transition-all hover:-translate-y-1 hover:shadow-xl dark:from-amber-900/30 dark:to-yellow-900/30"
          >
            <div
              class="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-amber-500/10 blur-3xl transition-all group-hover:bg-amber-500/20"
            ></div>
            <div class="relative">
              <div
                class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 shadow-lg shadow-amber-500/30"
              >
                <svg
                  class="h-7 w-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
              </div>
              <div>
                <p class="text-sm font-semibold text-amber-900 dark:text-amber-100">总成本</p>
                <p class="mt-2 text-3xl font-bold text-amber-900 dark:text-amber-50">
                  ${{ (userProfile?.totalUsage?.totalCost || 0).toFixed(4) }}
                </p>
              </div>
            </div>
          </div>

          <!-- 可用余额卡片 -->
          <div
            class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 p-6 transition-all hover:-translate-y-1 hover:shadow-xl dark:from-emerald-900/30 dark:to-green-900/30"
          >
            <div
              class="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl transition-all group-hover:bg-emerald-500/20"
            ></div>
            <div class="relative">
              <div
                class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30"
              >
                <svg
                  class="h-7 w-7 text-white"
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
              <div>
                <p class="text-sm font-semibold text-emerald-900 dark:text-emerald-100">可用余额</p>
                <p
                  class="mt-2 text-3xl font-bold"
                  :class="
                    (balanceInfo?.availableBalance || 0) > 0
                      ? 'text-emerald-900 dark:text-emerald-50'
                      : 'text-red-600 dark:text-red-400'
                  "
                >
                  ${{ (balanceInfo?.availableBalance || 0).toFixed(4) }}
                </p>
                <p class="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                  已充值: ${{ (balanceInfo?.totalRecharge || 0).toFixed(2) }}
                </p>
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

        <!-- User Info -->
        <div
          class="overflow-hidden rounded-3xl border border-gray-200/50 bg-white/80 shadow-xl backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-800/80"
        >
          <div class="bg-[#D97757] px-6 py-5">
            <h3 class="flex items-center text-xl font-bold text-white">
              <svg class="mr-3 h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                />
              </svg>
              账户信息
            </h3>
          </div>
          <div class="px-6 py-6">
            <dl class="space-y-4">
              <div
                class="flex items-center justify-between rounded-2xl bg-gray-50 px-5 py-4 dark:bg-gray-700/50"
              >
                <dt
                  class="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  <svg
                    class="mr-3 h-5 w-5 text-gray-400"
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
                  用户名
                </dt>
                <dd class="text-base font-bold text-gray-900 dark:text-white">
                  {{ userProfile?.username }}
                </dd>
              </div>
              <div
                class="flex items-center justify-between rounded-2xl bg-gray-50 px-5 py-4 dark:bg-gray-700/50"
              >
                <dt
                  class="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  <svg
                    class="mr-3 h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                  显示名称
                </dt>
                <dd class="text-base font-bold text-gray-900 dark:text-white">
                  {{ userProfile?.displayName || '未设置' }}
                </dd>
              </div>
              <div
                class="flex items-center justify-between rounded-2xl bg-gray-50 px-5 py-4 dark:bg-gray-700/50"
              >
                <dt
                  class="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  <svg
                    class="mr-3 h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                  邮箱
                </dt>
                <dd class="text-base font-bold text-gray-900 dark:text-white">
                  {{ userProfile?.email || '未设置' }}
                </dd>
              </div>
              <div
                class="flex items-center justify-between rounded-2xl bg-gray-50 px-5 py-4 dark:bg-gray-700/50"
              >
                <dt
                  class="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  <svg
                    class="mr-3 h-5 w-5 text-gray-400"
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
                  角色
                </dt>
                <dd>
                  <span
                    class="inline-flex items-center rounded-full bg-[#D97757] px-4 py-1.5 text-sm font-bold text-white shadow-md"
                  >
                    {{ userProfile?.role === 'admin' ? '管理员' : '用户' }}
                  </span>
                </dd>
              </div>
              <div
                class="flex items-center justify-between rounded-2xl bg-gray-50 px-5 py-4 dark:bg-gray-700/50"
              >
                <dt
                  class="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  <svg
                    class="mr-3 h-5 w-5 text-gray-400"
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
                  注册时间
                </dt>
                <dd class="text-base font-bold text-gray-900 dark:text-white">
                  {{ formatDate(userProfile?.createdAt) }}
                </dd>
              </div>
              <div
                class="flex items-center justify-between rounded-2xl bg-gray-50 px-5 py-4 dark:bg-gray-700/50"
              >
                <dt
                  class="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  <svg
                    class="mr-3 h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                  最后登录
                </dt>
                <dd class="text-base font-bold text-gray-900 dark:text-white">
                  {{ formatDate(userProfile?.lastLoginAt) || '未记录' }}
                </dd>
              </div>
            </dl>
          </div>
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
    'api-keys': 6,
    usage: 12,
    recharge: 18,
    tutorial: 24
  }
  return offsets[activeTab.value] || 0
})
const userProfile = ref(null)
const apiKeysStats = ref({ active: 0, deleted: 0 })
const balanceInfo = ref(null)
const referralInfo = ref(null)
const referralLoading = ref(false)

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

const handleTabChange = (tab) => {
  activeTab.value = tab
  // 切换到总览标签时刷新 API Keys 统计
  if (tab === 'overview') {
    loadApiKeysStats()
  }
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
