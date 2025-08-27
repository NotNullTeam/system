import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCases, deleteCase } from '../api/cases.js';

export default function Cases() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, caseId: null, caseName: '' });

  useEffect(() => {
    loadCases();
  }, []);

  async function loadCases() {
    try {
      setLoading(true);
      const data = await getCases();
      console.log('API返回数据:', data);  // 调试日志
      console.log('数据结构:', JSON.stringify(data, null, 2));  // 详细结构
      
      // 处理多种可能的数据格式
      let casesList = [];
      if (Array.isArray(data)) {
        casesList = data;
      } else if (data?.data?.items && Array.isArray(data.data.items)) {
        casesList = data.data.items;
      } else if (data?.items && Array.isArray(data.items)) {
        casesList = data.items;
      } else if (data?.data && Array.isArray(data.data)) {
        casesList = data.data;
      }
      
      // 过滤掉没有有效 ID 的案例，并为缺少字段设置默认值
      const validCases = casesList.filter(case_ => case_ && (case_.id || case_.caseId)).map(case_ => ({
        ...case_,
        id: case_.id || case_.caseId,
        title: case_.title || case_.name || case_.query || '未命名',
        description: case_.description || case_.query || '',
        status: case_.status || 'unknown',
        created_at: case_.created_at || case_.createdAt
      }));
      
      console.log('处理后的案例数据:', validCases);
      setCases(validCases);
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || '加载失败');
      setCases([]);  // 确保错误时设置为空数组
    } finally {
      setLoading(false);
    }
  }

  function handleDeleteCase(caseId) {
    console.log('删除按钮被点击，案例ID:', caseId);
    
    // 找到案例名称
    const case_ = cases.find(c => (c.id || c.caseId) === caseId);
    const caseName = case_?.title || '未命名案例';
    
    setDeleteConfirm({ show: true, caseId, caseName });
  }

  async function confirmDeleteCase() {
    const { caseId } = deleteConfirm;
    console.log('确认删除案例:', caseId);
    
    try {
      setLoading(true);
      setDeleteConfirm({ show: false, caseId: null, caseName: '' });
      
      const response = await deleteCase(caseId);
      console.log('删除响应:', response);
      setCases(prev => prev.filter(c => (c.id || c.caseId) !== caseId));
      console.log('案例列表已更新');
    } catch (e) {
      console.error('删除失败:', e);
      setError(e?.response?.data?.error?.message || '删除失败');
    } finally {
      setLoading(false);
    }
  }

  function cancelDeleteCase() {
    console.log('取消删除');
    setDeleteConfirm({ show: false, caseId: null, caseName: '' });
  }

  if (loading) return <div className="p-6 text-gray-600">加载中...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">诊断历史</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {cases.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            暂无案例数据
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    案例标题
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    问题描述
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    诊断状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cases.map(case_ => (
                  <tr key={case_.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{case_.id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      <Link
                        to={`/cases/${case_.id}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {case_.title || case_.name || '未命名'}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {case_.description ? (
                        case_.description.length > 50 ? (
                          case_.description.substring(0, 50) + '...'
                        ) : (
                          case_.description
                        )
                      ) : (
                        '无描述'
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${case_.status === 'active' ? 'bg-green-100 text-green-800' : 
                          case_.status === 'resolved' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'}`}
                      >
                        {case_.status === 'active' ? '🔄 诊断中' : 
                         case_.status === 'resolved' ? '✅ 已解决' : 
                         '⏸️ ' + case_.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {case_.created_at ? new Date(case_.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/cases/${case_.id}`}
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <span>👁️</span> 查看
                        </Link>
                        <button
                          onClick={() => handleDeleteCase(case_.id || case_.caseId)}
                          className="text-red-600 hover:text-red-800"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                确定要删除案例 <span className="font-semibold text-gray-900 dark:text-white">"{deleteConfirm.caseName}"</span> 吗？
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 mb-6">
                此操作将永久删除案例及其所有相关数据，不可撤销。
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelDeleteCase}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={confirmDeleteCase}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    </div>
  );
}
