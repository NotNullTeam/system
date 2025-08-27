import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Settings() {
  const { user, logout } = useAuth();
  const [notifySystem, setNotifySystem] = useState(false);
  const [notifyDesktop, setNotifyDesktop] = useState(false);
  const [msg, setMsg] = useState('');
  const [themePref, setThemePref] = useState('system'); // 'system' | 'light' | 'dark'

  useEffect(() => {
    try {
      setNotifySystem(localStorage.getItem('pref_notify_system') === '1');
      const savedDesktop = localStorage.getItem('pref_notify_desktop') === '1';
      // 若浏览器未授权，忽略已保存的开启状态
      const granted = typeof Notification !== 'undefined' && Notification.permission === 'granted';
      setNotifyDesktop(savedDesktop && granted);
      setThemePref(localStorage.getItem('pref_theme') || 'system');
    } catch (_) {}
  }, []);

  function setPref(key, value) {
    try { localStorage.setItem(key, value); } catch (_) {}
  }
  function flash(text) {
    setMsg(text);
    window.clearTimeout(flash._t);
    flash._t = window.setTimeout(() => setMsg(''), 1800);
  }

  // 主题应用与监听系统偏好
  useEffect(() => {
    const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    function apply(pref) {
      const isSystemDark = media ? media.matches : false;
      const shouldDark = pref === 'dark' || (pref === 'system' && isSystemDark);
      document.documentElement.classList.toggle('dark', !!shouldDark);
    }
    apply(themePref);
    let handler;
    if (themePref === 'system' && media) {
      handler = () => apply('system');
      // 兼容老浏览器 addEventListener 不可用情况
      if (typeof media.addEventListener === 'function') media.addEventListener('change', handler);
      else if (typeof media.addListener === 'function') media.addListener(handler);
    }
    return () => {
      if (media && handler) {
        if (typeof media.removeEventListener === 'function') media.removeEventListener('change', handler);
        else if (typeof media.removeListener === 'function') media.removeListener(handler);
      }
    };
  }, [themePref]);

  const toggleSystem = () => {
    const v = !notifySystem;
    setNotifySystem(v);
    setPref('pref_notify_system', v ? '1' : '0');
  };
  const toggleDesktop = () => {
    const v = !notifyDesktop;
    // 请求浏览器通知权限
    if (v) {
      if (typeof Notification === 'undefined') {
        flash('当前浏览器不支持桌面通知');
        return;
      }
      const ensure = async () => {
        if (Notification.permission === 'granted') return 'granted';
        const perm = await Notification.requestPermission();
        return perm;
      };
      ensure().then((perm) => {
        if (perm === 'granted') {
          setNotifyDesktop(true);
          setPref('pref_notify_desktop', '1');
          flash('桌面通知已开启');
        } else {
          setNotifyDesktop(false);
          setPref('pref_notify_desktop', '0');
          flash('未授予通知权限');
        }
      });
    } else {
      setNotifyDesktop(false);
      setPref('pref_notify_desktop', '0');
    }
  };
  const clearUiCache = () => {
    const keys = ['pref_notify_system', 'pref_notify_desktop', 'sidebar_open', 'pref_theme'];
    try { keys.forEach(k => localStorage.removeItem(k)); } catch (_) {}
    flash('已清理界面缓存');
  };

  const setTheme = (pref) => {
    setThemePref(pref);
    setPref('pref_theme', pref);
    flash('主题已切换');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">系统设置</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">调整账号与界面偏好设置。</p>
      </div>

      {msg && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 dark:bg-green-900 dark:text-green-200 dark:border-green-700">{msg}</div>
      )}

      {/* 主题设置 */}
      <section className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded-lg border p-4">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">主题</h2>
        <div className="flex items-center gap-2">
          {['system','light','dark'].map((opt) => (
            <button
              key={opt}
              onClick={() => setTheme(opt)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${themePref === opt ? 'bg-blue-500 text-white border-blue-500' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600'}`}
            >{opt === 'system' ? '跟随系统' : (opt === 'light' ? '浅色' : '深色')}</button>
          ))}
        </div>
      </section>

      {/* 账号与安全（已移动到页面底部） */}

      {/* 通知偏好 */}
      <section className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded-lg border p-4">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">通知偏好</h2>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm text-gray-800 dark:text-gray-100">接收系统提醒</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">重要事件与异常的消息提示</p>
          </div>
          <label className="inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only" checked={notifySystem} onChange={toggleSystem} />
            <span className={`w-10 h-6 flex items-center bg-gray-200 dark:bg-gray-600 rounded-full p-1 transition ${notifySystem ? 'bg-blue-500' : ''}`}>
              <span className={`bg-white w-4 h-4 rounded-full shadow transform transition ${notifySystem ? 'translate-x-4' : ''}`}></span>
            </span>
          </label>
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm text-gray-800 dark:text-gray-100">桌面通知</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">在浏览器层面弹出系统通知</p>
          </div>
          <label className="inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only" checked={notifyDesktop} onChange={toggleDesktop} />
            <span className={`w-10 h-6 flex items-center bg-gray-200 dark:bg-gray-600 rounded-full p-1 transition ${notifyDesktop ? 'bg-blue-500' : ''}`}>
              <span className={`bg-white w-4 h-4 rounded-full shadow transform transition ${notifyDesktop ? 'translate-x-4' : ''}`}></span>
            </span>
          </label>
        </div>
      </section>


      {/* 清理缓存 */}
      <section className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded-lg border p-4">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">清理缓存</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">仅清理界面偏好与本地保存的敏感信息，不影响登录状态。</p>
        <button onClick={clearUiCache} className="px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">清理界面缓存</button>
      </section>

      {/* 账号与安全 */}
      <section className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded-lg border p-4">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">账号</h2>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm text-gray-800 dark:text-gray-100">登录账号</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{user?.full_name || user?.name || user?.username || '—'}</p>
          </div>
          <button
            onClick={logout}
            className="px-3 py-1.5 text-sm rounded-md bg-red-50 text-red-600 hover:bg-red-100"
          >退出登录</button>
        </div>
      </section>
    </div>
  );
}
