import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  supabase,
} from '../lib/supabaseClient';

import {
  useAuth,
} from '../context/AuthContext';


/* =========================================================
   HELPERS
========================================================= */

/*
  Notifikasi dianggap ACTIVE / UNREAD jika:

  read_at     = NULL
  resolved_at = NULL

  Jadi:
  - dibaca user       → tidak active
  - action selesai    → tidak active
*/
function isActiveUnread(
  notif
) {
  return (
    !notif?.read_at &&
    !notif?.resolved_at
  );
}


function hitungUnread(
  daftar
) {
  return daftar.filter(
    isActiveUnread
  ).length;
}


/* =========================================================
   HOOK
========================================================= */

export function useNotifications() {
  const {
    user,
  } =
    useAuth();


  const [
    notifs,
    setNotifs,
  ] = useState([]);


  const [
    unread,
    setUnread,
  ] = useState(0);


  const [
    loadingNotif,
    setLoadingNotif,
  ] = useState(false);


  /* =======================================================
     LOAD NOTIFIKASI
  ======================================================= */

  const muat =
    useCallback(
      async () => {
        if (!user?.id) {
          setNotifs([]);
          setUnread(0);
          setLoadingNotif(
            false
          );

          return;
        }


        setLoadingNotif(
          true
        );


        try {
          /*
            =================================================
            1. CLEANUP STATE YANG SUDAH TIDAK RELEVAN
            =================================================

            RPC ini idempotent.

            Contoh:
            - task sudah selesai
            - application sudah diproses
            - izin sudah diproses
            - mentoring sudah lewat
            - sertifikat sudah terbit

            Maka notification lifecycle terkait akan diberi:
            resolved_at = now()
          */
          const {
            error:
              resolveError,
          } =
            await supabase.rpc(
              'resolve_stale_notifications'
            );


          if (
            resolveError
          ) {
            /*
              Jangan membuat NotificationBell gagal total
              hanya karena cleanup gagal.

              Query notification tetap dilanjutkan.
            */
            console.error(
              'Gagal membersihkan notifikasi stale:',
              resolveError
            );
          }


          /*
            =================================================
            2. AMBIL NOTIFIKASI USER
            =================================================
          */
          const [
            {
              count,
              error:
                countError,
            },

            {
              data,
              error:
                dataError,
            },
          ] =
            await Promise.all([
              /*
                Counter badge hanya menghitung:

                unread
                +
                unresolved
              */
              supabase
                .from(
                  'notifications'
                )
                .select(
                  'id',
                  {
                    count:
                      'exact',

                    head:
                      true,
                  }
                )
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
                )
                .is(
                  'resolved_at',
                  null
                ),


              /*
                Tetap ambil:
                - unread active
                - read history
                - resolved rows

                resolved unread nantinya disembunyikan
                dari UI, tetapi tetap tinggal di database.
              */
              supabase
                .from(
                  'notifications'
                )
                .select(
                  `
                  id,
                  judul,
                  pesan,
                  target_url,

                  read_at,
                  resolved_at,

                  entity_type,
                  entity_id,
                  notification_type,

                  created_at
                  `
                )
                .eq(
                  'user_id',
                  user.id
                )
                .eq(
                  'channel',
                  'in_app'
                )
                .order(
                  'created_at',
                  {
                    ascending:
                      false,
                  }
                )
                .limit(
                  75
                ),
            ]);


          if (
            countError
          ) {
            console.error(
              'Gagal menghitung notifikasi:',
              countError
            );
          }


          if (
            dataError
          ) {
            console.error(
              'Gagal memuat notifikasi:',
              dataError
            );

            return;
          }


          const daftar =
            data ?? [];


          setNotifs(
            daftar
          );


          /*
            Kalau count query berhasil,
            gunakan hasil server.

            Fallback:
            hitung dari daftar lokal.
          */
          setUnread(
            countError
              ? hitungUnread(
                  daftar
                )
              : count ??
                  0
          );
        } catch (
          error
        ) {
          console.error(
            'Gagal memuat notifikasi:',
            error
          );
        } finally {
          setLoadingNotif(
            false
          );
        }
      },
      [
        user?.id,
      ]
    );


  /* =======================================================
     INITIAL LOAD + REALTIME + FALLBACK POLLING
  ======================================================= */

  useEffect(() => {
    if (!user?.id) {
      setNotifs([]);
      setUnread(0);

      return;
    }


    muat();


    const channel =
      supabase
        .channel(
          `notifikasi-saya-${user.id}`
        )


        /* =================================================
           INSERT
        ================================================= */

        .on(
          'postgres_changes',

          {
            event:
              'INSERT',

            schema:
              'public',

            table:
              'notifications',

            filter:
              `user_id=eq.${user.id}`,
          },

          (
            payload
          ) => {
            const baru =
              payload.new;


            if (
              !baru ||
              baru.channel !==
                'in_app'
            ) {
              return;
            }


            setNotifs(
              (
                sekarang
              ) => {
                /*
                  Hindari duplicate kalau realtime
                  bertemu polling.
                */
                const next =
                  [
                    baru,

                    ...sekarang.filter(
                      (
                        item
                      ) =>
                        item.id !==
                        baru.id
                    ),
                  ].slice(
                    0,
                    75
                  );


                setUnread(
                  hitungUnread(
                    next
                  )
                );


                return next;
              }
            );
          }
        )


        /* =================================================
           UPDATE

           Ini bagian paling penting untuk smart lifecycle.

           Kalau DB mengubah:

           resolved_at:
           NULL → timestamp

           badge langsung turun tanpa perlu klik notif.
        ================================================= */

        .on(
          'postgres_changes',

          {
            event:
              'UPDATE',

            schema:
              'public',

            table:
              'notifications',

            filter:
              `user_id=eq.${user.id}`,
          },

          (
            payload
          ) => {
            const update =
              payload.new;


            if (!update) {
              return;
            }


            setNotifs(
              (
                sekarang
              ) => {
                const next =
                  sekarang.map(
                    (
                      item
                    ) =>
                      item.id ===
                      update.id
                        ? {
                            ...item,
                            ...update,
                          }
                        : item
                  );


                setUnread(
                  hitungUnread(
                    next
                  )
                );


                return next;
              }
            );
          }
        )


        /* =================================================
           DELETE
        ================================================= */

        .on(
          'postgres_changes',

          {
            event:
              'DELETE',

            schema:
              'public',

            table:
              'notifications',

            filter:
              `user_id=eq.${user.id}`,
          },

          (
            payload
          ) => {
            const id =
              payload.old
                ?.id;


            if (!id) {
              return;
            }


            setNotifs(
              (
                sekarang
              ) => {
                const next =
                  sekarang.filter(
                    (
                      item
                    ) =>
                      item.id !==
                      id
                  );


                setUnread(
                  hitungUnread(
                    next
                  )
                );


                return next;
              }
            );
          }
        )


        .subscribe();


    /*
      =====================================================
      FALLBACK POLLING
      =====================================================

      Kalau realtime terputus,
      maksimal ±60 detik kemudian state kembali sinkron.
    */
    const interval =
      setInterval(
        muat,
        60000
      );


    /*
      Saat user kembali membuka tab browser,
      langsung sinkronkan.

      Ini berguna misalnya:
      - user membuka project
      - berpindah tab
      - state berubah
      - kembali ke aplikasi
    */
    function handleVisibility() {
      if (
        document.visibilityState ===
        'visible'
      ) {
        muat();
      }
    }


    document.addEventListener(
      'visibilitychange',
      handleVisibility
    );


    return () => {
      supabase.removeChannel(
        channel
      );


      clearInterval(
        interval
      );


      document.removeEventListener(
        'visibilitychange',
        handleVisibility
      );
    };
  }, [
    user?.id,
    muat,
  ]);


  /* =======================================================
     TANDAI SATU DIBACA
  ======================================================= */

  async function tandaiBaca(
    id
  ) {
    if (
      !id ||
      !user?.id
    ) {
      return;
    }


    const waktu =
      new Date()
        .toISOString();


    /*
      Ambil kondisi lama untuk optimistic update.
    */
    const sebelumnya =
      notifs.find(
        (
          item
        ) =>
          item.id ===
          id
      );


    /*
      Sudah read?
      Tidak perlu request lagi.
    */
    if (
      sebelumnya?.read_at
    ) {
      return;
    }


    setNotifs(
      (
        sekarang
      ) => {
        const next =
          sekarang.map(
            (
              item
            ) =>
              item.id ===
              id
                ? {
                    ...item,

                    read_at:
                      item.read_at ??
                      waktu,
                  }
                : item
          );


        setUnread(
          hitungUnread(
            next
          )
        );


        return next;
      }
    );


    const {
      error,
    } =
      await supabase
        .from(
          'notifications'
        )
        .update({
          read_at:
            waktu,
        })
        .eq(
          'id',
          id
        )
        .eq(
          'user_id',
          user.id
        );


    if (error) {
      console.error(
        'Gagal menandai notifikasi dibaca:',
        error
      );


      /*
        Kembalikan state sesuai DB.
      */
      await muat();
    }
  }


  /* =======================================================
     TANDAI SEMUA NOTIFIKASI AKTIF DIBACA
  ======================================================= */

  async function tandaiSemuaBaca() {
    if (!user?.id) {
      return;
    }


    const waktu =
      new Date()
        .toISOString();


    /*
      Hanya active unresolved notification.

      resolved notification yang belum pernah dibaca
      tidak perlu diubah menjadi read.
    */
    setNotifs(
      (
        sekarang
      ) => {
        const next =
          sekarang.map(
            (
              item
            ) =>
              isActiveUnread(
                item
              )
                ? {
                    ...item,

                    read_at:
                      waktu,
                  }
                : item
          );


        setUnread(
          hitungUnread(
            next
          )
        );


        return next;
      }
    );


    const {
      error,
    } =
      await supabase
        .from(
          'notifications'
        )
        .update({
          read_at:
            waktu,
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
        )
        .is(
          'resolved_at',
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


  /* =======================================================
     HAPUS SATU NOTIFIKASI
  ======================================================= */

  async function hapus(
    id
  ) {
    if (
      !id ||
      !user?.id
    ) {
      return;
    }


    setNotifs(
      (
        sekarang
      ) => {
        const next =
          sekarang.filter(
            (
              item
            ) =>
              item.id !==
              id
          );


        setUnread(
          hitungUnread(
            next
          )
        );


        return next;
      }
    );


    const {
      error,
    } =
      await supabase
        .from(
          'notifications'
        )
        .delete()
        .eq(
          'id',
          id
        )
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


  /* =======================================================
     HAPUS SEMUA YANG SUDAH DIBACA
  ======================================================= */

  async function hapusSemuaDibaca() {
    if (!user?.id) {
      return;
    }


    setNotifs(
      (
        sekarang
      ) => {
        const next =
          sekarang.filter(
            (
              item
            ) =>
              !item.read_at
          );


        setUnread(
          hitungUnread(
            next
          )
        );


        return next;
      }
    );


    const {
      error,
    } =
      await supabase
        .from(
          'notifications'
        )
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


  /* =======================================================
     MANUAL REFRESH
  ======================================================= */

  async function refreshNotifications() {
    await muat();
  }


  /* =======================================================
     RETURN
  ======================================================= */

  return {
    notifs,
    unread,

    loadingNotif,

    muat:
      refreshNotifications,

    tandaiBaca,
    tandaiSemuaBaca,

    hapus,
    hapusSemuaDibaca,
  };
}