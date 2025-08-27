import React, { useEffect, useRef, useState } from 'react';
import { Graph } from '@antv/g6';

// 节点类型映射
const NODE_CONFIGS = {
  USER_QUERY: {
    icon: '👤',
    color: '#1890ff',
    title: '用户问题'
  },
  USER_RESPONSE: {
    icon: '👤', 
    color: '#1890ff',
    title: '用户补充信息'
  },
  AI_ANALYSIS: {
    icon: '🤖',
    color: '#722ed1',
    title: 'AI分析中'
  },
  AI_CLARIFICATION: {
    icon: '❓',
    color: '#fa8c16', 
    title: '需要更多信息'
  },
  SOLUTION: {
    icon: '✅',
    color: '#52c41a',
    title: '解决方案'
  }
};

export default function DiagnosticCanvas({ 
  caseId, 
  nodes = [], 
  edges = [], 
  onNodeClick,
  loading = false,
  activeNodeId = null
}) {
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 初始化G6图实例
    if (!graphRef.current) {
      const width = containerRef.current.scrollWidth;
      const height = containerRef.current.scrollHeight || 600;

      const graph = new Graph({
        container: containerRef.current,
        width,
        height,
        layout: {
          type: 'dagre',
          direction: 'TB',
          nodesep: 50,
          ranksep: 70,
          controlPoints: true
        },
        defaultNode: {
          type: 'rect',
          size: [180, 60],
          style: {
            fill: '#fff',
            stroke: '#e8e8e8',
            lineWidth: 2,
            radius: 8,
            cursor: 'pointer'
          },
          labelCfg: {
            style: {
              fill: '#333',
              fontSize: 14
            }
          }
        },
        defaultEdge: {
          type: 'cubic-vertical',
          style: {
            stroke: '#c3c3c3',
            lineWidth: 2,
            endArrow: {
              path: G6.Arrow.triangle(8, 10, 15),
              fill: '#c3c3c3'
            }
          }
        },
        modes: {
          default: ['drag-canvas', 'zoom-canvas', 'click-select']
        },
        animate: true,
        animateCfg: {
          duration: 500,
          easing: 'easeCubic'
        }
      });

      // 节点点击事件
      graphRef.current.on('node:click', (evt) => {
        const node = evt.item;
        const model = node.getModel();
        if (onNodeClick) {
          onNodeClick(model.id, model);
        }
      });

      // 节点悬停事件
      graphRef.current.on('node:mouseenter', (evt) => {
        const node = evt.item;
        const model = node.getModel();
        setHoveredNode(model.id);
        graphRef.current.setItemState(node, 'hover', true);
      });

      graphRef.current.on('node:mouseleave', (evt) => {
        const node = evt.item;
        setHoveredNode(null);
        graphRef.current.setItemState(node, 'hover', false);
      });
    }

    // 处理数据更新
    const data = {
      nodes: nodes.map(node => {
        const config = NODE_CONFIGS[node.type] || {};
        const isActive = node.id === activeNodeId;
        const isAwaiting = node.status === 'AWAITING_USER_INPUT';
        
        return {
          id: node.id,
          label: `${config.icon} ${node.title || config.title || node.type}`,
          type: 'rect',
          style: {
            fill: isActive ? config.color : '#fff',
            stroke: config.color,
            lineWidth: isActive ? 3 : 2,
            shadowColor: isActive ? config.color : 'transparent',
            shadowBlur: isActive ? 10 : 0,
            cursor: 'pointer'
          },
          labelCfg: {
            style: {
              fill: isActive ? '#fff' : '#333',
              fontSize: 14,
              fontWeight: isActive ? 'bold' : 'normal'
            }
          },
          // 自定义数据
          nodeType: node.type,
          nodeStatus: node.status,
          content: node.content,
          description: node.description
        };
      }),
      edges: edges.map(edge => ({
        id: edge.id || `${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        style: {
          stroke: '#c3c3c3',
          lineWidth: 2,
          lineDash: edge.pending ? [5, 5] : undefined,
          endArrow: {
            path: G6.Arrow.triangle(8, 10, 15),
            fill: '#c3c3c3'
          }
        }
      }))
    };

    // 添加加载中的虚拟边
    if (loading && nodes.length > 0) {
      const lastNode = nodes[nodes.length - 1];
      data.edges.push({
        id: 'loading-edge',
        source: lastNode.id,
        target: 'loading-node',
        style: {
          stroke: '#1890ff',
          lineWidth: 2,
          lineDash: [5, 5],
          endArrow: false
        }
      });
      data.nodes.push({
        id: 'loading-node',
        label: '🔄 AI处理中...',
        type: 'rect',
        style: {
          fill: '#f0f2f5',
          stroke: '#1890ff',
          lineWidth: 2,
          lineDash: [5, 5]
        }
      });
    }

    graphRef.current.data(data);
    graphRef.current.render();

    // 自适应画布
    if (nodes.length > 0) {
      setTimeout(() => {
        graphRef.current.fitView(20);
      }, 100);
    }

    return () => {
      // 清理事件监听
      if (graphRef.current) {
        graphRef.current.off('node:click');
        graphRef.current.off('node:mouseenter');
        graphRef.current.off('node:mouseleave');
      }
    };
  }, [nodes, edges, loading, activeNodeId, onNodeClick]);

  // 响应容器大小变化
  useEffect(() => {
    const handleResize = () => {
      if (graphRef.current && containerRef.current) {
        const width = containerRef.current.scrollWidth;
        const height = containerRef.current.scrollHeight || 600;
        graphRef.current.changeSize(width, height);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 工具栏控制
  const handleZoomIn = () => {
    if (graphRef.current) {
      graphRef.current.zoom(1.2);
    }
  };

  const handleZoomOut = () => {
    if (graphRef.current) {
      graphRef.current.zoom(0.8);
    }
  };

  const handleFitView = () => {
    if (graphRef.current) {
      graphRef.current.fitView(20);
    }
  };

  const handleCenterView = () => {
    if (graphRef.current) {
      graphRef.current.fitCenter();
    }
  };

  return (
    <div className="relative w-full h-full bg-gray-50 rounded-lg overflow-hidden">
      {/* 画布容器 */}
      <div 
        ref={containerRef} 
        className="w-full h-full"
        style={{ minHeight: '600px' }}
      />

      {/* 工具栏 */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 bg-white rounded-lg shadow-md p-2">
        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="放大"
        >
          🔍+
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="缩小"
        >
          🔍-
        </button>
        <button
          onClick={handleFitView}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="适应视图"
        >
          ⊡
        </button>
        <button
          onClick={handleCenterView}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="居中"
        >
          ⊙
        </button>
      </div>

      {/* 节点图例 */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md p-3">
        <div className="text-xs text-gray-600 mb-2 font-medium">节点类型</div>
        <div className="space-y-1">
          {Object.entries(NODE_CONFIGS).map(([type, config]) => (
            <div key={type} className="flex items-center gap-2 text-xs">
              <span className="w-4 h-4 rounded" style={{ backgroundColor: config.color, opacity: 0.2 }}></span>
              <span>{config.icon}</span>
              <span className="text-gray-600">{config.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 加载提示 */}
      {loading && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg shadow-md flex items-center gap-2">
          <LoadingOutlined spin />
          <span>AI正在分析处理中...</span>
        </div>
      )}
    </div>
  );
}
