import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // ⭐ 1. Muat session dari localStorage (persist) — dengan delay kecil
    //       untuk menghindari race condition di mobile browser
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) {
        setSession(data.session);
        loadProfile(data.session.user.id);
      } else {
        // ⭐ 2. Kalau tidak ada session di localStorage, coba refresh token
        //       (beberapa mobile browser menghapus localStorage tapi cookie masih ada)
        supabase.auth.refreshSession().then(({ data: refreshData }) => {
          if (!mounted) return;
          if (refreshData.session) {
            setSession(refreshData.session);
            loadProfile(refreshData.session.user.id);
          } else {
            setLoading(false);
          }
        }).catch(() => {
          if (mounted) setLoading(false);
        });
      }
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    // ⭐ 3. Listener untuk perubahan auth (login/logout/token refresh)
    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mounted) return;
      setSession(s);
      if (s) {
        loadProfile(s.user.id);
      } else {
        // ⭐ HANYA set profile null kalau event benar-benar SIGNED_OUT
        // (bukan event TOKEN_REFRESHED yang sementara null)
        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function loadProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (data) setProfile(data);
    } catch (err) {
      // Kalau profile gagal dimuat, jangan logout — coba lagi
      setTimeout(() => {
        supabase.from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
          .then(({ data }) => {
            if (data) setProfile(data);
            setLoading(false);
          })
          .catch(() => setLoading(false));
      }, 1000);
      return;
    }
    setLoading(false);
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? null,
    loading,
    login: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    logout: () => supabase.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}