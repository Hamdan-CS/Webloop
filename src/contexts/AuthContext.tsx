import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { fetchUnreadMessageCount, fetchPendingReviewCount, fetchPendingInviteCount, fetchUnreadNotificationCount } from '@/services/api';
import type { Profile } from '@/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  /** The most recent Supabase auth event (e.g. 'SIGNED_IN', 'INITIAL_SESSION', 'TOKEN_REFRESHED'). */
  authEvent: string | null;
  unreadMessages: number;
  pendingReviews: number;
  pendingInvites: number;
  unreadNotifications: number;
  signUp: (email: string, password: string, displayName: string, creatorType: string) => Promise<{ error: string | null; profile: Profile | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null; profile: Profile | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshCounts: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authEvent, setAuthEvent] = useState<string | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingReviews, setPendingReviews] = useState(0);
  const [pendingInvites, setPendingInvites] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Tracks the user the app currently considers signed in, so late responses
  // from a previous user (or after sign-out) never overwrite fresh state.
  const activeUid = useRef<string | null>(null);

  const loadProfile = useCallback(async (uid: string): Promise<Profile | null> => {
    const { data, error } = await supabase.rpc('get_profile_by_user_id', { user_uid: uid });
    if (activeUid.current !== uid) return null; // signed out / switched user meanwhile
    if (error) {
      console.warn('Failed to load profile:', error.message);
      return null; // keep any previously loaded profile instead of flashing "User"
    }
    const p = data as unknown as Profile;
    setProfile(p);
    return p;
  }, []);

  const loadCounts = useCallback(async (profileId: string) => {
    const [unread, pending, invites, notifications] = await Promise.all([
      fetchUnreadMessageCount(profileId),
      fetchPendingReviewCount(profileId),
      fetchPendingInviteCount(profileId),
      fetchUnreadNotificationCount(profileId),
    ]);
    setUnreadMessages(unread);
    setPendingReviews(pending);
    setPendingInvites(invites);
    setUnreadNotifications(notifications);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const clearUserState = () => {
      activeUid.current = null;
      setProfile(null);
      setUnreadMessages(0);
      setPendingReviews(0);
      setPendingInvites(0);
      setUnreadNotifications(0);
    };

    const hydrate = async (uid: string) => {
      try {
        const p = await loadProfile(uid);
        if (!cancelled && p?.id && activeUid.current === uid) await loadCounts(p.id);
      } catch (e) {
        console.warn('Failed to hydrate auth state:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const apply = (event: string, s: Session | null) => {
      setAuthEvent(event);
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const sameUser = activeUid.current === s.user.id;
        activeUid.current = s.user.id;
        // Token refreshes don't need a profile reload.
        if (event === 'TOKEN_REFRESHED' && sameUser) { setLoading(false); return; }
        void hydrate(s.user.id);
      } else {
        clearUserState();
        setLoading(false);
      }
    };

    // IMPORTANT: never await Supabase calls inside onAuthStateChange - the auth
    // client holds a lock while the callback runs, so doing so deadlocks
    // sign-in / sign-out. Defer the work to the next tick instead.
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setTimeout(() => { if (!cancelled) apply(event, s); }, 0);
    });

    // Safety net: never leave the app stuck in a loading state.
    const timeout = setTimeout(() => { if (!cancelled) setLoading(false); }, 6000);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      sub.subscription.unsubscribe();
    };
  }, [loadProfile, loadCounts]);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  const refreshCounts = useCallback(async () => {
    if (profile?.id) await loadCounts(profile.id);
  }, [profile, loadCounts]);

  const signUp = useCallback(
    async (email: string, password: string, displayName: string, creatorType: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName, creator_type: creatorType },
        },
      });
      if (error) return { error: error.message, profile: null };
      if (data.user) {
        // Profile is auto-created by the database trigger.
        // Give it a moment then try to load it.
        await new Promise((r) => setTimeout(r, 500));
        activeUid.current = data.user.id;
        const p = await loadProfile(data.user.id);
        return { error: null, profile: p };
      }
      return { error: null, profile: null };
    },
    [loadProfile],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message, profile: null };
    if (data.user) {
      activeUid.current = data.user.id;
      const p = await loadProfile(data.user.id);
      return { error: null, profile: p };
    }
    return { error: null, profile: null };
  }, [loadProfile]);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    return { error: error?.message ?? null };
  }, []);

  const resetPasswordForEmail = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error?.message ?? null };
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    // Clear local state first so the UI never shows a stale/"User" placeholder.
    activeUid.current = null;
    setSession(null);
    setUser(null);
    setProfile(null);
    setUnreadMessages(0);
    setPendingReviews(0);
    setPendingInvites(0);
    setUnreadNotifications(0);
    try {
      // 'local' removes the stored session without a network round-trip failing the logout.
      await Promise.race([
        supabase.auth.signOut({ scope: 'local' }),
        new Promise((r) => setTimeout(r, 4000)),
      ]);
    } catch (e) {
      console.warn('signOut failed, clearing local session anyway:', e);
    }
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))
        .forEach((k) => localStorage.removeItem(k));
    } catch { /* storage unavailable */ }
  }, []);

  return (
    <AuthContext.Provider
      value={{ session, user, profile, loading, authEvent, unreadMessages, pendingReviews, pendingInvites, unreadNotifications, signUp, signIn, signInWithGoogle, resetPasswordForEmail, updatePassword, signOut, refreshProfile, refreshCounts }}
    >
      {children}
    </AuthContext.Provider>
  );
}
