import React, { useEffect, useRef, useState } from 'react';
import { 
  FullscreenOutlined, 
  CompressOutlined,
  ReloadOutlined,
  DeleteOutlined 
} from '@ant-design/icons';

// 原生React对话式诊断界面组件
function DiagnosticCanvas({ 
  nodes = [], 
  edges = [], 
  loading = false, 
  activeNodeId = null, 
  onNodeClick = null 
}) {
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);

  // 将时间戳转为"x分钟前"格式
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return '0m ago';
    try {
      const now = Date.now();
      const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
      const diff = Math.max(0, now - time);
      const minutes = Math.floor(diff / 60000);
      if (minutes === 0) return '0m ago';
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      return `${Math.floor(hours / 24)}d ago`;
    } catch {
      return '0m ago';
    }
  };

  // 提取消息内容文本
  const extractDisplayText = (content) => {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) return content.filter(Boolean).join('\n');
    if (typeof content === 'object') {
      const text = content.answer || content.clarification || content.analysis || 
                   content.text || content.message || content.content || content.summary || '';
      return typeof text === 'string' ? text : JSON.stringify(text);
    }
    return String(content);
  };

  // 自动滚动到底部
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [nodes, loading]);

  // 工具栏控制函数
  const handleFullscreen = () => setIsFullscreen(!isFullscreen);
  const handleRefresh = () => window.location.reload();
  const handleClear = () => {
    if (window.confirm('确定要清空所有对话吗？')) {
      // 这里可以调用父组件的清空回调
    }
  };

  // 处理消息点击事件
  const handleMessageClick = (nodeId, nodeData) => {
    if (onNodeClick) {
      onNodeClick(nodeId, nodeData);
    }
  };

  // 渲染单个消息气泡
  const renderMessage = (node) => {
    const isUser = node.type === 'USER_QUERY';
    const isActive = node.id === activeNodeId;
    const isLoading = loading && node.id === activeNodeId;
    const messageText = extractDisplayText(node.content || node.description || node.title);
    const timestamp = (node.metadata && node.metadata.timestamp) || 
                     node.created_at || node.createdAt || node.timestamp;

    return (
      <div
        key={node.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 px-4`}
        onMouseEnter={() => setHoveredMessageId(node.id)}
        onMouseLeave={() => setHoveredMessageId(null)}
      >
        <div
          className={`max-w-2xl cursor-pointer transition-all duration-200 ${
            isUser 
              ? `bg-gray-700 border-gray-600 ${isActive ? 'ring-2 ring-gray-500' : ''}`
              : `bg-gradient-to-r from-indigo-900 to-purple-900 border-indigo-600 ${
                  isActive ? 'ring-2 ring-indigo-400' : ''
                }`
          } border rounded-2xl p-4 shadow-lg hover:shadow-xl`}
          onClick={() => handleMessageClick(node.id, node)}
        >
          {/* 消息内容 */}
          {!isUser && (
            <div className="text-sm font-semibold text-gray-300 mb-2">
              deepseek-chat:
            </div>
          )}
          
          <div className={`${isUser ? 'text-white' : 'text-gray-100'} whitespace-pre-wrap break-words`}>
            {messageText}
          </div>

          {/* 底部信息栏 */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-600">
            <div className="flex items-center space-x-2">
              {!isUser && (
                <div className="flex items-center space-x-1">
                  <span className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded-full">
                    DeepSeek V3.1
                  </span>
                </div>
              )}
              {isUser && (
                <span className="text-xs px-2 py-1 bg-gray-600 text-gray-300 rounded-full">
                  我
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {isLoading && (
                <span className="text-blue-400 animate-pulse">Typing ...</span>
              )}
              <span className="text-xs text-gray-400">
                {formatTimeAgo(timestamp)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div 
      className={`relative ${isFullscreen ? 'fixed inset-0 z-50' : 'w-full h-full'} 
                  bg-gray-900 flex flex-col`}
    >
      {/* 工具栏 */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={handleFullscreen}
          className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg border border-gray-600 transition-colors shadow-lg"
          title={isFullscreen ? "退出全屏" : "全屏模式"}
        >
          {isFullscreen ? <CompressOutlined /> : <FullscreenOutlined />}
        </button>
        <button
          onClick={handleRefresh}
          className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg border border-gray-600 transition-colors shadow-lg"
          title="刷新"
        >
          <ReloadOutlined />
        </button>
        <button
          onClick={handleClear}
          className="p-2 bg-red-800 hover:bg-red-700 text-white rounded-lg border border-red-600 transition-colors shadow-lg"
          title="清空对话"
        >
          <DeleteOutlined />
        </button>
      </div>

      {/* 对话流容器 */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto py-8 space-y-1"
        style={{ maxHeight: isFullscreen ? '100vh' : '600px' }}
      >
        {nodes.length === 0 && !loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <div className="text-6xl mb-4">💬</div>
              <div className="text-lg">开始一个新的分析，请开始输入...</div>
            </div>
          </div>
        )}
        
        {nodes.map(renderMessage)}
        
        {/* 加载指示器 */}
        {loading && (
          <div className="flex justify-start mb-4 px-4">
            <div className="max-w-2xl bg-gradient-to-r from-indigo-900 to-purple-900 border border-indigo-600 rounded-2xl p-4 shadow-lg">
              <div className="text-sm font-semibold text-gray-300 mb-2">
                deepseek-chat:
              </div>
              <div className="flex items-center space-x-2 text-gray-100">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-sm">正在思考...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 状态栏 */}
      <div className="px-4 py-2 bg-gray-800 border-t border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-4">
            <span>消息数: {nodes.length}</span>
            {activeNodeId && <span>活跃节点: {activeNodeId}</span>}
          </div>
          <div className="flex items-center space-x-2">
            {hoveredMessageId && <span>悬停: {hoveredMessageId}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DiagnosticCanvas;
