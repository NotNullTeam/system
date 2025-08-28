import React, { useState, useEffect } from 'react';
import DocumentUpload from '../components/DocumentUpload';
import { getDocuments } from '../api/knowledge';

const KnowledgeUpload = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // 加载文档列表
  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await getDocuments();
      setDocuments(response.data.documents || []);
    } catch (error) {
      console.error('加载文档列表失败:', error);
      showNotification('加载文档列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 显示通知
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // 处理上传完成
  const handleUploadComplete = (result) => {
    showNotification('文档上传并解析完成！', 'success');
    loadDocuments(); // 重新加载文档列表
  };

  // 处理上传错误
  const handleUploadError = (error) => {
    console.error('上传错误:', error);
    const errorMessage = error.response?.data?.error?.message || error.message || '上传失败';
    showNotification(`上传失败: ${errorMessage}`, 'error');
  };

  // 组件挂载时加载文档列表
  useEffect(() => {
    loadDocuments();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">知识库管理</h1>
          <p className="mt-2 text-gray-600">
            上传文档到知识库，系统将自动解析并建立索引
          </p>
        </div>

        {/* 通知栏 */}
        {notification && (
          <div className={`mb-6 p-4 rounded-md ${
            notification.type === 'success' ? 'bg-green-50 border border-green-200' :
            notification.type === 'error' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex">
              <div className={`mr-2 ${
                notification.type === 'success' ? 'text-green-400' :
                notification.type === 'error' ? 'text-red-400' :
                'text-blue-400'
              }`}>
                {notification.type === 'success' ? '✅' :
                 notification.type === 'error' ? '❌' : 'ℹ️'}
              </div>
              <div className={`text-sm ${
                notification.type === 'success' ? 'text-green-800' :
                notification.type === 'error' ? 'text-red-800' :
                'text-blue-800'
              }`}>
                {notification.message}
              </div>
            </div>
          </div>
        )}

        {/* 文档上传组件 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">上传新文档</h2>
          <DocumentUpload
            onUploadComplete={handleUploadComplete}
            onError={handleUploadError}
          />
        </div>

        {/* 文档列表 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">文档列表</h2>
          </div>
          
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-500">加载中...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📚</div>
                <p className="text-gray-500">暂无文档，请上传您的第一个文档</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-900 truncate">{doc.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        doc.status === 'PARSED' ? 'bg-green-100 text-green-800' :
                        doc.status === 'PROCESSING' ? 'bg-yellow-100 text-yellow-800' :
                        doc.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {doc.status === 'PARSED' ? '已解析' :
                         doc.status === 'PROCESSING' ? '处理中' :
                         doc.status === 'FAILED' ? '失败' : doc.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {doc.description || '无描述'}
                    </p>
                    <div className="text-xs text-gray-500">
                      <p>上传时间: {new Date(doc.created_at).toLocaleString()}</p>
                      {doc.parsed_at && (
                        <p>解析时间: {new Date(doc.parsed_at).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 使用说明 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-3">使用说明</h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>• <strong>同步处理</strong>: 文档上传后将立即开始解析，请耐心等待完成</p>
            <p>• <strong>处理时间</strong>: 根据文档大小和复杂度，处理时间通常为1-5分钟</p>
            <p>• <strong>支持格式</strong>: PDF、DOC、DOCX、TXT、MD等常见文档格式</p>
            <p>• <strong>处理期间</strong>: 您可以继续浏览其他页面，但无法同时上传多个文档</p>
            <p>• <strong>错误处理</strong>: 如果处理失败，您可以重新尝试上传</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeUpload;
