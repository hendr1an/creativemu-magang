import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export function useNotifications() {
  const { user } = useAuth();

  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);

  // =========================================================
  // LOAD NOTIFIKASI USER
  // =========================================================

  const muat = useCallback(async () => {
    if (!user) {
      setNotifs([]);
      setUnread(0);
      return;
    }

    try {
      const [
        { count, error: countError },
        { data, error: dataError },
      ] = await Promise.all([
        supabase
          .from('notifications')
          .select('id', {
            count: 'exact',
            head: true,
          })
          .eq('user_id', user.id)
          .eq('channel', 'in_app')
          .is('read_at', null),

        supabase
          .from('notifications')
          .select(`
            id,
            judul,
            pesan,
            target_url,
            read_at,
            created_at
          `)
          .eq('user_id', user.id)
          .eq('channel', 'in_app')
          .order('created_at', {
            ascending: false,
          })
          .limit(50),
      ]);

      if (countError) {
        console.error(
          'Gagal menghitung notifikasi:',
          countError
        );
      }

      if (dataError) {
        console.error(
          'Gagal memuat notifikasi:',
          dataError
        );

        return;
      }

      setUnread(count ?? 0);
      setNotifs(data ?? []);
    } catch (error) {
      console.error(
        'Gagal memuat notifikasi:',
        error
      );
    }
  }, [user]);

  // =========================================================
  // INITIAL LOAD + REALTIME + FALLBACK POLLING
  // =========================================================

  useEffect(() => {
    if (!user) {
      setNotifs([]);
      setUnread(0);
      return;
    }

    muat();

    const channel = supabase
      .channel(
        `notifikasi-saya-${user.id}`
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const baru = payload.new;

          if (
            !baru ||
            baru.channel !== 'in_app'
          ) {
            return;
          }

          setNotifs((sekarang) => {
            // Hindari kemungkinan duplicate jika
            // realtime dan polling terjadi hampir bersamaan.
            const tanpaDuplikat =
              sekarang.filter(
                (item) =>
                  item.id !== baru.id
              );

            return [
              baru,
              ...tanpaDuplikat,
            ].slice(0, 50);
          });

          if (!baru.read_at) {
            setUnread(
              (jumlah) =>
                jumlah + 1
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const update =
            payload.new;

          if (!update) {
            return;
          }

          setNotifs((sekarang) =>
            sekarang.map(
              (item) =>
                item.id ===
                update.id
                  ? {
                      ...item,
                      ...update,
                    }
                  : item
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const id =
            payload.old?.id;

          if (!id) {
            return;
          }

          setNotifs((sekarang) =>
            sekarang.filter(
              (item) =>
                item.id !== id
            )
          );
        }
      )
      .subscribe();

    // Fallback kalau realtime sempat putus.
    const interval = setInterval(
      muat,
      60000
    );

    return () => {
      supabase.removeChannel(
        channel
      );

      clearInterval(
        interval
      );
    };
  }, [user, muat]);

  // =========================================================
  // TANDAI SATU NOTIFIKASI DIBACA
  // =========================================================

  async function tandaiBaca(id) {
    if (!id) {
      return;
    }

    const waktu =
      new Date().toISOString();

    const sebelumnya =
      notifs.find(
        (item) =>
          item.id === id
      );

    // Optimistic update.
    setNotifs((sekarang) =>
      sekarang.map(
        (item) =>
          item.id === id
            ? {
                ...item,
                read_at:
                  item.read_at ??
                  waktu,
              }
            : item
      )
    );

    if (
      sebelumnya &&
      !sebelumnya.read_at
    ) {
      setUnread(
        (jumlah) =>
          Math.max(
            0,
            jumlah - 1
          )
      );
    }

    const { error } =
      await supabase
        .from('notifications')
        .update({
          read_at: waktu,
        })
        .eq('id', id)
        .eq(
          'user_id',
          user.id
        );

    if (error) {
      console.error(
        'Gagal menandai notifikasi dibaca:',
        error
      );

      // Refresh agar state kembali mengikuti DB.
      await muat();
    }
  }

  // =========================================================
  // TANDAI SEMUA DIBACA
  // =========================================================

  async function tandaiSemuaBaca() {
    if (!user) {
      return;
    }

    const waktu =
      new Date().toISOString();

    setNotifs((sekarang) =>
      sekarang.map(
        (item) => ({
          ...item,
          read_at:
            item.read_at ??
            waktu,
        })
      )
    );

    setUnread(0);

    const { error } =
      await supabase
        .from('notifications')
        .update({
          read_at: waktu,
        })
        .eq(
          'user_id',
          user.id
        )
        .eq(
          'channel',
          'in_app'
        )
        .is(
          'read_at',
          null
        );

    if (error) {
      console.error(
        'Gagal menandai semua notifikasi dibaca:',
        error
      );

      await muat();
    }
  }

  // =========================================================
  // HAPUS SATU NOTIFIKASI
  // =========================================================

  async function hapus(id) {
    if (!id || !user) {
      return;
    }

    const target =
      notifs.find(
        (item) =>
          item.id === id
      );

    // Optimistic update.
    setNotifs((sekarang) =>
      sekarang.filter(
        (item) =>
          item.id !== id
      )
    );

    if (
      target &&
      !target.read_at
    ) {
      setUnread(
        (jumlah) =>
          Math.max(
            0,
            jumlah - 1
          )
      );
    }

    const { error } =
      await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq(
          'user_id',
          user.id
        );

    if (error) {
      console.error(
        'Gagal menghapus notifikasi:',
        error
      );

      await muat();
    }
  }

  // =========================================================
  // HAPUS SEMUA NOTIFIKASI YANG SUDAH DIBACA
  // =========================================================

  async function hapusSemuaDibaca() {
    if (!user) {
      return;
    }

    setNotifs((sekarang) =>
      sekarang.filter(
        (item) =>
          !item.read_at
      )
    );

    const { error } =
      await supabase
        .from('notifications')
        .delete()
        .eq(
          'user_id',
          user.id
        )
        .eq(
          'channel',
          'in_app'
        )
        .not(
          'read_at',
          'is',
          null
        );

    if (error) {
      console.error(
        'Gagal menghapus notifikasi yang sudah dibaca:',
        error
      );

      await muat();
    }
  }

  // =========================================================
  // RETURN
  // =========================================================

  return {
    notifs,
    unread,

    muat,

    tandaiBaca,
    tandaiSemuaBaca,

    hapus,
    hapusSemuaDibaca,
  };
}