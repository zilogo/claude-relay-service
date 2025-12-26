# Lei Claude Relay Service - 用户API接口完整文档

> 最后更新：2025-12-16
> 版本：v2.0

---

## 📋 目录

1. [用户认证和账户管理](#1-用户认证和账户管理)
2. [API Key管理](#2-api-key管理)
3. [使用统计和余额查询](#3-使用统计和余额查询)
4. [Claude服务端点](#4-claude服务端点)
5. [Gemini服务端点](#5-gemini服务端点)
6. [OpenAI服务端点](#6-openai服务端点)
7. [Droid (Factory.ai)服务端点](#7-droid-factoryai服务端点)
8. [支付相关端点](#8-支付相关端点)
9. [邀请返利端点](#9-邀请返利端点)
10. [密码重置和邮箱验证](#10-密码重置和邮箱验证)
11. [认证方式](#认证方式)
12. [速率限制和配额](#速率限制和配额)
13. [错误响应格式](#错误响应格式)

---

## 1. 用户认证和账户管理

### 1.1 用户注册

创建新用户账户。

**端点**: `POST /users/register`

**认证**: 无需认证

**请求体**:
```json
{
  "username": "string (必填)",
  "email": "string (必填)",
  "password": "string (必填)",
  "displayName": "string (可选)",
  "firstName": "string (可选)",
  "lastName": "string (可选)",
  "referralCode": "string (可选) - 邀请码"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "Registration successful",
  "user": {
    "id": "user_123abc",
    "username": "john_doe",
    "email": "john@example.com",
    "displayName": "John Doe",
    "role": "user",
    "isActive": true,
    "createdAt": "2025-12-16T10:30:00Z"
  }
}
```

**错误示例**:
```json
{
  "error": "validation_error",
  "message": "Username already exists"
}
```

---

### 1.2 本地用户登录

使用用户名和密码登录系统。

**端点**: `POST /users/login/local`

**认证**: 无需认证

**请求体**:
```json
{
  "username": "john_doe",
  "password": "SecurePassword123!"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "user_123abc",
    "username": "john_doe",
    "email": "john@example.com",
    "displayName": "John Doe",
    "role": "user",
    "authType": "local",
    "lastLoginAt": "2025-12-16T10:35:00Z"
  },
  "sessionToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**说明**:
- 返回的 `sessionToken` 用于后续需要用户认证的API调用
- 登录后会记录最后登录时间

---

### 1.3 LDAP用户登录

使用LDAP凭据登录（需要系统启用LDAP支持）。

**端点**: `POST /users/login/ldap`

**认证**: 无需认证

**请求体**:
```json
{
  "username": "john_doe",
  "password": "LdapPassword123"
}
```

**响应示例**: 与本地登录相同

**说明**:
- 需要环境变量 `LDAP_ENABLED=true`
- LDAP用户首次登录时会自动创建本地账户

---

### 1.4 自动登录

自动选择合适的认证方式（本地或LDAP）。

**端点**: `POST /users/login`

**认证**: 无需认证

**请求体**:
```json
{
  "username": "john_doe",
  "password": "Password123"
}
```

**响应示例**: 与本地登录相同

**说明**:
- 系统会自动尝试本地认证和LDAP认证
- 优先使用本地认证

---

### 1.5 用户登出

退出当前会话。

**端点**: `POST /users/logout`

**认证**: 需要 Session Token

**请求头**:
```http
Authorization: Bearer <sessionToken>
```

**响应示例**:
```json
{
  "success": true,
  "message": "Logout successful"
}
```

**说明**:
- 登出后 sessionToken 将失效
- 建议客户端在登出后清除本地存储的 token

---

### 1.6 修改密码

修改当前用户的密码。

**端点**: `POST /users/change-password`

**认证**: 需要 Session Token

**请求体**:
```json
{
  "oldPassword": "OldPassword123",
  "newPassword": "NewPassword456!"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**错误示例**:
```json
{
  "error": "invalid_credentials",
  "message": "Current password is incorrect"
}
```

**说明**:
- 仅适用于本地认证用户（LDAP用户需在LDAP服务器修改密码）
- 密码需满足强度要求（建议先使用密码强度检查接口）

---

### 1.7 获取用户资料

获取当前登录用户的详细信息。

**端点**: `GET /users/profile`

**认证**: 需要 Session Token

**响应示例**:
```json
{
  "success": true,
  "user": {
    "id": "user_123abc",
    "username": "john_doe",
    "email": "john@example.com",
    "displayName": "John Doe",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "authType": "local",
    "isActive": true,
    "createdAt": "2025-11-01T08:00:00Z",
    "lastLoginAt": "2025-12-16T10:35:00Z",
    "apiKeyCount": 1,
    "totalUsage": {
      "requests": 150,
      "inputTokens": 75000,
      "outputTokens": 30000,
      "totalCost": 15.50
    }
  },
  "config": {
    "maxApiKeysPerUser": 1,
    "allowUserDeleteApiKeys": false
  }
}
```

**说明**:
- `config` 字段包含系统配置信息
- `totalUsage` 显示用户的累计使用统计

---

## 2. API Key管理

### 2.1 获取用户的API Keys

查看当前用户的所有API Keys。

**端点**: `GET /users/api-keys`

**认证**: 需要 Session Token

**查询参数**:
- `includeDeleted` (可选): `true` / `false` - 是否包含已删除的Keys，默认 `false`

**示例请求**:
```http
GET /users/api-keys?includeDeleted=false
Authorization: Bearer <sessionToken>
```

**响应示例**:
```json
{
  "success": true,
  "apiKeys": [
    {
      "id": "key_abc123",
      "name": "My Production Key",
      "description": "用于生产环境的API Key",
      "keyPreview": "cr_abc12...xyz9",
      "tokenLimit": 1000000,
      "isActive": true,
      "createdAt": "2025-12-01T10:00:00Z",
      "lastUsedAt": "2025-12-16T09:30:00Z",
      "expiresAt": null,
      "permissions": "all",
      "usage": {
        "requests": 150,
        "inputTokens": 75000,
        "outputTokens": 30000,
        "cacheCreateTokens": 5000,
        "cacheReadTokens": 10000,
        "totalTokens": 120000,
        "totalCost": 15.50
      },
      "dailyCost": 2.30,
      "dailyCostLimit": null,
      "totalCost": 15.50,
      "totalCostLimit": null
    }
  ],
  "total": 1
}
```

**字段说明**:
- `keyPreview`: Key的前后部分预览，完整Key仅在创建时返回
- `permissions`: 权限类型（`all`, `claude`, `gemini`, `openai`, `droid`）
- `tokenLimit`: Token配额限制，`null` 表示无限制
- `dailyCostLimit` / `totalCostLimit`: 成本限制（USD）

---

### 2.2 创建新的API Key

创建一个新的API Key。

**端点**: `POST /users/api-keys`

**认证**: 需要 Session Token

**请求体**:
```json
{
  "name": "My New Key (必填)",
  "description": "测试环境使用 (可选)",
  "tokenLimit": null,
  "expiresAt": null,
  "dailyCostLimit": 10.00,
  "totalCostLimit": 100.00
}
```

**参数说明**:
- `name`: Key名称（必填）
- `description`: Key描述（可选）
- `tokenLimit`: Token配额（可选，null表示无限制）
- `expiresAt`: 过期时间（可选，ISO8601格式）
- `dailyCostLimit`: 每日成本限制（USD，可选）
- `totalCostLimit`: 总成本限制（USD，可选）

**响应示例**:
```json
{
  "success": true,
  "message": "API key created successfully",
  "apiKey": {
    "id": "key_def456",
    "name": "My New Key",
    "description": "测试环境使用",
    "key": "cr_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz",
    "tokenLimit": null,
    "expiresAt": null,
    "dailyCostLimit": 10.00,
    "totalCostLimit": 100.00,
    "createdAt": "2025-12-16T11:00:00Z"
  }
}
```

**重要提示**:
- ⚠️ **完整的 `key` 值仅在创建时返回一次，请妥善保存！**
- 后续查询只会返回 `keyPreview`（前后预览）
- 创建的Key数量受系统配置 `MAX_API_KEYS_PER_USER` 限制

---

### 2.3 删除API Key

删除指定的API Key。

**端点**: `DELETE /users/api-keys/:keyId`

**认证**: 需要 Session Token

**前置条件**:
- 系统设置允许用户删除自己的Keys（`ALLOW_USER_DELETE_API_KEYS=true`）
- 如果未启用，只有管理员可以删除Keys

**示例请求**:
```http
DELETE /users/api-keys/key_abc123
Authorization: Bearer <sessionToken>
```

**响应示例**:
```json
{
  "success": true,
  "message": "API key deleted successfully"
}
```

**错误示例**:
```json
{
  "error": "forbidden",
  "message": "Users are not allowed to delete their own API keys. Please contact an administrator."
}
```

---

## 3. 使用统计和余额查询

### 3.1 获取余额信息

查询用户的账户余额和充值统计。

**端点**: `GET /users/balance`

**认证**: 需要 Session Token

**响应示例**:
```json
{
  "success": true,
  "data": {
    "balance": 100.50,
    "availableBalance": 95.30,
    "frozenBalance": 5.20,
    "totalRecharge": 100.00,
    "totalCost": 4.70,
    "lastRechargeAt": "2025-12-15T14:30:00Z"
  }
}
```

**字段说明**:
- `balance`: 总余额（USD）
- `availableBalance`: 可用余额
- `frozenBalance`: 冻结余额
- `totalRecharge`: 累计充值金额
- `totalCost`: 累计消费金额

---

### 3.2 获取充值记录

查询用户的充值和奖励记录。

**端点**: `GET /users/recharge-records`

**认证**: 需要 Session Token

**查询参数**:
- `page` (可选): 页码，默认 `1`
- `limit` (可选): 每页记录数，默认 `20`，最大 `100`
- `type` (可选): 记录类型 - `recharge`（充值）/ `reward`（奖励）/ `refund`（退款）

**示例请求**:
```http
GET /users/recharge-records?page=1&limit=20&type=recharge
Authorization: Bearer <sessionToken>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "id": "recharge_abc123",
        "userId": "user_123abc",
        "type": "recharge",
        "amount": 100.00,
        "balanceBefore": 0.00,
        "balanceAfter": 100.00,
        "description": "支付宝充值",
        "orderId": "order_xyz789",
        "createdAt": "2025-12-15T14:30:00Z"
      },
      {
        "id": "reward_def456",
        "userId": "user_123abc",
        "type": "reward",
        "amount": 5.00,
        "balanceBefore": 100.00,
        "balanceAfter": 105.00,
        "description": "邀请奖励",
        "referralCode": "ABC123",
        "createdAt": "2025-12-16T08:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

---

### 3.3 获取使用统计

查询详细的使用统计信息。

**端点**: `GET /users/usage-stats`

**认证**: 需要 Session Token

**查询参数**:
- `period` (可选): 统计周期 - `day` / `week` / `month`，默认 `week`
- `model` (可选): 按模型过滤，如 `claude-sonnet-4-5-20250929`
- `includeModelUsage` (可选): 是否包含按模型的统计，默认 `true`
- `modelLimit` (可选): 返回的模型数量上限，默认 `10`
- `modelMinTokens` (可选): 模型最小token数过滤，默认 `100`

**示例请求**:
```http
GET /users/usage-stats?period=week&includeModelUsage=true&modelLimit=5
Authorization: Bearer <sessionToken>
```

**响应示例**:
```json
{
  "success": true,
  "stats": {
    "period": "week",
    "startDate": "2025-12-09",
    "endDate": "2025-12-16",
    "totalRequests": 150,
    "totalInputTokens": 75000,
    "totalOutputTokens": 30000,
    "totalCacheCreateTokens": 5000,
    "totalCacheReadTokens": 10000,
    "totalTokens": 120000,
    "totalCost": 15.50,
    "dailyStats": [
      {
        "date": "2025-12-16",
        "requests": 25,
        "inputTokens": 12500,
        "outputTokens": 5000,
        "cost": 2.50
      }
    ],
    "modelStats": [
      {
        "model": "claude-sonnet-4-5-20250929",
        "requests": 100,
        "inputTokens": 50000,
        "outputTokens": 20000,
        "cost": 10.00
      },
      {
        "model": "gemini-2.5-flash",
        "requests": 50,
        "inputTokens": 25000,
        "outputTokens": 10000,
        "cost": 5.50
      }
    ]
  }
}
```

---

### 3.4 获取使用趋势

查询一段时间内的使用趋势数据。

**端点**: `GET /users/usage-trend`

**认证**: 需要 Session Token

**查询参数**:
- `days` (可选): 查询天数，默认 `7`，最大 `90`

**示例请求**:
```http
GET /users/usage-trend?days=7
Authorization: Bearer <sessionToken>
```

**响应示例**:
```json
{
  "success": true,
  "trend": [
    {
      "date": "2025-12-10",
      "inputTokens": 10000,
      "outputTokens": 4000,
      "cacheCreateTokens": 500,
      "cacheReadTokens": 1000,
      "requests": 20,
      "tokens": 15500,
      "cost": 2.20
    },
    {
      "date": "2025-12-11",
      "inputTokens": 12000,
      "outputTokens": 5000,
      "cacheCreateTokens": 600,
      "cacheReadTokens": 1200,
      "requests": 25,
      "tokens": 18800,
      "cost": 2.70
    }
  ]
}
```

**说明**:
- 数据按日期升序排列
- 适合用于绘制趋势图表

---

## 4. Claude服务端点

Claude API服务提供符合Anthropic Messages API标准的接口。

### 4.1 发送Claude消息

发送消息到Claude模型并获取响应。

**端点**:
- `POST /api/v1/messages`
- `POST /claude/v1/messages` (别名路由)

**认证**: 需要 API Key

**请求头**:
```http
x-api-key: cr_abc123def456...
Content-Type: application/json
anthropic-version: 2023-06-01
```

**请求体**:
```json
{
  "model": "claude-sonnet-4-5-20250929",
  "messages": [
    {
      "role": "user",
      "content": "Hello, Claude! How are you today?"
    }
  ],
  "max_tokens": 1024,
  "temperature": 1.0,
  "stream": false,
  "system": "You are a helpful assistant."
}
```

**参数说明**:
- `model`: 模型ID（必填）
- `messages`: 对话消息数组（必填）
- `max_tokens`: 最大生成token数（必填）
- `temperature`: 温度参数 0.0-1.0（可选）
- `stream`: 是否启用流式响应（可选，默认false）
- `system`: 系统提示词（可选）
- 其他参数见[Anthropic API文档](https://docs.anthropic.com/claude/reference/messages_post)

**响应示例（非流式）**:
```json
{
  "id": "msg_01AbCdEfGh",
  "type": "message",
  "role": "assistant",
  "model": "claude-sonnet-4-5-20250929",
  "content": [
    {
      "type": "text",
      "text": "Hello! I'm doing well, thank you for asking. How can I help you today?"
    }
  ],
  "stop_reason": "end_turn",
  "stop_sequence": null,
  "usage": {
    "input_tokens": 15,
    "output_tokens": 25,
    "cache_creation_input_tokens": 0,
    "cache_read_input_tokens": 0
  }
}
```

**流式响应（stream=true）**:
```
event: message_start
data: {"type":"message_start","message":{"id":"msg_01AbCdEfGh","type":"message","role":"assistant",...}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"! I'm"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":25}}

event: message_stop
data: {"type":"message_stop"}
```

**说明**:
- 支持完整的Anthropic Messages API功能
- 流式响应使用Server-Sent Events (SSE)格式
- 自动记录使用统计和成本

---

### 4.2 Token计数

计算请求的输入token数量（Beta功能）。

**端点**: `POST /api/v1/messages/count_tokens`

**认证**: 需要 API Key

**请求体**: 与发送消息相同，但不会实际生成响应

**响应示例**:
```json
{
  "input_tokens": 15
}
```

---

### 4.3 获取模型列表

获取可用的Claude模型列表。

**端点**: `GET /api/v1/models`

**认证**: 需要 API Key

**响应示例**:
```json
{
  "object": "list",
  "data": [
    {
      "id": "claude-sonnet-4-5-20250929",
      "object": "model",
      "created": 1735689600,
      "owned_by": "anthropic",
      "display_name": "Claude Sonnet 4.5"
    },
    {
      "id": "claude-opus-4-1-20250805",
      "object": "model",
      "created": 1722816000,
      "owned_by": "anthropic",
      "display_name": "Claude Opus 4.1"
    }
  ]
}
```

---

### 4.4 获取API Key信息

查询API Key的详细信息和使用情况。

**端点**: `GET /api/v1/key-info`

**认证**: 需要 API Key

**响应示例**:
```json
{
  "keyInfo": {
    "id": "key_abc123",
    "name": "My Production Key",
    "permissions": "all",
    "tokenLimit": 1000000,
    "tokensUsed": 120000,
    "tokensRemaining": 880000,
    "usage": {
      "requests": 150,
      "inputTokens": 75000,
      "outputTokens": 30000,
      "totalCost": 15.50
    },
    "dailyCost": 2.30,
    "dailyCostLimit": null,
    "totalCost": 15.50,
    "totalCostLimit": null,
    "isActive": true,
    "createdAt": "2025-12-01T10:00:00Z",
    "lastUsedAt": "2025-12-16T09:30:00Z"
  },
  "timestamp": "2025-12-16T11:30:00Z"
}
```

---

### 4.5 获取使用统计

查询API Key的使用统计。

**端点**: `GET /api/v1/usage`

**认证**: 需要 API Key

**响应示例**:
```json
{
  "usage": {
    "requests": 150,
    "inputTokens": 75000,
    "outputTokens": 30000,
    "cacheCreateTokens": 5000,
    "cacheReadTokens": 10000,
    "totalTokens": 120000,
    "totalCost": 15.50
  },
  "limits": {
    "tokens": 1000000,
    "requests": 0
  },
  "timestamp": "2025-12-16T11:30:00Z"
}
```

---

### 4.6 获取用户信息

获取当前API Key关联的用户信息（Claude Code客户端需要）。

**端点**: `GET /api/v1/me`

**认证**: 需要 API Key

**响应示例**:
```json
{
  "id": "user_123abc",
  "type": "user",
  "display_name": "John Doe",
  "created_at": "2025-11-01T08:00:00Z"
}
```

---

### 4.7 获取组织使用统计

获取组织级别的使用统计（兼容Anthropic API）。

**端点**: `GET /api/v1/organizations/:org_id/usage`

**认证**: 需要 API Key

**响应示例**:
```json
{
  "object": "usage",
  "data": [
    {
      "type": "credit_balance",
      "credit_balance": 950000
    },
    {
      "type": "usage",
      "input_tokens": 75000,
      "output_tokens": 30000
    }
  ]
}
```

---

## 5. Gemini服务端点

Gemini API服务提供Google Gemini模型的访问。

### 5.1 生成内容（非流式）

调用Gemini模型生成内容。

**端点**:
- `POST /gemini/v1internal:generateContent`
- `POST /gemini/v1beta/models/:modelName:generateContent`

**认证**: 需要 API Key

**请求头**:
```http
x-api-key: cr_abc123def456...
Content-Type: application/json
```

**请求体**:
```json
{
  "model": "gemini-2.5-flash",
  "request": {
    "contents": [
      {
        "role": "user",
        "parts": [
          {
            "text": "What is the capital of France?"
          }
        ]
      }
    ],
    "generationConfig": {
      "temperature": 0.7,
      "maxOutputTokens": 4096,
      "topP": 0.9,
      "topK": 40
    },
    "safetySettings": []
  },
  "user_prompt_id": "prompt_123",
  "project": "my-project"
}
```

**参数说明**:
- `model`: 模型名称（必填）
- `request.contents`: 对话内容数组（必填）
- `request.generationConfig`: 生成配置（可选）
- `user_prompt_id`: 用户提示ID（可选）
- `project`: 项目标识（可选）

**响应示例**:
```json
{
  "candidates": [
    {
      "content": {
        "role": "model",
        "parts": [
          {
            "text": "The capital of France is Paris."
          }
        ]
      },
      "finishReason": "STOP",
      "safetyRatings": []
    }
  ],
  "usageMetadata": {
    "promptTokenCount": 10,
    "candidatesTokenCount": 8,
    "totalTokenCount": 18
  }
}
```

---

### 5.2 生成内容（流式）

启用流式响应的内容生成。

**端点**:
- `POST /gemini/v1internal:streamGenerateContent`
- `POST /gemini/v1beta/models/:modelName:streamGenerateContent`

**认证**: 需要 API Key

**请求体**: 与非流式相同

**响应格式**: Server-Sent Events (SSE) 流式JSON

**流式响应示例**:
```
data: {"candidates":[{"content":{"role":"model","parts":[{"text":"The"}]},...}]}

data: {"candidates":[{"content":{"role":"model","parts":[{"text":" capital"}]},...}]}

data: {"candidates":[{"content":{"role":"model","parts":[{"text":" of France is Paris."}]},...}]}
```

---

### 5.3 Token计数

计算Gemini请求的token数量。

**端点**:
- `POST /gemini/v1internal:countTokens`
- `POST /gemini/v1beta/models/:modelName:countTokens`

**认证**: 需要 API Key

**请求体**:
```json
{
  "contents": [
    {
      "role": "user",
      "parts": [{"text": "Hello, Gemini!"}]
    }
  ],
  "model": "gemini-2.5-flash"
}
```

**响应示例**:
```json
{
  "totalTokens": 8
}
```

---

### 5.4 加载Code Assist

加载代码辅助功能（Gemini Code Assist）。

**端点**:
- `POST /gemini/v1internal:loadCodeAssist`
- `POST /gemini/v1beta/models/:modelName:loadCodeAssist`

**认证**: 需要 API Key

**请求体**: 根据具体需求

---

### 5.5 Onboard用户

初始化Gemini用户设置。

**端点**:
- `POST /gemini/v1internal:onboardUser`
- `POST /gemini/v1beta/models/:modelName:onboardUser`

**认证**: 需要 API Key

**请求体**:
```json
{
  "tierId": "free",
  "cloudaicompanionProject": "my-project",
  "metadata": {}
}
```

---

### 5.6 获取模型列表

获取可用的Gemini模型列表。

**端点**: `GET /gemini/models`

**认证**: 需要 API Key

**响应示例**:
```json
{
  "object": "list",
  "data": [
    {
      "id": "gemini-2.5-flash",
      "object": "model",
      "created": 1735689600,
      "owned_by": "google"
    },
    {
      "id": "gemini-2.0-flash-exp",
      "object": "model",
      "created": 1733011200,
      "owned_by": "google"
    }
  ]
}
```

---

## 6. OpenAI服务端点

OpenAI兼容服务，支持OpenAI Responses (Codex) API格式。

### 6.1 OpenAI Responses (Codex API)

使用OpenAI Responses格式发送请求。

**端点**:
- `POST /openai/responses`
- `POST /openai/v1/responses`

**认证**: 需要 API Key（需要 `openai` 权限）

**请求头**:
```http
x-api-key: cr_abc123def456...
Content-Type: application/json
```

**请求体**:
```json
{
  "model": "gpt-5",
  "instructions": "You are a helpful coding assistant.",
  "messages": [
    {
      "role": "user",
      "content": "Write a Python function to calculate fibonacci numbers."
    }
  ],
  "stream": true,
  "session_id": "session_abc123",
  "temperature": 0.7,
  "max_tokens": 2048
}
```

**参数说明**:
- `model`: 模型名称（必填）
- `instructions`: 系统指令（可选）
- `messages`: 对话消息数组（必填）
- `stream`: 是否流式响应（可选，默认true）
- `session_id`: 会话ID（可选，用于粘性会话）
- 其他参数见OpenAI文档

**响应示例（流式）**:
```
data: {"id":"resp_abc","object":"response","created":1735689600,"model":"gpt-5","choices":[{"index":0,"delta":{"content":"def"},"finish_reason":null}]}

data: {"id":"resp_abc","object":"response","created":1735689600,"model":"gpt-5","choices":[{"index":0,"delta":{"content":" fibonacci"},"finish_reason":null}]}

data: [DONE]
```

**说明**:
- 该端点支持OpenAI Responses格式（Codex API）
- 默认启用流式响应
- 支持会话级粘性（同一session_id使用同一账户）

---

### 6.2 获取使用统计

查询OpenAI服务的使用统计。

**端点**: `GET /openai/usage`

**认证**: 需要 API Key

**响应示例**:
```json
{
  "object": "usage",
  "total_tokens": 50000,
  "total_requests": 100,
  "daily_tokens": 1000,
  "daily_requests": 5,
  "monthly_tokens": 50000,
  "monthly_requests": 100,
  "cost": {
    "total": 5.50,
    "daily": 0.15,
    "monthly": 5.50
  }
}
```

---

### 6.3 获取Key信息

查询API Key在OpenAI服务的信息。

**端点**: `GET /openai/key-info`

**认证**: 需要 API Key

**响应示例**:
```json
{
  "id": "key_abc123",
  "name": "My Production Key",
  "permissions": "all",
  "token_limit": 1000000,
  "tokens_used": 50000,
  "tokens_remaining": 950000,
  "rate_limit": {
    "window": 60,
    "requests": 100
  },
  "usage": {
    "requests": 100,
    "inputTokens": 30000,
    "outputTokens": 20000,
    "totalCost": 5.50
  }
}
```

---

## 7. Droid (Factory.ai)服务端点

Droid服务提供Factory.ai的Claude和OpenAI模型访问。

### 7.1 Droid Claude端点

通过Droid访问Claude模型。

**端点**: `POST /droid/claude/v1/messages`

**认证**: 需要 API Key（需要 `droid` 权限）

**请求头**:
```http
x-api-key: cr_abc123def456...
Content-Type: application/json
```

**请求体**: 遵循Claude Messages API格式（见 [4.1](#41-发送claude消息)）

**响应**: 标准Claude API响应格式

**说明**:
- 使用Droid账户转发到Claude模型
- 支持流式响应
- API Key需要包含 `droid` 权限

---

### 7.2 Droid OpenAI端点

通过Droid访问OpenAI模型。

**端点**:
- `POST /droid/openai/v1/responses`
- `POST /droid/openai/responses`

**认证**: 需要 API Key（需要 `droid` 权限）

**请求体**: 遵循OpenAI Responses格式（见 [6.1](#61-openai-responses-codex-api)）

**响应**: OpenAI API响应格式

---

### 7.3 Droid模型列表

获取Droid支持的模型列表。

**端点**: `GET /droid/*/v1/models`

**认证**: 需要 API Key

**响应示例**:
```json
{
  "object": "list",
  "data": [
    {
      "id": "claude-opus-4-1-20250805",
      "object": "model",
      "created": 1722816000,
      "owned_by": "anthropic",
      "via": "droid"
    },
    {
      "id": "gpt-5-2025-08-07",
      "object": "model",
      "created": 1723161600,
      "owned_by": "openai",
      "via": "droid"
    }
  ]
}
```

---

## 8. 支付相关端点

支付系统支持多种支付方式（ZPAY、Stripe等）。

### 8.1 获取支付配置

获取系统支持的支付方式和充值套餐。

**端点**: `GET /payment/config`

**认证**: 无需认证（公开接口）

**响应示例**:
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "providers": ["zpay", "stripe"],
    "currency": "CNY",
    "exchangeRates": {
      "USD": 1.0,
      "CNY": 7.2
    },
    "packages": [
      {
        "id": "pkg_10",
        "amount": 10,
        "bonus": 0,
        "total": 10,
        "discount": 0,
        "popular": false
      },
      {
        "id": "pkg_50",
        "amount": 50,
        "bonus": 5,
        "total": 55,
        "discount": 0.1,
        "popular": true
      },
      {
        "id": "pkg_100",
        "amount": 100,
        "bonus": 15,
        "total": 115,
        "discount": 0.15,
        "popular": false
      }
    ],
    "zpay": {
      "methods": ["alipay", "wechat"]
    },
    "stripe": {
      "publicKey": "pk_..."
    }
  }
}
```

**字段说明**:
- `enabled`: 支付功能是否启用
- `providers`: 支持的支付提供商
- `packages`: 充值套餐列表
- `bonus`: 赠送金额
- `discount`: 折扣率

---

### 8.2 创建支付订单

创建充值订单并获取支付链接。

**端点**: `POST /payment/orders`

**认证**: 需要 Session Token

**请求体**:
```json
{
  "amount": 100,
  "currency": "CNY",
  "provider": "zpay",
  "paymentMethod": "alipay",
  "packageId": "pkg_100",
  "displayAmount": 100,
  "displayCurrency": "CNY"
}
```

**参数说明**:
- `amount`: 充值金额（必填）
- `currency`: 货币类型（必填，CNY/USD）
- `provider`: 支付提供商（必填，zpay/stripe）
- `paymentMethod`: 支付方式（alipay/wechat/card等）
- `packageId`: 套餐ID（可选，使用套餐时必填）
- `displayAmount`: 显示金额（可选）
- `displayCurrency`: 显示货币（可选）

**响应示例**:
```json
{
  "success": true,
  "data": {
    "orderId": "order_abc123",
    "payUrl": "https://pay.example.com/...",
    "paymentData": null,
    "amount": 100,
    "currency": "CNY",
    "amountUsd": 13.89,
    "displayAmount": 100,
    "displayCurrency": "CNY",
    "bonus": 15,
    "totalCredit": 115,
    "expiredAt": "2025-12-16T12:30:00Z",
    "provider": "zpay",
    "paymentMethod": "alipay",
    "status": "pending"
  }
}
```

**说明**:
- `payUrl`: 支付链接，用户需要访问此链接完成支付
- `expiredAt`: 订单过期时间（通常30分钟）
- `totalCredit`: 实际到账金额（含赠送）

---

### 8.3 获取订单详情

查询指定订单的详细信息。

**端点**: `GET /payment/orders/:orderId`

**认证**: 需要 Session Token

**示例请求**:
```http
GET /payment/orders/order_abc123
Authorization: Bearer <sessionToken>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "order_abc123",
    "userId": "user_123abc",
    "amount": 100,
    "currency": "CNY",
    "amountUsd": 13.89,
    "displayAmount": 100,
    "displayCurrency": "CNY",
    "bonus": 15,
    "totalCredit": 115,
    "status": "paid",
    "provider": "zpay",
    "paymentMethod": "alipay",
    "transactionId": "txn_xyz789",
    "createdAt": "2025-12-16T11:00:00Z",
    "paidAt": "2025-12-16T11:05:32Z",
    "expiredAt": "2025-12-16T11:30:00Z"
  }
}
```

**订单状态**:
- `pending`: 待支付
- `paid`: 已支付
- `expired`: 已过期
- `cancelled`: 已取消
- `refunded`: 已退款

---

### 8.4 获取用户订单列表

查询当前用户的所有订单。

**端点**: `GET /payment/orders`

**认证**: 需要 Session Token

**查询参数**:
- `page` (可选): 页码，默认 `1`
- `pageSize` (可选): 每页数量，默认 `10`，最大 `50`
- `status` (可选): 订单状态过滤

**示例请求**:
```http
GET /payment/orders?page=1&pageSize=10&status=paid
Authorization: Bearer <sessionToken>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "order_abc123",
        "amount": 100,
        "currency": "CNY",
        "status": "paid",
        "provider": "zpay",
        "createdAt": "2025-12-16T11:00:00Z",
        "paidAt": "2025-12-16T11:05:32Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

---

### 8.5 获取支付统计

查询用户的支付统计信息。

**端点**: `GET /payment/stats`

**认证**: 需要 Session Token

**响应示例**:
```json
{
  "success": true,
  "data": {
    "totalOrders": 10,
    "totalAmount": 1000.00,
    "totalAmountUsd": 138.89,
    "paidOrders": 8,
    "paidAmount": 800.00,
    "paidAmountUsd": 111.11,
    "pendingOrders": 2,
    "pendingAmount": 200.00,
    "totalBonus": 120.00,
    "averageOrderAmount": 100.00
  }
}
```

---

### 8.6 支付回调端点（系统使用）

这些端点由支付提供商调用，用户无需直接访问：

- **ZPAY Webhook**: `POST /payment/webhook/zpay` 和 `GET /payment/webhook/zpay`
- **Stripe Webhook**: `POST /payment/webhook/stripe`
- **ZPAY同步回调**: `GET /payment/return/zpay`
- **Stripe同步回调**: `GET /payment/return/stripe`

---

## 9. 邀请返利端点

邀请返利系统允许用户邀请新用户注册并获得奖励。

### 9.1 获取邀请返利信息

查询用户的邀请码和返利统计。

**端点**: `GET /users/referral`

**认证**: 需要 Session Token

**前置条件**: 系统启用邀请返利功能

**响应示例**:
```json
{
  "success": true,
  "data": {
    "referralCode": "ABC123",
    "referralLink": "https://example.com/register?ref=ABC123",
    "stats": {
      "totalInvites": 5,
      "qualifiedInvites": 3,
      "totalRewardUsd": 15.00,
      "pendingRewardUsd": 10.00
    },
    "config": {
      "rewardPerInvite": 5.00,
      "qualificationThreshold": 10.00
    },
    "recentInvitees": [
      {
        "username": "user2",
        "createdAt": "2025-12-15T10:00:00Z",
        "qualified": true,
        "qualifiedAt": "2025-12-16T08:00:00Z"
      }
    ]
  }
}
```

**字段说明**:
- `referralCode`: 用户的邀请码
- `referralLink`: 完整的邀请链接
- `totalInvites`: 总邀请人数
- `qualifiedInvites`: 已完成资格认证的邀请人数
- `totalRewardUsd`: 累计奖励金额
- `qualificationThreshold`: 被邀请人需充值的金额门槛

---

### 9.2 获取邀请列表

查询详细的邀请列表。

**端点**: `GET /users/referral/invitees`

**认证**: 需要 Session Token

**查询参数**:
- `page` (可选): 页码，默认 `1`
- `limit` (可选): 每页数量，默认 `20`
- `qualified` (可选): 过滤已认证的邀请（`true` / `false`）

**示例请求**:
```http
GET /users/referral/invitees?page=1&limit=20&qualified=true
Authorization: Bearer <sessionToken>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "invitees": [
      {
        "inviteeId": "user_def456",
        "inviteeUsername": "john_doe",
        "inviteeEmail": "john@example.com",
        "createdAt": "2025-12-10T09:00:00Z",
        "qualified": true,
        "qualifiedAt": "2025-12-11T14:30:00Z",
        "qualificationAmount": 20.00,
        "rewardUsd": 5.00,
        "rewardPaidAt": "2025-12-11T14:31:00Z"
      },
      {
        "inviteeId": "user_ghi789",
        "inviteeUsername": "jane_smith",
        "inviteeEmail": "jane@example.com",
        "createdAt": "2025-12-12T11:00:00Z",
        "qualified": false,
        "qualifiedAt": null,
        "qualificationAmount": 5.00,
        "rewardUsd": 0,
        "rewardPaidAt": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

**说明**:
- `qualified`: 被邀请人是否完成资格认证（充值达到门槛）
- `qualificationAmount`: 被邀请人的累计充值金额
- `rewardUsd`: 获得的奖励金额
- `rewardPaidAt`: 奖励发放时间

---

## 10. 密码重置和邮箱验证

### 10.1 请求密码重置

发送密码重置邮件到用户邮箱。

**端点**: `POST /users/forgot-password`

**认证**: 无需认证

**请求体**:
```json
{
  "email": "user@example.com"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "If a user account with that email exists, a password reset link has been sent to it."
}
```

**说明**:
- 出于安全考虑，无论邮箱是否存在都返回相同消息
- 重置链接有效期默认1小时（`PASSWORD_RESET_TOKEN_TTL`）
- 受速率限制保护（默认10分钟内最多3次）

---

### 10.2 重置密码

使用邮件中的Token重置密码。

**端点**: `POST /users/reset-password`

**认证**: 无需认证

**请求体**:
```json
{
  "token": "reset_token_abc123...",
  "newPassword": "NewSecurePassword456!"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "Password has been reset successfully. You can now log in with your new password."
}
```

**错误示例**:
```json
{
  "error": "invalid_token",
  "message": "Password reset token is invalid or has expired"
}
```

---

### 10.3 验证邮箱

使用邮件中的Token验证邮箱地址。

**端点**: `POST /users/verify-email`

**认证**: 无需认证

**请求体**:
```json
{
  "token": "verify_token_xyz789..."
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

**说明**:
- 验证Token有效期默认24小时（`EMAIL_VERIFICATION_TOKEN_TTL`）
- 验证成功后账户自动激活

---

### 10.4 重新发送验证邮件

重新发送邮箱验证邮件。

**端点**: `POST /users/resend-verification`

**认证**: 需要 Session Token

**响应示例**:
```json
{
  "success": true,
  "message": "Verification email has been sent"
}
```

**说明**:
- 仅未验证邮箱的用户可以请求
- 受速率限制保护

---

### 10.5 检查密码强度

检查密码的安全强度。

**端点**: `POST /users/check-password-strength`

**认证**: 无需认证

**请求体**:
```json
{
  "password": "MyPassword123!"
}
```

**响应示例**:
```json
{
  "success": true,
  "strength": {
    "score": 3,
    "label": "Strong",
    "feedback": [
      "Add another word or two. Uncommon words are better.",
      "Avoid dates and years that are associated with you."
    ],
    "requirements": {
      "minLength": true,
      "hasUppercase": true,
      "hasLowercase": true,
      "hasNumber": true,
      "hasSpecial": true
    }
  }
}
```

**强度等级**:
- `0`: Very Weak（非常弱）
- `1`: Weak（弱）
- `2`: Fair（一般）
- `3`: Strong（强）
- `4`: Very Strong（非常强）

---

## 认证方式

所有需要认证的端点支持以下方式传递凭据：

### 1. API Key认证

用于服务API端点（Claude、Gemini、OpenAI、Droid等）。

**方式一：请求头**（推荐）
```http
x-api-key: cr_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

**示例**:
```bash
curl -X POST https://api.example.com/api/v1/messages \
  -H "x-api-key: cr_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4-5-20250929","messages":[...]}'
```

---

### 2. Session Token认证

用于用户管理端点（用户资料、API Key管理、支付等）。

**方式一：请求头**（推荐）
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**方式二：Cookie**
```http
Cookie: sessionToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**方式三：请求体**
```json
{
  "sessionToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  ...其他参数
}
```

**示例**:
```bash
# 使用Header
curl -X GET https://api.example.com/users/profile \
  -H "Authorization: Bearer eyJhbGci..."

# 使用Cookie
curl -X GET https://api.example.com/users/profile \
  -b "sessionToken=eyJhbGci..."
```

---

### 3. 无需认证

部分公开端点无需认证：
- `POST /users/register` - 用户注册
- `POST /users/login/*` - 用户登录
- `POST /users/forgot-password` - 请求密码重置
- `POST /users/reset-password` - 重置密码
- `POST /users/verify-email` - 验证邮箱
- `GET /payment/config` - 支付配置
- `GET /health` - 健康检查

---

## 速率限制和配额

### API Key级别限制

每个API Key可配置以下限制：

1. **Token配额** (`tokenLimit`)
   - 可用token总数限制
   - `null` 表示无限制
   - 查询剩余配额：`GET /api/v1/key-info`

2. **每日成本限制** (`dailyCostLimit`)
   - 每日最大消费金额（USD）
   - 每日UTC 0点重置
   - 超限后当日无法使用

3. **总成本限制** (`totalCostLimit`)
   - 累计最大消费金额（USD）
   - 超限后永久禁用（除非管理员调整）

4. **速率限制** (`rateLimit`)
   - 时间窗口内最大请求数
   - 默认配置（可通过管理后台修改）
   - 超限返回 `429 Too Many Requests`

---

### 用户级别限制

1. **登录/注册速率限制**
   - IP级别：30次/15分钟，100次/小时
   - 防止暴力破解和自动化注册

2. **邮件发送限制**
   - 10分钟内最多3封（密码重置、邮箱验证）
   - 防止邮件轰炸

3. **API Key数量限制**
   - 默认每用户1个API Key（`MAX_API_KEYS_PER_USER`）
   - 管理员可调整

---

### 账户级别并发限制

每个后端账户（Claude、Gemini等）有并发请求限制，系统自动管理：
- 并发满时排队或选择其他账户
- 基于Redis Sorted Set的并发计数
- 请求完成后自动释放

---

## 错误响应格式

所有端点的错误响应遵循统一格式：

```json
{
  "error": "error_type",
  "message": "Human-readable error message"
}
```

### 常见HTTP状态码

| 状态码 | 含义 | 常见错误类型 |
|--------|------|-------------|
| `400` | 请求参数错误 | `validation_error`, `invalid_request` |
| `401` | 未认证或认证失败 | `authentication_error`, `invalid_api_key`, `invalid_session` |
| `403` | 无权限访问 | `permission_denied`, `insufficient_quota` |
| `404` | 资源不存在 | `not_found`, `resource_not_found` |
| `429` | 速率限制超限 | `rate_limit_error`, `quota_exceeded` |
| `500` | 服务器内部错误 | `internal_error`, `server_error` |
| `503` | 服务不可用 | `service_unavailable`, `overloaded` |

---

### 错误示例

#### 认证错误（401）
```json
{
  "error": "authentication_error",
  "message": "Invalid API key provided"
}
```

#### 权限错误（403）
```json
{
  "error": "permission_denied",
  "message": "This API key does not have permission to access Gemini services"
}
```

#### 速率限制（429）
```json
{
  "error": "rate_limit_error",
  "message": "Rate limit exceeded. Please try again in 60 seconds."
}
```

#### 配额不足（403）
```json
{
  "error": "insufficient_quota",
  "message": "Daily cost limit of $10.00 exceeded. Current daily cost: $12.50"
}
```

#### 验证错误（400）
```json
{
  "error": "validation_error",
  "message": "Password must be at least 8 characters long"
}
```

#### 服务不可用（503）
```json
{
  "error": "overloaded",
  "message": "All accounts are currently at capacity. Please try again later."
}
```

---

## 总结

本文档涵盖了 Lei Claude Relay Service 所有用户可用的API接口，包括：

### 核心功能
- ✅ **用户管理**: 注册、登录、认证、资料管理
- ✅ **API Key管理**: 创建、查看、删除Keys，配额和成本控制
- ✅ **多平台AI服务**: Claude、Gemini、OpenAI、Droid等模型访问
- ✅ **使用统计**: 详细的token使用、成本分析、趋势查询
- ✅ **支付系统**: 多渠道充值、订单管理、余额查询
- ✅ **邀请返利**: 邀请码生成、返利统计、奖励发放
- ✅ **安全功能**: 密码重置、邮箱验证、密码强度检查

### 使用建议

1. **开发测试**
   - 先在测试环境创建API Key
   - 设置较低的成本限制避免意外消费
   - 使用流式响应提升用户体验

2. **生产环境**
   - 妥善保管API Key（仅在创建时返回完整Key）
   - 设置合理的配额和成本限制
   - 监控使用统计和成本
   - 启用速率限制保护

3. **错误处理**
   - 正确处理所有HTTP状态码
   - 实现指数退避重试策略
   - 记录错误日志便于排查

4. **最佳实践**
   - 使用Session Token管理用户会话
   - 使用API Key调用AI服务
   - 定期检查余额和使用统计
   - 合理利用流式响应提升响应速度

---

**需要帮助？**
- 查看项目文档：[CLAUDE.md](./CLAUDE.md)
- 查看健康状态：`GET /health`
- 查看系统指标：`GET /metrics`

---

*本文档由系统自动生成并持续更新。最后更新时间：2025-12-16*
