import { create }            from 'zustand';
import { AuthAPI, UserAPI }  from '../services/api.js';
import { useProgressStore }  from './progressStore.js';

/**
 * Auth Store - Manages user authentication state
 * Supabase dependency removed, uses server-side JWT only
 */

function resetProgress() {
  localStorage.removeItem('pokebattle-progress');
}

function syncProgress(user) {
  if (!user) return;
  useProgressStore.getState().syncFromServer(user);
}

export const useAuthStore = create((set, get) => ({
  user:    null,
  token:   null,
  loading: false,
  error:   null,
  needsVerification: false,
  verificationEmail: null,

  register: async (username, email, password) => {
    set({ loading: true, error: null, needsVerification: false });
    try {
      const res = await AuthAPI.register(username, email, password);
      
      set({
        loading: false,
        needsVerification: true,
        verificationEmail: email,
      });
      return { success: true, needsVerification: true };
    } catch (err) {
      set({ error: err.response?.data?.error || err.message, loading: false });
      return { success: false };
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null, needsVerification: false });
    try {
      const res = await AuthAPI.login(email, password);
      const token = res.token;
      
      if (!token) throw new Error('Missing access token');
      
      sessionStorage.setItem('pb_token', token);
      resetProgress();
      
      const freshUser = (await UserAPI.getProfile()).user;
      set({ token, user: freshUser, loading: false });
      syncProgress(freshUser);
      
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      
      // Check if user needs verification
      if (errorMsg?.includes('تفعيل') || errorMsg?.includes('verify')) {
        set({ 
          error: errorMsg, 
          loading: false, 
          needsVerification: true, 
          verificationEmail: email 
        });
      } else {
        set({ error: errorMsg, loading: false });
      }
      return { success: false };
    }
  },

  loginWithToken: async (token, userData) => {
    sessionStorage.setItem('pb_token', token);
    resetProgress();
    set({ token, user: userData, loading: false, error: null });
    try {
      const res = await UserAPI.getProfile();
      set({ user: res.user });
      syncProgress(res.user);
    } catch {}
  },

  restoreSession: async () => {
    const token = sessionStorage.getItem('pb_token');
    if (!token) {
      set({ user: null, token: null });
      return;
    }
    
    set({ loading: true, token });
    try {
      const { user } = await UserAPI.getProfile();
      set({ user, loading: false });
      syncProgress(user);
    } catch (err) {
      sessionStorage.removeItem('pb_token');
      resetProgress();
      useProgressStore.getState().resetAll?.();
      set({ user: null, token: null, loading: false });
    }
  },

  refreshUser: async () => {
    try {
      const { user } = await UserAPI.getProfile();
      set({ user });
      syncProgress(user);
      return user;
    } catch { return null; }
  },

  resendVerification: async (email) => {
    try {
      await AuthAPI.resendVerification(email);
      return true;
    } catch { return false; }
  },

  logout: async () => {
    try { await AuthAPI.logout(); } catch {}
    sessionStorage.removeItem('pb_token');
    resetProgress();
    useProgressStore.getState().resetAll?.();
    // Lazy import to avoid circular deps
    import('./missionStore.js').then(m => m.useMissionStore.getState().resetAll?.()).catch(()=>{});
    set({ user: null, token: null, loading: false, error: null, needsVerification: false, verificationEmail: null });
  },

  clearError: () => set({ error: null, needsVerification: false }),
}));
