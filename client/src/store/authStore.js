// ══════════════════════════════════════════
// authStore — manages login session
// ══════════════════════════════════════════
import { create }  from 'zustand';
import { AuthAPI } from '../services/api';

export const useAuthStore = create((set, get) => ({
  user:    null,
  token:   localStorage.getItem('pb_token') || null,
  loading: false,
  error:   null,

  // ── Register ────────────────────────────────────────────────────────
  register: async (username, email, password) => {
    set({ loading: true, error: null });
    try {
      const { token, user } = await AuthAPI.register(username, email, password);
      localStorage.setItem('pb_token', token);
      set({ token, user, loading: false });
      return true;
    } catch (err) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  // ── Login ────────────────────────────────────────────────────────────
  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { token, user } = await AuthAPI.login(email, password);
      localStorage.setItem('pb_token', token);
      set({ token, user, loading: false });
      return true;
    } catch (err) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  // ── Restore session from token ───────────────────────────────────────
  restoreSession: async () => {
    const token = localStorage.getItem('pb_token');
    if (!token) return;
    try {
      const { user } = await AuthAPI.me();
      set({ user, token });
    } catch {
      localStorage.removeItem('pb_token');
      set({ user: null, token: null });
    }
  },

  // ── Logout ───────────────────────────────────────────────────────────
  logout: () => {
    localStorage.removeItem('pb_token');
    set({ user: null, token: null });
  },

  clearError: () => set({ error: null }),
}));
