import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { fetchUnreadMessageCount, fetchPendingReviewCount } from '@/lib/api';
import type { Profile } from '@/lib/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  /** The most recent Supabase auth event (e.g. 'SIGNED_IN', 'INITIAL_SESSION', 'TOKEN_REFRESHED'). */
  authEvent: string | null;
  unreadMessages: number;
  pendingReviews: number;
  signUp: (email: string, password: string, displayName: string, creatorType: string) => Promise<{ error: string | null; profile: Profile | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null; profile: Profile | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
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

  const loadProfile = useCallback(async (uid: string): Promise<Profile | null> => {
    const { data, error } = await supabase.rpc('get_profile_by_user_id', { user_uid: uid });
    if (error) {
      console.warn('Failed to load profile:', error.message);
      setProfile(null);
      return null;
    }
    const p = data as unknown as Profile;
    setProfile(p);
    return p;
  }, []);

  const loadCounts = useCallback(async (profileId: string) => {
    const [unread, pending] = await Promise.all([
      fetchUnreadMessageCount(profileId),
      fetchPendingReviewCount(profileId),
    ]);
    setUnreadMessages(unread);
    setPendingReviews(pending);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        (async () => {
          const p = await loadProfile(s.user.id);
          if (p) await loadCounts(p.id);
          setLoading(false);
        })();
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      (async () => {
        setAuthEvent(event);
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          const p = await loadProfile(s.user.id);
          if (p) await loadCounts(p.id);
        } else {
          setProfile(null);
          setUnreadMessages(0);
          setPendingReviews(0);
        }
        setLoading(false);
      })();
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfile, loadCounts]);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  const refreshCounts = useCallback(async () => {
    if (profile) await loadCounts(profile.id);
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

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUnreadMessages(0);
    setPendingReviews(0);
  }, []);

  return (
    <AuthContext.Provider
      value={{ session, user, profile, loading, authEvent, unreadMessages, pendingReviews, signUp, signIn, signInWithGoogle, signOut, refreshProfile, refreshCounts }}
    >
      {children}
    </AuthContext.Provider>
  );
}
