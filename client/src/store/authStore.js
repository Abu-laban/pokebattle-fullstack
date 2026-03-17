import { create }            from 'zustand';
import { AuthAPI }           from '../services/api.js';
import { useProgressStore }  from './progressStore.js';

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
      const data = await AuthAPI.register(username, email, password);
      set({
        loading: false,
        needsVerification: !data.devAutoVerified,
        verificationEmail: email,
      });
      return { success: true, devAutoVerified: data.devAutoVerified, needsVerification: !data.devAutoVerified };
    } catch (err) {
      set({ error: err.message, loading: false });
      return { success: false };
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null, needsVerification: false });
    try {
      const { token, user } = await AuthAPI.login(email, password);
      sessionStorage.setItem('pb_token', token);
      resetProgress();
      let freshUser = user;
      try { freshUser = (await AuthAPI.me()).user; } catch {}
      set({ token, user: freshUser, loading: false });
      syncProgress(freshUser);
      return { success: true };
    } catch (err) {
      const isVerify = err.needsVerification;
      set({ error: err.message, loading: false, needsVerification: isVerify || false, verificationEmail: isVerify ? email : null });
      return { success: false, needsVerification: isVerify };
    }
  },

  loginWithToken: async (token, userData) => {
    sessionStorage.setItem('pb_token', token);
    resetProgress();
    set({ token, user: userData, loading: false, error: null });
    try {
      const res = await AuthAPI.me();
      set({ user: res.user });
      syncProgress(res.user);
    } catch {}
  },

  restoreSession: async () => {
    const token = sessionStorage.getItem('pb_token');
    if (!token) {
      resetProgress();
      useProgressStore.getState().resetAll?.();
      set({ user: null, token: null });
      return;
    }
    try {
      const { user } = await AuthAPI.me();
      set({ user, token });
      syncProgress(user);
    } catch {
      sessionStorage.removeItem('pb_token');
      resetProgress();
      useProgressStore.getState().resetAll?.();
      set({ user: null, token: null });
    }
  },

  refreshUser: async () => {
    try {
      const { user } = await AuthAPI.me();
      set({ user });
      syncProgress(user);
      return user;
    } catch { return null; }
  },

  resendVerification: async (email) => {
    try { await AuthAPI.resendVerify(email); return true; }
    catch { return false; }
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