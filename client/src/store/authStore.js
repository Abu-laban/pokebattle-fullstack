import { create }  from 'zustand';
import { AuthAPI } from '../services/api.js';

// Token stored only in memory (not localStorage)
let _token = sessionStorage.getItem('pb_token') || null;

export const useAuthStore = create((set, get) => ({
  user:    null,
  token:   _token,
  loading: false,
  error:   null,
  needsVerification: false,
  verificationEmail: null,

  register: async (username, email, password) => {
    set({ loading: true, error: null, needsVerification: false });
    try {
      const data = await AuthAPI.register(username, email, password);
      set({ loading: false, needsVerification: true, verificationEmail: email });
      return { success: true, needsVerification: true };
    } catch (err) {
      set({ error: err.message, loading: false });
      return { success: false };
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null, needsVerification: false });
    try {
      const { token, user } = await AuthAPI.login(email, password);
      _token = token;
      sessionStorage.setItem('pb_token', token);
      // Fetch fresh user data from server
      const freshUser = await AuthAPI.me().catch(() => user);
      set({ token, user: freshUser?.user || user, loading: false });
      return { success: true };
    } catch (err) {
      const isVerify = err.needsVerification;
      set({
        error: err.message,
        loading: false,
        needsVerification: isVerify || false,
        verificationEmail: isVerify ? email : null,
      });
      return { success: false, needsVerification: isVerify };
    }
  },

  loginWithToken: async (token, userData) => {
    _token = token;
    sessionStorage.setItem('pb_token', token);
    set({ token, user: userData, loading: false, error: null });
    // Fetch fresh from server
    try {
      const res = await AuthAPI.me();
      set({ user: res.user });
    } catch {}
  },

  restoreSession: async () => {
    const token = sessionStorage.getItem('pb_token');
    if (!token) return;
    _token = token;
    try {
      const { user } = await AuthAPI.me();
      set({ user, token });
    } catch {
      sessionStorage.removeItem('pb_token');
      _token = null;
      set({ user: null, token: null });
    }
  },

  resendVerification: async (email) => {
    try {
      await AuthAPI.resendVerify(email);
      return true;
    } catch { return false; }
  },

  logout: async () => {
    try { await AuthAPI.logout(); } catch {}
    sessionStorage.removeItem('pb_token');
    _token = null;
    set({ user: null, token: null, needsVerification: false });
  },

  clearError: () => set({ error: null, needsVerification: false }),
}));