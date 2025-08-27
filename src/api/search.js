import { api } from './client.js';

// 知识检索
export async function searchKnowledge(params) {
  const r = await api.post('/search/knowledge', params);
  return r.data;
}

// 获取搜索建议词
export async function getSearchSuggestions(query) {
  const r = await api.get('/search/suggestions', { params: { q: query } });
  return r.data;
}

// 获取搜索过滤器选项
export async function getSearchFilters() {
  const r = await api.get('/search/filters');
  return r.data;
}

// 保存搜索历史
export async function saveSearchHistory(query, filters) {
  const r = await api.post('/search/history', { query, filters });
  return r.data;
}

// 获取搜索历史
export async function getSearchHistory() {
  const r = await api.get('/search/history');
  return r.data;
}
