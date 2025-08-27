# API 文档 (v1)

## 基本信息

- **基础路径**: `/api/v1`
- **数据交换格式**: JSON
- **字符编码**: UTF-8

## 认证方式

所有需要认证的API请求，必须在HTTP头部包含 `Authorization` 字段。

`Authorization: Bearer {access_token}`

## 通用响应结构

### 成功响应
```json
{
  "code": 200,
  "status": "success",
  "data": { /* 响应数据 */ },
  "message": "可选，补充说明信息（前端可忽略）"
}
```

### 失败响应
```json
{
  "code": 400,
  "status": "error",
  "error": {
    "type": "INVALID_REQUEST",
    "message": "错误详细信息"
  }
}
```

#### 错误码说明

| HTTP 状态码 | 业务错误码(`error.type`) | 错误类型 | 说明 | 示例场景 |
| --- | --- | --- #### 2.13 获取节点厂商命令
- **Endpoint**#### 2.14 保存画布布局
- **Endpoint**: `PUT /cases/{case_id}/layout`
- **功能**: 保存用户自定义的画布节点位置布局。
- **认证**: 需要
- **请求体**:
  ```json
  {
    "node_positions": [
      { "node_id": "node_a1b2c3d4", "x": 100, "y": 200 },
      { "node_id": "node_e5f6g7h8", "x": 300, "y": 150 }
    ],
    "viewport_state": {
      "zoom": 1.2,
      "center_x": 250,
      "center_y": 180
    }
  }
  ```
- **响应体**: `204 No Content`

#### 2.15 获取画布布局
- **Endpoint**: `GET /cases/{case_id}/layout`
- **功能**: 获取之前保存的画布节点位置布局。
- **认证**: 需要
- **响应体**:
  ```json
  {
    "node_positions": [
      { "node_id": "node_a1b2c3d4", "x": 100, "y": 200 },
      { "node_id": "node_e5f6g7h8", "x": 300, "y": 150 }
    ],
    "viewport_state": {
      "zoom": 1.2,
      "center_x": 250,
      "center_y": 180
    }
  }
  ```

#### 2.16 获取节点状态Id}/nodes/{node_id}/commands`
- **功能**: 根据设备厂商返回对应的可复制命令集，用于"可复制命令"Tab。
- **认证**: 需要
- **查询参数**:
  - `vendor` (string, 必需): 设备厂商，如 `Huawei`、`Cisco`、`Juniper`。
- **响应体**:
  ```json
  {
    "vendor": "Huawei",
    "commands": [
      "display ospf",
      "display interface GigabitEthernet0/0/0"
    ]
  }
  ```

#### 2.14 保存画布布局0 | `INVALID_REQUEST` | 参数校验失败 | 请求体缺失必需字段或字段格式不合法 | 创建案例时缺少 `query` 字段 |
| 401 | `UNAUTHORIZED` | 未认证 | 请求未携带或携带无效 Token | Token 过期或无效 |
| 403 | `FORBIDDEN` | 无权限 | 当前用户无权访问该资源 | 尝试访问他人诊断案例 |
| 404 | `NOT_FOUND` | 资源不存在 | 请求的资源不存在 | `case_id` 不存在 |
| 409 | `CONFLICT` | 资源冲突 | 资源状态冲突，无法完成请求 | 重复创建同名案例 |
| 422 | `UNPROCESSABLE_ENTITY` | 业务规则校验失败 | 请求格式正确，但不满足业务规则 | 上传文件大小超限 |
| 429 | `RATE_LIMITED` | 触发限流 | 过短时间内过多请求 | 高频调用生成解决方案接口 |
| 500 | `INTERNAL_ERROR` | 服务器错误 | 非预期后端异常 | 数据库连接失败 |
| 503 | `SERVICE_UNAVAILABLE` | 服务暂不可用 | 下游依赖服务不可用或维护中 | 向量数据库超时 |

错误响应示例（含业务错误码）：
```json
{
  "code": 404,
  "status": "error",
  "error": {
    "type": "NOT_FOUND",
    "message": "指定的 case_id 不存在"
  }
}
```

## 核心概念与数据结构

每一次独立的诊断过程视为一个“**诊断案例 (Case)**”。每个`Case`在逻辑上是一个有向图（Diagnostic Path），由多个“**节点 (Node)**”和连接它们的“**边 (Edge)**”组成。

### Node (节点)
```json
{
  "id": "node_a1b2c3d4",
  "type": "USER_QUERY" | "AI_ANALYSIS" | "AI_CLARIFICATION" | "USER_RESPONSE" | "SOLUTION",
  "title": "标题/节点摘要",
  "status": "COMPLETED" | "AWAITING_USER_INPUT" | "PROCESSING",
  "content": {
    // 当 type 为 USER_QUERY / USER_RESPONSE 时
    "text": "问题文本或用户补充信息",
    "attachments": [ { "type": "image", "url": "https://...", "name": "screenshot.png" } ],

    // 当 type 为 AI_ANALYSIS 时
    "analysis": "AI 的分析摘要",
    "suggested_questions": [ "下一步该检查什么？" ],

    // 当 type 为 SOLUTION 时
    "answer": "为解决OSPF邻居ExStart状态问题，您需要检查接口的MTU值 [doc1]。在华为设备上，可以使用命令 `display ip interface brief` 来查看 [doc2]。",
    "sources": [
        { "id": "doc1", "source_document_name": "HUAWEI-OSPF故障排查手册.pdf", "page_number": 25 },
        { "id": "doc2", "source_document_name": "华为VRP命令参考.pdf", "page_number": 112 }
    ],
    "commands": {
      "Huawei": [ "display ospf", "display interface" ],
      "Cisco": [ "show ip ospf", "show interfaces" ]
    }
  },
  "metadata": {
    "tags": ["OSPF", "MTU"],
    "vendor": "Huawei",
    "relevance": 0.95
  }
}
```

#### Node 字段说明

| 字段 | 类型 | 是否必填 | 取值 / 格式 | 说明 |
| ---- | ---- | -------- | ----------- | ---- |
| `id` | string | 是 | `node_<UUID>` | 节点唯一标识，由后端生成，保证在全局范围内唯一。 |
| `type` | enum | 是 | `USER_QUERY` / `AI_ANALYSIS` / `AI_CLARIFICATION` / `USER_RESPONSE` / `SOLUTION` | 节点业务角色，不同类型驱动不同的前端渲染逻辑。 |
| `title` | string | 是 | 任意 | 节点标题或摘要，用于列表及画布展示。 |
| `status` | enum | 是 | `COMPLETED` / `AWAITING_USER_INPUT` / `PROCESSING` | 节点处理状态：• `PROCESSING` 表示 AI 正在生成内容；• `AWAITING_USER_INPUT` 表示等待用户补充信息；• `COMPLETED` 表示节点已完成。 |
| `content` | object | 视 `type` 而定 | — | 节点主体内容，结构随 `type` 不同，见下表。 |
| `metadata` | object | 否 | — | 搜索与过滤所用的附加信息，如标签、厂商、相关度等。 |

> 以下子字段只在满足对应 `type` 时出现

| `type` | 子字段 | 类型 | 说明 |
| :--- | :--- | :--- | :--- |
| `USER_QUERY` / `USER_RESPONSE` | `text` | string | 用户输入的文本内容 |
|  | `attachments` | Attachment[] | 用户上传的附件，结构见“Attachment 说明” |
| `AI_ANALYSIS` | `analysis` | string | AI 对当前信息的诊断分析摘要 |
|  | `suggested_questions` | string[] | AI 建议的下一步追问列表 |
| `SOLUTION` | `answer` | string | 解决方案正文，可能包含引用标记如 `[doc_x]` |
|  | `sources` | Source[] | 解决方案所引用的知识片段元数据，结构见“Source 说明” |
|  | `commands` | object | 各厂商对应的命令集合，键为厂商名，值为命令字符串数组 |

**Attachment 说明**

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `type` | enum | `image` / `topo` / `log` / `config` / `other` |
| `url` | string | 文件的可访问 URL |
| `name` | string | 原文件名 |

**Source 说明**

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | string | 引用标记 ID，与 `answer` 中的 `[doc_x]` 对应 |
| `source_document_name` | string | 原始文档文件名 |
| `page_number` | integer | 页码（从 1 开始） |

### Edge (边)
```json
{
  "source": "node_a1b2c3d4", // 源节点ID
  "target": "node_e5f6g7h8"  // 目标节点ID
}
```

#### Edge 字段说明

| 字段 | 类型 | 是否必填 | 说明 |
| ---- | ---- | -------- | ---- |
| `source` | string | 是 | 边的起始节点 ID，应指向现有的 `Node.id` |
| `target` | string | 是 | 边的目标节点 ID，应指向现有的 `Node.id` |

---

## API接口列表

### 1. 认证接口 (Authentication)

#### 1.1 用户登录
- **Endpoint**: `POST /auth/login`
- **功能**: 用户使用凭据登录，获取`access_token`。
- **请求体**:
  ```json
  {
    "username": "admin",
    "password": "password123"
  }
  ```
- **响应体**:
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "eyJhbGciOi...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "user_info": { "id": 1, "username": "admin" },
    "user": {
      "id": 1,
      "username": "admin",
      "roles": ["user"],
      "is_active": true,
      "created_at": "2025-07-15T10:00:00Z",
      "updated_at": "2025-07-15T10:30:00Z"
    }
  }
  ```

#### 1.2 用户登出
- **Endpoint**: `POST /auth/logout`
- **功能**: 使当前用户的`access_token`失效。
- **认证**: 需要
- **响应**: `204 No Content`

#### 1.3 刷新 Token
- **Endpoint**: `POST /auth/refresh`
- **功能**: 使用有效的 `refresh_token` 换取新的 `access_token`，延长会话。
- **请求体**:
  ```json
  {
    "refresh_token": "eyJhbGciOi..."
  }
  ```
- **响应体**:
  ```json
  {
    "code": 200,
    "status": "success",
    "data": {
      "access_token": "eyJhbGciOi...",
      "token_type": "Bearer",
      "expires_in": 3600
    }
  }
  ```

#### 1.4 获取当前用户信息
- **Endpoint**: `GET /auth/me`
- **功能**: 获取当前登录用户的基本信息，用于前端初始化。
- **认证**: 需要
- **响应体**:
  ```json
  {
    "user": {
      "id": 1,
      "username": "admin",
      "roles": ["admin"],
      "stats": {
        "cases": {
          "total": 25,
          "solved": 20,
          "open": 5
        },
        "feedback_count": 15
      },
      "preferences": {
        "theme": "light",
        "language": "zh-cn"
      }
    }
  }
  ```

### 2. 诊断案例接口 (Case)

#### 2.1 获取案例列表
- **Endpoint**: `GET /cases`
- **功能**: 获取当前用户的诊断案例列表。
- **认证**: 需要
- **查询参数**:
  - `status` (string, 可选): `open` | `solved`。
  - `vendor` (string, 可选): 过滤指定厂商，如 `Huawei`、`Cisco`、`Juniper`。
  - `category` (string, 可选): 故障分类过滤，例如 `OSPF`、`BGP`、`MPLS`。
  - `attachment_type` (string, 可选): `topo` | `log` | `config` | `none`。
- **响应体**:
  ```json
  {
    "items": [
      {
        "case_id": "case_12345",
        "title": "MPLS VPN 跨域不通",
        "status": "open",
        "created_at": "2025-07-15T10:30:00Z",
        "updated_at": "2025-07-15T11:00:00Z"
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "per_page": 10,
      "pages": 5
    }
  }
  ```

#### 2.2 创建新案例
- **Endpoint**: `POST /cases`
- **功能**: 用户输入第一个问题，创建新诊断案例及初始图。
- **认证**: 需要
- **请求体**:
  ```json
  {
    "query": "我的OSPF邻居状态为什么卡在ExStart？",
    "attachments": [
      { "type": "image", "url": "https://example.com/topology.png", "name": "topology.png" }
    ]
  }
  ```
- **响应体**: 包含`case_id`, `title`, 初始`nodes`和`edges`。

#### 2.3 获取案例详情
- **Endpoint**: `GET /cases/{case_id}`
- **功能**: 获取指定案例的完整图谱信息。
- **认证**: 需要
- **响应体**: 完整的案例图谱数据。

#### 2.4 获取案例状态
- **Endpoint**: `GET /cases/{case_id}/status`
- **功能**: 获取案例的当前状态，用于前端轮询检查后台处理进度。
- **认证**: 需要
- **响应体**:
  ```json
  {
    "case_status": "processing",
    "processing_node_id": "node_ai_analysis_3"
  }
  ```

#### 2.5 更新案例
- **Endpoint**: `PUT /cases/{case_id}`
- **功能**: 更新案例的基本信息，如标题、状态等。
- **认证**: 需要
- **请求体**:
  ```json
  {
    "title": "更新后的案例标题",
    "status": "open" | "solved" | "closed"
  }
  ```
- **响应体**: 更新后的案例信息。

#### 2.6 删除案例
- **Endpoint**: `DELETE /cases/{case_id}`
- **功能**: 删除一个诊断案例。
- **认证**: 需要
- **响应**: `204 No Content`

#### 2.7 驱动诊断路径 (交互)
- **Endpoint**: `POST /cases/{case_id}/interactions`
- **功能**: 在某节点上交互，驱动AI生成后续节点，增量更新图。
- **认证**: 需要
- **请求体**:
  ```json
  {
    "parent_node_id": "node_a1b2c3d4",
    "response": {
      "text": "这是我获取的debug日志。",
      "attachments": [{ "type": "log", "url": "https://example.com/debug.log", "name": "debug.log" }]
    }
  }
  ```
- **响应体**: 新增的节点和边。

#### 2.8 获取节点详情
- **Endpoint**: `GET /cases/{case_id}/nodes/{node_id}`
- **功能**: 获取图中某个节点的详细信息。
- **认证**: 需要
- **响应体**: 单个`Node`对象。

#### 2.9 更新节点信息
- **Endpoint**: `PUT /cases/{case_id}/nodes/{node_id}`
- **功能**: 更新节点的标题、状态、内容或元数据。
- **认证**: 需要
- **请求体**: 包含节点更新字段的JSON对象。
- **响应体**: 更新后的`Node`对象。

#### 2.10 重新生成节点内容
- **Endpoint**: `POST /cases/{case_id}/nodes/{node_id}/regenerate`
- **功能**: 基于用户的指导性提示，使用AI服务重新生成指定节点的内容。
- **认证**: 需要
- **请求体**:
  ```json
  {
    "prompt": "请从另一个角度分析，考虑MTU不匹配的可能性。",
    "regeneration_strategy": "more_detailed" | "simpler" | "default"
  }
  ```
- **响应体**:
  ```json
  {
    "message": "节点已成功重新生成",
    "node": {
      "id": "node_a1b2c3d4",
      "type": "AI_ANALYSIS",
      "title": "AI重新分析",
      "status": "COMPLETED",
      "content": {
        "analysis": "经过重新分析，MTU不匹配是导致OSPF邻居卡在ExStart状态的主要原因...",
        "confidence": 0.92
      },
      "metadata": {
        "regenerated": true,
        "regeneration_count": 1,
        "user_prompt": "请从另一个角度分析，考虑MTU不匹配的可能性。"
      }
    }
  }
  ```

#### 2.11 评价节点
- **Endpoint**: `POST /cases/{case_id}/nodes/{node_id}/rate`
- **功能**: 对单个节点的分析质量进行评分和评论，用于改进AI模型。
- **认证**: 需要
- **请求体**:
  ```json
  {
    "rating": 5,
    "comment": "这个分析非常准确，直接指出了问题关键。"
  }
  ```
- **响应体**:
  ```json
  {
    "message": "节点评价已提交",
    "rating": {
      "value": 5,
      "comment": "这个分析非常准确，直接指出了问题关键。",
      "rated_at": "2025-07-15T14:30:00Z"
    }
  }
  ```

#### 2.12 获取节点厂商命令
- **Endpoint**: `GET /cases/{case_id}/nodes/{node_id}/commands`
- **功能**: 根据指定的设备厂商，返回与该节点相关的可复制命令集。
- **认证**: 需要
- **查询参数**:
  - `vendor` (string, 必需): 设备厂商，如 `Huawei`、`Cisco`、`Juniper`。
- **响应体**:
  ```json
  {
    "vendor": "Huawei",
    "commands": [
      "display ospf peer",
      "display interface GigabitEthernet0/0/0",
      "interface GigabitEthernet0/0/0",
      "mtu 1500"
    ]
  }
  ```

#### 2.13 提交或更新案例反馈
- **Endpoint**: `PUT /cases/{case_id}/feedback`
- **功能**: 提交对整个诊断案例的最终结果反馈，用于知识自进化。此操作是幂等的。
- **认证**: 需要
- **请求体**:
  ```json
  {
    "outcome": "solved" | "unsolved",
    "rating": 4,
    "comment": "解决方案有效，但步骤可以更简洁。",
    "corrected_solution": "1. 检查MTU配置\n2. 修改接口MTU为1500\n3. 重启OSPF进程",
    "knowledge_contribution": {
      "new_knowledge": "华为设备OSPF MTU问题的快速诊断方法",
      "source_references": ["RFC2328", "华为配置指南"]
    },
    "additional_context": {
      "device_model": "NE40E-X8",
      "software_version": "V800R012C00",
      "network_environment": "生产环境"
    }
  }
  ```
- **响应体**: `204 No Content`

#### 2.14 保存画布布局
- **Endpoint**: `PUT /cases/{case_id}/layout`
- **功能**: 保存用户自定义的画布节点位置布局。
- **认证**: 需要
- **请求体**:
  ```json
  {
    "node_positions": [
      { "node_id": "node_a1b2c3d4", "x": 100, "y": 200 },
      { "node_id": "node_e5f6g7h8", "x": 300, "y": 150 }
    ],
    "viewport_state": {
      "zoom": 1.2,
      "center_x": 250,
      "center_y": 180
    }
  }
  ```
- **响应体**: `204 No Content`

#### 2.15 获取画布布局
- **Endpoint**: `GET /cases/{case_id}/layout`
- **功能**: 获取之前保存的画布节点位置布局。
- **认证**: 需要
- **响应体**:
  ```json
  {
    "node_positions": [
      { "node_id": "node_a1b2c3d4", "x": 100, "y": 200 },
      { "node_id": "node_e5f6g7h8", "x": 300, "y": 150 }
    ],
    "viewport_state": {
      "zoom": 1.2,
      "center_x": 250,
      "center_y": 180
    }
  }
  ```

#### 2.16 获取案例处理状态
- **Endpoint**: `GET /cases/{case_id}/status`
- **功能**: 获取当前诊断案例的整体处理状态，用于前端轮询检查后台进度。
- **认证**: 需要
- **响应体**:
  ```json
  {
    "case_status": "processing" | "completed" | "awaiting_input" | "error",
    "processing_node_id": "node_ai_analysis_2"
  }
  ```

#### 2.17 获取案例节点列表
- **Endpoint**: `GET /cases/{case_id}/nodes`
- **功能**: 获取指定案例的所有节点信息
- **认证**: 需要
- **响应体**:
  ```json
  {
    "nodes": [
      {
        "id": "node_1",
        "type": "question",
        "content": "网络连接异常",
        "position": { "x": 100, "y": 200 },
        "created_at": "2025-07-15T10:00:00Z",
        "updated_at": "2025-07-15T10:30:00Z"
      }
    ]
  }
  ```

#### 2.18 获取案例边列表
- **Endpoint**: `GET /cases/{case_id}/edges`
- **功能**: 获取指定案例的所有边（连接）信息
- **认证**: 需要
- **响应体**:
  ```json
  {
    "edges": [
      {
        "id": "edge_1",
        "source": "node_1",
        "target": "node_2",
        "type": "flow",
        "created_at": "2025-07-15T10:00:00Z"
      }
    ]
  }
  ```

#### 2.19 获取案例反馈
- **Endpoint**: `GET /cases/{case_id}/feedback`
- **功能**: 获取指定案例的用户反馈信息
- **认证**: 需要
- **响应体**:
  ```json
  {
    "feedback": {
      "rating": 5,
      "comment": "解决方案很有帮助",
      "is_helpful": true,
      "created_at": "2025-07-15T10:00:00Z",
      "updated_at": "2025-07-15T10:30:00Z"
    }
  }
  ```

#### 2.20 获取节点知识溯源
- **Endpoint**: `GET /cases/{case_id}/nodes/{node_id}/knowledge`
- **功能**: 获取节点回答的知识来源和相关文档
- **认证**: 需要
- **响应体**:
  ```json
  {
    "knowledge_sources": [
      {
        "document_id": "doc_123",
        "document_title": "网络故障排查手册",
        "chunk_id": "chunk_456",
        "relevance_score": 0.95,
        "content_preview": "当出现IP地址冲突时..."
      }
    ]
  }
  ```

### 3. 系统接口 (System)

#### 3.1 获取统计数据
- **Endpoint**: `GET /system/statistics`
- **功能**: 获取用于渲染数据看板的聚合统计数据。
- **认证**: 需要
- **查询参数**:
  - `time_range` (string, 可选): `7d` | `30d` | `90d`。默认为 `30d`。
- **响应体**:
  ```json
  {
    "fault_categories": [
      { "name": "VPN", "value": 120, "percentage": 34.3, "trend": "+5.2%" },
      { "name": "OSPF", "value": 95, "percentage": 27.1, "trend": "-2.1%" },
      { "name": "BGP", "value": 60, "percentage": 17.1, "trend": "+1.8%" },
      { "name": "IPsec", "value": 45, "percentage": 12.9, "trend": "+0.5%" },
      { "name": "Other", "value": 30, "percentage": 8.6, "trend": "-1.2%" }
    ],
    "resolution_trend": [
      { "date": "2025-07-01", "rate": 0.80, "total_cases": 45, "resolved_cases": 36 },
      { "date": "2025-07-02", "rate": 0.82, "total_cases": 52, "resolved_cases": 43 },
      { "date": "2025-07-03", "rate": 0.85, "total_cases": 48, "resolved_cases": 41 }
    ],
    "knowledge_coverage": {
      "heatmap_data": [
        {
          "topic": "OSPF",
          "vendor": "Huawei",
          "coverage": 95,
          "document_count": 45,
          "last_updated": "2025-07-15T10:00:00Z",
          "quality_score": 0.92,
          "gaps": ["OSPF v3配置", "NSSA区域故障"]
        },
        {
          "topic": "OSPF",
          "vendor": "Cisco",
          "coverage": 80,
          "document_count": 32,
          "last_updated": "2025-07-14T15:30:00Z",
          "quality_score": 0.85,
          "gaps": ["OSPF LSA类型7", "虚链路配置"]
        }
      ],
      "overall_stats": {
        "total_topics": 25,
        "average_coverage": 78.5,
        "critical_gaps": 3,
        "recently_updated": 12,
        "top_vendors": ["Huawei", "Cisco", "Juniper"]
      }
    },
    "performance_metrics": {
      "average_resolution_time": 1245,
      "user_satisfaction_rate": 0.87,
      "knowledge_base_usage": {
        "total_queries": 2340,
        "hit_rate": 0.92,
        "average_retrieval_time": 234
      }
    },
    "user_activity": {
      "active_users": 15,
      "new_cases_today": 8,
      "pending_cases": 12,
      "top_users": []
    },
    "timestamp": "2025-07-15T14:30:00Z"
  }
  ```

#### 3.2 获取系统状态
- **Endpoint**: `GET /system/status`
- **功能**: 获取系统基本运行状态信息，包括版本、运行时间、数据库状态等。
- **认证**: 无需认证
- **响应体**:
  ```json
  {
    "code": 200,
    "status": "success",
    "data": {
      "version": "1.0.0",
      "uptime": "5 days, 12 hours",
      "database_status": "connected",
      "redis_status": "connected",
      "status": "running",
      "timestamp": "2025-07-15T14:30:00Z",
      "system": {
        "cpu_percent": 25.6,
        "memory_percent": 68.3,
        "disk_percent": 42.1
      }
    }
  }
  ```

#### 3.3 获取系统健康状况
- **Endpoint**: `GET /system/health`
- **功能**: 获取各个系统组件的健康状况检查结果。
- **认证**: 无需认证
- **响应体**:
  ```json
  {
    "code": 200,
    "status": "success",
    "data": {
      "healthy": true,
      "services": {
        "database": {
          "status": "up",
          "response_time": 0.1
        },
        "redis": {
          "status": "up",
          "response_time": 0.05
        },
        "memory": {
          "status": "up",
          "response_time": 0.01
        },
        "disk": {
          "status": "up",
          "response_time": 0.01
        }
      },
      "timestamp": "2025-07-15T14:30:00Z"
    }
  }
  ```

#### 3.4 获取系统指标
- **Endpoint**: `GET /system/metrics`
- **功能**: 获取详细的系统性能指标，需要管理员权限。
- **认证**: 需要（管理员权限）
- **响应体**:
  ```json
  {
    "cpu_usage": 25.6,
    "memory_usage": 68.3,
    "disk_usage": 42.1,
    "network_io": {
      "bytes_sent": 1048576,
      "bytes_recv": 2097152
    },
    "request_count": 1234,
    "error_rate": 0.02,
    "timestamp": "2025-07-15T14:30:00Z"
  }
  ```
- **Endpoint**: `GET /statistics/top-issues`
- **功能**: 获取最常见的问题类型排行榜。
- **认证**: 需要
- **查询参数**:
  - `limit` (integer, 可选): 返回的问题数量，默认为 10。
- **响应体**:
  ```json
  {
    "top_issues": [
      {
        "issue": "OSPF邻居状态异常",
        "count": 25
      },
      {
        "issue": "BGP会话建立失败",
        "count": 18
      }
    ]
  }
  ```

### 4. 知识文档接口 (Knowledge Documents)

> 用户可通过以下端点上传原始知识文档（PDF、Word、图片、Markdown 等）并查看其解析状态。后台会将文件保存到**本地文件系统**，并异步触发 IDP 解析 → 语义切分 → 向量化 → 入库流水线。

#### 4.1 上传知识文档
- **Endpoint**: `POST /knowledge/documents`
- **功能**: 上传一个新的知识文档。
- **认证**: 需要
- **请求格式**: `multipart/form-data`
- **表单字段**:
  | 字段 | 类型 | 是否必填 | 说明 |
  | ---- | ---- | ------ | ---- |
  | `file` | file | 是 | 待上传的文档文件 |
  | `tags` | string[] | 否 | 标签数组，用于元数据过滤（如["OSPF","Huawei"]） |
  | `vendor` | string | 否 | 设备厂商标识，如 `Huawei` / `Cisco` |
- **响应体**:
  ```json
  {
    "doc_id": "doc_123456",
    "status": "QUEUED",
    "message": "文档已加入处理队列"
  }
  ```

#### 4.2 获取文档列表
- **Endpoint**: `GET /knowledge/documents`
- **功能**: 分页获取当前用户已上传的知识文档。
- **认证**: 需要
- **查询参数**:
  - `status` (string, 可选): `QUEUED` | `PARSING` | `INDEXED` | `FAILED`
  - `vendor` (string, 可选): 过滤指定厂商文档
  - `page` / `page_size` (int, 可选): 分页参数
- **响应体**:
  ```json
  {
    "documents": [
      {
        "doc_id": "doc_123456",
        "file_name": "OSPF_RFC2328.pdf",
        "vendor": "Huawei",
        "tags": ["OSPF"],
        "status": "INDEXED",
        "uploaded_at": "2025-07-20T09:00:00Z"
      }
    ],
    "pagination": {
      "total": 40,
      "page": 1,
      "per_page": 10,
      "pages": 4
    }
  }
  ```

#### 4.3 获取单个文档详情
- **Endpoint**: `GET /knowledge/documents/{doc_id}`
- **功能**: 获取指定知识文档的元数据及解析进度。
- **认证**: 需要
- **响应体**:
  ```json
  {
    "doc_id": "doc_123456",
    "file_name": "OSPF_RFC2328.pdf",
    "vendor": "Huawei",
    "tags": ["OSPF"],
    "status": "PARSING",
    "progress": 45,
    "message": "正在进行OCR识别",
    "created_at": "2025-07-20T09:00:00Z",
    "updated_at": "2025-07-20T09:05:00Z"
  }
  ```

#### 4.4 获取文档解析状态
- **Endpoint**: `GET /knowledge/documents/{doc_id}/status`
- **功能**: 获取单个文档的详细解析状态和历史作业记录。
- **认证**: 需要
- **响应体**:
  ```json
  {
    "current_status": "INDEXED",
    "history": [
      {
        "job_id": "job_xyz",
        "status": "SUCCESS",
        "started_at": "2025-07-20T09:01:00Z",
        "finished_at": "2025-07-20T09:05:00Z",
        "message": "文档解析和索引成功完成。"
      }
    ]
  }
  ```

#### 4.5 删除知识文档
- **Endpoint**: `DELETE /knowledge/documents/{doc_id}`
- **功能**: 删除一个知识文档及其索引数据（需要管理员或文档上传者权限）。
- **认证**: 需要
- **响应**: `204 No Content`

#### 4.5 重新解析知识文档
- **Endpoint**: `POST /knowledge/documents/{doc_id}/reparse`
- **功能**: 对解析失败或需要重新 OCR 的文档重新触发解析流水线。
- **认证**: 需要
- **响应体**:
  ```json
  {
    "doc_id": "doc_123456",
    "status": "PARSING",
    "message": "已触发重新解析"
  }
  ```

#### 4.6 更新文档元数据
- **Endpoint**: `PUT /knowledge/documents/{doc_id}`
- **功能**: 更新文档的标签 (`tags`) 或厂商 (`vendor`) 等元数据。
- **认证**: 需要
- **请求体**:
  ```json
  {
    "tags": ["OSPF", "BGP"],
    "vendor": "Huawei"
  }
  ```
- **响应体**:
  ```json
  {
    "status": "success"
  }
  ```

#### 4.8 获取所有标签
- **Endpoint**: `GET /knowledge/tags`
- **功能**: 获取当前用户所有知识文档中使用的全部唯一标签。
- **认证**: 需要
- **响应体**:
  ```json
  {
    "tags": ["OSPF", "BGP", "Huawei", "Cisco"],
    "total": 4
  }
  ```

### 5. 文件与附件接口 (Files)

#### 5.1 上传附件
- **Endpoint**: `POST /files`
- **功能**: 上传单个附件（图片 / 拓扑 / 日志压缩包等），返回文件`file_id`及访问 URL。
- **认证**: 需要
- **请求**: `multipart/form-data`
- **表单字段**:
  | 字段 | 类型 | 是否必填 | 说明 |
  | ---- | ---- | ------ | ---- |
  | `file` | file | 是 | 待上传的文件 |
  | `file_type` | string | 否 | 文件类型标识：`image`/`topo`/`log`/`config`/`other` |
  | `description` | string | 否 | 文件描述信息 |
- **文件限制**:
  - 支持格式：PDF, PNG, JPG, JPEG, GIF, TXT, LOG, ZIP, TAR.GZ
  - 单文件最大：50MB
  - 图片文件最大：10MB
- **响应体**:
  ```json
  {
    "file_id": "file_abc123",
    "url": "/api/v1/files/file_abc123",
    "file_name": "network_topology.png",
    "file_size": 2048576,
    "file_type": "image",
    "mime_type": "image/png",
    "uploaded_at": "2025-07-15T10:30:00Z",
    "security_scan": {
      "status": "clean",
      "scan_time": "2025-07-15T10:30:05Z"
    }
  }
  ```

#### 5.2 获取附件
- **Endpoint**: `GET /files/{file_id}`
- **功能**: 下载 / 预览附件文件。
- **认证**: 需要（文件权限继承案例权限）
- **查询参数**:
  - `download` (boolean, 可选): 是否强制下载，默认为预览
  - `thumbnail` (boolean, 可选): 是否返回缩略图（仅图片文件）
- **响应**: `200 OK`, 文件流
- **响应头**:
  ```
  Content-Type: image/png
  Content-Length: 2048576
  Content-Disposition: inline; filename="network_topology.png"
  X-File-Security-Status: clean
  ```

#### 5.3 获取文件元数据
- **Endpoint**: `GET /files/{file_id}/metadata`
- **功能**: 获取文件的详细元数据信息。
- **认证**: 需要
- **响应体**:
  ```json
  {
    "file_id": "file_abc123",
    "file_name": "network_topology.png",
    "file_size": 2048576,
    "file_type": "image",
    "mime_type": "image/png",
    "uploaded_at": "2025-07-15T10:30:00Z",
    "uploaded_by": "user_id_001",
    "associated_cases": ["case_001", "case_002"],
    "download_count": 15,
    "last_accessed": "2025-07-15T14:20:00Z",
    "security_scan": {
      "status": "clean",
      "scan_time": "2025-07-15T10:30:05Z",
      "scan_engine": "ClamAV"
    }
  }
  ```

#### 5.4 批量上传附件
- **Endpoint**: `POST /files/batch`
- **功能**: 批量上传多个附件文件。
- **认证**: 需要
- **请求**: `multipart/form-data`，支持多个 `files[]` 字段
- **响应体**:
  ```json
  {
    "upload_results": [
      {
        "file_name": "config1.txt",
        "status": "success",
        "file_id": "file_001",
        "url": "/api/v1/files/file_001"
      },
      {
        "file_name": "large_file.zip",
        "status": "failed",
{{ ... }}
        "error": "文件大小超过限制"
      }
    ],
    "summary": {
      "total": 2,
      "successful": 1,
      "failed": 1
    }
  }
  ```

### 6. 用户设置接口 (User Settings)

#### 6.1 获取用户设置
- **Endpoint**: `GET /user/settings`
- **功能**: 获取当前登录用户的个性化配置（主题、通知偏好等）。
- **认证**: 需要
- **响应体**:
  ```json
  {
    "theme": "system",          // light | dark | system
    "language": "zh-cn",
    "notifications": {
      "solution": true,
      "mention": false
    }
  }
  ```
#### 6.2 更新用户设置
- **Endpoint**: `PUT /user/settings`
- **功能**: 更新用户个性化配置。支持部分字段更新。
- **认证**: 需要
- **请求体**:
  ```json
  {
    "theme": "dark",
    "notifications": {
      "solution": false
    }
  }
  ```
- **响应体**:
  ```json
  {
    "message": "用户设置已更新",
    "updated_fields": ["theme", "notifications.solution"]
  }
  ```

### 7. 通知接口 (Notifications)

#### 7.1 获取通知列表
- **Endpoint**: `GET /notifications`
- **功能**: 分页获取当前用户的历史通知。
- **认证**: 需要
- **查询参数**:
  - `page` (integer, 可选, 默认 1)
  - `page_size` (integer, 可选, 默认 20)
  - `type` (string, 可选): 按类型过滤 (`solution` | `mention` | `system`)
  - `read` (boolean, 可选): 按已读状态过滤 (`true` | `false`)
- **响应体**:
  ```json
  {
    "page": 1,
    "page_size": 20,
    "total": 45,
    "items": [
      {
        "id": "noti_001",
        "type": "solution",
        "title": "诊断案例已生成解决方案",
        "content": "您的案例 'OSPF邻居建立失败' 已完成分析",
        "read": false,
        "related_case_id": "case_123",
        "created_at": "2025-07-15T11:30:00Z"
      },
      {
        "id": "noti_002",
        "type": "system",
        "title": "系统维护通知",
        "content": "系统将于今晚23:00进行维护升级",
        "read": true,
        "created_at": "2025-07-14T16:00:00Z"
      }
    ]
  }
  ```

#### 7.2 标记单个通知已读
- **Endpoint**: `POST /notifications/{notification_id}/read`
- **功能**: 将指定的单个通知标记为已读状态。
- **认证**: 需要
- **响应**: `204 No Content`

#### 7.3 批量标记通知已读
- **Endpoint**: `POST /notifications/batch/read`
- **功能**: 批量将通知标记为已读。如果请求体为空，则标记所有未读通知。
- **认证**: 需要
- **请求体**:
  ```json
  {
    "notification_ids": ["noti_001", "noti_002"]
  }
  ```
- **响应体**:
  ```json
  {
    "marked_count": 2,
    "message": "已标记 2 条通知为已读"
  }
  ```

#### 7.4 获取未读通知数量
- **Endpoint**: `GET /notifications/unread-count`
- **功能**: 获取当前用户未读通知的总数及分类统计。
- **认证**: 需要
- **响应体**:
  ```json
  {
    "total": 5,
    "by_type": {
      "solution": 2,
      "mention": 1,
      "system": 2
    }
  }
  ```

### 8. 智能分析接口 (AI Analysis)

#### 8.1 解析技术日志
- **Endpoint**: `POST /analysis/log-parsing`
- **功能**: 使用大模型解析网络设备日志，提取关键信息和异常点。
- **认证**: 需要
- **请求体**:
  ```json
  {
    "log_type": "debug_ip_packet" | "ospf_debug" | "bgp_debug" | "system_log",
    "vendor": "Huawei" | "Cisco" | "Juniper",
    "log_content": "原始日志内容...",
    "context_info": {
      "device_model": "NE40E-X8",
      "problem_description": "用户报告的问题描述"
    }
  }
  ```
- **响应体**:
  ```json
  {
    "summary": "检测到OSPF邻居建立过程中的MTU不匹配问题",
    "anomalies": [
      {
        "type": "MTU_MISMATCH",
        "severity": "high",
        "location": "interface GE0/0/1",
        "description": "检测到MTU不匹配问题，本端1500，对端1400"
      }
    ],
    "suggested_actions": [
      {
        "action": "检查接口MTU配置",
        "commands": {
          "Huawei": ["display interface GE0/0/1", "interface GE0/0/1", "mtu 1500"],
          "Cisco": ["show interface GigabitEthernet0/0/1", "interface GigabitEthernet0/0/1", "mtu 1500"]
        }
      }
    ]
  }
  ```

### 6. 用户设置接口 (User Settings)

#### 6.1 获取用户设置
- **Endpoint**: `GET /user/settings`
- **功能**: 获取当前登录用户的个性化配置（主题、通知偏好等）。
- **认证**: 需要
- **响应体**:
  ```json
  {
{{ ... }}
    }
  }
  ```

#### 6.2 更新用户设置
- **Endpoint**: `PUT /user/settings`
- **功能**: 更新用户个性化配置。支持部分字段更新。
- **认证**: 需要
- **请求体**:
  ```json
  {
{{ ... }}
- **请求体**:
  ```json
  {
    "template_name": "diagnosis_analysis",
    "variables": {
      "user_query": "OSPF邻居建立失败",
      "context": "华为设备"
    }
  }
  ```
- **响应体**:
{{ ... }}
  {
    "rendered_prompt": "请分析以下网络问题...",
    "token_count": 150,
    "template_metadata": {
      "version": "1.0",
      "last_updated": "2025-07-15T10:00:00Z"
    }
  }
  ```

#### 9.4 向量数据库管理
- **Endpoint**: `POST /dev/vector/rebuild`
- **功能**: 重建向量数据库索引（开发调试用）。
- **认证**: 需要（开发环境）
- **请求体**:
  ```json
  {
    "document_ids": ["doc_001", "doc_002"], // 可选，指定文档ID
    "force_rebuild": true
  }
  ```
- **响应体**:
  ```json
  {
    "job_id": "rebuild_job_001",
    "status": "queued",
    "estimated_time": "5-10分钟"
  }
  ```
