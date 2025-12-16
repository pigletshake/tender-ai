// 简单跨页存储，使用 localStorage 保底
const STORE_KEY = 'yibiao_store_v1';

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn('loadStore error', e);
    return {};
  }
}

function saveStore(data) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('saveStore error', e);
  }
}

function getState() {
  return loadStore();
}

function setState(patch) {
  const current = loadStore();
  const next = { ...current, ...patch };
  saveStore(next);
  return next;
}

function clearState() {
  saveStore({});
}

// 对外导出
window.Store = {
  getState,
  setState,
  clearState,
};

