/*
 * 废弃页面 - Files.jsx
 * 
 * 此页面已废弃，功能已整合到以下位置：
 * - 文件管理功能 → KnowledgeManagement.jsx 的"附件文件"标签页
 * - 案例附件上传 → CaseCreate.jsx 和 CaseDetailRefactored.jsx
 * 
 * 保留此文件仅供参考，不再在路由中使用
 * 最后更新：2025-08-27
 */

import React, { useState, useEffect, useRef } from 'react';
import { getFiles, uploadFile, uploadFiles, downloadFile, deleteFile, deleteFiles, updateFile } from '../api/files.js';

export default function Files() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadFiles();
  }, []);

  async function loadFiles() {
    try {
      setLoading(true);
      const data = await getFiles();
      setFiles(data?.data || data || []);
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(fileList) {
    if (!fileList || fileList.length === 0) return;
    
    try {
      setUploading(true);
      setUploadProgress(0);
      
      if (fileList.length === 1) {
        const result = await uploadFile(fileList[0], setUploadProgress);
        const newFile = result?.data || result;
        setFiles(prev => [newFile, ...prev]);
      } else {
        const result = await uploadFiles(Array.from(fileList), setUploadProgress);
        const newFiles = result?.data || result || [];
        setFiles(prev => [...newFiles, ...prev]);
      }
      
      alert('上传成功');
    } catch (e) {
      alert(e?.response?.data?.error?.message || e?.message || '上传失败');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  async function handleDownload(file) {
    try {
      await downloadFile(file.id, file.filename || file.name);
    } catch (e) {
      alert(e?.response?.data?.error?.message || e?.message || '下载失败');
    }
  }

  async function handleDelete(fileId) {
    if (!confirm('确定删除此文件？')) return;
    try {
      await deleteFile(fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (e) {
      alert(e?.response?.data?.error?.message || e?.message || '删除失败');
    }
  }

  async function handleBatchDelete() {
    if (selectedFiles.length === 0) return;
    if (!confirm(`确定删除选中的 ${selectedFiles.length} 个文件？`)) return;
    
    try {
      await deleteFiles(selectedFiles);
      setFiles(prev => prev.filter(f => !selectedFiles.includes(f.id)));
      setSelectedFiles([]);
    } catch (e) {
      alert(e?.response?.data?.error?.message || e?.message || '批量删除失败');
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = e.dataTransfer.files;
    handleFileUpload(droppedFiles);
  }

  function toggleFileSelection(fileId) {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  }

  function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  if (loading) return <div className="p-6 text-gray-600">加载中...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">文件管理</h2>
        <div className="space-x-2">
          {selectedFiles.length > 0 && (
            <button
              onClick={handleBatchDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              删除选中 ({selectedFiles.length})
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? '上传中...' : '上传文件'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* 拖拽上传区域 */}
      <div
        className={`mb-6 border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="text-gray-600">
          <div className="text-lg mb-2">拖拽文件到此处上传</div>
          <div className="text-sm">或点击上方"上传文件"按钮选择文件</div>
          {uploading && (
            <div className="mt-4">
              <div className="text-sm mb-2">上传进度: {uploadProgress}%</div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files)}
      />

      {/* 文件列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {files.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            暂无文件
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedFiles.length === files.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFiles(files.map(f => f.id));
                        } else {
                          setSelectedFiles([]);
                        }
                      }}
                      className="rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">文件名</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">大小</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">上传时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {files.map(file => (
                  <tr key={file.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(file.id)}
                        onChange={() => toggleFileSelection(file.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {file.filename || file.name || '未命名文件'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatFileSize(file.size)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                        {file.mimetype || file.type || '未知'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {file.created_at ? new Date(file.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm space-x-2">
                      <button
                        onClick={() => handleDownload(file)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        下载
                      </button>
                      <button
                        onClick={() => handleDelete(file.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
