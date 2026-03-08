// ══════════════════════════════════════════
// API Service — connects React client to Express server
// All server calls go through here
// ══════════════════════════════════════════

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── Generic fetch wrapper ─────────────────────────────────────────────────
async function request(path, options = {}) {
  const token = localStorage.getItem('pb_token');

  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Server error');
  return data;
}

// ════════════════════════════════════════
// AUTH
// ════════════════════════════════════════
export const AuthAPI = {
  register: (username, email, password) =>
    request('/auth/register', { method: 'POST', body: { username, email, password } }),

  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: { email, password } }),

  me: () => request('/auth/me'),
};

// ════════════════════════════════════════
// USER
// ════════════════════════════════════════
export const UserAPI = {
  getProfile: () => request('/user'),

  getPublicProfile: (username) => request(`/user/${username}`),

  syncProgress: (xpToAdd, achievements = []) =>
    request('/user/progress', { method: 'PATCH', body: { xpToAdd, achievements } }),
};

// ════════════════════════════════════════
// BATTLE
// ════════════════════════════════════════
export const BattleAPI = {
  saveResult: (payload) =>
    request('/battle/result', { method: 'POST', body: payload }),

  getHistory: (page = 1, limit = 20) =>
    request(`/battle/history?page=${page}&limit=${limit}`),
};

// ════════════════════════════════════════
// LEADERBOARD
// ════════════════════════════════════════
export const LeaderboardAPI = {
  getXP:    () => request('/leaderboard/xp'),
  getTower: () => request('/leaderboard/tower'),
  getWins:  () => request('/leaderboard/wins'),
};
