<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">User Management</h1>
        <p class="mt-2 text-sm text-gray-700 dark:text-gray-300">
          Manage users, their API keys, and view usage statistics
        </p>
      </div>
      <div
        class="mt-4 flex flex-col gap-2 sm:ml-16 sm:mt-0 sm:flex-none sm:flex sm:flex-row sm:items-center sm:space-x-3"
      >
        <button
          class="inline-flex items-center justify-center rounded-md border border-[#D97757] bg-white px-4 py-2 text-sm font-medium text-[#D97757] shadow-sm hover:bg-[#fff3ee] focus:outline-none focus:ring-2 focus:ring-[#D97757] focus:ring-offset-2 disabled:opacity-50"
          :disabled="exportLoading || loading"
          @click="exportUsers"
        >
          <svg class="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            />
          </svg>
          <span>{{ exportLoading ? '导出中...' : '导出 CSV' }}</span>
        </button>
        <button
          class="inline-flex items-center justify-center rounded-md border border-transparent bg-[#D97757] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#c86847] focus:outline-none focus:ring-2 focus:ring-[#D97757] focus:ring-offset-2 disabled:opacity-50 sm:w-auto"
          :disabled="loading"
          @click="loadUsers"
        >
          <svg class="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            />
          </svg>
          Refresh
        </button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      <div class="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg
                class="h-6 w-6 text-[#D97757]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                />
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="truncate text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Users
                </dt>
                <dd class="text-lg font-medium text-gray-900 dark:text-white">
                  {{ userStats?.totalUsers || 0 }}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div class="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg
                class="h-6 w-6 text-green-500"
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
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="truncate text-sm font-medium text-gray-500 dark:text-gray-400">
                  Active Users
                </dt>
                <dd class="text-lg font-medium text-gray-900 dark:text-white">
                  {{ userStats?.activeUsers || 0 }}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div class="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg
                class="h-6 w-6 text-purple-500"
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
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="truncate text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total API Keys
                </dt>
                <dd class="text-lg font-medium text-gray-900 dark:text-white">
                  {{ userStats?.totalApiKeys || 0 }}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div class="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg
                class="h-6 w-6 text-yellow-500"
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
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="truncate text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Cost
                </dt>
                <dd class="text-lg font-medium text-gray-900 dark:text-white">
                  ${{ (userStats?.totalUsage?.totalCost || 0).toFixed(4) }}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Search and Filters -->
    <div class="rounded-lg bg-white shadow dark:bg-gray-800">
      <div class="px-4 py-5 sm:p-6">
        <div class="sm:flex sm:items-center sm:justify-between">
          <div class="space-y-4 sm:flex sm:items-center sm:space-x-4 sm:space-y-0">
            <!-- Search -->
            <div class="min-w-0 flex-1">
              <div class="relative rounded-md shadow-sm">
                <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg
                    class="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                </div>
                <input
                  v-model="searchQuery"
                  class="block w-full rounded-md border-gray-300 pl-10 focus:border-[#D97757] focus:ring-[#D97757] dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                  placeholder="Search users..."
                  type="search"
                  @input="debouncedSearch"
                />
              </div>
            </div>

            <!-- Role Filter -->
            <div>
              <select
                v-model="selectedRole"
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#D97757] focus:ring-[#D97757] dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                @change="handleFilterChange"
              >
                <option value="">All Roles</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <!-- Status Filter -->
            <div>
              <select
                v-model="selectedStatus"
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#D97757] focus:ring-[#D97757] dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                @change="handleFilterChange"
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Disabled</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Users Table -->
    <div class="overflow-hidden bg-white shadow dark:bg-gray-800 sm:rounded-md">
      <div class="border-b border-gray-200 px-4 py-5 dark:border-gray-700 sm:px-6">
        <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white">
          Users
          <span v-if="!loading" class="text-sm text-gray-500 dark:text-gray-400">
            {{ paginationSummary }}
          </span>
        </h3>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="py-12 text-center">
        <svg
          class="mx-auto h-8 w-8 animate-spin text-[#D97757]"
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
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
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading users...</p>
      </div>

      <!-- Users List -->
      <ul v-else-if="users.length > 0" class="divide-y divide-gray-200 dark:divide-gray-700" role="list">
        <li v-for="user in users" :key="user.id" class="px-6 py-4">
          <div class="flex items-center justify-between">
            <div class="flex min-w-0 flex-1 items-center">
              <div class="flex-shrink-0">
                <div
                  class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300 dark:bg-gray-600"
                >
                  <svg
                    class="h-6 w-6 text-gray-600 dark:text-gray-400"
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
              <div class="ml-4 min-w-0 flex-1">
                <div class="flex items-center">
                  <p class="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {{ user.displayName || user.username }}
                  </p>
                  <div class="ml-2 flex items-center space-x-2">
                    <span
                      :class="[
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        user.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      ]"
                    >
                      {{ user.isActive ? 'Active' : 'Disabled' }}
                    </span>
                    <span
                      :class="[
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                          : 'bg-[#E6A87C]/20 text-[#D97757] dark:bg-[#D97757]/20 dark:text-[#E6A87C]'
                      ]"
                    >
                      {{ user.role }}
                    </span>
                    <span
                      :class="[
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        (user.availableBalance ?? user.balance ?? 0) > 0
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      ]"
                    >
                      Available ${{ formatCurrency(user.availableBalance ?? user.balance ?? 0, 4) }}
                    </span>
                  </div>
                </div>
                <div
                  class="mt-1 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400"
                >
                  <span>@{{ user.username }}</span>
                  <span v-if="user.email">{{ user.email }}</span>
                  <span>{{ user.apiKeyCount || 0 }} API keys</span>
                  <span v-if="user.lastLoginAt"
                    >Last login: {{ formatDate(user.lastLoginAt) }}</span
                  >
                  <span v-else>Never logged in</span>
                </div>
                <div
                  v-if="user.totalUsage"
                  class="mt-1 flex items-center space-x-4 text-xs text-gray-400 dark:text-gray-500"
                >
                  <span>{{ formatNumber(user.totalUsage.requests || 0) }} requests</span>
                  <span>${{ (user.totalUsage.totalCost || 0).toFixed(4) }} total cost</span>
                </div>
                <div
                  v-if="user.referralStats"
                  class="mt-2 flex flex-wrap items-center gap-3 text-xs text-amber-700 dark:text-amber-200"
                >
                  <span>邀请 {{ user.referralStats.totalInvites || 0 }} 人</span>
                  <span>达标 {{ user.referralStats.qualifiedInvites || 0 }} 人</span>
                  <span>奖励 ${{ formatCurrency(user.referralStats.totalRewardUsd || 0, 2) }}</span>
                </div>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <!-- View Usage Stats -->
              <button
                class="inline-flex items-center rounded border border-transparent p-1 text-gray-400 hover:text-[#D97757]"
                title="View Usage Stats"
                @click="viewUserStats(user)"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
              </button>

              <!-- View Referral Details -->
              <button
                v-if="user.referralStats"
                class="inline-flex items-center rounded border border-transparent p-1 text-amber-600 hover:text-amber-500 dark:text-amber-200"
                title="View Referral Details"
                @click="openReferralModal(user)"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M13 7h6m-6 4h4m-4 4h6M4 7h6m-6 4h6m-6 4h6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
              </button>

              <!-- Disable User API Keys -->
              <button
                class="inline-flex items-center rounded border border-transparent p-1 text-gray-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="user.apiKeyCount === 0"
                title="Disable All API Keys"
                @click="disableUserApiKeys(user)"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18 12M6 6l12 12"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
              </button>

              <!-- Toggle User Status -->
              <button
                :class="[
                  'inline-flex items-center rounded border border-transparent p-1',
                  user.isActive
                    ? 'text-gray-400 hover:text-red-600'
                    : 'text-gray-400 hover:text-green-600'
                ]"
                :title="user.isActive ? 'Disable User' : 'Enable User'"
                @click="toggleUserStatus(user)"
              >
                <svg
                  v-if="user.isActive"
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18 12M6 6l12 12"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
                <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
              </button>

              <!-- Recharge Balance -->
              <button
                class="inline-flex items-center rounded border border-transparent p-1 text-gray-400 hover:text-emerald-600"
                title="Recharge Balance"
                @click="openRechargeModal(user)"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
              </button>

              <!-- Deduct Balance -->
              <button
                class="inline-flex items-center rounded border border-transparent p-1 text-gray-400 hover:text-red-600"
                title="Deduct Balance"
                @click="openDeductModal(user)"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
              </button>

              <!-- Change Role -->
              <button
                class="inline-flex items-center rounded border border-transparent p-1 text-gray-400 hover:text-purple-600"
                title="Change Role"
                @click="changeUserRole(user)"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
              </button>
            </div>
          </div>
        </li>
      </ul>

      <!-- Empty State -->
      <div v-else class="py-12 text-center">
        <svg
          class="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
          />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No users found</h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {{
            searchQuery ? 'No users match your search criteria.' : 'No users have been created yet.'
          }}
        </p>
      </div>
      <div
        v-if="!loading && pagination.total > 0"
        class="flex flex-col border-t border-gray-200 px-6 py-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          Showing {{ paginationRange.start }}-{{ paginationRange.end }} of {{ pagination.total }} users
        </div>
        <div
          class="mt-4 flex flex-col space-y-4 sm:mt-0 sm:flex-row sm:items-center sm:space-x-6 sm:space-y-0"
        >
          <div class="flex items-center space-x-2">
            <span>Rows per page</span>
            <select
              v-model.number="pagination.limit"
              class="rounded-md border-gray-300 text-sm shadow-sm focus:border-[#D97757] focus:ring-[#D97757] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              @change="handlePageSizeChange"
            >
              <option v-for="size in pageSizeOptions" :key="size" :value="size">
                {{ size }}
              </option>
            </select>
          </div>
          <div class="flex items-center space-x-3">
            <button
              class="inline-flex items-center rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#D97757] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              :disabled="pagination.page <= 1"
              @click="goToPreviousPage"
            >
              Previous
            </button>
            <span>Page {{ pagination.page }} / {{ pagination.totalPages || 1 }}</span>
            <button
              class="inline-flex items-center rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#D97757] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              :disabled="pagination.totalPages === 0 || pagination.page >= pagination.totalPages"
              @click="goToNextPage"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- User Usage Stats Modal -->
    <UserUsageStatsModal
      :show="showStatsModal"
      :user="selectedUser"
      @close="showStatsModal = false"
    />

    <!-- Referral Details Modal -->
    <div
      v-if="showReferralModal"
      aria-modal="true"
      class="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
    >
      <div class="flex min-h-screen items-end justify-center px-4 pb-10 pt-4 text-center sm:block sm:p-0">
        <div
          aria-hidden="true"
          class="fixed inset-0 bg-gray-900/60 transition-opacity"
          @click="closeReferralModal"
        ></div>

        <div
          class="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-2xl transition-all dark:bg-gray-900 sm:my-8 sm:w-full sm:max-w-4xl sm:align-middle"
        >
          <div class="bg-white px-6 py-5 dark:bg-gray-900">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                  邀请详情 - {{ referralModalUser?.displayName || referralModalUser?.username }}
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">邀请码：{{ referralCode || '暂无' }}</p>
              </div>
              <button
                class="inline-flex items-center rounded-md border border-transparent px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-300"
                type="button"
                @click="closeReferralModal"
              >
                关闭
              </button>
            </div>

            <div class="mt-4 grid gap-4 sm:grid-cols-3">
              <div class="rounded-2xl border border-gray-200 px-4 py-3 dark:border-gray-700">
                <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  邀请人数
                </p>
                <p class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                  {{ referralStatsView.totalInvites || 0 }}
                </p>
              </div>
              <div class="rounded-2xl border border-gray-200 px-4 py-3 dark:border-gray-700">
                <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  达标人数
                </p>
                <p class="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-200">
                  {{ referralStatsView.qualifiedInvites || 0 }}
                </p>
              </div>
              <div class="rounded-2xl border border-gray-200 px-4 py-3 dark:border-gray-700">
                <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  累计奖励
                </p>
                <p class="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-200">
                  ${{ formatCurrency(referralStatsView.totalRewardUsd || 0, 2) }}
                </p>
              </div>
            </div>

            <div class="mt-6">
              <div class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                <div v-if="referralModalLoading" class="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                  正在加载邀请数据...
                </div>
                <div v-else>
                  <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead class="bg-gray-50 dark:bg-gray-800/60">
                      <tr>
                        <th
                          class="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300"
                          scope="col"
                        >
                          用户
                        </th>
                        <th
                          class="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300"
                          scope="col"
                        >
                          注册时间
                        </th>
                        <th
                          class="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300"
                          scope="col"
                        >
                          累计充值
                        </th>
                        <th
                          class="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300"
                          scope="col"
                        >
                          状态
                        </th>
                        <th
                          class="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300"
                          scope="col"
                        >
                          奖励信息
                        </th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-900">
                      <tr v-for="invite in referralInvitees" :key="invite.inviteeId">
                        <td class="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          {{ invite.inviteeUsername || '未知用户' }}
                        </td>
                        <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {{ formatDate(invite.createdAt) || '—' }}
                        </td>
                        <td class="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          ${{ formatCurrency(invite.totalRechargeUsd || 0, 2) }}
                        </td>
                        <td class="px-4 py-3 text-sm">
                          <span
                            :class="[
                              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                              getReferralStatusBadge(invite.status).classes
                            ]"
                          >
                            {{ getReferralStatusBadge(invite.status).label }}
                          </span>
                        </td>
                        <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          <div v-if="invite.rewardedAt">
                            <p>已发放 ${{ formatCurrency(invite.rewardAmountUsd || 0, 2) }}</p>
                            <p class="text-xs text-gray-400 dark:text-gray-500">
                              {{ formatDate(invite.rewardedAt) }}
                            </p>
                          </div>
                          <div v-else-if="invite.qualifiedAt">
                            <p>待发放</p>
                            <p class="text-xs text-gray-400 dark:text-gray-500">
                              达标：{{ formatDate(invite.qualifiedAt) || '—' }}
                            </p>
                          </div>
                          <span v-else>—</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div
                    v-if="!referralInvitees.length"
                    class="py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    暂无邀请数据
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            class="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              共 {{ referralPaginationInfo.total }} 人 - 第 {{ referralPaginationInfo.page }} / {{
                referralPaginationInfo.totalPages || 1
              }} 页
            </div>
            <div class="flex items-center gap-2">
              <button
                class="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-200"
                :disabled="referralPaginationInfo.page <= 1"
                type="button"
                @click="handleReferralPageChange('prev')"
              >
                上一页
              </button>
              <button
                class="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-200"
                :disabled="
                  referralPaginationInfo.totalPages !== 0 &&
                  referralPaginationInfo.page >= referralPaginationInfo.totalPages
                "
                type="button"
                @click="handleReferralPageChange('next')"
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirm Modals -->
    <ConfirmModal
      :confirm-class="confirmAction.confirmClass"
      :confirm-text="confirmAction.confirmText"
      :message="confirmAction.message"
      :show="showConfirmModal"
      :title="confirmAction.title"
      @cancel="showConfirmModal = false"
      @confirm="handleConfirmAction"
    />

    <!-- Change Role Modal -->
    <ChangeRoleModal
      :show="showRoleModal"
      :user="selectedUser"
      @close="showRoleModal = false"
      @updated="handleUserUpdated"
    />

    <!-- Recharge Modal -->
    <div
      v-if="showRechargeModal"
      aria-labelledby="modal-title"
      aria-modal="true"
      class="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
    >
      <div
        class="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0"
      >
        <!-- Background overlay -->
        <div
          aria-hidden="true"
          class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity dark:bg-gray-900 dark:bg-opacity-75"
          @click="showRechargeModal = false"
        ></div>

        <!-- Modal panel -->
        <div
          class="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all dark:bg-gray-800 sm:my-8 sm:w-full sm:max-w-md sm:align-middle"
        >
          <div class="bg-white px-4 pb-4 pt-5 dark:bg-gray-800 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div
                class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900 sm:mx-0 sm:h-10 sm:w-10"
              >
                <svg
                  class="h-6 w-6 text-emerald-600 dark:text-emerald-400"
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
              <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                <h3
                  id="modal-title"
                  class="text-lg font-medium leading-6 text-gray-900 dark:text-white"
                >
                  用户充值
                </h3>
                <div class="mt-2">
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    为用户 <span class="font-semibold">{{ selectedUser?.username }}</span> 充值
                  </p>
                </div>
              </div>
            </div>

            <div class="mt-4 space-y-4">
              <!-- Current Balance -->
              <div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                <div class="flex justify-between">
                  <span class="text-sm text-gray-600 dark:text-gray-400">当前余额</span>
                  <span class="font-medium text-gray-900 dark:text-white">
                    ${{ (rechargeForm.currentBalance || 0).toFixed(4) }}
                  </span>
                </div>
                <div class="mt-2 flex justify-between">
                  <span class="text-sm text-gray-600 dark:text-gray-400">已消费</span>
                  <span class="font-medium text-gray-900 dark:text-white">
                    ${{ (rechargeForm.totalCost || 0).toFixed(4) }}
                  </span>
                </div>
                <div
                  class="mt-2 flex justify-between border-t border-gray-200 pt-2 dark:border-gray-600"
                >
                  <span class="text-sm font-medium text-gray-600 dark:text-gray-400">可用余额</span>
                  <span
                    class="font-bold"
                    :class="
                      (rechargeForm.availableBalance || 0) > 0 ? 'text-emerald-600' : 'text-red-600'
                    "
                  >
                    ${{ (rechargeForm.availableBalance || 0).toFixed(4) }}
                  </span>
                </div>
              </div>

              <!-- Amount Input -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  for="recharge-amount"
                >
                  充值金额 (USD)
                </label>
                <div class="relative mt-1 rounded-md shadow-sm">
                  <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span class="text-gray-500 dark:text-gray-400 sm:text-sm">$</span>
                  </div>
                  <input
                    id="recharge-amount"
                    v-model.number="rechargeForm.amount"
                    class="block w-full rounded-md border-gray-300 pl-7 pr-12 focus:border-emerald-500 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                    min="0.01"
                    placeholder="0.00"
                    step="0.01"
                    type="number"
                  />
                </div>
              </div>

              <!-- Remark Input -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  for="recharge-remark"
                >
                  备注（可选）
                </label>
                <input
                  id="recharge-remark"
                  v-model="rechargeForm.remark"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                  placeholder="例如：首次充值"
                  type="text"
                />
              </div>
            </div>
          </div>

          <div class="bg-gray-50 px-4 py-3 dark:bg-gray-700 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              class="inline-flex w-full justify-center rounded-md border border-transparent bg-emerald-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:ml-3 sm:w-auto sm:text-sm"
              :disabled="!rechargeForm.amount || rechargeForm.amount <= 0 || rechargeLoading"
              type="button"
              @click="handleRecharge"
            >
              <svg
                v-if="rechargeLoading"
                class="-ml-1 mr-2 h-4 w-4 animate-spin text-white"
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
              确认充值
            </button>
            <button
              class="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 sm:ml-3 sm:mt-0 sm:w-auto sm:text-sm"
              type="button"
              @click="showRechargeModal = false"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Deduction Modal -->
    <div
      v-if="showDeductModal"
      aria-labelledby="modal-title"
      aria-modal="true"
      class="fixed inset-0 z-10 overflow-y-auto"
      role="dialog"
    >
      <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <!-- Background overlay -->
        <div
          aria-hidden="true"
          class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity dark:bg-gray-900 dark:bg-opacity-75"
          @click="showDeductModal = false"
        ></div>

        <!-- Modal panel -->
        <div
          class="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all dark:bg-gray-800 sm:my-8 sm:w-full sm:max-w-md sm:align-middle"
        >
          <div class="bg-white px-4 pb-4 pt-5 dark:bg-gray-800 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div
                class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900 sm:mx-0 sm:h-10 sm:w-10"
              >
                <svg
                  class="h-6 w-6 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
              </div>
              <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                <h3
                  id="modal-title"
                  class="text-lg font-medium leading-6 text-gray-900 dark:text-white"
                >
                  扣减余额
                </h3>
                <div class="mt-2">
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    从用户 <span class="font-semibold">{{ selectedUser?.username }}</span> 扣减余额
                  </p>
                </div>
              </div>
            </div>

            <div class="mt-4 space-y-4">
              <!-- Current Balance -->
              <div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                <div class="flex justify-between">
                  <span class="text-sm text-gray-600 dark:text-gray-400">当前余额</span>
                  <span class="font-medium text-gray-900 dark:text-white">
                    ${{ (deductForm.currentBalance || 0).toFixed(4) }}
                  </span>
                </div>
                <div class="mt-2 flex justify-between">
                  <span class="text-sm text-gray-600 dark:text-gray-400">已消费</span>
                  <span class="font-medium text-gray-900 dark:text-white">
                    ${{ (deductForm.totalCost || 0).toFixed(4) }}
                  </span>
                </div>
                <div
                  class="mt-2 flex justify-between border-t border-gray-200 pt-2 dark:border-gray-600"
                >
                  <span class="text-sm font-medium text-gray-600 dark:text-gray-400">可用余额</span>
                  <span
                    class="font-bold"
                    :class="
                      (deductForm.availableBalance || 0) > 0 ? 'text-emerald-600' : 'text-red-600'
                    "
                  >
                    ${{ (deductForm.availableBalance || 0).toFixed(4) }}
                  </span>
                </div>
              </div>

              <!-- Amount Input -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  for="deduct-amount"
                >
                  扣减金额 (USD)
                </label>
                <div class="relative mt-1 rounded-md shadow-sm">
                  <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span class="text-gray-500 dark:text-gray-400 sm:text-sm">$</span>
                  </div>
                  <input
                    id="deduct-amount"
                    v-model.number="deductForm.amount"
                    class="block w-full rounded-md border-gray-300 pl-7 pr-12 focus:border-red-500 focus:ring-red-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                    min="0.01"
                    :max="deductForm.currentBalance"
                    placeholder="0.00"
                    step="0.01"
                    type="number"
                  />
                </div>
                <p v-if="deductForm.amount > deductForm.currentBalance" class="mt-1 text-sm text-red-600">
                  扣减金额不能超过当前余额
                </p>
              </div>

              <!-- Remark Input -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  for="deduct-remark"
                >
                  备注（可选）
                </label>
                <input
                  id="deduct-remark"
                  v-model="deductForm.remark"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                  placeholder="默认：管理员手动扣费"
                  type="text"
                />
              </div>
            </div>
          </div>

          <div class="bg-gray-50 px-4 py-3 dark:bg-gray-700 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              class="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:ml-3 sm:w-auto sm:text-sm"
              :disabled="!deductForm.amount || deductForm.amount <= 0 || deductForm.amount > deductForm.currentBalance || deductLoading"
              type="button"
              @click="handleDeduction"
            >
              <svg
                v-if="deductLoading"
                class="-ml-1 mr-2 h-4 w-4 animate-spin text-white"
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
              确认扣减
            </button>
            <button
              class="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 sm:ml-3 sm:mt-0 sm:w-auto sm:text-sm"
              type="button"
              @click="showDeductModal = false"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiClient } from '@/config/api'
import { showToast } from '@/utils/toast'
import { debounce } from 'lodash-es'
import UserUsageStatsModal from '@/components/admin/UserUsageStatsModal.vue'
import ChangeRoleModal from '@/components/admin/ChangeRoleModal.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'

const loading = ref(true)
const users = ref([])
const exportLoading = ref(false)
const userStats = ref(null)
const searchQuery = ref('')
const selectedRole = ref('')
const selectedStatus = ref('')
const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0
})
const pageSizeOptions = [10, 20, 50, 100]

const showStatsModal = ref(false)
const showConfirmModal = ref(false)
const showRoleModal = ref(false)
const showRechargeModal = ref(false)
const showReferralModal = ref(false)
const rechargeLoading = ref(false)
const showDeductModal = ref(false)
const deductLoading = ref(false)
const referralModalLoading = ref(false)
const selectedUser = ref(null)
const referralModalUser = ref(null)
const rechargeForm = ref({
  currentBalance: 0,
  totalCost: 0,
  availableBalance: 0,
  amount: null,
  remark: ''
})
const deductForm = ref({
  currentBalance: 0,
  totalCost: 0,
  availableBalance: 0,
  amount: null,
  remark: ''
})
const referralModalData = ref({
  code: '',
  stats: {
    totalInvites: 0,
    qualifiedInvites: 0,
    totalRewardUsd: 0
  },
  invitees: {
    records: [],
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  }
})
const referralModalPageSize = ref(10)

const confirmAction = ref({
  title: '',
  message: '',
  confirmText: '',
  confirmClass: '',
  action: null
})

const paginationRange = computed(() => {
  if (!users.value.length || pagination.value.total === 0) {
    return { start: 0, end: 0 }
  }

  const start = (pagination.value.page - 1) * pagination.value.limit + 1
  const end = start + users.value.length - 1
  return { start, end }
})

const paginationSummary = computed(() => {
  if (pagination.value.total === 0) {
    return 'No users found'
  }
  return `Showing ${paginationRange.value.start}-${paginationRange.value.end} of ${pagination.value.total}`
})

const referralStatsView = computed(() => {
  return referralModalData.value?.stats || {
    totalInvites: 0,
    qualifiedInvites: 0,
    totalRewardUsd: 0
  }
})

const referralInvitees = computed(() => {
  return referralModalData.value?.invitees?.records || []
})

const referralPaginationInfo = computed(() => {
  const paginationData = referralModalData.value?.invitees || {}
  return {
    page: paginationData.page || 1,
    totalPages: paginationData.totalPages || 0,
    total: paginationData.total || 0
  }
})

const referralCode = computed(() => referralModalData.value?.code || '')

const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

const formatCurrency = (value, digits = 2) => {
  const amount = Number(value ?? 0)
  if (!Number.isFinite(amount)) {
    return (0).toFixed(digits)
  }
  return amount.toFixed(digits)
}

const formatDate = (dateString) => {
  if (!dateString) return null
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getReferralStatusBadge = (status) => {
  const mapping = {
    rewarded: {
      label: 'Rewarded',
      classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
    },
    qualified: {
      label: 'Qualified',
      classes: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200'
    },
    pending: {
      label: 'Pending',
      classes: 'bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300'
    }
  }
  return mapping[status] || mapping.pending
}

const openReferralModal = async (user) => {
  referralModalUser.value = user
  showReferralModal.value = true
  await loadReferralDetails(1)
}

const loadReferralDetails = async (page = 1) => {
  if (!referralModalUser.value) {
    return
  }
  referralModalLoading.value = true
  try {
    const response = await apiClient.get(`/users/${referralModalUser.value.id}/referrals`, {
      params: {
        page,
        limit: referralModalPageSize.value
      }
    })

    if (response.success) {
      referralModalData.value = response.data
    }
  } catch (error) {
    console.error('Failed to load referral details:', error)
    showToast('Failed to load referral details', 'error')
  } finally {
    referralModalLoading.value = false
  }
}

const handleReferralPageChange = async (direction) => {
  const { page, totalPages } = referralPaginationInfo.value
  let targetPage = page
  if (direction === 'prev') {
    targetPage = Math.max(1, page - 1)
  } else if (direction === 'next') {
    targetPage = totalPages === 0 ? page : Math.min(totalPages, page + 1)
  } else if (typeof direction === 'number') {
    targetPage = direction
  }

  if (targetPage === page || targetPage < 1) {
    return
  }

  if (totalPages !== 0 && targetPage > totalPages) {
    return
  }

  await loadReferralDetails(targetPage)
}

const closeReferralModal = () => {
  showReferralModal.value = false
}

const buildUserQueryParams = (includePagination = true) => {
  const params = {}
  if (includePagination) {
    params.page = pagination.value.page
    params.limit = pagination.value.limit
  }
  if (selectedRole.value && selectedRole.value.trim() !== '') {
    params.role = selectedRole.value
  }
  if (selectedStatus.value !== '') {
    params.isActive = selectedStatus.value
  }
  const trimmedSearch = searchQuery.value.trim()
  if (trimmedSearch) {
    params.search = trimmedSearch
  }
  return params
}

const loadUsers = async (options = {}) => {
  if (options.resetPage) {
    pagination.value.page = 1
  }
  if (typeof options.page === 'number' && !Number.isNaN(options.page)) {
    pagination.value.page = options.page
  }
  if (typeof options.limit === 'number' && !Number.isNaN(options.limit)) {
    pagination.value.limit = options.limit
  }

  loading.value = true
  try {
    const params = buildUserQueryParams(true)

    const [usersResponse, statsResponse] = await Promise.all([
      apiClient.get('/users', { params }),
      apiClient.get('/users/stats/overview')
    ])

    if (usersResponse.success) {
      users.value = usersResponse.users
      const serverPagination = usersResponse.pagination || {}
      pagination.value.total = serverPagination.total ?? usersResponse.users.length
      pagination.value.totalPages = serverPagination.totalPages ?? 0
      pagination.value.page = serverPagination.page ?? pagination.value.page
      pagination.value.limit = serverPagination.limit ?? pagination.value.limit
    }

    if (statsResponse.success) {
      userStats.value = statsResponse.stats
    }
  } catch (error) {
    console.error('Failed to load users:', error)
    showToast('Failed to load users', 'error')
  } finally {
    loading.value = false
  }
}

const debouncedSearch = debounce(() => {
  loadUsers({ resetPage: true })
}, 300)

const handleFilterChange = () => {
  loadUsers({ resetPage: true })
}

const handlePageSizeChange = () => {
  loadUsers({ resetPage: true, limit: pagination.value.limit })
}

const goToPreviousPage = () => {
  if (pagination.value.page <= 1) {
    return
  }
  loadUsers({ page: pagination.value.page - 1 })
}

const goToNextPage = () => {
  if (
    pagination.value.totalPages === 0 ||
    pagination.value.page >= pagination.value.totalPages
  ) {
    return
  }
  loadUsers({ page: pagination.value.page + 1 })
}

const exportUsers = async () => {
  if (exportLoading.value) {
    return
  }
  exportLoading.value = true
  try {
    const params = buildUserQueryParams(false)
    const response = await apiClient.download('/users/export', { params })
    const blob =
      response.data instanceof Blob
        ? response.data
        : new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
    const blobUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = response.filename || 'users-export.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(blobUrl)
    showToast('导出成功', 'success')
  } catch (error) {
    console.error('Failed to export users:', error)
    showToast(error.message || '导出失败', 'error')
  } finally {
    exportLoading.value = false
  }
}

const viewUserStats = (user) => {
  selectedUser.value = user
  showStatsModal.value = true
}

const toggleUserStatus = (user) => {
  selectedUser.value = user
  confirmAction.value = {
    title: user.isActive ? 'Disable User' : 'Enable User',
    message: user.isActive
      ? `Are you sure you want to disable user "${user.username}"? This will prevent them from logging in.`
      : `Are you sure you want to enable user "${user.username}"?`,
    confirmText: user.isActive ? 'Disable' : 'Enable',
    confirmClass: user.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700',
    action: 'toggleStatus'
  }
  showConfirmModal.value = true
}

const disableUserApiKeys = (user) => {
  if (user.apiKeyCount === 0) return

  selectedUser.value = user
  confirmAction.value = {
    title: 'Disable All API Keys',
    message: `Are you sure you want to disable all ${user.apiKeyCount} API keys for user "${user.username}"? This will prevent them from using the service.`,
    confirmText: 'Disable Keys',
    confirmClass: 'bg-red-600 hover:bg-red-700',
    action: 'disableKeys'
  }
  showConfirmModal.value = true
}

const changeUserRole = (user) => {
  selectedUser.value = user
  showRoleModal.value = true
}

const openRechargeModal = async (user) => {
  selectedUser.value = user
  rechargeForm.value = {
    currentBalance: 0,
    totalCost: 0,
    availableBalance: 0,
    amount: null,
    remark: ''
  }

  try {
    // 获取用户余额信息
    const response = await apiClient.get(`/admin/users/${user.id}/balance`)
    if (response.success) {
      rechargeForm.value.currentBalance = response.data.balance || 0
      rechargeForm.value.totalCost = response.data.totalCost || 0
      rechargeForm.value.availableBalance = response.data.availableBalance || 0
    }
  } catch (error) {
    console.error('Failed to fetch user balance:', error)
  }

  showRechargeModal.value = true
}

const handleRecharge = async () => {
  if (!rechargeForm.value.amount || rechargeForm.value.amount <= 0) {
    showToast('请输入有效的充值金额', 'error')
    return
  }

  rechargeLoading.value = true
  try {
    const response = await apiClient.post(`/admin/users/${selectedUser.value.id}/recharge`, {
      amount: rechargeForm.value.amount,
      remark: rechargeForm.value.remark || ''
    })

    if (response.success) {
      showToast(
        `充值成功！余额: $${response.data.balanceBefore.toFixed(2)} → $${response.data.balanceAfter.toFixed(2)}`,
        'success'
      )
      showRechargeModal.value = false
      // 刷新用户列表
      await loadUsers()
    }
  } catch (error) {
    console.error('Failed to recharge:', error)
    showToast(error.response?.data?.message || '充值失败', 'error')
  } finally {
    rechargeLoading.value = false
  }
}

const openDeductModal = async (user) => {
  selectedUser.value = user
  deductForm.value = {
    currentBalance: 0,
    totalCost: 0,
    availableBalance: 0,
    amount: null,
    remark: ''
  }

  try {
    // 获取用户余额信息
    const response = await apiClient.get(`/admin/users/${user.id}/balance`)
    if (response.success) {
      deductForm.value.currentBalance = response.data.balance || 0
      deductForm.value.totalCost = response.data.totalCost || 0
      deductForm.value.availableBalance = response.data.availableBalance || 0
    }
  } catch (error) {
    console.error('Failed to fetch user balance:', error)
  }

  showDeductModal.value = true
}

const handleDeduction = async () => {
  if (!deductForm.value.amount || deductForm.value.amount <= 0) {
    showToast('请输入有效的扣减金额', 'error')
    return
  }

  if (deductForm.value.amount > deductForm.value.currentBalance) {
    showToast('扣减金额不能超过当前余额', 'error')
    return
  }

  deductLoading.value = true
  try {
    const response = await apiClient.post(`/admin/users/${selectedUser.value.id}/deduct`, {
      amount: deductForm.value.amount,
      remark: deductForm.value.remark || ''
    })

    if (response.success) {
      showToast(
        `扣减成功！余额: $${response.data.balanceBefore.toFixed(2)} → $${response.data.balanceAfter.toFixed(2)}`,
        'success'
      )
      showDeductModal.value = false
      // 刷新用户列表
      await loadUsers()
    }
  } catch (error) {
    console.error('Failed to deduct:', error)
    showToast(error.response?.data?.message || '扣减失败', 'error')
  } finally {
    deductLoading.value = false
  }
}

const handleConfirmAction = async () => {
  const user = selectedUser.value
  const action = confirmAction.value.action

  try {
    if (action === 'toggleStatus') {
      const response = await apiClient.patch(`/users/${user.id}/status`, {
        isActive: !user.isActive
      })

      if (response.success) {
        const userIndex = users.value.findIndex((u) => u.id === user.id)
        if (userIndex !== -1) {
          users.value[userIndex].isActive = !user.isActive
        }
        showToast(`User ${user.isActive ? 'disabled' : 'enabled'} successfully`, 'success')
      }
    } else if (action === 'disableKeys') {
      const response = await apiClient.post(`/users/${user.id}/disable-keys`)

      if (response.success) {
        showToast(`Disabled ${response.disabledCount} API keys`, 'success')
        await loadUsers() // Refresh to get updated counts
      }
    }
  } catch (error) {
    console.error(`Failed to ${action}:`, error)
    showToast(`Failed to ${action}`, 'error')
  } finally {
    showConfirmModal.value = false
    selectedUser.value = null
  }
}

const handleUserUpdated = () => {
  showRoleModal.value = false
  selectedUser.value = null
  loadUsers()
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
/* 组件特定样式 */
</style>
