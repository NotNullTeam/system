import React, { useState, useEffect } from 'react';
import { searchKnowledge, getSearchSuggestions, getSearchFilters, saveSearchHistory, getSearchHistory } from '../api/search.js';

export default function Knowledge() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [filters, setFilters] = useState({});
  const [availableFilters, setAvailableFilters] = useState({});
  const [weights, setWeights] = useState({
    semantic: 0.7,
    keyword: 0.3
  });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (query.length > 2) {
      loadSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [query]);

  async function loadInitialData() {
    try {
      const [filtersData, historyData] = await Promise.all([
        getSearchFilters().catch(() => ({ data: {} })),
        getSearchHistory().catch(() => ({ data: [] }))
      ]);
      setAvailableFilters(filtersData?.data || {});
      setHistory(historyData?.data || []);
    } catch (e) {
      console.error('加载初始数据失败:', e);
    }
  }

  async function loadSuggestions() {
    try {
      const data = await getSearchSuggestions(query);
      setSuggestions(data?.data || data || []);
    } catch (e) {
      console.error('加载建议词失败:', e);
    }
  }

  async function handleSearch() {
    if (!query.trim()) return;
    
    try {
      setLoading(true);
      setError('');
      
      const searchParams = {
        query: query.trim(),
        filters,
        weights
      };
      
      const data = await searchKnowledge(searchParams);
      setResults(data?.data || data || []);
      
      // 保存搜索历史
      await saveSearchHistory(query.trim(), filters).catch(() => {});
      
      // 更新历史记录
      setHistory(prev => [
        { query: query.trim(), timestamp: new Date().toISOString() },
        ...prev.slice(0, 9)
      ]);
      
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || '搜索失败');
    } finally {
      setLoading(false);
    }
  }

  function handleSuggestionClick(suggestion) {
    setQuery(suggestion);
    setSuggestions([]);
  }

  function handleHistoryClick(historyItem) {
    setQuery(historyItem.query);
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">知识检索</h2>
      
      {/* 搜索区域 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="space-y-4">
          {/* 搜索框 */}
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="输入关键词或问题进行搜索..."
              className="w-full border rounded-md px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="absolute right-2 top-2 px-4 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '搜索中...' : '搜索'}
            </button>
            
            {/* 建议词下拉 */}
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-t-0 rounded-b-md shadow-lg z-10">
                {suggestions.slice(0, 5).map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b last:border-b-0"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 权重调节 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                语义搜索权重: {Math.round(weights.semantic * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={weights.semantic}
                onChange={(e) => setWeights(prev => ({
                  semantic: parseFloat(e.target.value),
                  keyword: 1 - parseFloat(e.target.value)
                }))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                关键词搜索权重: {Math.round(weights.keyword * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={weights.keyword}
                onChange={(e) => setWeights(prev => ({
                  keyword: parseFloat(e.target.value),
                  semantic: 1 - parseFloat(e.target.value)
                }))}
                className="w-full"
              />
            </div>
          </div>

          {/* 过滤器 */}
          {Object.keys(availableFilters).length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">过滤条件</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(availableFilters).map(([key, options]) => (
                  <select
                    key={key}
                    value={filters[key] || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      [key]: e.target.value || undefined
                    }))}
                    className="border rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{key}</option>
                    {(options || []).map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 搜索历史 */}
      {history.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">搜索历史</h3>
          <div className="flex flex-wrap gap-2">
            {history.slice(0, 5).map((item, index) => (
              <button
                key={index}
                onClick={() => handleHistoryClick(item)}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
              >
                {item.query}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* 搜索结果 */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-8 text-center text-gray-600">搜索中...</div>
        ) : results.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {query ? '未找到相关结果' : '输入关键词开始搜索'}
          </div>
        ) : (
          <div className="divide-y">
            {results.map((result, index) => (
              <div key={index} className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-medium text-gray-900">
                    {result.title || result.name || `结果 ${index + 1}`}
                  </h3>
                  {result.score && (
                    <span className="text-sm text-gray-500">
                      相关度: {Math.round(result.score * 100)}%
                    </span>
                  )}
                </div>
                
                {result.content && (
                  <p className="text-gray-600 mb-3">
                    {result.content.length > 200 
                      ? result.content.substring(0, 200) + '...' 
                      : result.content
                    }
                  </p>
                )}
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex space-x-4">
                    {result.type && <span>类型: {result.type}</span>}
                    {result.source && <span>来源: {result.source}</span>}
                  </div>
                  {result.updated_at && (
                    <span>更新时间: {new Date(result.updated_at).toLocaleDateString()}</span>
                  )}
                </div>
                
                {result.tags && result.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {result.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
