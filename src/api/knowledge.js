import { api } from './client.js';

// 知识检索
export async function searchKnowledge(params) {
  const r = await api.post('/knowledge/search', {
    query: params.query,
    filters: params.filters || {},
    vector_weight: params.vector_weight || 0.7,
    keyword_weight: params.keyword_weight || 0.3,
    top_k: params.top_k || 10
  });
  return r.data;
}

// 获取搜索建议
export async function getSearchSuggestions(query) {
  const r = await api.post('/knowledge/search/suggest', {
    query: query,
    limit: 10
  });
  return r.data;
}

// 获取文档详情
export async function getDocument(docId) {
  const r = await api.get(`/knowledge/documents/${docId}`);
  return r.data;
}

// 获取文档列表
export async function getDocuments(params = {}) {
  const r = await api.get('/knowledge/documents', { params });
  return r.data;
}

// 提交查询反馈
export async function submitQueryFeedback(data) {
  const r = await api.post('/knowledge/feedback', data);
  return r.data;
}

// 上传知识文档
export async function uploadDocument(formData, onProgress = null) {
  const r = await api.post('/knowledge/documents', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 300000, // 5分钟超时
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    }
  });
  return r.data;
}

// 删除知识文档
export async function deleteDocument(docId) {
  const r = await api.delete(`/knowledge/documents/${docId}`);
  return r.data;
}

// 更新文档元数据
export async function updateDocumentMetadata(docId, metadata) {
  const r = await api.patch(`/knowledge/documents/${docId}`, metadata);
  return r.data;
}

// 重新解析文档
export async function reparseDocument(docId) {
  const r = await api.post(`/knowledge/documents/${docId}/reparse`);
  return r.data;
}

// 获取文档处理状态
export async function getDocumentProcessingStatus(docId) {
  const r = await api.get(`/knowledge/documents/${docId}/status`);
  return r.data;
}

// 解析文档（IDP服务）
export async function parseDocumentWithIDP(docId, options = {}) {
  const r = await api.post(`/knowledge/documents/${docId}/reparse`, {
    enable_llm: options.enable_llm !== false,
    enable_formula: options.enable_formula !== false,
    async_mode: false // 强制同步处理
  }, {
    timeout: 300000 // 5分钟超时
  });
  return r.data;
}

// 获取搜索过滤器选项
export async function getSearchFilters() {
  const r = await api.get('/knowledge/search/filters');
  return r.data;
}

// 获取搜索历史
export const getSearchHistory = async () => {
  const response = await api.get('/knowledge/search-history');
  return response.data;
};

// 清空搜索历史
export const clearSearchHistory = async () => {
  const response = await api.delete('/knowledge/search-history');
  return response.data;
};

// 获取文档结构信息
export const getDocumentStructure = async (docId) => {
  const response = await api.get(`/knowledge/documents/${docId}/structure`);
  return response.data;
};

// 保存搜索历史
export async function saveSearchHistory(query, filters = {}) {
  const r = await api.post('/knowledge/search/history', { query, filters });
  return r.data;
}
