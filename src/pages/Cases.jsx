import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCases, deleteCase } from '../api/cases.js';

export default function Cases() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCases();
  }, []);

  async function loadCases() {
    try {
      setLoading(true);
      const data = await getCases();
      // 后端返回分页数据结构: {data: {items: [...], pagination: {...}}}
      setCases(data?.data?.items || data?.items || []);
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('确定删除此案例？')) return;
    try {
      await deleteCase(id);
      setCases(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      alert(e?.response?.data?.error?.message || e?.message || '删除失败');
    }
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
                          onClick={() => handleDelete(case_.id)}
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
    </div>
  );
}
