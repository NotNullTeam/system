import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getTimeline } from '../api/dashboard.js';
import HarmonyIcon from './HarmonyIcon.jsx';
import HarmonyIcons from '../assets/harmonyIcons.js';

export default function Layout() {
  const { logout, user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [miniTimeline, setMiniTimeline] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    // 载入侧边栏的简易最近活动
    getTimeline({ limit: 5 }).then(r => {
      const data = r?.data || r || [];
      setMiniTimeline(Array.isArray(data) ? data.slice(0, 5) : []);
    }).catch(() => {});
  }, []);

  // 读取/持久化侧边栏开关
  useEffect(() => {
    try {
      const persisted = localStorage.getItem('sidebar_open');
      if (persisted !== null) setIsSidebarOpen(persisted === '1');
    } catch (_) {}
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => {
      const next = !prev;
      try { localStorage.setItem('sidebar_open', next ? '1' : '0'); } catch (_) {}
      return next;
    });
  };

  const NavLink = ({ to, children }) => (
    <Link
      to={to}
      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        pathname === to
          ? 'bg-blue-100 text-blue-700 ring-1 ring-inset ring-blue-200'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {children}
    </Link>
  );

  // 状态映射（与 Dashboard 的 inferStatus 语义一致）
  const getStatusMeta = (item = {}) => {
    const raw = (item.status || item.type || item.tag || '').toString().toLowerCase();
    const has = (s) => raw.includes(s);
    if (has('resolved') || has('已解决') || has('success')) return { label: '已解决', cls: 'bg-green-100 text-green-800' };
    if (has('in_progress') || has('处理中') || has('processing')) return { label: '诊断中', cls: 'bg-blue-100 text-blue-800' };
    if (has('failed') || has('未解决') || has('error')) return { label: '未解决', cls: 'bg-red-100 text-red-800' };
    if (has('archived') || has('已归档')) return { label: '已归档', cls: 'bg-gray-100 text-gray-800' };
    return { label: '事件', cls: 'bg-gray-100 text-gray-700' };
  };


  // 选中的案例ID（用于高亮），取自当前路由 /cases/:id
  const selectedCaseId = pathname.startsWith('/cases/')
    ? (pathname.split('/cases/')[1] || '').split('/')[0]
    : null;

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      <aside className={`${isSidebarOpen ? 'w-80' : 'w-20'} bg-white dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col sticky top-0 h-screen overflow-hidden transition-all duration-300 ease-in-out`}>
        {/* 顶部：用户信息与操作 */}
        <div className="p-4 border-b dark:border-gray-700">
          <div className={`flex items-center ${isSidebarOpen ? '' : 'justify-center'}`}>
            <img
              src={`${import.meta.env.BASE_URL}avatar.png`}
              alt="用户头像"
              className="h-10 w-10 rounded-full object-cover"
            />
            {isSidebarOpen && (
              <div className="ml-3 min-w-0">
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{user?.full_name || user?.name || user?.username}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">工号: {user?.employeeNo || user?.username || 'N/A'} | {user?.dept}</div>
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              to="/cases/new"
              className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center transition-colors duration-200"
              title="发起诊断"
            >
              <span className={`inline-flex items-center ${isSidebarOpen ? 'mr-2' : ''}`}>
                <HarmonyIcon name="add" className="h-5 w-5" />
              </span>
              {isSidebarOpen && <span className="whitespace-nowrap flex items-center">新建诊断</span>}
            </Link>
            <button
              type="button"
              className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 font-bold py-2 px-4 rounded-lg flex items-center justify-center transition-colors duration-200"
              onClick={() => navigate('/cases?filter=open')}
              title="过滤"
            >
              <span className={`inline-flex items-center ${isSidebarOpen ? 'mr-2' : ''}`}>
                <HarmonyIcon name="filter" className="h-5 w-5" />
              </span>
              {isSidebarOpen && <span className="whitespace-nowrap flex items-center">过滤</span>}
            </button>
          </div>
          {/* 搜索框 / 折叠时显示放大镜按钮 */}
          {isSidebarOpen ? (
            <div className="relative mt-4">
              <input
                type="text"
                placeholder="搜索诊断历史..."
                className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const q = e.currentTarget.value || '';
                    navigate(`/cases?query=${encodeURIComponent(q)}`);
                  }
                }}
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <HarmonyIcon name="search" className="h-5 w-5" />
              </div>
            </div>
          ) : (
            <div className="flex justify-center mt-3">
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" title="搜索">
                <HarmonyIcon name="search" className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        {/* 中部：历史列表（展开） */}
        {isSidebarOpen && (
          <div className="flex-grow my-4 overflow-y-auto flex flex-col px-4 pb-16">
            <div className="space-y-2">
              {miniTimeline.slice(0, 5).map((item, idx) => {
                const meta = getStatusMeta(item);
                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-150 ${
                      selectedCaseId && item?.id && selectedCaseId.toString() === String(item.id)
                        ? 'bg-blue-50 ring-1 ring-blue-100'
                        : ''
                    }`}
                    onClick={() => navigate(item?.id ? `/cases/${item.id}` : '/cases')}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{item.title || item.description || '诊断事件'}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}</p>
                  </div>
                );
              })}
            </div>
            {miniTimeline.length > 5 && (
              <div className="mt-2 text-center">
                <button onClick={() => navigate('/cases')} className="w-full py-2 px-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">查看更多 (共{miniTimeline.length}个案例)</button>
              </div>
            )}
            {miniTimeline.length === 0 && (
              <div className="flex flex-col items-center justify-center py-6 text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-sm">暂无最近案例</p>
              </div>
            )}
          </div>
        )}

        {/* 中部：折叠视图（仅图标） */}
        {!isSidebarOpen && (
          <div className="flex-grow my-4 overflow-y-auto flex flex-col items-center space-y-3 pb-16">
            {miniTimeline.map((item, idx) => {
              const raw = (item.status || '').toString().toLowerCase();
              const iconEl = raw.includes('resolved') ? (
                <HarmonyIcon name="status" variant="success" className="h-6 w-6" />
              ) : raw.includes('in_progress') ? (
                <HarmonyIcon name="status" variant="processing" className="h-6 w-6" />
              ) : raw.includes('failed') ? (
                <HarmonyIcon name="status" variant="failed" className="h-6 w-6" />
              ) : (
                <HarmonyIcon name="status" variant="archived" className="h-6 w-6" />
              );
              const colorCls = raw.includes('in_progress') ? 'bg-blue-100 text-blue-800'
                : raw.includes('resolved') ? 'bg-green-100 text-green-800'
                : raw.includes('failed') ? 'bg-red-100 text-red-800'
                : 'bg-gray-200 text-gray-800';
              const ring = (selectedCaseId && item?.id && selectedCaseId.toString() === String(item.id))
                ? 'ring-2 ring-blue-500 shadow-lg'
                : '';
              return (
                <div
                  key={idx}
                  className={`w-12 h-12 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-150 ${colorCls} ${ring}`}
                  onClick={() => { setIsSidebarOpen(true); navigate(item?.id ? `/cases/${item.id}` : '/cases'); }}
                  title={item.title || item.description || '诊断事件'}
                >
                  {iconEl}
                </div>
              );
            })}
          </div>
        )}

        {/* 导航菜单 */}
        <div className="mt-auto p-4 border-t dark:border-gray-700">
          <nav className="space-y-1 mb-4">
            <Link
              to="/"
              className={`flex items-center p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-150 ${pathname === '/' ? 'bg-gray-100 dark:bg-gray-700' : ''} ${isSidebarOpen ? '' : 'justify-center'}`}
              title="数据看板"
            >
              <span className={`${isSidebarOpen ? 'mr-3' : ''}`}>
                <HarmonyIcon name="dashboard" className="h-6 w-6" />
              </span>
              {isSidebarOpen && <span className="whitespace-nowrap">数据看板</span>}
            </Link>
            
            <Link
              to="/cases"
              className={`flex items-center p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-150 ${pathname.startsWith('/cases') ? 'bg-gray-100 dark:bg-gray-700' : ''} ${isSidebarOpen ? '' : 'justify-center'}`}
              title="诊断历史"
            >
              <span className={`${isSidebarOpen ? 'mr-3' : ''}`}>
                <HarmonyIcon name="cases" className="h-6 w-6" />
              </span>
              {isSidebarOpen && <span className="whitespace-nowrap">诊断历史</span>}
            </Link>
            
            <Link
              to="/knowledge"
              className={`flex items-center p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-150 ${pathname.startsWith('/knowledge') ? 'bg-gray-100 dark:bg-gray-700' : ''} ${isSidebarOpen ? '' : 'justify-center'}`}
              title="文档管理"
            >
              <span className={`${isSidebarOpen ? 'mr-3' : ''}`}>
                <HarmonyIcon name="document" className="h-6 w-6" />
              </span>
              {isSidebarOpen && <span className="whitespace-nowrap">文档管理</span>}
            </Link>
            {/* 文件管理能力将整合至 文档管理/案例附件 面板，移除独立入口 */}
            {/* 智能分析能力将整合至 诊断案例 流程中的AI分析节点，移除独立入口 */}
          </nav>
          <div className={`flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
            <button onClick={toggleSidebar} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title={isSidebarOpen ? '收起侧边栏' : '展开侧边栏'}>
              <span className={`inline-block transition-transform ${isSidebarOpen ? '' : 'rotate-180'}`}>
                <HarmonyIcon name="arrowLeft" className="h-6 w-6" />
              </span>
            </button>
            {isSidebarOpen && (
              <Link
                to="/settings"
                className={`p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-150 ${pathname.startsWith('/settings') ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                title="设置"
              >
                {/* 若存在 Harmony 版 settings 则使用之，否则回退到内联图标 */}
                {HarmonyIcons?.settings
                  ? <HarmonyIcon name="settings" className="h-6 w-6" />
                  : FallbackSettingsIcon()}
              </Link>
            )}
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-6">
          <div className="max-w-screen-2xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
