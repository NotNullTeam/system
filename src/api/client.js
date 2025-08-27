import axios from 'axios';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

const baseURL = import.meta.env.VITE_API_BASE || '/api/v1';

export const api = axios.create({ baseURL });

function emitAuthLogout() {
  try { window.dispatchEvent(new CustomEvent('auth:logout')); } catch (_) {}
}

// 请求拦截器：自动添加 Authorization 头
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

let isRefreshing = false;
let subscribers = [];
const subscribeToken = (cb) => subscribers.push(cb);
const onRefreshed = (token) => { subscribers.forEach((cb) => cb(token)); subscribers = []; };

function setTokens(access, refresh) {
  if (access) localStorage.setItem(ACCESS_TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}
function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}
export function getAccessToken(){ return localStorage.getItem(ACCESS_TOKEN_KEY); }
export function getRefreshToken(){ return localStorage.getItem(REFRESH_TOKEN_KEY); }
export { setTokens, clearTokens };

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error || {};
    if (!response) return Promise.reject(error);

    if (response.status === 401 && !config.__isRetryRequest) {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearTokens();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeToken((token) => {
            if (token) {
              config.headers.Authorization = `Bearer ${token}`;
              config.__isRetryRequest = true;
              resolve(api.request(config));
            } else {
              reject(new Error('Token刷新失败'));
            }
          });
        });
      }

      isRefreshing = true;
      try {
        const r = await axios.post(`${baseURL}/auth/refresh`, { refresh_token: refreshToken }, {
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        });
        const data = r.data;
        const newAccess = data?.data?.access_token || data?.access_token;
        const newRefresh = data?.data?.refresh_token || data?.refresh_token || refreshToken;
        if (!newAccess) throw new Error('刷新返回不含 access_token');
        
        setTokens(newAccess, newRefresh);
        onRefreshed(newAccess);
        config.headers.Authorization = `Bearer ${newAccess}`;
        config.__isRetryRequest = true;
        return api.request(config);
      } catch (e) {
        clearTokens();
        emitAuthLogout();
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export async function login(username, password) {
  const r = await api.post('/auth/login', { username, password });
  const data = r.data;
  const access = data?.data?.access_token || data?.access_token;
  const refresh = data?.data?.refresh_token || data?.refresh_token;
  if (!access || !refresh) throw new Error('登录响应缺少令牌');
  setTokens(access, refresh);
  return data;
}

export async function logout() {
  try { await api.post('/auth/logout'); } catch (_) {}
  clearTokens();
  emitAuthLogout();
}

export async function me() {
  const r = await api.get('/auth/me');
  const d = r.data;
  return d?.data?.user ?? d?.user ?? d;
}

export async function health() {
  const r = await api.get('/system/health');
  return r.data;
}

export function onAuthLogout(handler) {
  window.addEventListener('auth:logout', handler);
  return () => window.removeEventListener('auth:logout', handler);
}
