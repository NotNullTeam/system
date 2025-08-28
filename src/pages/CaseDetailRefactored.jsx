import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCaseById, getCaseNodes, getCaseEdges, submitInteraction, getNodeDetail, submitFeedback } from '../api/cases.js';
import { uploadFile } from '../api/files.js';
import { analyzeLog, getAnalysisResult } from '../api/analysis.js';
import DiagnosticCanvas from '../components/DiagnosticCanvas.jsx';

export default function CaseDetailRefactored() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // 状态管理
  const [caseData, setCaseData] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [activeNode, setActiveNode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  
  // 用户输入状态
  const [userInput, setUserInput] = useState('');
  const [attachments, setAttachments] = useState([]);
  
  // 面板状态
  const [rightPanelTab, setRightPanelTab] = useState('detail'); // detail | feedback | solution | analysis
  
  // AI分析状态
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState('');

  // 加载案例数据
  useEffect(() => {
    if (id && id !== 'undefined') {
      loadCaseData();
      // 设置定时刷新，检查新节点
      const interval = setInterval(() => {
        if (!processing && id !== 'undefined') {
          refreshNodes();
        }
      }, 5000);
      return () => clearInterval(interval);
    } else if (id === 'undefined') {
      // 如果ID无效，显示错误并返回案例列表
      setError('案例ID无效');
      setLoading(false);
    }
  }, [id, processing]);

  async function loadCaseData() {
    try {
      setLoading(true);
      const [caseRes, nodesRes, edgesRes] = await Promise.all([
        getCaseById(id),
        getCaseNodes(id),
        getCaseEdges(id)
      ]);
      
      
      setCaseData(caseRes?.data || caseRes);
      
      // 处理节点数据，确保是数组 - 修复嵌套格式问题
      const nodesList = Array.isArray(nodesRes?.data?.nodes) ? nodesRes.data.nodes :
                       Array.isArray(nodesRes?.data) ? nodesRes.data : 
                       Array.isArray(nodesRes) ? nodesRes : [];
      const edgesList = Array.isArray(edgesRes?.data?.edges) ? edgesRes.data.edges :
                       Array.isArray(edgesRes?.data) ? edgesRes.data : 
                       Array.isArray(edgesRes) ? edgesRes : [];
      
      
      setNodes(nodesList);
      setEdges(edgesList);
      
      // 自动选中最后一个节点
      if (nodesList.length > 0) {
        const lastNode = nodesList[nodesList.length - 1];
        if (lastNode && lastNode.id) {
          handleNodeClick(lastNode.id);
        }
      }
    } catch (e) {
      console.error('❌ 加载案例数据失败:', e);
      setError(e?.response?.data?.error?.message || e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  async function refreshNodes() {
    if (!id || id === 'undefined') {
      console.warn('无效的案例ID，跳过刷新');
      return;
    }
    
    try {
      const [nodesRes, edgesRes] = await Promise.all([
        getCaseNodes(id),
        getCaseEdges(id)
      ]);
      
      
      // 处理节点数据，确保是数组 - 修复嵌套格式问题
      const nodesList = Array.isArray(nodesRes?.data?.nodes) ? nodesRes.data.nodes :
                       Array.isArray(nodesRes?.data) ? nodesRes.data : 
                       Array.isArray(nodesRes) ? nodesRes : [];
      const edgesList = Array.isArray(edgesRes?.data?.edges) ? edgesRes.data.edges :
                       Array.isArray(edgesRes?.data) ? edgesRes.data : 
                       Array.isArray(edgesRes) ? edgesRes : [];
      
      
      setNodes(nodesList);
      setEdges(edgesList);
    } catch (e) {
      console.error('刷新节点失败:', e);
    }
  }

  async function handleNodeClick(nodeId) {
    try {
      const nodeDetail = await getNodeDetail(id, nodeId);
      setActiveNode(nodeDetail?.data || nodeDetail);
      setRightPanelTab('detail');
    } catch (e) {
      console.error('获取节点详情失败:', e);
    }
  }

  async function handleUserResponse(e) {
    e.preventDefault();
    
    if (!userInput.trim() && attachments.length === 0) {
      alert('请输入回复内容或上传附件');
      return;
    }

    setProcessing(true);
    try {
      // 提交用户响应
      const response = await submitInteraction(id, {
        type: 'USER_RESPONSE',
        content: userInput,
        parent_node_id: activeNode?.id,
        attachments: attachments
      });

      // 兼容后端返回字段命名（snake_case / camelCase）
      const respData = response?.data || response || {};
      const newNodes = Array.isArray(respData?.new_nodes)
        ? respData.new_nodes
        : Array.isArray(respData?.newNodes)
        ? respData.newNodes
        : [];
      const newEdges = Array.isArray(respData?.new_edges)
        ? respData.new_edges
        : Array.isArray(respData?.newEdges)
        ? respData.newEdges
        : [];
      const processingNodeId =
        respData?.processingNodeId ?? respData?.processing_node_id ?? null;
      
      if (newNodes.length > 0) {
        setNodes(prev => [...prev, ...newNodes]);
      }
      if (newEdges.length > 0) {
        setEdges(prev => [...prev, ...newEdges]);
      }

      // 清空输入
      setUserInput('');
      setAttachments([]);
      
      // 选中新节点
      if (newNodes.length > 0) {
        const lastNewNode = newNodes[newNodes.length - 1];
        setTimeout(() => {
          handleNodeClick(lastNewNode.id);
        }, 500);
      }

      // 定向轮询：等待处理中的节点完成（避免长期“运行中”）
      if (processingNodeId) {
        const startTs = Date.now();
        const timeoutMs = 120000; // 最多轮询2分钟
        const pollIntervalMs = 2000;

        const pollProcessing = async () => {
          try {
            const detail = await getNodeDetail(id, processingNodeId);
            const nodeObj = detail?.data || detail;
            const status = nodeObj?.status;
            if (status && status !== 'PROCESSING') {
              await refreshNodes();
              setProcessing(false);
              return;
            }
          } catch (err) {
            // 忽略错误并继续短暂重试
          }
          if (Date.now() - startTs < timeoutMs) {
            setTimeout(pollProcessing, pollIntervalMs);
          } else {
            // 超时后结束loading但仍保留当前节点列表
            setProcessing(false);
          }
        };

        // 稍等片刻启动轮询，给后端任务提交/事务提交一些时间
        setTimeout(pollProcessing, 1000);
      } else {
        // 无处理节点ID，直接结束processing
        setProcessing(false);
      }
    } catch (e) {
      alert(e?.response?.data?.error?.message || '提交失败');
      setProcessing(false);
    }
  }

  async function handleFileUpload(e) {
    const files = Array.from(e.target.files);
    const uploadPromises = files.map(file => {
      return uploadFile(file);
    });
    
    try {
      const results = await Promise.all(uploadPromises);
      const fileIds = results.map(r => r?.data?.id || r?.id).filter(Boolean);
      setAttachments(prev => [...prev, ...fileIds]);
    } catch (error) {
      console.error('文件上传失败:', error);
      alert('文件上传失败，请重试');
    }
  }

  async function handleFeedbackSubmit(rating, comment) {
    try {
      await submitFeedback(id, {
        node_id: activeNode?.id,
        rating: rating,
        comment: comment
      });
      alert('感谢您的反馈！');
      setRightPanelTab('detail');
    } catch (e) {
      alert('反馈提交失败');
    }
  }

  async function handleAIAnalysis() {
    if (!activeNode?.content) {
      setAnalysisError('当前节点没有可分析的内容');
      return;
    }

    setAnalysisLoading(true);
    setAnalysisError('');
    setAnalysisResult(null);

    try {
      // 提交分析请求
      const analysisResponse = await analyzeLog({
        content: activeNode.content,
        context: {
          case_id: id,
          node_id: activeNode.id,
          node_type: activeNode.type
        }
      });

      const analysisId = analysisResponse?.data?.analysis_id || analysisResponse?.analysis_id;
      
      if (analysisId) {
        // 轮询获取分析结果
        const pollResult = async () => {
          try {
            const result = await getAnalysisResult(analysisId);
            if (result?.data?.status === 'COMPLETED') {
              setAnalysisResult(result.data);
              setAnalysisLoading(false);
            } else if (result?.data?.status === 'FAILED') {
              setAnalysisError('分析失败：' + (result.data.error || '未知错误'));
              setAnalysisLoading(false);
            } else {
              // 继续轮询
              setTimeout(pollResult, 2000);
            }
          } catch (e) {
            setAnalysisError('获取分析结果失败');
            setAnalysisLoading(false);
          }
        };
        
        setTimeout(pollResult, 1000);
      } else {
        setAnalysisError('分析请求提交失败');
        setAnalysisLoading(false);
      }
    } catch (e) {
      setAnalysisError(e?.response?.data?.error?.message || '分析请求失败');
      setAnalysisLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-red-600">{error}</p>
          <Link to="/cases" className="mt-4 inline-block text-blue-600 hover:underline">
            返回案例列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 顶部导航栏 */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/cases" className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
            <span>←</span> 返回列表
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">
            诊断案例 #{id}: {caseData?.title || '未命名'}
          </h1>
          <span className={`px-2 py-1 text-xs rounded-full ${
            caseData?.status === 'in_progress' ? 'bg-green-100 text-green-800' :
            caseData?.status === 'resolved' ? 'bg-blue-100 text-blue-800' :
            caseData?.status === 'closed' ? 'bg-gray-200 text-gray-700' :
            'bg-gray-100 text-gray-800'
          }`}>
            {caseData?.status === 'in_progress' ? '诊断中' :
             caseData?.status === 'resolved' ? '已解决' :
             caseData?.status === 'closed' ? '已关闭' : '待处理'}
          </span>
        </div>
        <div className="text-sm text-gray-500">
          创建于 {(caseData?.createdAt || caseData?.created_at) ? new Date(caseData.createdAt || caseData.created_at).toLocaleString() : '-'}
        </div>
      </div>

      {/* 主体内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：诊断历史列表 */}
        <div className="w-64 bg-white border-r overflow-y-auto">
          <div className="p-4 border-b">
            <h2 className="font-medium text-gray-900">诊断流程</h2>
            <p className="text-xs text-gray-500 mt-1">共 {nodes.length} 个节点</p>
          </div>
          <div className="p-2">
            {nodes.map((node, index) => (
              <button
                key={node.id}
                onClick={() => handleNodeClick(node.id)}
                className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors ${
                  activeNode?.id === node.id
                    ? 'bg-blue-50 border border-blue-300'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {node.type === 'USER_QUERY' || node.type === 'USER_RESPONSE' ? '👤' :
                     node.type === 'AI_ANALYSIS' ? '🤖' :
                     node.type === 'AI_CLARIFICATION' ? '❓' :
                     node.type === 'SOLUTION' ? '✅' : '📝'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      步骤 {index + 1}: {node.title || node.type}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(node?.metadata?.timestamp || node?.createdAt || node?.created_at || node?.timestamp) ? new Date(node.metadata?.timestamp || node.createdAt || node.created_at || node.timestamp).toLocaleTimeString() : ''}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 画布区域 - 现在占据大部分空间 */}
        <div className="flex-1 p-4">
          <DiagnosticCanvas
            caseId={id}
            nodes={nodes}
            edges={edges}
            onNodeClick={handleNodeClick}
            loading={processing}
            activeNodeId={activeNode?.id}
          />
        </div>
      </div>
    </div>
  );
}

// AI分析面板组件
function AIAnalysisPanel({ node, loading, result, error, onAnalyze }) {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">AI智能分析</h3>
        <button
          onClick={onAnalyze}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {loading ? (
            <>
              <span className="animate-spin">🔄</span>
              分析中...
            </>
          ) : (
            <>
              <span>🤖</span>
              开始分析
            </>
          )}
        </button>
      </div>

      <div className="text-sm text-gray-600 bg-blue-50 rounded-lg p-3">
        <p className="mb-2"><strong>分析内容：</strong>{node.type === 'USER_QUERY' ? '用户问题' : node.type === 'USER_RESPONSE' ? '用户回复' : '节点内容'}</p>
        <p className="text-xs text-gray-500">AI将分析当前节点内容，提供问题诊断建议、相关知识点和解决思路</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-red-800">
            <span>❌</span>
            <span className="font-medium">分析失败</span>
          </div>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
      )}

      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="animate-spin text-2xl mb-2">🔄</div>
          <p className="text-blue-800 font-medium">AI正在分析中...</p>
          <p className="text-blue-600 text-sm mt-1">请稍候，这可能需要几秒钟</p>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* 分析摘要 */}
          {result.summary && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="text-green-900 font-medium mb-2 flex items-center gap-2">
                <span>📋</span>
                分析摘要
              </h4>
              <p className="text-green-800 text-sm whitespace-pre-wrap">{result.summary}</p>
            </div>
          )}

          {/* 问题诊断 */}
          {result.diagnosis && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="text-orange-900 font-medium mb-2 flex items-center gap-2">
                <span>🔍</span>
                问题诊断
              </h4>
              <p className="text-orange-800 text-sm whitespace-pre-wrap">{result.diagnosis}</p>
            </div>
          )}

          {/* 建议解决方案 */}
          {result.suggestions && result.suggestions.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-blue-900 font-medium mb-2 flex items-center gap-2">
                <span>💡</span>
                建议解决方案
              </h4>
              <ul className="space-y-2">
                {result.suggestions.map((suggestion, index) => (
                  <li key={index} className="text-blue-800 text-sm flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 相关命令 */}
          {result.commands && result.commands.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-gray-900 font-medium mb-2 flex items-center gap-2">
                <span>⚡</span>
                相关命令
              </h4>
              <div className="space-y-2">
                {result.commands.map((cmd, index) => (
                  <div key={index} className="bg-gray-900 text-green-400 rounded p-2 font-mono text-sm">
                    <div className="flex justify-between items-start">
                      <code className="flex-1">{cmd}</code>
                      <button
                        onClick={() => navigator.clipboard.writeText(cmd)}
                        className="ml-2 text-gray-400 hover:text-white"
                        title="复制"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 置信度 */}
          {result.confidence && (
            <div className="text-sm text-gray-600 text-center">
              分析置信度: {Math.round(result.confidence * 100)}%
            </div>
          )}
        </div>
      )}

      {!loading && !result && !error && (
        <div className="text-center text-gray-500 py-8">
          <div className="text-4xl mb-2">🤖</div>
          <p>点击"开始分析"让AI为您分析当前节点内容</p>
        </div>
      )}
    </div>
  );
}

// 反馈面板组件
function FeedbackPanel({ onSubmit }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (rating === 0) {
      alert('请选择评分');
      return;
    }
    onSubmit(rating, comment);
    setRating(0);
    setComment('');
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      <h3 className="text-lg font-medium text-gray-900">解决方案反馈</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          方案有效性评分
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`text-2xl transition-colors ${
                star <= rating ? 'text-yellow-400' : 'text-gray-300'
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          补充说明（可选）
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          placeholder="请描述方案的实际效果，或提供改进建议..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>

      <button
        type="submit"
        className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        提交反馈
      </button>

      <p className="text-xs text-gray-500 text-center">
        您的反馈将帮助我们改进诊断质量
      </p>
    </form>
  );
}
