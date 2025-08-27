import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSystemStats, getFaultCategories, getTrends, getCoverage, getTimeline } from '../api/dashboard.js';

export default function Dashboard() {
  const [stats, setStats] = useState({});
  const [faultCategories, setFaultCategories] = useState([]);
  const [trends, setTrends] = useState([]);
  const [coverage, setCoverage] = useState({});
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trendRange, setTrendRange] = useState('month'); // week | month | year

  useEffect(() => {
    loadDashboardData();
  }, []);

  // 颜色调色板（与 index.css 的 CSS 变量保持一致）
  const palette = [
    'var(--brand-blue-500)',
    'var(--brand-green-500)',
    'var(--brand-yellow-500)',
    'var(--brand-red-500)',
    'var(--brand-blue-700)',
    'var(--brand-green-700)',
    'var(--brand-yellow-700)',
    'var(--brand-red-700)',
    'var(--brand-blue-400)',
    'var(--brand-green-400)'
  ];

  // 计算圆环图分段
  const totalFault = faultCategories.reduce((sum, c) => sum + (c?.count || 0), 0);
  let acc = 0;
  const segments = totalFault > 0
    ? faultCategories.map((c, i) => {
        const value = c?.count || 0;
        const percent = (value / totalFault) * 100;
        const start = acc;
        const end = acc + percent;
        acc = end;
        return {
          name: c?.name || `类别 ${i + 1}`,
          count: value,
          percent,
          start,
          end,
          color: palette[i % palette.length],
        };
      })
    : [];
  const gradient = segments.length
    ? `conic-gradient(${segments.map(s => `${s.color} ${s.start}% ${s.end}%`).join(', ')})`
    : 'conic-gradient(#e5e7eb 0 100%)'; // 默认灰色

  async function loadDashboardData() {
    try {
      setLoading(true);
      const [statsData, faultData, trendsData, coverageData, timelineData] = await Promise.all([
        getSystemStats().catch(() => ({ data: {} })),
        getFaultCategories().catch(() => ({ data: [] })),
        getTrends({ range: trendRange }).catch(() => ({ data: [] })),
        getCoverage().catch(() => ({ data: {} })),
        getTimeline().catch(() => ({ data: [] }))
      ]);
      
      setStats(statsData?.data || {});
      setFaultCategories(faultData?.data || []);
      setTrends(trendsData?.data || []);
      setCoverage(coverageData?.data || {});
      setTimeline(timelineData?.data || []);
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  // 切换时间范围时刷新趋势数据
  useEffect(() => {
    getTrends({ range: trendRange })
      .then((r) => setTrends(r?.data || r || []))
      .catch(() => {});
  }, [trendRange]);

  if (loading) return <div className="p-6 text-gray-600">加载中...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">系统统计仪表盘</h2>
        <div className="inline-flex rounded-md border border-gray-200 overflow-hidden text-sm">
          {['year','month','week'].map(key => (
            <button
              key={key}
              onClick={() => setTrendRange(key)}
              className={`px-3 py-1.5 ${trendRange===key? 'bg-blue-50 text-blue-700' : 'bg-white hover:bg-gray-50'} ${key!=='week' ? 'border-r border-gray-200' : ''}`}
            >
              {key==='year'?'年':key==='month'?'月':'周'}
            </button>
          ))}
        </div>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* 概览统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard 
          title="总案例数" 
          value={stats.total_cases || 0} 
          icon="📋"
          color="blue"
        />
        <StatCard 
          title="活跃案例" 
          value={stats.active_cases || 0} 
          icon="🔄"
          color="green"
        />
        <StatCard 
          title="已解决案例" 
          value={stats.resolved_cases || 0} 
          icon="✅"
          color="purple"
        />
        <StatCard 
          title="知识条目" 
          value={stats.knowledge_items || 0} 
          icon="📚"
          color="yellow"
        />
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 故障类别分布（圆环图 + 图例） */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium mb-4">故障类别分布</h3>
          <div className="flex items-center gap-6">
            <div
              className="relative w-48 h-48 rounded-full shrink-0"
              style={{ background: gradient }}
            >
              <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-xs text-gray-500">总计</div>
                  <div className="text-lg font-semibold">{totalFault}</div>
                </div>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {segments.length > 0 ? (
                segments.map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
                      <span className="text-sm text-gray-700 truncate">{s.name}</span>
                    </div>
                    <div className="text-sm text-gray-900 tabular-nums">
                      {s.count} <span className="text-gray-500">({Math.round(s.percent)}%)</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8 col-span-full">暂无数据</div>
              )}
            </div>
          </div>
        </div>

        {/* 覆盖率统计 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium mb-4">系统覆盖率</h3>
          <div className="space-y-4">
            <CoverageItem 
              label="知识库覆盖率" 
              percentage={coverage.knowledge_coverage || 0}
              color="bg-green-500"
            />
            <CoverageItem 
              label="案例覆盖率" 
              percentage={coverage.case_coverage || 0}
              color="bg-blue-500"
            />
            <CoverageItem 
              label="问题解决率" 
              percentage={coverage.resolution_rate || 0}
              color="bg-purple-500"
            />
          </div>
        </div>
      </div>

      {/* 趋势图表（SVG 折线图 + 年/月/周切换） */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium">解决趋势</h3>
        </div>
        {trends.length > 0 ? (
          <LineChart data={trends} height={260} />
        ) : (
          <div className="text-center text-gray-500 py-16">暂无趋势数据</div>
        )}
      </div>

      {/* 知识库热度（热力图） */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-medium mb-4">知识库热度</h3>
        <KnowledgeHeatmap 
          topics={(stats?.knowledge_topics || faultCategories.map(c=>c.name)).slice(0,7)}
          vendors={stats?.vendors || ['华为','思科','Juniper']}
          faultCategories={faultCategories}
        />
      </div>

      {/* 最近活动时间线 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium mb-4">最近活动</h3>
        {timeline.length > 0 ? (
          <div className="space-y-4">
            {timeline.slice(0, 10).map((item, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {item.title || item.description}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}
                    </span>
                    {(() => {
                      const s = inferStatus(item);
                      return (
                        <span className={`inline-block text-xs px-2 py-0.5 rounded border ${s.className}`}>
                          {s.text}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">暂无活动记录</div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    yellow: 'bg-yellow-50 text-yellow-700'
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <span className="text-2xl">{icon}</span>
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

function CoverageItem({ label, percentage, color }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-700">{label}</span>
        <span className="font-medium">{percentage}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`${color} h-2 rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// 简易 SVG 折线图实现
function LineChart({ data = [], height = 260 }) {
  const padding = { top: 10, right: 12, bottom: 28, left: 28 };
  const w = 760; // 容器宽度（将随父容器缩放）
  const h = height;
  const viewW = w - padding.left - padding.right;
  const viewH = h - padding.top - padding.bottom;
  const points = (Array.isArray(data) ? data : []).map((d, i) => ({
    x: i,
    y: Number(d.value ?? d.count ?? 0),
    label: d.date || d.label || `${i+1}`
  }));
  if (points.length === 0) return null;
  const maxY = Math.max(1, ...points.map(p => p.y));
  const stepX = points.length > 1 ? viewW / (points.length - 1) : 0;
  const toXY = (p, idx) => [
    padding.left + idx * stepX,
    padding.top + (viewH - (p.y / maxY) * viewH)
  ];
  const path = points.map((p, i) => toXY(p, i).join(',')).join(' ');
  const grid = [0.25, 0.5, 0.75, 1];

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-64">
        {/* 网格线与轴 */}
        {grid.map((g, i) => {
          const y = padding.top + g * viewH;
          return <line key={i} x1={padding.left} y1={y} x2={w - padding.right} y2={y} stroke="#E5E7EB" strokeWidth="1" />
        })}
        {/* 折线 */}
        <polyline fill="none" stroke="var(--brand-blue-500)" strokeWidth="3" points={path} />
        {/* 节点 */}
        {points.map((p, i) => {
          const [cx, cy] = toXY(p, i);
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r="3.5" fill="white" stroke="var(--brand-blue-500)" strokeWidth="2" />
            </g>
          );
        })}
        {/* X 轴标签 */}
        {points.map((p, i) => {
          const [tx] = toXY(p, i);
          const ty = h - 6;
          return <text key={i} x={tx} y={ty} fontSize="10" textAnchor="middle" fill="#6B7280">{p.label}</text>
        })}
        {/* Y 轴标签（0 与 max）*/}
        <text x={padding.left - 10} y={h - padding.bottom + 14} fontSize="10" textAnchor="end" fill="#6B7280">0</text>
        <text x={padding.left - 10} y={padding.top + 4} fontSize="10" textAnchor="end" fill="#6B7280">{maxY}</text>
      </svg>
    </div>
  );
}

// 知识库热力图（占位 + 从现有数据推导）
function KnowledgeHeatmap({ topics = [], vendors = [], faultCategories = [] }) {
  const cols = topics && topics.length ? topics : (faultCategories.map(c => c.name).slice(0, 6));
  const rows = vendors && vendors.length ? vendors : ['华为','思科','Juniper'];
  if (!cols || cols.length === 0) {
    return <div className="text-center text-gray-500 py-8">暂无数据</div>;
  }
  const total = faultCategories.reduce((s,c)=> s + (c?.count||0), 0) || 1;
  const base = faultCategories.map(c => (c?.count||0)/total);
  const val = (rIdx, cIdx) => {
    const b = base[cIdx % base.length] || 0.05;
    // 行维度微调，形成梯度
    return Math.max(0.04, Math.min(1, b + rIdx * 0.08));
  };

  return (
    <div className="space-y-3">
      <div className="grid" style={{ gridTemplateColumns: `120px repeat(${cols.length}, minmax(56px, 1fr))` }}>
        <div></div>
        {cols.map((c, i) => (
          <div key={i} className="text-xs text-gray-600 text-center truncate">{c}</div>
        ))}
        {rows.map((r, ri) => (
          <React.Fragment key={ri}>
            <div className="text-xs text-gray-600 flex items-center">{r}</div>
            {cols.map((c, ci) => (
              <div key={ci} className="h-10 rounded-md" style={{ backgroundColor: `rgba(0,125,255,${val(ri,ci)})` }} />
            ))}
          </React.Fragment>
        ))}
      </div>
      <div className="flex items-center gap-2 justify-end text-xs text-gray-600">
        <span>低</span>
        <div className="h-2 w-24 rounded" style={{ background: 'linear-gradient(90deg, rgba(0,125,255,0.1), rgba(0,125,255,1))' }} />
        <span>高</span>
      </div>
    </div>
  );
}

// 推断时间线项状态，返回用于展示的文本及样式类
function inferStatus(item = {}) {
  const raw = (item.status || item.type || item.tag || '').toString().toLowerCase();
  const yes = (s) => raw.includes(s);
  if (yes('resolved') || yes('已解决') || yes('success')) {
    return { text: '已解决', className: 'bg-green-50 text-green-700 border-green-200' };
  }
  if (yes('in_progress') || yes('处理中') || yes('processing')) {
    return { text: '进行中', className: 'bg-blue-50 text-blue-700 border-blue-200' };
  }
  if (yes('new') || yes('created') || yes('新建')) {
    return { text: '新建', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
  }
  if (yes('failed') || yes('error') || yes('失败')) {
    return { text: '失败', className: 'bg-red-50 text-red-700 border-red-200' };
  }
  return { text: '事件', className: 'bg-gray-50 text-gray-600 border-gray-200' };
}
