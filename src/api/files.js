import { api } from './client.js';

// 获取文件列表
export async function getFiles(params = {}) {
  const r = await api.get('/files', { params });
  return r.data;
}

// 上传文件
export async function uploadFile(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  
  const config = {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress ? (progressEvent) => {
      const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      onProgress(percentCompleted);
    } : undefined
  };
  
  const r = await api.post('/files', formData, config);
  return r.data;
}

// 批量上传文件
export async function uploadFiles(files, onProgress) {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });
  
  const config = {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress ? (progressEvent) => {
      const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      onProgress(percentCompleted);
    } : undefined
  };
  
  const r = await api.post('/files/batch', formData, config);
  return r.data;
}

// 下载文件
export async function downloadFile(fileId, filename) {
  const r = await api.get(`/files/${fileId}/download`, {
    responseType: 'blob'
  });
  
  // 创建下载链接
  const url = window.URL.createObjectURL(new Blob([r.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  
  return r.data;
}

// 删除文件
export async function deleteFile(fileId) {
  const r = await api.delete(`/files/${fileId}`);
  return r.data;
}

// 批量删除文件
export async function deleteFiles(fileIds) {
  const r = await api.post('/files/delete/batch', { file_ids: fileIds });
  return r.data;
}

// 获取文件详情
export async function getFileById(fileId) {
  const r = await api.get(`/files/${fileId}`);
  return r.data;
}

// 更新文件信息
export async function updateFile(fileId, data) {
  const r = await api.put(`/files/${fileId}`, data);
  return r.data;
}
