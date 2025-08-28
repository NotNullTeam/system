import { api } from './client.js';

// 获取案例列表
export async function getCases(params = {}) {
  const r = await api.get('/cases/', { params });
  return r.data;
}

// 获取案例详情
export async function getCaseById(id) {
  const r = await api.get(`/cases/${id}`);
  return r.data;
}

// 创建案例
export async function createCase(data) {
  const r = await api.post('/cases/', data);
  return r.data;
}

// 更新案例
export async function updateCase(id, data) {
  const r = await api.put(`/cases/${id}`, data);
  return r.data;
}

// 删除案例
export async function deleteCase(id) {
  const r = await api.delete(`/cases/${id}`);
  return r.data;
}

// 获取案例节点
export async function getCaseNodes(caseId) {
  const r = await api.get(`/cases/${caseId}/nodes`);
  return r.data;
}

// 创建节点
export async function createNode(caseId, data) {
  const r = await api.post(`/cases/${caseId}/nodes`, data);
  return r.data;
}

// 更新节点
export async function updateNode(caseId, nodeId, data) {
  const r = await api.put(`/cases/${caseId}/nodes/${nodeId}`, data);
  return r.data;
}

// 删除节点
export async function deleteNode(caseId, nodeId) {
  const r = await api.delete(`/cases/${caseId}/nodes/${nodeId}`);
  return r.data;
}

// 获取案例边
export async function getCaseEdges(caseId) {
  const r = await api.get(`/cases/${caseId}/edges`);
  return r.data;
}

// 创建边
export async function createEdge(caseId, data) {
  const r = await api.post(`/cases/${caseId}/edges`, data);
  return r.data;
}

// 更新边
export async function updateEdge(caseId, edgeId, data) {
  const r = await api.put(`/cases/${caseId}/edges/${edgeId}`, data);
  return r.data;
}

// 删除边
export async function deleteEdge(caseId, edgeId) {
  const r = await api.delete(`/cases/${caseId}/edges/${edgeId}`);
  return r.data;
}

// 提交反馈
export async function submitFeedback(caseId, data) {
  const r = await api.put(`/cases/${caseId}/feedback`, data);
  return r.data;
}

// 交互驱动诊断流程
export async function submitInteraction(caseId, data) {
  // 兼容旧字段，规范为后端期望字段
  const payload = {
    // 父节点ID：优先使用 camelCase，其次兼容 snake_case 等写法
    parentNodeId:
      data?.parentNodeId ??
      data?.parent_node_id ??
      data?.parent_nodeID ??
      data?.parent_nodeId ??
      data?.parentId ??
      data?.parent_id,
    // 响应内容：若已有 response 则直传，否则根据现有字段组装
    response:
      data?.response ?? {
        type: data?.type,
        content: data?.content,
        attachments: data?.attachments || [],
      },
    // 可选参数：检索权重与过滤标签
    retrievalWeight: data?.retrievalWeight ?? data?.retrieval_weight ?? 0.7,
    filterTags: data?.filterTags ?? data?.filter_tags ?? [],
  };

  const r = await api.post(`/cases/${caseId}/interactions`, payload);
  return r.data;
}

// 获取单个节点详情
export async function getNodeDetail(caseId, nodeId) {
  const r = await api.get(`/cases/${caseId}/nodes/${nodeId}`);
  return r.data;
}
