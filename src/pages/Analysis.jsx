/*
 * 废弃页面 - Analysis.jsx
 * 
 * 此页面已废弃，功能已整合到以下位置：
 * - AI智能分析功能 → CaseDetailRefactored.jsx 的"AI分析"标签页
 * - 在诊断流程中直接对节点内容进行分析，提供更好的上下文体验
 * 
 * 保留此文件仅供参考，不再在路由中使用
 * 最后更新：2025-08-27
 */

import React, { useState, useEffect } from 'react';
import { analyzeLog, getAnalysisResult, getAnalysisHistory, getFixSuggestions, submitAnalysisFeedback } from '../api/analysis.js';

export default function Analysis() {
  const [logContent, setLogContent] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [history, setHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('analyze');

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const data = await getAnalysisHistory();
      setHistory(data?.data || data || []);
    } catch (e) {
      console.error('加载历史失败:', e);
    }
  }

  async function handleAnalyze() {
    if (!logContent.trim()) {
      setError('请输入日志内容');
      return;
    }

    try {
      setAnalyzing(true);
      setError('');
      
      const result = await analyzeLog({ content: logContent });
      const analysisId = result?.data?.id || result?.id;
      
      if (analysisId) {
        // 获取分析结果
        const analysisResult = await getAnalysisResult(analysisId);
        setCurrentAnalysis(analysisResult?.data || analysisResult);
        
        // 获取修复建议
        const suggestionsResult = await getFixSuggestions(analysisId);
        setSuggestions(suggestionsResult?.data || suggestionsResult || []);
        
        // 刷新历史记录
        loadHistory();
        
        setActiveTab('result');
      }
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || '分析失败');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleViewHistory(item) {
    try {
      const analysisResult = await getAnalysisResult(item.id);
      setCurrentAnalysis(analysisResult?.data || analysisResult);
      
      const suggestionsResult = await getFixSuggestions(item.id);
      setSuggestions(suggestionsResult?.data || suggestionsResult || []);
      
      setActiveTab('result');
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || '加载失败');
    }
  }

  async function handleFeedback(rating, comment) {
    if (!currentAnalysis?.id) return;
    
    try {
      await submitAnalysisFeedback(currentAnalysis.id, { rating, comment });
      alert('反馈提交成功');
    } catch (e) {
      alert(e?.response?.data?.error?.message || e?.message || '反馈提交失败');
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">AI 日志解析</h2>
      
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {['analyze', 'result', 'history'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 text-sm font-medium border-b-2 ${
                  activeTab === tab 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'analyze' ? '日志分析' : 
                 tab === 'result' ? '分析结果' : '历史记录'}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {activeTab === 'analyze' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  日志内容
                </label>
                <textarea
                  value={logContent}
                  onChange={(e) => setLogContent(e.target.value)}
                  placeholder="请粘贴需要分析的技术日志内容..."
                  rows={12}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing || !logContent.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {analyzing ? '分析中...' : '开始分析'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'result' && (
            <div>
              {currentAnalysis ? (
                <div className="space-y-6">
                  {/* 分析概要 */}
                  <div>
                    <h3 className="text-lg font-medium mb-3">分析概要</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <div className="text-sm text-gray-600">严重程度</div>
                          <div className={`font-medium ${
                            currentAnalysis.severity === 'high' ? 'text-red-600' :
                            currentAnalysis.severity === 'medium' ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            {currentAnalysis.severity === 'high' ? '高' :
                             currentAnalysis.severity === 'medium' ? '中' : '低'}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">问题类型</div>
                          <div className="font-medium">{currentAnalysis.category || '未分类'}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">分析时间</div>
                          <div className="font-medium">
                            {currentAnalysis.created_at ? 
                              new Date(currentAnalysis.created_at).toLocaleString() : '-'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 问题描述 */}
                  {currentAnalysis.description && (
                    <div>
                      <h3 className="text-lg font-medium mb-3">问题描述</h3>
                      <div className="bg-white border rounded-lg p-4">
                        <p className="text-gray-700">{currentAnalysis.description}</p>
                      </div>
                    </div>
                  )}

                  {/* 异常节点 */}
                  {currentAnalysis.anomaly_nodes && currentAnalysis.anomaly_nodes.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium mb-3">异常节点</h3>
                      <div className="space-y-2">
                        {currentAnalysis.anomaly_nodes.map((node, index) => (
                          <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="font-medium text-red-800">{node.name || node.location}</div>
                            <div className="text-sm text-red-600">{node.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 修复建议 */}
                  {suggestions.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium mb-3">修复建议</h3>
                      <div className="space-y-3">
                        {suggestions.map((suggestion, index) => (
                          <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="font-medium text-green-800 mb-2">
                              建议 {index + 1}: {suggestion.title}
                            </div>
                            <div className="text-sm text-green-700 mb-2">
                              {suggestion.description}
                            </div>
                            {suggestion.steps && (
                              <div className="text-sm text-green-600">
                                <div className="font-medium mb-1">执行步骤:</div>
                                <ol className="list-decimal list-inside space-y-1">
                                  {suggestion.steps.map((step, stepIndex) => (
                                    <li key={stepIndex}>{step}</li>
                                  ))}
                                </ol>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 反馈区域 */}
                  <div>
                    <h3 className="text-lg font-medium mb-3">分析反馈</h3>
                    <FeedbackForm onSubmit={handleFeedback} />
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  请先进行日志分析或从历史记录中选择查看
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              {history.length > 0 ? (
                <div className="space-y-3">
                  {history.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                         onClick={() => handleViewHistory(item)}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">
                            {item.category || '日志分析'} #{item.id}
                          </div>
                          <div className="text-sm text-gray-600">
                            {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
                          </div>
                        </div>
                        <div className={`px-2 py-1 text-xs rounded-full ${
                          item.severity === 'high' ? 'bg-red-100 text-red-800' :
                          item.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {item.severity === 'high' ? '高' :
                           item.severity === 'medium' ? '中' : '低'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  暂无分析历史
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FeedbackForm({ onSubmit }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(rating, comment);
    setComment('');
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          分析质量评分 (1-5 分)
        </label>
        <div className="flex space-x-2">
          {[1, 2, 3, 4, 5].map(score => (
            <button
              key={score}
              type="button"
              onClick={() => setRating(score)}
              className={`w-8 h-8 rounded-full text-sm ${
                rating >= score ? 'bg-yellow-400 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          评价和建议
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="请分享您对分析结果的看法..."
          rows={3}
          className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <button
        type="submit"
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        提交反馈
      </button>
    </form>
  );
}
