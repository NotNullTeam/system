import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCaseById, updateCase, getCaseNodes, getCaseEdges, createNode, updateNode, deleteNode, createEdge, updateEdge, deleteEdge, submitFeedback, createCase } from '../api/cases.js';
import { searchKnowledge, getSearchSuggestions, submitQueryFeedback } from '../api/knowledge.js';

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [case_, setCase] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('info');
  const [editingNode, setEditingNode] = useState(null);
  const [editingEdge, setEditingEdge] = useState(null);
  const [feedback, setFeedback] = useState('');
  // RAG 状态
  const [ragQuery, setRagQuery] = useState('');
  const [ragResults, setRagResults] = useState([]);
  const [ragLoading, setRagLoading] = useState(false);
  const [ragError, setRagError] = useState('');
  const [ragSuggestions, setRagSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [filters, setFilters] = useState({ vendor: '', category: '' });
  const [advancedMode, setAdvancedMode] = useState(false);
  const [vectorWeight, setVectorWeight] = useState(0.7);
  const suggestionsTimeoutRef = useRef(null);

  useEffect(() => {
    if (id && id !== 'new') {
      loadCaseData();
    } else if (id === 'new') {
      setCase({ title: '', description: '', status: 'active' });
      setLoading(false);
    }
  }, [id]);

  // RAG 搜索建议
  useEffect(() => {
    if (ragQuery.length > 2) {
      if (suggestionsTimeoutRef.current) {
        clearTimeout(suggestionsTimeoutRef.current);
      }
      suggestionsTimeoutRef.current = setTimeout(async () => {
        try {
          const result = await getSearchSuggestions(ragQuery);
          setRagSuggestions(result?.data?.suggestions || result?.suggestions || []);
          setShowSuggestions(true);
        } catch (e) {
          console.error('获取建议失败:', e);
        }
      }, 300);
    } else {
      setRagSuggestions([]);
      setShowSuggestions(false);
    }
  }, [ragQuery]);

  async function loadCaseData() {
    try {
      setLoading(true);
      const [caseData, nodesData, edgesData] = await Promise.all([
        getCaseById(id),
        getCaseNodes(id).catch(() => ({ data: [] })),
        getCaseEdges(id).catch(() => ({ data: [] }))
      ]);
      setCase(caseData?.data || caseData);
      setNodes(nodesData?.data || nodesData || []);
      setEdges(edgesData?.data || edgesData || []);
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveCase() {
    try {
      if (id === 'new') {
        const result = await createCase(case_);
        const newId = result?.data?.id || result?.id;
        if (newId) {
          navigate(`/cases/${newId}`, { replace: true });
        }
      } else {
        await updateCase(id, case_);
      }
      alert('保存成功');
    } catch (e) {
      alert(e?.response?.data?.error?.message || e?.message || '保存失败');
    }
  }

  async function handleNodeSave(nodeData) {
    try {
      if (editingNode?.id) {
        await updateNode(id, editingNode.id, nodeData);
        setNodes(prev => prev.map(n => n.id === editingNode.id ? { ...n, ...nodeData } : n));
      } else {
        const result = await createNode(id, nodeData);
        const newNode = result?.data || result;
        setNodes(prev => [...prev, newNode]);
      }
      setEditingNode(null);
    } catch (e) {
      alert(e?.response?.data?.error?.message || e?.message || '节点保存失败');
    }
  }

  async function handleNodeDelete(nodeId) {
    if (!confirm('确定删除此节点？')) return;
    try {
      await deleteNode(id, nodeId);
      setNodes(prev => prev.filter(n => n.id !== nodeId));
    } catch (e) {
      alert(e?.response?.data?.error?.message || e?.message || '删除失败');
    }
  }

  async function handleEdgeSave(edgeData) {
    try {
      if (editingEdge?.id) {
        await updateEdge(id, editingEdge.id, edgeData);
        setEdges(prev => prev.map(e => e.id === editingEdge.id ? { ...e, ...edgeData } : e));
      } else {
        const result = await createEdge(id, edgeData);
        const newEdge = result?.data || result;
        setEdges(prev => [...prev, newEdge]);
      }
      setEditingEdge(null);
    } catch (e) {
      alert(e?.response?.data?.error?.message || e?.message || '边保存失败');
    }
  }

  async function handleEdgeDelete(edgeId) {
    if (!confirm('确定删除此边？')) return;
    try {
      await deleteEdge(id, edgeId);
      setEdges(prev => prev.filter(e => e.id !== edgeId));
    } catch (e) {
      alert(e?.response?.data?.error?.message || e?.message || '删除失败');
    }
  }

  async function handleFeedbackSubmit() {
    if (!feedback.trim()) return;
    try {
      await submitFeedback(id, { content: feedback });
      setFeedback('');
      alert('反馈提交成功');
    } catch (e) {
      alert(e?.response?.data?.error?.message || e?.message || '反馈提交失败');
    }
  }

  // 执行 RAG 搜索
  async function handleRagSearch(searchQuery = null) {
    const finalQuery = searchQuery || ragQuery;
    if (!finalQuery.trim()) {
      setRagError('请输入查询内容');
      return;
    }
    try {
      setRagLoading(true);
      setRagError('');
      setShowSuggestions(false);
      const result = await searchKnowledge({
        query: finalQuery,
        filters: filters.vendor || filters.category ? filters : {},
        vector_weight: vectorWeight,
        keyword_weight: 1 - vectorWeight,
        top_k: 20
      });
      const searchResults = result?.data?.results || result?.results || [];
      setRagResults(searchResults);
      if (searchResults.length === 0) {
        setRagError('未找到相关内容，请尝试其他关键词');
      }
    } catch (e) {
      setRagError(e?.response?.data?.error?.message || e?.message || '搜索失败');
    } finally {
      setRagLoading(false);
    }
  }

  // 处理建议点击
  function handleSuggestionClick(suggestion) {
    setRagQuery(suggestion);
    setShowSuggestions(false);
    handleRagSearch(suggestion);
  }

  // RAG 结果反馈
  async function handleRagFeedback(resultId, isHelpful) {
    try {
      await submitQueryFeedback({
        query: ragQuery,
        result_id: resultId,
        is_helpful: isHelpful,
        case_id: id
      });
      alert('感谢您的反馈！');
    } catch (e) {
      alert('反馈提交失败');
    }
  }

  function clearRagFilters() {
    setFilters({ vendor: '', category: '' });
    setVectorWeight(0.7);
  }

  if (loading) return <div className="p-6 text-gray-600">加载中...</div>;
  if (error) return <div className="p-6 text-red-600">错误：{error}</div>;
  if (!case_) return <div className="p-6 text-gray-600">案例不存在</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <Link to="/cases" className="text-blue-600 hover:text-blue-800">← 返回列表</Link>
          <h2 className="text-xl font-semibold">
            {id === 'new' ? '新建案例' : `案例详情 #${id}`}
          </h2>
        </div>
        <button 
          onClick={handleSaveCase}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          保存
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {['info', 'nodes', 'edges', 'knowledge', 'feedback'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 text-sm font-medium border-b-2 ${
                  activeTab === tab 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'info' ? '基本信息' : 
                 tab === 'nodes' ? '节点管理' :
                 tab === 'edges' ? '边管理' :
                 tab === 'knowledge' ? '知识溯源' : '反馈'}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                <input
                  type="text"
                  value={case_.title || ''}
                  onChange={(e) => setCase(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={case_.description || ''}
                  onChange={(e) => setCase(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select
                  value={case_.status || 'active'}
                  onChange={(e) => setCase(prev => ({ ...prev, status: e.target.value }))}
                  className="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">活跃</option>
                  <option value="pending">待处理</option>
                  <option value="closed">已关闭</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'nodes' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">节点管理</h3>
                <button
                  onClick={() => setEditingNode({})}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                >
                  添加节点
                </button>
              </div>
              
              <div className="space-y-2">
                {nodes.map(node => (
                  <div key={node.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <div className="font-medium">{node.name || node.label || `节点 ${node.id}`}</div>
                      <div className="text-sm text-gray-600">{node.type || '未分类'}</div>
                    </div>
                    <div className="space-x-2">
                      <button
                        onClick={() => setEditingNode(node)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleNodeDelete(node.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {editingNode && (
                <NodeEditModal
                  node={editingNode}
                  onSave={handleNodeSave}
                  onCancel={() => setEditingNode(null)}
                />
              )}
            </div>
          )}

          {activeTab === 'edges' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">边管理</h3>
                <button
                  onClick={() => setEditingEdge({})}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                >
                  添加边
                </button>
              </div>
              
              <div className="space-y-2">
                {edges.map(edge => (
                  <div key={edge.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <div className="font-medium">
                        {edge.source_label || edge.source} → {edge.target_label || edge.target}
                      </div>
                      <div className="text-sm text-gray-600">{edge.relationship || edge.type || '关联'}</div>
                    </div>
                    <div className="space-x-2">
                      <button
                        onClick={() => setEditingEdge(edge)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleEdgeDelete(edge.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {editingEdge && (
                <EdgeEditModal
                  edge={editingEdge}
                  nodes={nodes}
                  onSave={handleEdgeSave}
                  onCancel={() => setEditingEdge(null)}
                />
              )}
            </div>
          )}

          {activeTab === 'knowledge' && (
            <div>
              <h3 className="text-lg font-medium mb-4">知识溯源</h3>

              {/* 搜索区域 */}
              <div className="bg-white border rounded-lg p-4 mb-4">
                <div className="space-y-3">
                  <div className="relative">
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={ragQuery}
                          onChange={(e) => setRagQuery(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleRagSearch()}
                          placeholder="请描述您遇到的网络问题，如：OSPF邻居建立失败、BGP路由不通..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {showSuggestions && ragSuggestions.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                            {ragSuggestions.map((suggestion, index) => (
                              <div
                                key={index}
                                onClick={() => handleSuggestionClick(suggestion)}
                                className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-gray-700 border-b last:border-b-0"
                              >
                                {suggestion}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleRagSearch()}
                        disabled={ragLoading}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {ragLoading ? '搜索中...' : '智能搜索'}
                      </button>
                    </div>
                  </div>

                  {/* 高级选项 */}
                  <div>
                    <button
                      onClick={() => setAdvancedMode(!advancedMode)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      {advancedMode ? '隐藏' : '显示'}高级选项 {advancedMode ? '▲' : '▼'}
                    </button>
                    {advancedMode && (
                      <div className="mt-3 p-4 bg-gray-50 rounded-lg space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">厂商</label>
                            <select
                              value={filters.vendor}
                              onChange={(e) => setFilters({ ...filters, vendor: e.target.value })}
                              className="w-full border border-gray-300 rounded-md px-3 py-2"
                            >
                              <option value="">全部厂商</option>
                              <option value="华为">华为</option>
                              <option value="思科">思科</option>
                              <option value="Juniper">Juniper</option>
                              <option value="H3C">H3C</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
                            <select
                              value={filters.category}
                              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                              className="w-full border border-gray-300 rounded-md px-3 py-2"
                            >
                              <option value="">全部分类</option>
                              <option value="路由协议">路由协议</option>
                              <option value="交换技术">交换技术</option>
                              <option value="网络安全">网络安全</option>
                              <option value="VPN">VPN</option>
                              <option value="QoS">QoS</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">语义权重: {(vectorWeight * 100).toFixed(0)}%</label>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={vectorWeight}
                              onChange={(e) => setVectorWeight(parseFloat(e.target.value))}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>关键词优先</span>
                              <span>语义优先</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button onClick={clearRagFilters} className="text-sm text-gray-600 hover:text-gray-800">重置过滤器</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 错误提示 */}
              {ragError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">{ragError}</div>
              )}

              {/* 结果列表 */}
              <div>
                {ragResults.length > 0 ? (
                  <div className="space-y-4">
                    <div className="text-sm text-gray-600">找到 {ragResults.length} 个相关结果</div>
                    {ragResults.map((result, index) => (
                      <KnowledgeResultCard
                        key={index}
                        result={result}
                        index={index}
                        onSelect={() => setSelectedResult(result)}
                        onFeedback={handleRagFeedback}
                      />
                    ))}
                  </div>
                ) : !ragLoading && ragQuery && (
                  <div className="text-center py-8 text-gray-500">暂无搜索结果，试试换个关键词</div>
                )}
              </div>

              {/* 详情模态框 */}
              {selectedResult && (
                <KnowledgeResultDetailModal
                  result={selectedResult}
                  onClose={() => setSelectedResult(null)}
                  onFeedback={handleRagFeedback}
                />
              )}
            </div>
          )}

          {activeTab === 'feedback' && (
            <div>
              <h3 className="text-lg font-medium mb-4">提交反馈</h3>
              <div className="space-y-4">
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="请输入您的反馈..."
                  rows={4}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleFeedbackSubmit}
                  disabled={!feedback.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  提交反馈
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 知识检索结果卡片
function KnowledgeResultCard({ result, index, onSelect, onFeedback }) {
  const relevanceColor = result.score > 0.8 ? 'text-green-600' :
                         result.score > 0.6 ? 'text-yellow-600' : 'text-gray-600';

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {result.title || `结果 ${index + 1}`}
          </h3>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className={`${relevanceColor} font-medium`}>
              相关度: {(result.score * 100).toFixed(1)}%
            </span>
            {result.source && <span>来源: {result.source}</span>}
            {result.vendor && <span>厂商: {result.vendor}</span>}
          </div>
        </div>
      </div>

      <p className="text-gray-700 mb-3 line-clamp-3">
        {result.content || result.text || result.description}
      </p>

      {result.highlights && result.highlights.length > 0 && (
        <div className="mb-3 p-2 bg-yellow-50 rounded text-sm">
          <span className="font-medium">关键内容: </span>
          {result.highlights.join(' ... ')}
        </div>
      )}

      <div className="flex justify-between items-center">
        <button
          onClick={onSelect}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          查看详情 →
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => onFeedback(result.id, true)}
            className="text-gray-500 hover:text-green-600 text-sm"
            title="有帮助"
          >
            👍
          </button>
          <button
            onClick={() => onFeedback(result.id, false)}
            className="text-gray-500 hover:text-red-600 text-sm"
            title="没帮助"
          >
            👎
          </button>
        </div>
      </div>
    </div>
  );
}

// 知识检索结果详情模态框
function KnowledgeResultDetailModal({ result, onClose, onFeedback }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex justify-between items-start">
            <h2 className="text-xl font-semibold text-gray-900">
              {result.title || '知识详情'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
            <div>
              <span className="text-gray-500">相关度:</span>
              <span className="ml-2 font-medium">{(result.score * 100).toFixed(1)}%</span>
            </div>
            {result.source && (
              <div>
                <span className="text-gray-500">来源:</span>
                <span className="ml-2 font-medium">{result.source}</span>
              </div>
            )}
            {result.vendor && (
              <div>
                <span className="text-gray-500">厂商:</span>
                <span className="ml-2 font-medium">{result.vendor}</span>
              </div>
            )}
            {result.category && (
              <div>
                <span className="text-gray-500">分类:</span>
                <span className="ml-2 font-medium">{result.category}</span>
              </div>
            )}
          </div>

          <div className="prose max-w-none">
            <h3 className="text-lg font-medium mb-3">内容详情</h3>
            <div className="whitespace-pre-wrap text-gray-700">
              {result.content || result.text || result.description}
            </div>
          </div>

          {result.solution && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-3">解决方案</h3>
              <div className="bg-green-50 p-4 rounded-lg">
                <pre className="whitespace-pre-wrap text-sm">{result.solution}</pre>
              </div>
            </div>
          )}

          {result.commands && result.commands.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-3">相关命令</h3>
              <div className="space-y-2">
                {result.commands.map((cmd, index) => (
                  <div key={index} className="bg-gray-100 p-3 rounded font-mono text-sm">
                    {cmd}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">这个信息对您有帮助吗？</div>
            <div className="flex gap-3">
              <button
                onClick={() => { onFeedback(result.id, true); onClose(); }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                有帮助 👍
              </button>
              <button
                onClick={() => { onFeedback(result.id, false); onClose(); }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                没帮助 👎
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NodeEditModal({ node, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: node.name || '',
    type: node.type || '',
    description: node.description || '',
    ...node
  });

  function handleSubmit(e) {
    e.preventDefault();
    onSave(formData);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h3 className="text-lg font-medium mb-4">{node.id ? '编辑节点' : '添加节点'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
            <input
              type="text"
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 border rounded-md hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EdgeEditModal({ edge, nodes, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    source: edge.source || '',
    target: edge.target || '',
    relationship: edge.relationship || edge.type || '',
    description: edge.description || '',
    ...edge
  });

  function handleSubmit(e) {
    e.preventDefault();
    onSave(formData);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h3 className="text-lg font-medium mb-4">{edge.id ? '编辑边' : '添加边'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">源节点</label>
            <select
              value={formData.source}
              onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">请选择源节点</option>
              {nodes.map(node => (
                <option key={node.id} value={node.id}>
                  {node.name || node.label || `节点 ${node.id}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">目标节点</label>
            <select
              value={formData.target}
              onChange={(e) => setFormData(prev => ({ ...prev, target: e.target.value }))}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">请选择目标节点</option>
              {nodes.map(node => (
                <option key={node.id} value={node.id}>
                  {node.name || node.label || `节点 ${node.id}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">关系类型</label>
            <input
              type="text"
              value={formData.relationship}
              onChange={(e) => setFormData(prev => ({ ...prev, relationship: e.target.value }))}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="如：依赖、关联、影响等"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 border rounded-md hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
