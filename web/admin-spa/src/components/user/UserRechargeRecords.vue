<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">充值记录</h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">查看您的账户充值历史记录</p>
      </div>
      <!-- 导出按钮 -->
      <button
        class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="records.length === 0 || exporting"
        @click="exportRecords"
      >
        <svg v-if="exporting" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            fill="currentColor"
          ></path>
        </svg>
        <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
          />
        </svg>
        {{ exporting ? '导出中...' : '导出 CSV' }}
      </button>
    </div>

    <!-- 在线充值区域（仅当支付功能启用时显示） -->
    <div
      v-if="paymentStore.isPaymentEnabled"
      class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
    >
      <div class="border-b border-gray-200 bg-[#D97757] px-6 py-4 dark:border-gray-700">
        <h3 class="flex items-center text-lg font-semibold text-white">
          <svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            />
          </svg>
          在线充值
        </h3>
      </div>
      <div class="p-6">
        <!-- 加载中 -->
        <div v-if="paymentStore.configLoading" class="flex justify-center py-8">
          <div class="flex items-center gap-3 text-gray-500">
            <svg class="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                fill="currentColor"
              ></path>
            </svg>
            <span>加载支付配置...</span>
          </div>
        </div>

        <div v-else>
          <div class="mb-6">
            <label class="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
              快速选择充值金额
            </label>
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <button
                v-for="amount in presetAmounts"
                :key="`preset-${amount}`"
                class="relative rounded-xl border-2 p-4 text-left transition-all hover:border-[#D97757] hover:shadow-md"
                :class="
                  isPresetSelected(amount)
                    ? 'border-[#D97757] bg-[#D97757]/5 dark:bg-[#D97757]/10'
                    : 'border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-700'
                "
                @click="selectPresetAmount(amount)"
              >
                <div class="mb-1 text-lg font-bold text-gray-900 dark:text-white">
                  {{ currencySymbol }}{{ amount }}
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  实付约 ¥{{ formatPresetCny(amount) }}
                </div>
                <div
                  v-if="isPresetSelected(amount)"
                  class="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#D97757] text-white"
                >
                  <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      clip-rule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      fill-rule="evenodd"
                    />
                  </svg>
                </div>
              </button>
              <button
                v-if="paymentStore.allowCustomAmount"
                class="relative rounded-xl border-2 p-4 text-left transition-all hover:border-[#D97757] hover:shadow-md"
                :class="
                  isOtherPresetSelected
                    ? 'border-[#D97757] bg-[#D97757]/5 dark:bg-[#D97757]/10'
                    : 'border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-700'
                "
                @click="selectPresetAmount('other')"
              >
                <div class="mb-1 text-lg font-bold text-gray-900 dark:text-white">其他</div>
                <div class="text-sm text-gray-500 dark:text-gray-400">自定义金额</div>
                <div
                  v-if="isOtherPresetSelected"
                  class="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#D97757] text-white"
                >
                  <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      clip-rule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      fill-rule="evenodd"
                    />
                  </svg>
                </div>
              </button>
            </div>
            <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
              微信支付最低充值金额：¥{{ minWechatAmountDisplay }}
            </p>
          </div>

          <!-- 自定义金额 -->
          <div v-if="shouldShowCustomAmount" class="mb-6">
            <label class="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
              输入充值金额（{{ currencyDisplayName }}）
            </label>
            <div class="flex gap-3">
              <div class="relative flex-1">
                <span
                  class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500"
                >
                  {{ currencySymbol }}
                </span>
                <input
                  v-model="customAmount"
                  class="block w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-8 pr-3 text-gray-900 transition-colors focus:border-[#D97757] focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  :max="maxAmount"
                  :min="minAmount"
                  placeholder="输入金额"
                  type="number"
                  @blur="handleCustomAmountBlur"
                  @input="onCustomAmountChange"
                />
              </div>
            </div>
            <p v-if="convertedAmountHint" class="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {{ convertedAmountHint }}
            </p>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {{ conversionFormulaHint }}
            </p>
          </div>

          <!-- 支付方式选择 -->
          <div class="mb-6">
            <label class="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
              选择支付方式
            </label>
            <div class="flex flex-wrap gap-3">
              <button
                v-for="method in availablePaymentMethods"
                :key="`${method.provider}-${method.method}`"
                class="flex w-full max-w-xs items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all hover:border-[#D97757]"
                :class="
                  isMethodSelected(method)
                    ? 'border-[#D97757] bg-[#D97757]/5 dark:bg-[#D97757]/10'
                    : 'border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-700'
                "
                @click="selectMethod(method)"
              >
                <!-- 支付图标 -->
                <span v-if="method.method === 'alipay'" class="text-lg font-bold text-blue-500">
                  <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M21.422 15.358c-.937-.239-1.968-.494-3.093-.772a36.796 36.796 0 001.81-4.366H16.32V8.628h5.15V7.68h-5.15V5.07h-2.316c-.274 0-.496.222-.496.496V7.68H8.32v.948h5.188v1.592H9.266v.948h7.813c-.451 1.208-.986 2.377-1.601 3.493-3.183-.692-5.806-.87-7.248.175-2.122 1.538-2.294 4.468.357 5.935 1.927 1.066 4.608.337 6.416-1.64.793.472 1.663.992 2.609 1.562.936.566 1.846 1.072 2.728 1.52a.992.992 0 001.345-.403l.008-.015c.212-.391.194-.805-.054-1.1-.249-.295-.495-.577-.738-.846zm-11.6 3.88c-1.303.932-3.056 1.232-4.001.564-1.157-.82-.894-2.748.589-3.622 1.14-.67 2.882-.505 4.918.01a8.606 8.606 0 01-1.506 3.048z"
                    />
                  </svg>
                </span>
                <span
                  v-else-if="
                    method.method === 'wxpay' ||
                    (method.provider === 'stripe' && method.method === 'wechat_pay')
                  "
                  class="text-lg font-bold text-green-500"
                >
                  <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295.095 0 .182-.05.248-.126l1.89-1.11c.164-.096.359-.144.554-.126.559.08 1.127.126 1.701.126.36 0 .714-.017 1.063-.05A6.601 6.601 0 018.1 14.12c0-3.81 3.693-6.897 8.25-6.897.275 0 .547.012.816.035C16.166 4.228 12.713 2.188 8.691 2.188zM5.336 6.83c.673 0 1.218.544 1.218 1.215s-.545 1.215-1.218 1.215c-.674 0-1.22-.544-1.22-1.215s.546-1.215 1.22-1.215zm6.618 0c.673 0 1.218.544 1.218 1.215s-.545 1.215-1.218 1.215c-.673 0-1.218-.544-1.218-1.215s.545-1.215 1.218-1.215zM16.35 8.508c-3.937 0-7.129 2.71-7.129 6.05s3.192 6.05 7.13 6.05c.71 0 1.397-.087 2.05-.249a.513.513 0 01.38.065l1.416.832c.048.05.109.09.18.09.112 0 .203-.094.203-.21 0-.052-.02-.102-.034-.15l-.288-1.11a.453.453 0 01.157-.478c1.37-1.02 2.25-2.572 2.25-4.302 0-3.34-3.191-6.05-7.128-6.05zm-2.742 3.378c.5 0 .906.404.906.903s-.405.902-.906.902-.907-.403-.907-.902.406-.903.907-.903zm5.465 0c.5 0 .907.404.907.903s-.406.902-.907.902c-.5 0-.906-.403-.906-.902s.406-.903.906-.903z"
                    />
                  </svg>
                </span>
                <span v-else class="text-gray-400">
                  <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                </span>
                <div>
                  <div class="font-medium text-gray-900 dark:text-white">{{ method.name }}</div>
                </div>
              </button>
            </div>
          </div>

          <!-- 充值按钮 -->
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-500 dark:text-gray-400">
              <template v-if="displayAmount">
                支付金额：<span class="font-semibold text-gray-900 dark:text-white">{{
                  displayAmount
                }}</span>
              </template>
            </div>
            <button
              class="inline-flex items-center gap-2 rounded-xl bg-[#D97757] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#c86747] focus:outline-none focus:ring-2 focus:ring-[#D97757] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="!canSubmit || paymentStore.orderLoading"
              @click="createPaymentOrder"
            >
              <svg
                v-if="paymentStore.orderLoading"
                class="h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  fill="currentColor"
                ></path>
              </svg>
              {{ paymentStore.orderLoading ? '创建订单中...' : '立即充值' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 余额概览卡片 -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <!-- 累计充值 -->
      <div
        class="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-5 dark:from-emerald-900/20 dark:to-teal-900/20"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
              />
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">累计充值</p>
            <p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              ${{ balanceInfo?.totalRecharge?.toFixed(2) || '0.00' }}
            </p>
          </div>
        </div>
      </div>

      <!-- 已消费 -->
      <div
        class="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 p-5 dark:from-orange-900/20 dark:to-amber-900/20"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-500/30"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
              />
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">已消费</p>
            <p class="text-2xl font-bold text-orange-600 dark:text-orange-400">
              ${{ balanceInfo?.totalCost?.toFixed(2) || '0.00' }}
            </p>
          </div>
        </div>
      </div>

      <!-- 可用余额 -->
      <div
        class="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-5 dark:from-blue-900/20 dark:to-indigo-900/20"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/30"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
              />
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">可用余额</p>
            <p
              class="text-2xl font-bold"
              :class="
                (balanceInfo?.availableBalance || 0) >= 0
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-red-600 dark:text-red-400'
              "
            >
              ${{ balanceInfo?.availableBalance?.toFixed(2) || '0.00' }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 记录列表 -->
    <div
      class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
    >
      <div
        class="flex flex-col gap-3 border-b border-gray-100 bg-gray-50/60 px-6 py-4 dark:border-gray-700 dark:bg-gray-900/40 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="w-full sm:w-52">
          <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400"
            >类型筛选</label
          >
          <select
            v-model="typeFilter"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            @change="handleTypeFilterChange"
          >
            <option
              v-for="option in typeFilterOptions"
              :key="option.value || 'all'"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          “在线充值” 表示二维码/支付网关订单，“手动充值” 为管理员在后台手动调整，邀请奖励会标记为
          “邀请奖励”。
        </p>
      </div>
      <!-- 加载状态 -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          <svg class="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              fill="currentColor"
            ></path>
          </svg>
          <span>加载中...</span>
        </div>
      </div>

      <!-- 空状态 -->
      <div
        v-else-if="records.length === 0"
        class="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400"
      >
        <svg
          class="mb-4 h-16 w-16 text-gray-300 dark:text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
          />
        </svg>
        <p class="text-lg font-medium">暂无充值记录</p>
        <p class="mt-1 text-sm">您还没有任何充值记录</p>
      </div>

      <!-- 表格 -->
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th
                class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                时间
              </th>
              <th
                class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                类型
              </th>
              <th
                class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                支付金额
              </th>
              <th
                class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                充值额度
              </th>
              <th
                class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                充值额度变化
              </th>
              <th
                class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                操作者
              </th>
              <th
                class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                备注
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            <tr
              v-for="record in records"
              :key="record.id"
              class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <td class="whitespace-nowrap px-6 py-4">
                <div class="text-sm text-gray-900 dark:text-gray-100">
                  {{ formatDate(record.createdAt) }}
                </div>
              </td>
              <td class="whitespace-nowrap px-6 py-4">
                <span
                  class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                  :class="getTypeClass(record.type)"
                >
                  {{ getTypeName(record.type) }}
                </span>
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-right">
                <span
                  v-if="hasPaymentAmount(record)"
                  class="text-sm font-semibold"
                  :class="getAmountColorClass(record.paymentAmount)"
                >
                  {{ getRecordPaymentAmountText(record) }}
                </span>
                <span v-else class="text-sm text-gray-400 dark:text-gray-500">-</span>
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-right">
                <span
                  class="text-sm font-semibold"
                  :class="
                    record.amount >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  "
                >
                  {{ record.amount >= 0 ? '+' : '' }}${{ record.amount.toFixed(2) }}
                </span>
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-right">
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  ${{ record.balanceBefore?.toFixed(2) || '0.00' }}
                  <span class="mx-1">→</span>
                  <span class="font-medium text-gray-900 dark:text-gray-100">
                    ${{ record.balanceAfter?.toFixed(2) || '0.00' }}
                  </span>
                </div>
              </td>
              <td class="whitespace-nowrap px-6 py-4">
                <div class="text-sm text-gray-600 dark:text-gray-400">
                  {{ record.source === 'dingtalk-bot' ? '-' : record.operatorName || '-' }}
                </div>
              </td>
              <td class="max-w-xs truncate px-6 py-4">
                <div class="text-sm text-gray-600 dark:text-gray-400" :title="record.remark">
                  {{ record.source === 'dingtalk-bot' ? '-' : record.remark || '-' }}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div
        v-if="totalRecords > pageSize"
        class="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-900/50"
      >
        <div class="text-sm text-gray-600 dark:text-gray-400">
          共 {{ totalRecords }} 条记录，第 {{ currentPage }} / {{ totalPages }} 页
        </div>
        <div class="flex items-center gap-2">
          <button
            class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            :disabled="currentPage <= 1"
            @click="goToPage(currentPage - 1)"
          >
            上一页
          </button>
          <button
            class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            :disabled="currentPage >= totalPages"
            @click="goToPage(currentPage + 1)"
          >
            下一页
          </button>
        </div>
      </div>
    </div>

    <transition name="fade">
      <div
        v-if="showPaymentDialog"
        class="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
      >
        <div class="absolute inset-0 bg-black/60" @click="closePaymentDialog"></div>
        <div
          class="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-800"
        >
          <div
            class="flex items-start justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700"
          >
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">微信扫码支付</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                订单号：{{ paymentDialogData?.orderId || '-' }}
              </p>
            </div>
            <button
              aria-label="关闭"
              class="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
              @click="closePaymentDialog"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M6 18L18 6M6 6l12 12"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                />
              </svg>
            </button>
          </div>

          <div class="space-y-4 px-6 py-5">
            <div
              class="rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-900/40 dark:text-gray-300"
            >
              <p>
                状态：
                <span
                  class="font-medium"
                  :class="{
                    'text-emerald-600 dark:text-emerald-400': paymentStatus === 'success',
                    'text-red-600 dark:text-red-400': paymentStatus === 'failed',
                    'text-blue-600 dark:text-blue-400': paymentStatus === 'pending'
                  }"
                >
                  {{
                    paymentStatus === 'success'
                      ? '支付成功'
                      : paymentStatus === 'failed'
                        ? '支付失败'
                        : '待支付'
                  }}
                </span>
              </p>
              <p v-if="paymentCountdown" class="mt-1">二维码有效期：{{ paymentCountdown }}</p>
              <p v-else class="mt-1 text-xs text-gray-400">二维码有效期：计算中...</p>
            </div>

            <div v-if="isWechatQrDialog" class="flex flex-col items-center gap-4">
              <div
                class="rounded-2xl border border-dashed border-gray-200 bg-white p-4 shadow-inner dark:border-gray-700 dark:bg-gray-900"
              >
                <img
                  v-if="paymentDialogData?.qrImageUrl"
                  alt="微信支付二维码"
                  class="h-48 w-48 object-contain"
                  :src="paymentDialogData.qrImageUrl"
                />
                <div
                  v-else-if="paymentDialogData?.qrSvgUrl"
                  class="h-48 w-48"
                  v-html="paymentDialogData.qrSvgUrl"
                ></div>
                <p class="mt-2 text-center text-sm text-gray-500">请使用微信扫描二维码完成支付</p>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                若二维码失效，可点击下方“重新生成二维码”
              </p>
            </div>

            <div
              v-else-if="isWechatRedirectDialog"
              class="space-y-3 text-sm text-gray-600 dark:text-gray-300"
            >
              <p>请在微信客户端中打开以下链接完成支付：</p>
              <a
                class="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-white transition hover:bg-emerald-700"
                :href="paymentDialogData?.redirectUrl"
                rel="noreferrer"
                target="_blank"
              >
                打开微信支付
              </a>
            </div>

            <div
              v-if="paymentStatus === 'success'"
              class="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
            >
              {{ paymentSuccessMessage }}。您可以关闭此窗口继续使用服务。
            </div>
            <div
              v-else-if="paymentStatus === 'failed'"
              class="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200"
            >
              {{ paymentIncompleteMessage }}。
            </div>
          </div>

          <div
            class="flex flex-col gap-2 border-t border-gray-200 px-6 py-4 dark:border-gray-700 sm:flex-row"
          >
            <button
              class="inline-flex flex-1 items-center justify-center rounded-xl bg-[#D97757] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#c86747] disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="manualCheckLoading"
              @click="checkOrderStatus"
            >
              <svg
                v-if="manualCheckLoading"
                class="mr-2 h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  fill="currentColor"
                ></path>
              </svg>
              {{ paymentStatus === 'success' ? '已完成支付' : '我已完成支付' }}
            </button>
            <button
              v-if="paymentStatus !== 'success'"
              class="inline-flex flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-[#D97757] hover:text-[#D97757] dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:text-white"
              :disabled="refreshPaymentLoading"
              @click="regenerateWechatPayment"
            >
              <svg
                v-if="refreshPaymentLoading"
                class="mr-2 h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  fill="currentColor"
                ></path>
              </svg>
              重新生成二维码
            </button>
            <button
              class="inline-flex flex-1 items-center justify-center rounded-xl border border-transparent px-4 py-2 text-sm font-semibold text-gray-600 transition hover:text-gray-800 dark:text-gray-300"
              @click="closePaymentDialog"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </transition>
    <transition name="fade">
      <div
        v-if="calculationModal.visible"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
        @click="closeCalculationModal"
      >
        <div
          class="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-900"
          @click.stop
        >
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">充值金额计算</h3>
            <button
              class="rounded-full p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              @click="closeCalculationModal"
            >
              <span class="sr-only">关闭</span>
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M6 18L18 6M6 6l12 12"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                />
              </svg>
            </button>
          </div>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
            系统会根据以下计算公式确定人民币实付金额
          </p>
          <div
            class="mt-4 space-y-4 rounded-2xl bg-gray-50 p-4 text-gray-700 dark:bg-gray-800/80 dark:text-gray-100"
          >
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">显示额度</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ currencySymbol }}{{ formatNumber(calculationModal.displayAmount) }}
              </p>
            </div>
            <div class="rounded-xl bg-white p-4 text-sm shadow-sm dark:bg-gray-900/50">
              <p class="text-gray-500 dark:text-gray-400">计算公式</p>
              <p class="mt-1 font-semibold text-gray-900 dark:text-white">
                {{ currencySymbol }}{{ formatNumber(calculationModal.displayAmount) }} ×
                {{ formatRate(calculationModal.exchangeRate) }}
                <span v-if="Math.abs(calculationModal.discountRate - 1) > 0.0001">
                  × {{ formatDiscountRate(calculationModal.discountRate) }}
                </span>
                = ¥{{ formatNumber(calculationModal.finalAmountCny) }}
              </p>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span>汇率</span>
              <span>{{ formatRate(calculationModal.exchangeRate) }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span>折扣率</span>
              <span>{{ formatDiscountRate(calculationModal.discountRate) }}</span>
            </div>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">最终实付金额</p>
              <p class="text-2xl font-bold text-emerald-600 dark:text-emerald-300">
                ¥{{ formatNumber(calculationModal.finalAmountCny) }}
              </p>
            </div>
          </div>
          <button
            class="mt-6 w-full rounded-2xl bg-[#D97757] py-3 text-sm font-semibold text-white shadow hover:bg-[#c86747]"
            @click="closeCalculationModal"
          >
            确认金额
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, reactive } from 'vue'
import { useUserStore } from '@/stores/user'
import { usePaymentStore } from '@/stores/payment'
import { showToast } from '@/utils/toast'
import { APP_CONFIG } from '@/config/app'
import { PAYMENT_SUCCESS_MESSAGE, PAYMENT_INCOMPLETE_MESSAGE } from '@/constants/paymentMessages'

const userStore = useUserStore()
const paymentStore = usePaymentStore()

const loading = ref(true)
const exporting = ref(false)
const records = ref([])
const balanceInfo = ref(null)
const totalRecords = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const typeFilter = ref('')
const typeFilterOptions = [
  { value: '', label: '全部类型' },
  { value: 'payment', label: '在线充值' },
  { value: 'manual', label: '手动充值' },
  { value: 'reward', label: '邀请奖励' },
  { value: 'refund', label: '退款' },
  { value: 'adjustment', label: '调整' }
]

// 支付相关状态
const selectedPackage = ref(null)
const selectedMethod = ref(null)
const customAmount = ref('')
const showPaymentDialog = ref(false)
const paymentDialogData = ref(null)
const paymentStatus = ref('pending')
const paymentCountdown = ref('')
const paymentPollingTimer = ref(null)
const paymentCountdownTimer = ref(null)
const manualCheckLoading = ref(false)
const refreshPaymentLoading = ref(false)
const selectedPresetId = ref('')
const presetAmounts = Object.freeze([100, 200, 500, 1000])
const OTHER_PRESET_ID = 'preset-other'
const parsedEnvWechatMin = Number(import.meta.env?.VITE_WECHAT_MIN_CNY ?? '')
const WECHAT_MIN_CNY =
  Number.isFinite(parsedEnvWechatMin) && parsedEnvWechatMin > 0 ? parsedEnvWechatMin : 100
const paymentCurrency = ref('CNY')
const calculationModal = reactive({
  visible: false,
  displayAmount: 0,
  exchangeRate: 0,
  discountRate: 1,
  finalAmountCny: 0
})

let wechatPaymentPopup = null
const paymentSuccessMessage = PAYMENT_SUCCESS_MESSAGE
const paymentIncompleteMessage = PAYMENT_INCOMPLETE_MESSAGE

const resolveOrderId = (order) => order?.orderId || order?.id || ''

const closeWechatPopupWindow = () => {
  if (wechatPaymentPopup && !wechatPaymentPopup.closed) {
    try {
      wechatPaymentPopup.close()
    } catch (error) {
      console.warn('[UserRechargeRecords] Failed to close WeChat popup:', error)
    }
  }
  wechatPaymentPopup = null
}

const notifyWechatPopup = (status, order, extra = {}) => {
  if (typeof window === 'undefined') {
    return
  }

  if (!wechatPaymentPopup || wechatPaymentPopup.closed) {
    wechatPaymentPopup = null
    return
  }

  const popup = wechatPaymentPopup
  const payload = {
    type: 'wechat_order_status',
    orderId: resolveOrderId(order),
    status,
    ...extra
  }

  try {
    popup.postMessage(payload, window.location?.origin || '*')

    if (status === 'success') {
      setTimeout(() => {
        if (popup && !popup.closed) {
          try {
            popup.close()
          } catch (error) {
            console.warn('[UserRechargeRecords] Failed to close WeChat popup after success:', error)
          }
        }
        if (wechatPaymentPopup === popup) {
          wechatPaymentPopup = null
        }
      }, 1500)
    }
  } catch (error) {
    console.warn('[UserRechargeRecords] Failed to notify WeChat popup:', error)
  }
}

const getRechargeDashboardUrl = () => {
  if (typeof window === 'undefined') {
    return '#/user-dashboard?tab=recharge'
  }
  const { origin = '' } = window.location
  let basePath = APP_CONFIG?.basePath || '/'
  if (!basePath.startsWith('/')) {
    basePath = `/${basePath}`
  }
  if (!basePath.endsWith('/')) {
    basePath = `${basePath}/`
  }
  return `${origin}${basePath}#/user-dashboard?tab=recharge`
}

const formatWechatExpiresLabel = (expiresAt) => {
  if (!expiresAt) return ''

  let timestamp = Number(expiresAt)
  if (Number.isNaN(timestamp)) {
    const parsed = Date.parse(expiresAt)
    timestamp = Number.isNaN(parsed) ? NaN : parsed
  } else if (timestamp < 1000000000000) {
    timestamp *= 1000
  }

  if (!Number.isFinite(timestamp)) {
    return ''
  }

  const date = new Date(timestamp)
  return `二维码有效期：${date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })}`
}

/* eslint-disable no-useless-escape */
const buildWechatQrPopupHtml = ({ qrHtml, expiresLabel, orderId }) => {
  const dashboardUrl = getRechargeDashboardUrl()
  const qrContent =
    qrHtml || '<div class="qr-placeholder">二维码加载失败，请返回上一页重新发起支付。</div>'
  const expiresMarkup = expiresLabel
    ? `<p class="expires" style="margin-top:8px;">${expiresLabel}</p>`
    : ''
  const statusMarkup =
    '<p id="wechat-status-message" class="status-message" style="display:none;"></p>'

  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>微信支付</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 24px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
          'Hiragino Sans GB', 'Microsoft Yahei', sans-serif;
        background: #f5f5f5;
        color: #111827;
      }
      .page {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .card {
        width: 100%;
        max-width: 420px;
        background: #ffffff;
        border-radius: 24px;
        padding: 32px 28px;
        box-shadow: 0 25px 40px -20px rgba(15, 23, 42, 0.4);
        text-align: center;
      }
      .badge {
        display: inline-flex;
        padding: 4px 12px;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 600;
        color: #059669;
        background: #ecfdf5;
        margin-bottom: 12px;
      }
      h1 {
        margin: 0;
        font-size: 22px;
        font-weight: 700;
        color: #0f172a;
      }
      .subtitle {
        margin-top: 8px;
        margin-bottom: 24px;
        font-size: 14px;
        color: #6b7280;
      }
      .qr-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f9fafb;
        border-radius: 20px;
        padding: 20px;
        border: 1px dashed #e5e7eb;
        min-height: 320px;
      }
      .qr-wrapper img,
      .qr-wrapper svg {
        width: 280px;
        height: 280px;
        object-fit: contain;
      }
      .qr-placeholder {
        width: 100%;
        font-size: 14px;
        color: #6b7280;
      }
      .action-btn {
        width: 100%;
        margin-top: 24px;
        background: #059669;
        color: white;
        border: none;
        border-radius: 16px;
        padding: 14px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s ease;
      }
      .action-btn:hover {
        background: #047857;
      }
      .expires {
        font-size: 13px;
        color: #6b7280;
      }
      .status-message {
        font-size: 13px;
        margin-top: 8px;
        font-weight: 600;
        display: none;
      }
      .status-message.success {
        color: #059669;
      }
      .status-message.failed {
        color: #dc2626;
      }
      .status-message.info {
        color: #4b5563;
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="card">
        <div class="badge">Stripe 微信支付</div>
        <h1>请使用微信扫码支付</h1>
        <p class="subtitle">在移动设备中打开微信扫一扫完成付款</p>
        <div class="qr-wrapper">
          ${qrContent}
        </div>
        ${expiresMarkup}
        ${statusMarkup}
      </div>
    </div>
    <script>
      (function () {
        const DASHBOARD_URL = ${JSON.stringify(dashboardUrl)};
        const ORDER_ID = ${JSON.stringify(orderId || '')};
        const statusElement = document.getElementById('wechat-status-message');

        const showStatus = function (variant, text) {
          if (!statusElement || !text) {
            return;
          }
          statusElement.textContent = text;
          statusElement.style.display = 'block';
          statusElement.className = 'status-message ' + variant;
        };

        const focusParentWindow = function () {
          try {
            if (window.opener && !window.opener.closed) {
              window.opener.focus();
            }
          } catch (error) {
            console.warn(error);
          }
        };

        const closeAndReturn = function () {
          focusParentWindow();
          window.close();
          setTimeout(function () {
            if (!window.closed) {
              window.location.href = DASHBOARD_URL;
            }
          }, 400);
        };

        window.addEventListener('message', function (event) {
          if (!event || event.source !== window.opener) {
            return;
          }
          const data = event.data || {};
          if (data.type !== 'wechat_order_status') {
            return;
          }
          if (ORDER_ID && data.orderId && data.orderId !== ORDER_ID) {
            return;
          }
          if (data.status === 'success') {
            showStatus('success', '支付成功，余额已到账，窗口即将关闭...');
            closeAndReturn();
          } else if (data.status === 'failed') {
            showStatus('failed', data.message || '支付未完成，请返回充值页重试');
          } else if (data.status === 'info' && data.message) {
            showStatus('info', data.message);
          }
        });
      })();
    <\/script>
  </body>
</html>`
}
/* eslint-enable no-useless-escape */

const currencyMap = {
  CNY: { symbol: '¥', label: '人民币' },
  USD: { symbol: '$', label: '美元' }
}

const displayCurrencyCode = computed(() =>
  (paymentStore.currency?.display || paymentStore.currency?.default || 'CNY').toUpperCase()
)

const exchangeRate = computed(() => paymentStore.currency?.exchangeRate || 7.1)

const discountRate = computed(() => {
  const raw = paymentStore.discountRate ?? paymentStore.currency?.discountRate ?? 1
  const value = parseFloat(raw)
  return Number.isFinite(value) && value > 0 ? value : 1
})

const currentCurrency = computed(() => displayCurrencyCode.value)

const currencySymbol = computed(
  () => currencyMap[currentCurrency.value]?.symbol || currencyMap.USD.symbol
)

const currencyDisplayName = computed(
  () => currencyMap[currentCurrency.value]?.label || currentCurrency.value
)

const formatNumber = (value, fractionDigits = 2) => {
  const numeric = Number.parseFloat(value)
  if (!Number.isFinite(numeric)) {
    return (0).toFixed(fractionDigits)
  }
  return numeric.toFixed(fractionDigits)
}

const formatRate = (value) => {
  const numeric = Number.parseFloat(value)
  return Number.isFinite(numeric) ? numeric.toFixed(2) : '0.00'
}

const formatDiscountRate = (value) => {
  const numeric = Number.parseFloat(value)
  return Number.isFinite(numeric) ? numeric.toFixed(4) : '0.0000'
}

const resolveCurrencySymbol = (currencyCode) => {
  const normalized = (currencyCode || '').toUpperCase()
  if (currencyMap[normalized]?.symbol) {
    return currencyMap[normalized].symbol
  }
  return normalized || '¥'
}

const formatSignedCurrency = (value, currencyCode, defaultCurrency = 'USD') => {
  const numeric = Number.parseFloat(value)
  if (!Number.isFinite(numeric)) {
    return ''
  }
  const symbol = resolveCurrencySymbol(currencyCode || defaultCurrency)
  const prefix = numeric >= 0 ? '+' : '-'
  return `${prefix}${symbol}${formatNumber(Math.abs(numeric))}`
}

const hasPaymentAmount = (record) => {
  if (!record || record.paymentAmount === undefined || record.paymentAmount === null) {
    return false
  }
  const numeric = Number.parseFloat(record.paymentAmount)
  return Number.isFinite(numeric)
}

const getRecordPaymentAmountText = (record) => {
  if (!hasPaymentAmount(record)) {
    return ''
  }
  return formatSignedCurrency(record.paymentAmount, record.paymentCurrency || 'CNY')
}

const getAmountColorClass = (value) => {
  const numeric = Number.parseFloat(value)
  if (!Number.isFinite(numeric)) {
    return 'text-gray-500 dark:text-gray-400'
  }
  return numeric >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
}

const calculatePayableCny = (amount) => {
  const numeric = parseFloat(amount)
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0
  }
  const rate = parseFloat(exchangeRate.value)
  if (!Number.isFinite(rate) || rate <= 0) {
    return 0
  }
  const discount = discountRate.value || 1
  return parseFloat((numeric * rate * discount).toFixed(2))
}

const minAmount = computed(() => {
  const minUsd = paymentStore.limits?.min || 1
  if (currentCurrency.value === 'CNY') {
    return parseFloat((minUsd * exchangeRate.value).toFixed(2))
  }
  return minUsd
})

const maxAmount = computed(() => {
  const maxUsd = paymentStore.limits?.max || 1000
  if (currentCurrency.value === 'CNY') {
    return parseFloat((maxUsd * exchangeRate.value).toFixed(2))
  }
  return maxUsd
})

const stripeConfig = computed(() => paymentStore.stripeConfig || {})

const stripeMinimumCny = computed(() => {
  const cfg = stripeConfig.value
  if (!cfg || !cfg.minConvertedAmount) {
    return 0
  }
  const rate = cfg.exchangeRateToCny || 1
  const value = cfg.minConvertedAmount * rate
  return Number.isFinite(value) ? parseFloat(value.toFixed(2)) : 0
})

const minWechatAmountCny = computed(() => {
  const stripeMin = Number(stripeMinimumCny.value) || 0
  return Math.max(WECHAT_MIN_CNY, stripeMin)
})

const minWechatAmountDisplay = computed(() => minWechatAmountCny.value.toFixed(2))

const convertedAmountHint = computed(() => {
  if (!customAmount.value) return ''
  const amount = parseFloat(customAmount.value)
  if (!Number.isFinite(amount) || amount <= 0) return ''
  const finalCny = calculatePayableCny(amount)
  const parts = [
    `${currencySymbol.value}${amount.toFixed(2)}`,
    `× ${formatRate(exchangeRate.value)}`
  ]
  if (Math.abs(discountRate.value - 1) > 0.0001) {
    parts.push(`× ${formatDiscountRate(discountRate.value)}`)
  }
  parts.push(`= ¥${formatNumber(finalCny)}`)
  return parts.join(' ')
})

const conversionFormulaHint = computed(() => {
  const base = `${currencySymbol.value}额度 × ${formatRate(exchangeRate.value)}`
  const extra =
    Math.abs(discountRate.value - 1) > 0.0001 ? ` × ${formatDiscountRate(discountRate.value)}` : ''
  return `系统将按照 ${base}${extra} 计算人民币实付金额`
})

const availablePaymentMethods = computed(() =>
  (paymentStore.paymentMethods || [])
    .filter((method) => !(method.provider === 'zpay' && method.method === 'wxpay'))
    .map((method) => {
      if (method.provider === 'stripe' && method.method === 'wechat_pay') {
        return {
          ...method,
          name: '微信'
        }
      }
      return method
    })
)

const totalPages = computed(() => Math.ceil(totalRecords.value / pageSize.value))

const formatPresetCny = (amount) => {
  const payable = calculatePayableCny(amount)
  return formatNumber(payable)
}

// 计算是否可以提交
const canSubmit = computed(() => {
  // 必须选择支付方式
  if (!selectedMethod.value) return false

  // 必须有金额（套餐或自定义）
  if (selectedPackage.value) return true
  if (customAmount.value && parseFloat(customAmount.value) > 0) return true

  return false
})

// 显示金额
const buildDisplayAmountLabel = (amountDisplay, payableCny) => {
  if (!Number.isFinite(amountDisplay) || amountDisplay <= 0) {
    return ''
  }
  return `${currencySymbol.value}${amountDisplay.toFixed(2)} (实付约 ¥${formatNumber(payableCny)})`
}

const displayAmount = computed(() => {
  if (selectedPackage.value) {
    return buildDisplayAmountLabel(
      selectedPackage.value.amountUsd,
      selectedPackage.value.payableAmountCny
    )
  }
  if (customAmount.value) {
    const amount = parseFloat(customAmount.value)
    if (!Number.isFinite(amount) || amount <= 0) return ''
    const payable = calculatePayableCny(amount)
    return buildDisplayAmountLabel(amount, payable)
  }
  return ''
})

// 选择套餐
const selectPackage = (pkg) => {
  selectedPackage.value = pkg
  selectedPresetId.value = pkg?.id || ''
  customAmount.value = '' // 清空自定义金额
}

const createPresetPackage = (amount) => {
  const numeric = Number(amount)
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null
  }
  const payableAmountCny = calculatePayableCny(numeric)
  return {
    id: `preset-${numeric}`,
    amountUsd: parseFloat(numeric.toFixed(2)),
    payableAmountCny,
    displayCurrency: currentCurrency.value,
    isPreset: true
  }
}

const selectPresetAmount = (amount, options = {}) => {
  if (amount === 'other') {
    selectedPresetId.value = OTHER_PRESET_ID
    selectedPackage.value = null
    return
  }

  const preset = createPresetPackage(amount)
  if (!preset) return
  selectPackage(preset)
  if (options.showModal !== false) {
    showCalculationModal(preset.amountUsd)
  }
}

const isPresetSelected = (amount) => {
  const presetId = `preset-${Number(amount)}`
  return selectedPresetId.value === presetId
}

const isOtherPresetSelected = computed(() => selectedPresetId.value === OTHER_PRESET_ID)
const shouldShowCustomAmount = computed(
  () => paymentStore.allowCustomAmount && isOtherPresetSelected.value
)

// 选择支付方式
const updateCurrencyByMethod = (method) => {
  const fallbackCurrency = (paymentStore.currency?.default || 'CNY').toUpperCase()
  if (!method) {
    paymentCurrency.value = fallbackCurrency
    return
  }
  const methodCurrency = method.currency ? method.currency.toUpperCase() : fallbackCurrency
  paymentCurrency.value = methodCurrency
}

const selectMethod = (method) => {
  if (!method) return
  selectedMethod.value = method
  updateCurrencyByMethod(method)
}

const isMethodSelected = (method) => {
  if (!selectedMethod.value) return false
  return (
    selectedMethod.value.provider === method.provider &&
    selectedMethod.value.method === method.method
  )
}

const isWechatQrDialog = computed(() => paymentDialogData.value?.wechatType === 'qr')
const isWechatRedirectDialog = computed(() => paymentDialogData.value?.wechatType === 'redirect')

const stopOrderPolling = () => {
  if (paymentPollingTimer.value) {
    clearInterval(paymentPollingTimer.value)
    paymentPollingTimer.value = null
  }
}

const stopCountdown = () => {
  if (paymentCountdownTimer.value) {
    clearInterval(paymentCountdownTimer.value)
    paymentCountdownTimer.value = null
  }
  paymentCountdown.value = ''
}

const formatCountdown = (expiresAt) => {
  if (!expiresAt) return ''
  const endsAt = expiresAt > 1000000000000 ? expiresAt : expiresAt * 1000
  const diff = Math.max(0, endsAt - Date.now())
  if (diff <= 0) {
    return '已过期'
  }
  const minutes = Math.floor(diff / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)
  return `${minutes}分${seconds.toString().padStart(2, '0')}秒`
}

const startCountdown = (expiresAt) => {
  stopCountdown()
  if (!expiresAt) return

  const updateCountdown = () => {
    paymentCountdown.value = formatCountdown(expiresAt)
    if (paymentCountdown.value === '已过期') {
      stopCountdown()
    }
  }

  updateCountdown()
  paymentCountdownTimer.value = setInterval(updateCountdown, 1000)
}

const handleOrderStatusUpdate = (order) => {
  if (!order) return
  if (order.status === 'paid') {
    notifyWechatPopup('success', order)
    paymentStatus.value = 'success'
    stopOrderPolling()
    stopCountdown()
    showToast(paymentSuccessMessage, 'success')
    loadBalanceInfo()
    loadRecords()
  } else if (order.status === 'failed') {
    const failMessage = order.failReason || paymentIncompleteMessage
    notifyWechatPopup('failed', order, { message: failMessage })
    paymentStatus.value = 'failed'
    stopOrderPolling()
    stopCountdown()
    showToast(failMessage, 'error')
  }
}

const startOrderPolling = (orderId) => {
  if (!orderId) return
  stopOrderPolling()

  const poll = async () => {
    try {
      const latest = await paymentStore.getOrder(orderId)
      handleOrderStatusUpdate(latest)
    } catch (error) {
      console.error('Failed to poll payment order:', error)
    }
  }

  poll()
  paymentPollingTimer.value = setInterval(poll, 5000)
}

const closePaymentDialog = () => {
  showPaymentDialog.value = false
  paymentDialogData.value = null
  paymentStatus.value = 'pending'
  manualCheckLoading.value = false
  refreshPaymentLoading.value = false
  stopOrderPolling()
  stopCountdown()
  closeWechatPopupWindow()
}

const openWechatPaymentWindow = (orderResponse) => {
  const paymentData = orderResponse.paymentData || orderResponse.payment || {}
  const wechat = paymentData.wechat || {}
  const orderId = resolveOrderId(orderResponse)
  if (!wechat) {
    return false
  }

  if (wechat.type === 'redirect' && wechat.url) {
    window.location.href = wechat.url
    return true
  }

  closeWechatPopupWindow()

  const popup = window.open('', '_blank')
  if (!popup) {
    return false
  }
  wechatPaymentPopup = popup

  const qrImageUrl = wechat.imageUrlPng || ''
  const qrSvg = wechat.imageUrlSvg || ''

  let qrHtml = ''
  if (qrImageUrl) {
    qrHtml =
      `<img src="${qrImageUrl}" alt="微信支付二维码" ` +
      'style="width:280px;height:280px;object-fit:contain;" />'
  } else if (qrSvg) {
    qrHtml = `<div style="width:280px;height:280px;">${qrSvg}</div>`
  }

  const expiresLabel = formatWechatExpiresLabel(paymentData.expiresAt || wechat.expiresAt || null)
  const html = buildWechatQrPopupHtml({ qrHtml, expiresLabel, orderId })

  popup.document.open()
  popup.document.write(html)
  popup.document.close()
  return true
}

const openWechatPaymentDialog = (orderResponse) => {
  const paymentData = orderResponse.paymentData || orderResponse.payment || {}
  const wechat = paymentData.wechat || {}
  const orderId = resolveOrderId(orderResponse)

  if (!orderId || !wechat) {
    showToast('无法获取微信支付信息，请稍后重试', 'error')
    return
  }

  closeWechatPopupWindow()
  stopOrderPolling()
  stopCountdown()

  paymentDialogData.value = {
    orderId,
    qrImageUrl: wechat.imageUrlPng || '',
    qrSvgUrl: wechat.imageUrlSvg || '',
    redirectUrl: wechat.url || '',
    expiresAt: paymentData.expiresAt || wechat.expiresAt || null,
    paymentIntentId: paymentData.paymentIntentId || '',
    wechatType: wechat.type || paymentData.nextActionType || 'qr'
  }
  paymentStatus.value = 'pending'
  showPaymentDialog.value = true

  if (paymentDialogData.value.expiresAt) {
    startCountdown(paymentDialogData.value.expiresAt)
  }
  startOrderPolling(orderId)
}

const checkOrderStatus = async () => {
  if (!paymentDialogData.value?.orderId) return
  manualCheckLoading.value = true
  try {
    const latest = await paymentStore.getOrder(paymentDialogData.value.orderId)
    handleOrderStatusUpdate(latest)
    if (latest.status === 'pending') {
      showToast('订单仍在等待支付，请完成微信支付后重试', 'info')
    }
  } catch (error) {
    console.error('Failed to check payment status:', error)
    showToast('查询订单状态失败，请稍后重试', 'error')
  } finally {
    manualCheckLoading.value = false
  }
}

const regenerateWechatPayment = async () => {
  if (!canSubmit.value) return
  refreshPaymentLoading.value = true
  try {
    // 关闭当前弹窗并重新创建订单
    closePaymentDialog()
    await createPaymentOrder()
  } finally {
    refreshPaymentLoading.value = false
  }
}

const showCalculationModal = (amountDisplay) => {
  const numeric = parseFloat(amountDisplay)
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return
  }
  calculationModal.displayAmount = parseFloat(numeric.toFixed(2))
  calculationModal.exchangeRate = exchangeRate.value
  calculationModal.discountRate = discountRate.value
  calculationModal.finalAmountCny = calculatePayableCny(numeric)
  calculationModal.visible = true
}

const closeCalculationModal = () => {
  calculationModal.visible = false
}

const handleCustomAmountBlur = () => {
  const numeric = parseFloat(customAmount.value)
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return
  }
  showCalculationModal(numeric)
}

// 自定义金额变化时清空套餐选择
const onCustomAmountChange = () => {
  if (customAmount.value) {
    selectedPackage.value = null
  }
  selectedPresetId.value = OTHER_PRESET_ID
}

// 创建支付订单
const createPaymentOrder = async () => {
  if (!canSubmit.value || !selectedMethod.value) return

  try {
    let amount
    let packageId = null
    let displayAmountValue = null

    if (selectedPackage.value) {
      displayAmountValue = selectedPackage.value.amountUsd
      packageId = selectedPackage.value.isPreset ? null : selectedPackage.value.id
      amount =
        paymentCurrency.value === 'CNY'
          ? selectedPackage.value.payableAmountCny
          : selectedPackage.value.amountUsd
    } else {
      const parsedDisplay = parseFloat(customAmount.value)
      if (!Number.isFinite(parsedDisplay) || parsedDisplay <= 0) {
        showToast('请输入有效的充值金额', 'error')
        return
      }
      displayAmountValue = parseFloat(parsedDisplay.toFixed(2))
      amount =
        paymentCurrency.value === 'CNY'
          ? calculatePayableCny(displayAmountValue)
          : displayAmountValue
    }

    if (!Number.isFinite(displayAmountValue) || displayAmountValue <= 0) {
      showToast('请选择充值金额', 'error')
      return
    }

    const normalizedCurrency = (paymentCurrency.value || 'CNY').toUpperCase()
    const payableAmountCny =
      normalizedCurrency === 'CNY' ? amount : calculatePayableCny(displayAmountValue)

    if (
      selectedMethod.value.provider === 'stripe' &&
      selectedMethod.value.method === 'wechat_pay'
    ) {
      const minCny = minWechatAmountCny.value
      if (payableAmountCny < minCny) {
        showToast(`微信支付最少需要充值 ¥${minWechatAmountDisplay.value}`, 'error')
        return
      }
    }

    const order = await paymentStore.createOrder({
      amount,
      currency: normalizedCurrency,
      provider: selectedMethod.value.provider,
      paymentMethod: selectedMethod.value.method,
      packageId,
      displayAmount: displayAmountValue,
      displayCurrency: currentCurrency.value
    })

    if (
      selectedMethod.value.provider === 'stripe' &&
      order.paymentData?.type === 'wechat_pay' &&
      order.paymentData.wechat
    ) {
      const orderId = resolveOrderId(order)
      if (!orderId) {
        showToast('未能获取订单编号，请稍后重试', 'error')
        return
      }

      startOrderPolling(orderId)
      const opened = openWechatPaymentWindow(order)
      if (opened) {
        showToast('已打开微信支付页面，请完成付款', 'success')
        return
      }
      showToast('浏览器阻止打开新页面，请允许弹窗或手动扫码', 'warning')
      openWechatPaymentDialog(order)
      return
    }

    if (order.payUrl) {
      showToast('即将跳转到支付页面...', 'success')
      window.location.href = order.payUrl
      return
    }

    showToast('未获取到支付信息，请稍后重试', 'error')
  } catch (error) {
    console.error('Failed to create payment order:', error)
    showToast(error.response?.data?.error || error.message || '创建订单失败', 'error')
  }
}

// 加载支付配置
const loadPaymentConfig = async () => {
  try {
    await paymentStore.loadConfig()
    const methods = availablePaymentMethods.value
    if (methods.length > 0) {
      selectedMethod.value = methods[0]
      updateCurrencyByMethod(selectedMethod.value)
    } else {
      selectedMethod.value = null
    }

    if (!selectedPackage.value && !customAmount.value && presetAmounts.length > 0) {
      selectPresetAmount(presetAmounts[0], { showModal: false })
    }
  } catch (error) {
    console.error('Failed to load payment config:', error)
  }
}

watch(
  () => selectedMethod.value,
  (method) => {
    updateCurrencyByMethod(method)
  }
)

watch(
  availablePaymentMethods,
  (methods) => {
    if (!methods || methods.length === 0) {
      selectedMethod.value = null
      return
    }
    const currentExists = methods.some(
      (method) =>
        selectedMethod.value &&
        method.provider === selectedMethod.value.provider &&
        method.method === selectedMethod.value.method
    )
    if (!currentExists) {
      selectedMethod.value = methods[0]
      updateCurrencyByMethod(selectedMethod.value)
    }
  },
  { immediate: false }
)

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getTypeName = (type) => {
  const typeMap = {
    manual: '手动充值',
    payment: '在线充值',
    reward: '邀请奖励',
    refund: '退款',
    adjustment: '调整'
  }
  return typeMap[type] || type
}

const getTypeClass = (type) => {
  const classMap = {
    manual: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    payment: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
    reward: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
    refund: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
    adjustment: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'
  }
  return classMap[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}

const loadRecords = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value
    }
    if (typeFilter.value) {
      params.type = typeFilter.value
    }

    const result = await userStore.getRechargeRecords(params)
    records.value = result.records || []
    totalRecords.value = result.total || 0
  } catch (error) {
    console.error('Failed to load recharge records:', error)
    showToast('加载充值记录失败', 'error')
  } finally {
    loading.value = false
  }
}

const loadBalanceInfo = async () => {
  try {
    balanceInfo.value = await userStore.getUserBalance()
  } catch (error) {
    console.error('Failed to load balance info:', error)
  }
}

const goToPage = (page) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  loadRecords()
}

const reloadAfterReturn = async () => {
  await Promise.all([loadBalanceInfo(), loadRecords()])
  closePaymentDialog()
}

const handleTypeFilterChange = () => {
  currentPage.value = 1
  loadRecords()
}

defineExpose({
  reloadAfterReturn
})

const exportRecords = async () => {
  if (records.value.length === 0) {
    showToast('没有可导出的记录', 'warning')
    return
  }

  exporting.value = true
  try {
    // 构建 CSV 内容
    const headers = [
      '时间',
      '类型',
      '支付金额',
      '充值额度',
      '充值前余额',
      '充值后余额',
      '操作者',
      '备注'
    ]
    const rows = records.value.map((record) => [
      formatDate(record.createdAt),
      getTypeName(record.type),
      getRecordPaymentAmountText(record) || '-',
      `$${record.amount.toFixed(2)}`,
      `$${record.balanceBefore?.toFixed(2) || '0.00'}`,
      `$${record.balanceAfter?.toFixed(2) || '0.00'}`,
      record.source === 'dingtalk-bot' ? '-' : record.operatorName || '-',
      record.source === 'dingtalk-bot' ? '-' : record.remark || '-'
    ])

    // 添加 BOM 以支持 Excel 正确识别 UTF-8
    const BOM = '\uFEFF'
    const csvContent = BOM + [headers, ...rows].map((row) => row.join(',')).join('\n')

    // 创建下载
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `充值记录_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    showToast('导出成功', 'success')
  } catch (error) {
    console.error('Export failed:', error)
    showToast('导出失败', 'error')
  } finally {
    exporting.value = false
  }
}

onMounted(() => {
  loadBalanceInfo()
  loadRecords()
  loadPaymentConfig()
})

onBeforeUnmount(() => {
  stopOrderPolling()
  stopCountdown()
  closeWechatPopupWindow()
})
</script>
