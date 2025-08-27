import { api } from './client.js';

// 获取系统统计概览
export async function getSystemStats() {
  const r = await api.get('/dashboard/stats');
  return r.data;
}

// 获取故障类别统计
export async function getFaultCategories() {
  const r = await api.get('/dashboard/fault-categories');
  return r.data;
}

// 获取趋势数据
export async function getTrends(params = {}) {
  const r = await api.get('/dashboard/trends', { params });
  return r.data;
}

// 获取覆盖率数据
export async function getCoverage() {
  const r = await api.get('/dashboard/coverage');
  return r.data;
}

// 获取时间线数据
export async function getTimeline(params = {}) {
  const r = await api.get('/dashboard/timeline', { params });
  return r.data;
}
