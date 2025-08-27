import React, { useState, useEffect } from 'react';
import { 
  uploadDocument, 
  deleteDocument, 
  updateDocumentMetadata, 
  reparseDocument,
  getDocumentStructure,
  getDocuments
} from '../api/knowledge';
import DocumentUpload from '../components/DocumentUpload';

// 文档结构树组件
const DocumentStructureTree = ({ structure, level = 0 }) => {
  const getTypeIcon = (type) => {
    switch (type) {
      case 'heading': return '📝';
      case 'paragraph': return '📄';
      case 'table': return '📊';
      case 'code_block': return '💻';
      case 'list': return '📋';
      case 'image': return '🖼️';
      default: return '📄';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'heading': return 'text-[#0A59F7]';
      case 'table': return 'text-[#00BFA5]';
      case 'code_block': return 'text-[#6750A4]';
      case 'list': return 'text-[#FA6400]';
      default: return 'text-gray-600';
    }
  };

  if (!structure) return null;

  return (
    <div className={`${level > 0 ? 'ml-5 border-l-2 border-[#E7E9F0] pl-4' : ''}`}>
      {structure.children?.map((item, index) => (
        <div key={index} className="mb-3">
          <div className={`flex items-center space-x-3 ${getTypeColor(item.type)}`}>
            <span className="text-lg">{getTypeIcon(item.type)}</span>
            <span className="text-sm font-medium">
              {item.type === 'heading' && `H${item.level} `}
              {item.text || item.caption || `${item.type}`}
            </span>
            {item.page && (
              <span className="text-xs bg-[#F2F3F5] px-2.5 py-1 rounded-full font-medium">
                第{item.page}页
              </span>
            )}
            {item.type === 'table' && item.rows && (
              <span className="text-xs text-[#646A73]">
                {item.rows}×{item.cols}
              </span>
            )}
          </div>
          {item.children && (
            <DocumentStructureTree structure={item} level={level + 1} />
          )}
        </div>
      ))}
    </div>
  );
};

export default function KnowledgeManagement() {
  const [documents, setDocuments] = useState([]);
  const [documentStructure, setDocumentStructure] = useState(null);
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, docId: null, docName: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(null);
  const [activeTab, setActiveTab] = useState('documents');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadForm, setUploadForm] = useState({
    docType: '',
    vendor: '',
    tags: ''
  });
  const [filters, setFilters] = useState({
    status: '',
    vendor: '',
    tags: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0
  });

  // 过滤文档
  const filteredDocuments = documents.filter(doc => {
    if (filters.status && doc.status !== filters.status) return false;
    if (filters.vendor && doc.vendor !== filters.vendor) return false;
    if (filters.tags) {
      const docTags = Array.isArray(doc.tags) ? doc.tags.join(',').toLowerCase() : (doc.tags || '').toLowerCase();
      if (!docTags.includes(filters.tags.toLowerCase())) return false;
    }
    return true;
  });

  useEffect(() => {
    if (activeTab === 'documents') {
      loadDocuments();
    }
  }, [activeTab, pagination.page, filters]);

  // 轮询机制：定期检查处理中的文档状态
  useEffect(() => {
    if (activeTab !== 'documents') return;

    const hasProcessingDocs = documents.some(doc => 
      doc.status === 'QUEUED' || doc.status === 'PARSING'
    );

    if (!hasProcessingDocs) return;

    const interval = setInterval(() => {
      loadDocuments();
    }, 3000); // 每3秒检查一次

    return () => clearInterval(interval);
  }, [activeTab, documents]);

  async function loadDocuments() {
    try {
      setLoading(true);
      setError('');
      const params = {
        page: pagination.page,
        pageSize: pagination.pageSize,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      };
      
      const data = await getDocuments(params);
      console.log('文档列表响应:', data); // 调试日志
      setDocuments(data?.data?.documents || []);
      setPagination(prev => ({
        ...prev,
        total: data?.data?.pagination?.total || 0
      }));
    } catch (e) {
      setError(e?.response?.data?.error?.message || '加载文档失败');
    } finally {
      setLoading(false);
    }
  }

  // 附件管理功能已移除 - 附件作为对话记录的一部分，在案例中管理

  function handleFileSelect(event) {
    const file = event.target.files[0];
    setSelectedFile(file);
  }

  async function handleUploadDocument() {
    if (!selectedFile) {
      setError('请先选择文件');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setUploadProgress(10); // 开始上传
      
      // 构建FormData
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('doc_type', uploadForm.docType);
      formData.append('vendor', uploadForm.vendor);
      formData.append('tags', uploadForm.tags);
      
      // 模拟上传进度
      const simulateProgress = async () => {
        for (let i = 10; i <= 40; i += 10) {
          setUploadProgress(i);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      };
      
      await simulateProgress();
      
      const response = await uploadDocument(formData);
      
      setUploadProgress(70); // 上传完成
      
      // 显示成功消息
      if (response?.data) {
        setUploadProgress(90);
        setError(''); // 清除错误
        
        // 输出调试信息
        console.log('文档上传响应:', response.data);
        
        // 最终完成
        setTimeout(() => {
          setUploadProgress(100);
          setTimeout(() => {
            setUploadProgress(null);
          }, 2000);
        }, 500);
      }
      
      // 重新加载文档列表
      await loadDocuments();
      
      // 清空表单
      setSelectedFile(null);
      setUploadForm({ docType: '', vendor: '', tags: '' });
      
      // 清空文件输入框
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      console.error('IDP智能文档处理失败:', error);
      setError(error?.response?.data?.error?.message || '文档上传失败');
      setUploadProgress(null);
    } finally {
      setLoading(false);
    }
  }

  function handleDeleteDocument(docId) {
    console.log('删除按钮被点击，文档ID:', docId);
    
    // 找到文档名称
    const doc = documents.find(d => (d.docId || d.id) === docId);
    const docName = doc?.fileName || doc?.title || '未知文档';
    
    // 显示自定义确认对话框
    setDeleteConfirm({
      show: true,
      docId: docId,
      docName: docName
    });
  }

  async function confirmDeleteDocument() {
    const { docId } = deleteConfirm;
    console.log('确认删除文档:', docId);
    
    try {
      setLoading(true);
      setDeleteConfirm({ show: false, docId: null, docName: '' });
      
      const response = await deleteDocument(docId);
      console.log('删除响应:', response);
      await loadDocuments();
      console.log('文档列表已刷新');
    } catch (e) {
      console.error('删除失败:', e);
      setError(e?.response?.data?.error?.message || '删除失败');
    } finally {
      setLoading(false);
    }
  }

  function cancelDeleteDocument() {
    console.log('取消删除');
    setDeleteConfirm({ show: false, docId: null, docName: '' });
  }

  async function handleReprocessDocument(docId) {
    try {
      await reparseDocument(docId);
      await loadDocuments();
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'IDP重新解析失败');
    }
  }

  // 查看文档结构树
  async function handleViewDocumentStructure(docId) {
    try {
      // 这里应该调用后端API获取文档的结构化信息
      const response = await getDocumentStructure(docId);
      setDocumentStructure(response.data);
      setShowStructureModal(true);
    } catch (e) {
      setError('获取文档结构失败');
    }
  }

  // handleSearch 函数已移除 - 知识检索功能整合到诊断流程中

  const getStatusBadge = (status) => {
    const statusConfig = {
      'QUEUED': { 
        text: '等待处理', 
        className: 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 text-[#646A73] dark:text-gray-400 border border-gray-200 dark:border-gray-600',
        icon: '⏳'
      },
      'PROCESSING': { 
        text: '处理中', 
        className: 'bg-gradient-to-r from-[#0A59F7]/10 to-[#0052CC]/10 text-[#0A59F7] dark:text-blue-400 border border-[#0A59F7]/20',
        icon: '🔄'
      },
      'PARSING': { 
        text: '解析中', 
        className: 'bg-gradient-to-r from-[#0A59F7]/10 to-[#0052CC]/10 text-[#0A59F7] dark:text-blue-400 border border-[#0A59F7]/20',
        icon: '🔄'
      },
      'INDEXED': { 
        text: '已索引', 
        className: 'bg-gradient-to-r from-[#00B96B]/10 to-[#00A761]/10 text-[#00B96B] dark:text-green-400 border border-[#00B96B]/20',
        icon: '✅'
      },
      'COMPLETED': { 
        text: '已完成', 
        className: 'bg-gradient-to-r from-[#00B96B]/10 to-[#00A761]/10 text-[#00B96B] dark:text-green-400 border border-[#00B96B]/20',
        icon: '✅'
      },
      'FAILED': { 
        text: '处理失败', 
        className: 'bg-gradient-to-r from-[#FA2A55]/10 to-[#E61F47]/10 text-[#FA2A55] dark:text-red-400 border border-[#FA2A55]/20',
        icon: '❌'
      }
    };
    
    const config = statusConfig[status] || statusConfig['QUEUED'];
    return (
      <span className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg ${config.className} shadow-sm`}>
        <span className="mr-1.5 text-sm">{config.icon}</span>
        {config.text}
      </span>
    );
  };

  const getStageDisplay = (stage) => {
    if (!stage) return null;
    
    const stages = [
      { num: 1, name: '细粒度解析', icon: '📄' },
      { num: 2, name: '语义切分', icon: '✂️' },
      { num: 3, name: '结构化输出', icon: '📋' }
    ];
    
    return (
      <div className="flex items-center gap-2">
        {stages.map(s => (
          <div
            key={s.num}
            className={`flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              s.num <= stage 
                ? 'bg-gradient-to-r from-[#0A59F7] to-[#0052CC] text-white shadow-md' 
                : 'bg-[#F8F9FB] dark:bg-gray-900 text-[#9DA3AE] dark:text-gray-500 border border-[#E7E9F0] dark:border-gray-700'
            }`}
            title={s.name}
          >
            <span className="mr-1">{s.icon}</span>
            <span>阶段{s.num}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">知识库管理</h2>
          <p className="text-sm text-[#646A73] dark:text-gray-400 mt-1">智能文档处理 · 知识结构化 · 语义检索</p>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="fixed top-4 right-4 bg-[#FDEDED] border border-[#F66] text-[#CC0000] px-5 py-4 rounded-xl shadow-lg z-50 max-w-md">
          <div className="flex items-start">
            <span className="text-lg mr-3">⚠️</span>
            <span className="flex-1 text-sm">{error}</span>
            <button 
              onClick={() => setError('')}
              className="ml-4 text-[#CC0000] hover:text-[#990000] font-bold text-xl leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* 删除确认对话框 */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl">
            <div className="px-6 py-5 border-b border-[#E7E9F0] dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">⚠️</span>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">确认删除</h3>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                确定要删除文档 <span className="font-semibold text-gray-900 dark:text-white">"{deleteConfirm.docName}"</span> 吗？
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 mb-6">
                此操作将永久删除文档及其所有相关数据，不可撤销。
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelDeleteDocument}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={confirmDeleteDocument}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      删除中...
                    </>
                  ) : (
                    '确认删除'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 文档结构查看模态框 */}
      {showStructureModal && documentStructure && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden shadow-2xl">
            <div className="px-6 py-5 border-b border-[#E7E9F0] dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-[#F8F9FB] to-white dark:from-gray-800 dark:to-gray-900">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">📋</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">IDP智能解析结构树</h3>
                  <p className="text-xs text-[#646A73] dark:text-gray-400">Document Intelligence Processing</p>
                </div>
              </div>
              <button 
                onClick={() => setShowStructureModal(false)}
                className="text-[#646A73] hover:text-gray-900 dark:text-gray-400 dark:hover:text-white p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[65vh]">
              {/* IDP处理阶段状态 */}
              <div className="mb-8">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="text-lg mr-2">🧠</span>
                  IDP处理流程
                </h4>
                <div className="space-y-3 bg-[#F8F9FB] dark:bg-gray-900 rounded-xl p-4">
                  {documentStructure.processing_stages?.map((stage) => (
                    <div key={stage.stage} className="flex items-center space-x-4 bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        stage.status === 'completed' 
                          ? 'bg-gradient-to-br from-[#00BFA5] to-[#00A693] text-white shadow-md' 
                          : 'bg-[#F2F3F5] dark:bg-gray-700 text-[#646A73] dark:text-gray-400'
                      }`}>
                        {stage.stage}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{stage.name}</div>
                        <div className="text-xs text-[#646A73] dark:text-gray-400">{stage.description}</div>
                      </div>
                      <div className="text-sm">
                        {stage.status === 'completed' ? 
                          <span className="text-[#00BFA5]">✅ 完成</span> : 
                          <span className="text-[#FA6400]">⏳ 处理中</span>
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 文档结构树 */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center justify-between">
                  <span className="flex items-center">
                    <span className="text-lg mr-2">📄</span>
                    文档结构
                  </span>
                  <span className="text-xs bg-[#0A59F7]/10 text-[#0A59F7] px-3 py-1 rounded-full font-medium">
                    共 {documentStructure.chunks_count} 个语义块
                  </span>
                </h4>
                <div className="bg-[#F8F9FB] dark:bg-gray-900 rounded-xl p-5 border border-[#E7E9F0] dark:border-gray-700">
                  <DocumentStructureTree structure={documentStructure.structure} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 文档管理标签页 */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* 增强文档上传区域 */}
          <DocumentUpload
            onUploadComplete={(result) => {
              console.log('文档上传完成:', result);
              // 刷新文档列表
              loadDocuments();
            }}
            onError={(error) => {
              console.error('文档上传失败:', error);
            }}
          />

          {/* 过滤器 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-[#E7E9F0] dark:border-gray-700 p-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">状态</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full bg-[#F8F9FB] dark:bg-gray-900 border border-[#E7E9F0] dark:border-gray-700 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A59F7] focus:border-[#0A59F7] transition-all">
                  <option value="">全部状态</option>
                  <option value="QUEUED">⏳ 等待处理</option>
                  <option value="PROCESSING">🔄 处理中</option>
                  <option value="PARSING">🔄 解析中</option>
                  <option value="INDEXED">✅ 已索引</option>
                  <option value="COMPLETED">✅ 已完成</option>
                  <option value="FAILED">❌ 处理失败</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">厂商</label>
                <select
                  value={filters.vendor}
                  onChange={(e) => setFilters(prev => ({ ...prev, vendor: e.target.value }))}
                  className="w-full bg-[#F8F9FB] dark:bg-gray-900 border border-[#E7E9F0] dark:border-gray-700 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A59F7] focus:border-[#0A59F7] transition-all">
                  <option value="">全部厂商</option>
                  <option value="Cisco">Cisco</option>
                  <option value="Huawei">华为</option>
                  <option value="H3C">H3C</option>
                  <option value="Juniper">Juniper</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">标签</label>
                <input
                  type="text"
                  value={filters.tags}
                  onChange={(e) => setFilters(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="搜索标签"
                  className="w-full bg-[#F8F9FB] dark:bg-gray-900 border border-[#E7E9F0] dark:border-gray-700 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder-[#9DA3AE] dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0A59F7] focus:border-[#0A59F7] transition-all"
                />
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={() => setFilters({ status: '', vendor: '', tags: '' })}
                  className="w-full px-4 py-2.5 text-sm bg-white dark:bg-gray-900 border border-[#E7E9F0] dark:border-gray-700 rounded-lg hover:bg-[#F8F9FB] dark:hover:bg-gray-800 text-gray-900 dark:text-white font-medium transition-all duration-200">
                  <svg className="w-4 h-4 inline-block mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  清空过滤器
                </button>
              </div>
            </div>
          </div>

          {/* 文档列表 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-[#E7E9F0] dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-[#F8F9FB] to-white dark:from-gray-800 dark:to-gray-900 border-b border-[#E7E9F0] dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <span className="text-xl mr-2">📂</span>
                智能文档库
                <span className="ml-3 px-2.5 py-1 bg-[#0A59F7]/10 text-[#0A59F7] dark:bg-[#0A59F7]/20 dark:text-blue-400 text-xs font-medium rounded-full">
                  {filteredDocuments.length} 个文档
                </span>
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-[#F8F9FB] dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#646A73] dark:text-gray-400 uppercase tracking-wider">文档名称</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#646A73] dark:text-gray-400 uppercase tracking-wider">厂商</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#646A73] dark:text-gray-400 uppercase tracking-wider">处理状态</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#646A73] dark:text-gray-400 uppercase tracking-wider">处理阶段</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#646A73] dark:text-gray-400 uppercase tracking-wider">上传时间</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#646A73] dark:text-gray-400 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E9F0] dark:divide-gray-700">
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.docId || doc.id} className="hover:bg-[#F8F9FB] dark:hover:bg-gray-900/50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{doc.fileName || doc.title}</span>
                        </div>
                        {doc.tags && doc.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {(Array.isArray(doc.tags) ? doc.tags : doc.tags.split(',')).map((tag, idx) => (
                              <span key={idx} className="inline-flex px-2.5 py-1 text-xs font-medium rounded-lg bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 text-[#646A73] dark:text-gray-400 border border-gray-200 dark:border-gray-600">
                                {typeof tag === 'string' ? tag.trim() : tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-[#646A73] dark:text-gray-400 font-medium">
                          {doc.vendor || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(doc.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStageDisplay(doc.processing_stage)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-[#646A73] dark:text-gray-400">
                          {doc.created_at ? new Date(doc.created_at).toLocaleDateString('zh-CN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {doc.status === 'COMPLETED' && (
                            <button
                              onClick={() => handleViewStructure(doc)}
                              className="p-2 text-[#0A59F7] hover:text-[#0052CC] bg-[#0A59F7]/10 hover:bg-[#0A59F7]/20 dark:bg-[#0A59F7]/20 dark:hover:bg-[#0A59F7]/30 rounded-lg transition-all duration-200"
                              title="查看文档结构">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteDocument(doc.docId || doc.id)}
                            className="p-2 text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 rounded-lg transition-all duration-200"
                            title="删除文档">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* 分页 */}
            {filteredDocuments.length > 0 && (
              <div className="px-6 py-4 border-t border-[#E7E9F0] dark:border-gray-700 bg-[#F8F9FB] dark:bg-gray-900/50">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#646A73] dark:text-gray-400 font-medium">
                    共 {filteredDocuments.length} 个文档
                  </span>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-[#E7E9F0] dark:border-gray-700 rounded-lg hover:bg-[#F8F9FB] dark:hover:bg-gray-700 text-[#646A73] dark:text-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                      上一页
                    </button>
                    <span className="px-3 py-1.5 text-sm font-medium text-gray-900 dark:text-white">1</span>
                    <button className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-[#E7E9F0] dark:border-gray-700 rounded-lg hover:bg-[#F8F9FB] dark:hover:bg-gray-700 text-[#646A73] dark:text-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                      下一页
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
