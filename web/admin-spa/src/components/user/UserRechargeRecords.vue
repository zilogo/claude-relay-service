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
          <!-- [已禁用] 套餐选择 - 暂时不需要套餐功能，仅支持自定义金额充值 -->
          <!--
          <div class="mb-6">
            <label class="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
              选择充值套餐
            </label>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                v-for="pkg in paymentStore.packages"
                :key="pkg.id"
                class="relative rounded-xl border-2 p-4 text-left transition-all hover:border-[#D97757] hover:shadow-md"
                :class="
                  selectedPackage?.id === pkg.id
                    ? 'border-[#D97757] bg-[#D97757]/5 dark:bg-[#D97757]/10'
                    : 'border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-700'
                "
                @click="selectPackage(pkg)"
              >
                <div class="mb-1 text-lg font-bold text-gray-900 dark:text-white">
                  ¥{{ pkg.amountCny }}
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400">≈ ${{ pkg.amountUsd }}</div>
                <div class="mt-2 text-xs font-medium text-[#D97757]">{{ pkg.name }}</div>
                <div
                  v-if="selectedPackage?.id === pkg.id"
                  class="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#D97757] text-white"
                >
                  <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
              </button>
            </div>
          </div>
          -->

          <!-- 自定义金额 -->
          <div v-if="paymentStore.allowCustomAmount" class="mb-6">
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
                  @input="onCustomAmountChange"
                />
              </div>
              <!-- [已禁用] 货币选择 - 暂时只支持人民币充值 -->
              <!--
              <select
                v-model="customCurrency"
                class="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-gray-900 transition-colors focus:border-[#D97757] focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="CNY">人民币 (¥)</option>
                <option value="USD">美元 ($)</option>
              </select>
              -->
            </div>
            <p v-if="convertedAmountHint" class="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {{ convertedAmountHint }}
            </p>
            <p v-if="exchangeRateHint" class="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {{ exchangeRateHint }}
            </p>
          </div>

          <!-- 支付方式选择 -->
          <div class="mb-6">
            <label class="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
              选择支付方式
            </label>
            <div class="flex flex-wrap gap-3">
              <button
                v-for="method in paymentStore.paymentMethods"
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
                  v-else-if="method.method === 'wxpay'"
                  class="text-lg font-bold text-green-500"
                >
                  <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295.095 0 .182-.05.248-.126l1.89-1.11c.164-.096.359-.144.554-.126.559.08 1.127.126 1.701.126.36 0 .714-.017 1.063-.05A6.601 6.601 0 018.1 14.12c0-3.81 3.693-6.897 8.25-6.897.275 0 .547.012.816.035C16.166 4.228 12.713 2.188 8.691 2.188zM5.336 6.83c.673 0 1.218.544 1.218 1.215s-.545 1.215-1.218 1.215c-.674 0-1.22-.544-1.22-1.215s.546-1.215 1.22-1.215zm6.618 0c.673 0 1.218.544 1.218 1.215s-.545 1.215-1.218 1.215c-.673 0-1.218-.544-1.218-1.215s.545-1.215 1.218-1.215zM16.35 8.508c-3.937 0-7.129 2.71-7.129 6.05s3.192 6.05 7.13 6.05c.71 0 1.397-.087 2.05-.249a.513.513 0 01.38.065l1.416.832c.048.05.109.09.18.09.112 0 .203-.094.203-.21 0-.052-.02-.102-.034-.15l-.288-1.11a.453.453 0 01.157-.478c1.37-1.02 2.25-2.572 2.25-4.302 0-3.34-3.191-6.05-7.128-6.05zm-2.742 3.378c.5 0 .906.404.906.903s-.405.902-.906.902-.907-.403-.907-.902.406-.903.907-.903zm5.465 0c.5 0 .907.404.907.903s-.406.902-.907.902c-.5 0-.906-.403-.906-.902s.406-.903.906-.903z"
                    />
                  </svg>
                </span>
                <span
                  v-else-if="method.provider === 'stripe'"
                  class="text-lg font-bold text-purple-500"
                >
                  <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M4 7a3 3 0 013-3h10a3 3 0 013 3v10a3 3 0 01-3 3H7a3 3 0 01-3-3V7zm3-1a1 1 0 00-1 1v2h12V7a1 1 0 00-1-1H7zm11 5H6v6a1 1 0 001 1h10a1 1 0 001-1v-6z"
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
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    {{ getMethodInfo(method) }}
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div
            v-if="isStripeSelected"
            class="mb-6 rounded-xl border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-700 dark:border-blue-800/70 dark:bg-blue-900/30 dark:text-blue-100"
          >
            Stripe 支付使用美元结算，支持 Visa / Mastercard / JCB 等国际信用卡。创建订单后将跳转至
            Stripe Checkout 页面完成付款。
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
                金额
              </th>
              <th
                class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                余额变化
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
                  {{ record.operatorName || '-' }}
                </div>
              </td>
              <td class="max-w-xs truncate px-6 py-4">
                <div class="text-sm text-gray-600 dark:text-gray-400" :title="record.remark">
                  {{ record.remark || '-' }}
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
              支付成功，余额即将更新。您可以关闭此窗口继续使用服务。
            </div>
            <div
              v-else-if="paymentStatus === 'failed'"
              class="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200"
            >
              支付失败，请重新创建订单或稍后再试。
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { usePaymentStore } from '@/stores/payment'
import { showToast } from '@/utils/toast'

const userStore = useUserStore()
const paymentStore = usePaymentStore()

const loading = ref(true)
const exporting = ref(false)
const records = ref([])
const balanceInfo = ref(null)
const totalRecords = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

// 支付相关状态
const selectedPackage = ref(null)
const selectedMethod = ref(null)
const customAmount = ref('')
const customCurrency = ref('CNY')
const showPaymentDialog = ref(false)
const paymentDialogData = ref(null)
const paymentStatus = ref('pending')
const paymentCountdown = ref('')
const paymentPollingTimer = ref(null)
const paymentCountdownTimer = ref(null)
const manualCheckLoading = ref(false)
const refreshPaymentLoading = ref(false)

const currencyMap = {
  CNY: { symbol: '¥', label: '人民币' },
  USD: { symbol: '$', label: '美元' }
}

const exchangeRate = computed(() => paymentStore.currency?.exchangeRate || 7.2)

const currentCurrency = computed(() =>
  (customCurrency.value || paymentStore.currency?.default || 'CNY').toUpperCase()
)

const currencySymbol = computed(
  () => currencyMap[currentCurrency.value]?.symbol || currencyMap.USD.symbol
)

const currencyDisplayName = computed(
  () => currencyMap[currentCurrency.value]?.label || currentCurrency.value
)

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

const convertedAmountHint = computed(() => {
  if (!customAmount.value) return ''
  const amount = parseFloat(customAmount.value)
  if (!Number.isFinite(amount) || amount <= 0) return ''
  if (currentCurrency.value === 'CNY') {
    return `约等于 $${(amount / exchangeRate.value).toFixed(2)}`
  }
  return `约等于 ¥${(amount * exchangeRate.value).toFixed(2)}`
})

const exchangeRateHint = computed(() => {
  if (!exchangeRate.value) return ''
  return `当前系统折算：1 USD ≈ ¥${exchangeRate.value.toFixed(2)}`
})

const totalPages = computed(() => Math.ceil(totalRecords.value / pageSize.value))

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
const displayAmount = computed(() => {
  if (selectedPackage.value) {
    return `¥${selectedPackage.value.amountCny} (≈$${selectedPackage.value.amountUsd})`
  }
  if (customAmount.value) {
    const amount = parseFloat(customAmount.value)
    if (!Number.isFinite(amount) || amount <= 0) return ''
    if (currentCurrency.value === 'CNY') {
      return `¥${amount.toFixed(2)} (≈$${(amount / exchangeRate.value).toFixed(2)})`
    }
    return `$${amount.toFixed(2)} (≈¥${(amount * exchangeRate.value).toFixed(2)})`
  }
  return ''
})

// 选择套餐
// 预留套餐功能（前端暂未开放入口）
// eslint-disable-next-line no-unused-vars
const selectPackage = (pkg) => {
  selectedPackage.value = pkg
  customAmount.value = '' // 清空自定义金额
}

// 选择支付方式
const updateCurrencyByMethod = (method) => {
  const fallbackCurrency = (paymentStore.currency?.default || 'CNY').toUpperCase()
  if (!method) {
    customCurrency.value = fallbackCurrency
    return
  }
  const methodCurrency = method.currency ? method.currency.toUpperCase() : fallbackCurrency
  customCurrency.value = methodCurrency
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

const getMethodInfo = (method) => {
  const currency = (method.currency || paymentStore.currency?.default || 'CNY').toUpperCase()
  if (method.provider === 'stripe') {
    return `Stripe 微信支付 · 结算货币：${currency}`
  }
  if (method.provider === 'zpay' && method.method === 'alipay') {
    return `支付宝 · 结算货币：${currency}`
  }
  if (method.provider === 'zpay' && method.method === 'wxpay') {
    return `微信支付 · 结算货币：${currency}`
  }
  return `结算货币：${currency}`
}

const isStripeSelected = computed(() => selectedMethod.value?.provider === 'stripe')
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
    paymentStatus.value = 'success'
    stopOrderPolling()
    stopCountdown()
    showToast('支付成功，余额已到账', 'success')
    loadBalanceInfo()
    loadRecords()
  } else if (order.status === 'failed') {
    paymentStatus.value = 'failed'
    stopOrderPolling()
    stopCountdown()
    if (order.failReason) {
      showToast(order.failReason, 'error')
    }
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
}

const openWechatPaymentDialog = (orderResponse) => {
  const paymentData = orderResponse.paymentData || orderResponse.payment || {}
  const wechat = paymentData.wechat || {}
  const orderId = orderResponse.orderId || orderResponse.id

  if (!orderId || !wechat) {
    showToast('无法获取微信支付信息，请稍后重试', 'error')
    return
  }

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

// 自定义金额变化时清空套餐选择
const onCustomAmountChange = () => {
  if (customAmount.value) {
    selectedPackage.value = null
  }
}

// 创建支付订单
const createPaymentOrder = async () => {
  if (!canSubmit.value) return

  try {
    let amount, currency, packageId

    if (selectedPackage.value) {
      amount = selectedPackage.value.amountCny
      currency = 'CNY'
      packageId = selectedPackage.value.id
    } else {
      amount = parseFloat(customAmount.value)
      currency = customCurrency.value
      packageId = null
    }

    const order = await paymentStore.createOrder({
      amount,
      currency,
      provider: selectedMethod.value.provider,
      paymentMethod: selectedMethod.value.method,
      packageId
    })

    if (order.paymentData?.type === 'wechat_pay' && order.paymentData.wechat) {
      showToast('订单创建成功，请使用微信完成支付', 'success')
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
    customCurrency.value = (paymentStore.currency?.default || 'CNY').toUpperCase()
    // 默认选择第一个支付方式
    if (paymentStore.paymentMethods.length > 0) {
      selectedMethod.value = paymentStore.paymentMethods[0]
      updateCurrencyByMethod(selectedMethod.value)
    }
  } catch (error) {
    console.error('Failed to load payment config:', error)
  }
}

watch(
  () => selectedMethod.value,
  (method) => {
    if (method) {
      updateCurrencyByMethod(method)
    }
  }
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
    payment: '在线支付',
    refund: '退款',
    adjustment: '调整'
  }
  return typeMap[type] || type
}

const getTypeClass = (type) => {
  const classMap = {
    manual: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    payment: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
    refund: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
    adjustment: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'
  }
  return classMap[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}

const loadRecords = async () => {
  loading.value = true
  try {
    const result = await userStore.getRechargeRecords({
      page: currentPage.value,
      pageSize: pageSize.value
    })
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

const exportRecords = async () => {
  if (records.value.length === 0) {
    showToast('没有可导出的记录', 'warning')
    return
  }

  exporting.value = true
  try {
    // 构建 CSV 内容
    const headers = ['时间', '类型', '金额', '充值前余额', '充值后余额', '操作者', '备注']
    const rows = records.value.map((record) => [
      formatDate(record.createdAt),
      getTypeName(record.type),
      `$${record.amount.toFixed(2)}`,
      `$${record.balanceBefore?.toFixed(2) || '0.00'}`,
      `$${record.balanceAfter?.toFixed(2) || '0.00'}`,
      record.operatorName || '-',
      record.remark || '-'
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
})
</script>
