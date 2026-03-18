import { create }            from 'zustand';
import { AuthAPI, UserAPI }  from '../services/api.js';
import { useProgressStore }  from './progressStore.js';
import { supabase }          from '../services/supabase.js';

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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;

      set({
        loading: false,
        needsVerification: true,
        verificationEmail: email,
      });
      return { success: true, needsVerification: true, supabaseUser: data.user || null };
    } catch (err) {
      set({ error: err.message, loading: false });
      return { success: false };
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null, needsVerification: false });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const token = data.session?.access_token;
      if (!token) throw new Error('Missing access token');
      sessionStorage.setItem('pb_token', token);
      resetProgress();
      const freshUser = (await UserAPI.getProfile()).user;
      set({ token, user: freshUser, loading: false });
      syncProgress(freshUser);
      return { success: true };
    } catch (err) {
      // Fallback: allow legacy accounts created before Supabase migration
      try {
        const legacy = await AuthAPI.login(email, password);
        const token = legacy.token;
        if (!token) throw new Error('Missing legacy token');
        sessionStorage.setItem('pb_token', token);
        resetProgress();
        const freshUser = (await UserAPI.getProfile()).user;
        set({ token, user: freshUser, loading: false, error: null });
        syncProgress(freshUser);
        return { success: true, legacy: true };
      } catch (legacyErr) {
        set({ error: err.message || legacyErr.message, loading: false, needsVerification: false, verificationEmail: null });
        return { success: false };
      }
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
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token || null;
      if (!token) {
        sessionStorage.removeItem('pb_token');
        resetProgress();
        useProgressStore.getState().resetAll?.();
        set({ user: null, token: null });
        return;
      }
      sessionStorage.setItem('pb_token', token);
      const { user } = await UserAPI.getProfile();
      set({ user, token });
      syncProgress(user);
    } catch {
      try { await supabase.auth.signOut(); } catch {}
      sessionStorage.removeItem('pb_token');
      resetProgress();
      useProgressStore.getState().resetAll?.();
      set({ user: null, token: null });
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
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      return true;
    }
    catch { return false; }
  },

  logout: async () => {
    try { await supabase.auth.signOut(); } catch {}
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