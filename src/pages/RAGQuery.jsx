import React, { useState, useEffect, useRef } from 'react';
import { searchKnowledge, getSearchSuggestions, submitQueryFeedback } from '../api/knowledge.js';
import { analyzeLog } from '../api/analysis.js';

export default function RAGQuery() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [queryHistory, setQueryHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('search');
  const [filters, setFilters] = useState({
    vendor: '',
    category: ''
  });
  const [advancedMode, setAdvancedMode] = useState(false);
  const [vectorWeight, setVectorWeight] = useState(0.7);
  const suggestionsTimeoutRef = useRef(null);

  // 加载查询历史
  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('ragQueryHistory') || '[]');
    setQueryHistory(history);
  }, []);

  // 获取搜索建议
  useEffect(() => {
    if (query.length > 2) {
      if (suggestionsTimeoutRef.current) {
        clearTimeout(suggestionsTimeoutRef.current);
      }
      
      suggestionsTimeoutRef.current = setTimeout(async () => {
        try {
          const result = await getSearchSuggestions(query);
          setSuggestions(result?.data?.suggestions || []);
          setShowSuggestions(true);
        } catch (e) {
          console.error('获取建议失败:', e);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query]);

  // 执行搜索
  async function handleSearch(searchQuery = null) {
    const finalQuery = searchQuery || query;
    if (!finalQuery.trim()) {
      setError('请输入查询内容');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setShowSuggestions(false);
      
      const result = await searchKnowledge({
        query: finalQuery,
        filters: filters.vendor || filters.category ? filters : {},
        vector_weight: vectorWeight,
        keyword_weight: 1 - vectorWeight,
        top_k: 20
      });

      const searchResults = result?.data?.results || [];
      setResults(searchResults);
      
      // 保存到历史记录
      const newHistory = [
        { query: finalQuery, timestamp: new Date().toISOString(), resultsCount: searchResults.length },
        ...queryHistory.filter(h => h.query !== finalQuery)
      ].slice(0, 10);
      setQueryHistory(newHistory);
      localStorage.setItem('ragQueryHistory', JSON.stringify(newHistory));
      
      if (searchResults.length === 0) {
        setError('未找到相关内容，请尝试其他关键词');
      }
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || '搜索失败');
    } finally {
      setLoading(false);
    }
  }

  // 处理建议点击
  function handleSuggestionClick(suggestion) {
    setQuery(suggestion);
    setShowSuggestions(false);
    handleSearch(suggestion);
  }

  // 提交反馈
  async function handleFeedback(resultId, isHelpful) {
    try {
      await submitQueryFeedback({
        query: query,
        result_id: resultId,
        is_helpful: isHelpful
      });
      alert('感谢您的反馈！');
    } catch (e) {
      alert('反馈提交失败');
    }
  }

  // 清除过滤器
  function clearFilters() {
    setFilters({ vendor: '', category: '' });
    setVectorWeight(0.7);
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">IP智慧解答专家系统</h2>
        <p className="text-gray-600">基于RAG技术的网络故障智能诊断与解决方案</p>
      </div>

      {/* 搜索区域 */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="space-y-4">
          {/* 搜索框 */}
          <div className="relative">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="请描述您遇到的网络问题，如：OSPF邻居建立失败、BGP路由不通..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                />
                
                {/* 搜索建议下拉 */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                    {suggestions.map((suggestion, index) => (
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
                onClick={() => handleSearch()}
                disabled={loading}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? '搜索中...' : '智能搜索'}
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
              <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">厂商</label>
                    <select
                      value={filters.vendor}
                      onChange={(e) => setFilters({...filters, vendor: e.target.value})}
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
                      onChange={(e) => setFilters({...filters, category: e.target.value})}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      语义权重: {(vectorWeight * 100).toFixed(0)}%
                    </label>
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
                  <button
                    onClick={clearFilters}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    重置过滤器
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* 标签页 */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {['search', 'history'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 text-sm font-medium border-b-2 ${
                  activeTab === tab 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'search' ? '搜索结果' : '查询历史'}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'search' && (
            <div>
              {results.length > 0 ? (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 mb-4">
                    找到 {results.length} 个相关结果
                  </div>
                  
                  {results.map((result, index) => (
                    <ResultCard
                      key={index}
                      result={result}
                      index={index}
                      onSelect={() => setSelectedResult(result)}
                      onFeedback={handleFeedback}
                    />
                  ))}
                </div>
              ) : !loading && query && (
                <div className="text-center py-12 text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>暂无搜索结果</p>
                  <p className="text-sm mt-2">请尝试使用其他关键词或调整搜索条件</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              {queryHistory.length > 0 ? (
                <div className="space-y-2">
                  {queryHistory.map((item, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        setQuery(item.query);
                        setActiveTab('search');
                        handleSearch(item.query);
                      }}
                      className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900">{item.query}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(item.timestamp).toLocaleString()} · {item.resultsCount} 个结果
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  暂无查询历史
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 详情模态框 */}
      {selectedResult && (
        <ResultDetailModal
          result={selectedResult}
          onClose={() => setSelectedResult(null)}
          onFeedback={handleFeedback}
        />
      )}
    </div>
  );
}

// 结果卡片组件
function ResultCard({ result, index, onSelect, onFeedback }) {
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

// 结果详情模态框
function ResultDetailModal({ result, onClose, onFeedback }) {
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
          {/* 元信息 */}
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
          
          {/* 内容 */}
          <div className="prose max-w-none">
            <h3 className="text-lg font-medium mb-3">内容详情</h3>
            <div className="whitespace-pre-wrap text-gray-700">
              {result.content || result.text || result.description}
            </div>
          </div>
          
          {/* 解决方案 */}
          {result.solution && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-3">解决方案</h3>
              <div className="bg-green-50 p-4 rounded-lg">
                <pre className="whitespace-pre-wrap text-sm">{result.solution}</pre>
              </div>
            </div>
          )}
          
          {/* 相关命令 */}
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
            <div className="text-sm text-gray-600">
              这个信息对您有帮助吗？
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  onFeedback(result.id, true);
                  onClose();
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                有帮助 👍
              </button>
              <button
                onClick={() => {
                  onFeedback(result.id, false);
                  onClose();
                }}
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
