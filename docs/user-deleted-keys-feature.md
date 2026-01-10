# 用户查看已删除 API Keys 功能实现文档

## 功能概述

用户现在可以查看自己已删除的 API Key 历史记录，类似于管理员的功能。这个功能已经在系统中完整实现。

## 实现状态 ✅

### 后端实现（已完成）

1. **API 端点支持**
   - 路由：`GET /users/api-keys?includeDeleted=true`
   - 位置：`src/routes/userRoutes.js:976`
   - 支持查询参数 `includeDeleted` 来包含已删除的 keys

2. **服务层支持**
   - 方法：`apiKeyService.getUserApiKeys(userId, includeDeleted)`
   - 位置：`src/services/apiKeyService.js:1649`
   - 当 `includeDeleted=true` 时，返回包含已删除的 API Keys

3. **数据结构**
   - 使用 Redis Set `user_apikeys:${userId}` 作为索引
   - 每个 API Key 存储删除相关字段：
     - `isDeleted`: 删除标记
     - `deletedAt`: 删除时间
     - `deletedBy`: 删除者 ID
     - `deletedByType`: 删除者类型（user/admin）

### 前端实现（已完成）

1. **组件支持**
   - 组件：`UserApiKeysManager.vue`
   - 位置：`web/admin-spa/src/components/user/UserApiKeysManager.vue`
   - 已经调用 `getUserApiKeys(true)` 获取包含已删除的 keys

2. **UI 展示**
   - 已删除的 keys 显示灰色状态
   - 显示删除时间
   - 显示 "已删除" 标签
   - 正确过滤活跃 keys 数量（只计算未删除的）

3. **Store 支持**
   - 方法：`userStore.getUserApiKeys(includeDeleted)`
   - 位置：`web/admin-spa/src/stores/user.js:135`
   - 支持传递 `includeDeleted` 参数到后端

## 性能优化

### Redis 索引结构

1. **现有索引**
   ```
   user_apikeys:${userId}  -> Set<keyId>  // 用户的所有 API Key ID
   ```

2. **优化脚本**
   - 脚本：`scripts/optimize-user-apikeys-index.js`
   - 功能：
     - 检查并修复索引完整性
     - 创建已删除 keys 的专用索引
     - 生成性能统计报告

3. **新增索引（可选）**
   ```
   user_deleted_keys:${userId}  -> Sorted Set<keyId, deletedTimestamp>
   deleted_keys:${date}         -> Set<keyId>  // 按日期分组，30天过期
   ```

## 使用方式

### 用户端

1. 访问 "我的 API Keys" 页面
2. 系统自动加载所有 API Keys（包含已删除的）
3. 已删除的 keys 会以灰色显示，带有 "已删除" 标签
4. 可以查看删除时间和其他历史信息

### API 调用示例

```bash
# 获取包含已删除的 API Keys
curl -X GET "http://localhost:3000/users/api-keys?includeDeleted=true" \
  -H "Authorization: Bearer <sessionToken>"

# 响应示例
{
  "success": true,
  "apiKeys": [
    {
      "id": "key_123",
      "name": "My API Key",
      "isActive": true,
      "isDeleted": "false",
      // ... 其他字段
    },
    {
      "id": "key_456",
      "name": "Old API Key",
      "isActive": false,
      "isDeleted": "true",
      "deletedAt": "2024-01-15T10:30:00Z",
      "deletedBy": "user_789",
      "deletedByType": "user",
      // ... 其他字段
    }
  ],
  "total": 2
}
```

## 运行优化脚本

```bash
# 模拟运行（不修改数据）
node scripts/optimize-user-apikeys-index.js --dry-run

# 实际执行优化
node scripts/optimize-user-apikeys-index.js
```

## 注意事项

1. **数据保留期**：已删除的 API Keys 会永久保留在系统中，除非管理员执行永久删除
2. **权限控制**：用户只能查看自己的已删除 keys，不能查看其他用户的
3. **性能影响**：包含已删除 keys 的查询可能会稍慢，但通过索引优化后影响很小
4. **UI 体验**：已删除的 keys 不计入活跃 keys 数量限制

## 总结

该功能已经完整实现，无需额外修改代码。用户可以直接使用该功能查看自己的已删除 API Keys 历史记录。如需进一步优化性能，可以运行提供的索引优化脚本。