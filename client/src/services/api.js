const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(path, options = {}) {
  const token = sessionStorage.getItem('pb_token');
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    credentials: 'include',
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || 'Server error');
    err.needsVerification = data.needsVerification || false;
    err.email = data.email || null;
    throw err;
  }
  return data;
}

export const AuthAPI = {
  // Legacy (server-managed auth). Kept for backward compatibility but not used
  // when Supabase Auth is enabled.
  register: (username, email, password) =>
    request('/auth/register', { method: 'POST', body: { username, email, password } }),
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: { email, password } }),
  logout: () =>
    request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
  resendVerify: (email) =>
    request('/auth/resend-verify', { method: 'POST', body: { email } }),
};

export const UserAPI = {
  getProfile: () => request('/user'),
  getPublicProfile: (username) => request(`/user/${username}`),
  syncProgress: (xpToAdd, achievements = []) =>
    request('/user/progress', { method: 'PATCH', body: { xpToAdd, achievements } }),
  saveBattleResult: (payload) =>
    request('/user/battle-result', { method: 'POST', body: payload }),
};

export const BattleAPI = {
  saveResult: (payload) =>
    request('/battle/result', { method: 'POST', body: payload }),
  getHistory: (page = 1, limit = 20) =>
    request(`/battle/history?page=${page}&limit=${limit}`),
};

export const LeaderboardAPI = {
  getXP:    () => request('/leaderboard/xp'),
  getTower: () => request('/leaderboard/tower'),
  getWins:  () => request('/leaderboard/wins'),
};