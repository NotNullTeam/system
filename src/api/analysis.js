import { api } from './client.js';

// 提交日志进行 AI 分析
export async function analyzeLog(data) {
  const r = await api.post('/analysis/log', data);
  return r.data;
}

// 获取分析结果
export async function getAnalysisResult(analysisId) {
  const r = await api.get(`/analysis/${analysisId}`);
  return r.data;
}

// 获取分析历史
export async function getAnalysisHistory(params = {}) {
  const r = await api.get('/analysis/history', { params });
  return r.data;
}

// 获取修复建议
export async function getFixSuggestions(analysisId) {
  const r = await api.get(`/analysis/${analysisId}/suggestions`);
  return r.data;
}

// 提交反馈
export async function submitAnalysisFeedback(analysisId, feedback) {
  const r = await api.post(`/analysis/${analysisId}/feedback`, feedback);
  return r.data;
}
