import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export function useNotifications() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);

  const muat = useCallback(async () => {
    if (!user) return;
    const [{ count }, { data }] = await Promise.all([
      supabase.from('notifications').select('id', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('channel', 'in_app').is('read_at', null),
      supabase.from('notifications')
        .select('id, judul, pesan, read_at, created_at')
        .eq('user_id', user.id).eq('channel', 'in_app')
        .order('created_at', { ascending: false }).limit(30),
    ]);
    setUnread(count ?? 0);
        // judul tab dinamis: (3) Creativemu — ...
    const judul = 'Creativemu — Sistem Manajemen Magang';
    document.title = (count ?? 0) > 0 ? `(${count}) ${judul}` : judul;
    setNotifs(data ?? []);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    muat();

    // ⚡ realtime: notifikasi baru muncul seketika
    const channel = supabase
      .channel('notifikasi-saya')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.new?.channel !== 'in_app') return; // abaikan duplikat WA/email
          setNotifs((n) => [payload.new, ...n].slice(0, 30));
          setUnread((u) => u + 1);
        })
      .subscribe();

    // 🛡️ fallback polling (kalau realtime kena jaringan)
    const iv = setInterval(muat, 60000);

    return () => { supabase.removeChannel(channel); clearInterval(iv); };
  }, [user, muat]);

  async function tandaiBaca(id) {
    setNotifs((n) => n.map((x) => (x.id === id ? { ...x, read_at: new Date().toISOString() } : x)));
    setUnread((u) => Math.max(0, u - 1));
    await supabase.from('notifications')
      .update({ read_at: new Date().toISOString() }).eq('id', id);
  }

  async function tandaiSemuaBaca() {
    setNotifs((n) => n.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })));
    setUnread(0);
    await supabase.from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id).eq('channel', 'in_app').is('read_at', null);
  }

  return { notifs, unread, muat, tandaiBaca, tandaiSemuaBaca };
}