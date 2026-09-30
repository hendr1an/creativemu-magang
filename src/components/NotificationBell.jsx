import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import {
  RefreshCw,
} from 'lucide-react';

import {
  useNotifications,
} from '../hooks/useNotifications';

import {
  useAuth,
} from '../context/AuthContext';


/* =========================================================
   WAKTU RELATIF
========================================================= */

const waktuRelatif =
  (iso) => {
    if (!iso) {
      return '';
    }


    const diff =
      Date.now() -
      new Date(
        iso
      ).getTime();


    const menit =
      Math.floor(
        diff /
          60000
      );


    if (menit < 1) {
      return 'baru saja';
    }


    if (menit < 60) {
      return `${menit} mnt lalu`;
    }


    const jam =
      Math.floor(
        menit / 60
      );


    if (jam < 24) {
      return `${jam} jam lalu`;
    }


    const hari =
      Math.floor(
        jam / 24
      );


    return hari === 1
      ? 'kemarin'
      : `${hari} hari lalu`;
  };


/* =========================================================
   ROUTE FALLBACK UNTUK NOTIFIKASI LEGACY
========================================================= */

function ruteFallback(
  judul,
  role
) {
  const j =
    (
      judul ??
      ''
    ).toLowerCase();


  /* =======================================================
     INTERN
  ======================================================= */

  if (
    role ===
    'intern'
  ) {
    if (
      j.includes(
        'tugas baru'
      ) ||
      j.includes(
        'dinilai'
      ) ||
      j.includes(
        'revisi'
      ) ||
      j.includes(
        'deadline'
      ) ||
      j.includes(
        'tugas terlambat'
      )
    ) {
      return '/intern/projek';
    }


    if (
      j.includes(
        'check-in'
      )
    ) {
      return '/intern/presensi';
    }


    if (
      j.includes(
        'izin wfh'
      ) ||
      j.includes(
        'izin telat'
      ) ||
      j.includes(
        'izin disetujui'
      )
    ) {
      return '/intern/presensi';
    }


    if (
      j.includes(
        'izin ditolak'
      )
    ) {
      return '/intern/izin';
    }


    if (
      j.includes(
        'pulang awal'
      )
    ) {
      return '/intern/presensi';
    }


    if (
      j.includes(
        'mentoring'
      )
    ) {
      return '/intern/mentoring';
    }


    if (
      j.includes(
        'lolos'
      )
    ) {
      return '/intern';
    }


    if (
      j.includes(
        'penilaian akhir'
      )
    ) {
      return '/intern/sertifikat';
    }
  }


  /* =======================================================
     MENTOR
  ======================================================= */

  if (
    role ===
    'mentor'
  ) {
    if (
      j.includes(
        'review'
      )
    ) {
      return '/mentor/kelompok?panel=review';
    }


    if (
      j.includes(
        'anggota baru'
      )
    ) {
      return '/mentor/kelompok';
    }
  }


  /* =======================================================
     ADMIN
  ======================================================= */

  if (
    role ===
    'admin'
  ) {
    if (
      j.includes(
        'pengajuan magang baru'
      )
    ) {
      return '/admin/pengajuan';
    }


    if (
      j.includes(
        'izin'
      ) ||
      j.includes(
        'pulang awal'
      )
    ) {
      return '/admin/izin';
    }


    if (
      j.includes(
        'peserta selesai'
      )
    ) {
      return '/admin/sertifikat';
    }


    if (
      j.includes(
        'password diganti'
      ) ||
      j.includes(
        'whatsapp'
      )
    ) {
      return '/admin/peserta';
    }
  }


  return null;
}


/* =========================================================
   ROUTE
========================================================= */

function ruteUntuk(
  notif,
  role
) {
  /*
    target_url selalu menjadi prioritas.

    Ini mempertahankan exact deeplink
    FASE 5-3.
  */
  if (
    notif?.target_url
  ) {
    return notif.target_url;
  }


  return ruteFallback(
    notif?.judul,
    role
  );
}


/* =========================================================
   ICON
========================================================= */

function ikonUntuk(
  notif
) {
  const type =
    notif?.notification_type;


  /*
    Utamakan lifecycle type.
  */
  if (
    type ===
    'subtask_new'
  ) {
    return '📌';
  }


  if (
    type ===
    'subtask_revision'
  ) {
    return '🔁';
  }


  if (
    type ===
    'subtask_deadline'
  ) {
    return '⏳';
  }


  if (
    type ===
    'subtask_review'
  ) {
    return '🔍';
  }


  if (
    type ===
    'application_review'
  ) {
    return '📥';
  }


  if (
    type ===
    'leave_review'
  ) {
    return '📝';
  }


  if (
    type ===
    'early_checkout_review'
  ) {
    return '🏃';
  }


  if (
    type ===
    'early_checkout_result'
  ) {
    return '🏃';
  }


  if (
    type ===
    'attendance_checkin'
  ) {
    return '⏰';
  }


  if (
    type ===
    'certificate_pending'
  ) {
    return '🎓';
  }


  if (
    type ===
    'mentoring_schedule'
  ) {
    return '📅';
  }


  /*
    Fallback untuk notification lama
    yang belum punya notification_type.
  */
  const j =
    (
      notif?.judul ??
      ''
    ).toLowerCase();


  if (
    j.includes(
      'tugas baru'
    )
  ) {
    return '📌';
  }


  if (
    j.includes(
      'dinilai'
    )
  ) {
    return '✅';
  }


  if (
    j.includes(
      'revisi'
    )
  ) {
    return '🔁';
  }


  if (
    j.includes(
      'deadline'
    )
  ) {
    return '⏳';
  }


  if (
    j.includes(
      'terlambat'
    )
  ) {
    return '⚠️';
  }


  if (
    j.includes(
      'check-in'
    )
  ) {
    return '⏰';
  }


  if (
    j.includes(
      'izin'
    )
  ) {
    return '📝';
  }


  if (
    j.includes(
      'pulang awal'
    )
  ) {
    return '🏃';
  }


  if (
    j.includes(
      'mentoring'
    )
  ) {
    return '📅';
  }


  if (
    j.includes(
      'review'
    )
  ) {
    return '🔍';
  }


  if (
    j.includes(
      'lolos'
    )
  ) {
    return '🎉';
  }


  if (
    j.includes(
      'penilaian akhir'
    )
  ) {
    return '🏆';
  }


  if (
    j.includes(
      'password'
    )
  ) {
    return '🔐';
  }


  if (
    j.includes(
      'whatsapp'
    )
  ) {
    return '📱';
  }


  if (
    j.includes(
      'anggota baru'
    )
  ) {
    return '👥';
  }


  if (
    j.includes(
      'pengajuan'
    )
  ) {
    return '📥';
  }


  if (
    j.includes(
      'peserta selesai'
    )
  ) {
    return '🎓';
  }


  return '🔔';
}


/* =========================================================
   ACTIVE UNREAD
========================================================= */

function isActiveUnread(
  notif
) {
  return (
    !notif?.read_at &&
    !notif?.resolved_at
  );
}


/* =========================================================
   COMPONENT
========================================================= */

export default function NotificationBell() {
  const {
    notifs,

    unread,

    loadingNotif,

    muat,

    tandaiBaca,

    tandaiSemuaBaca,

    hapus,

    hapusSemuaDibaca,
  } =
    useNotifications();


  const {
    role,
  } =
    useAuth();


  const [
    buka,
    setBuka,
  ] = useState(false);


  const [
    tab,
    setTab,
  ] = useState(
    'baru'
  );


  const [
    hapusId,
    setHapusId,
  ] = useState(
    null
  );


  const [
    refreshing,
    setRefreshing,
  ] = useState(
    false
  );


  const ref =
    useRef(null);


  const navigate =
    useNavigate();


  /* =======================================================
     CLICK OUTSIDE
  ======================================================= */

  useEffect(() => {
    const klikLuar =
      (
        event
      ) => {
        if (
          ref.current &&
          !ref.current.contains(
            event.target
          )
        ) {
          setBuka(
            false
          );
        }
      };


    document.addEventListener(
      'mousedown',
      klikLuar
    );


    return () => {
      document.removeEventListener(
        'mousedown',
        klikLuar
      );
    };
  }, []);


  /* =======================================================
     REFRESH SAAT BELL DIBUKA
  ======================================================= */

  async function toggleBell() {
    const next =
      !buka;


    setBuka(
      next
    );


    if (next) {
      setRefreshing(
        true
      );


      try {
        await muat();
      } finally {
        setRefreshing(
          false
        );
      }
    }
  }


  async function refreshManual() {
    setRefreshing(
      true
    );


    try {
      await muat();
    } finally {
      setRefreshing(
        false
      );
    }
  }


  /* =======================================================
     CLICK NOTIFIKASI
  ======================================================= */

  async function klikItem(
    notif
  ) {
    /*
      Item pada tab Belum Dibaca
      selalu active unresolved.

      Untuk tab Dibaca,
      tandaiBaca tidak diperlukan.
    */
    if (
      !notif.read_at
    ) {
      await tandaiBaca(
        notif.id
      );
    }


    const rute =
      ruteUntuk(
        notif,
        role
      );


    setBuka(
      false
    );


    if (rute) {
      navigate(
        rute
      );
    }
  }


  /* =======================================================
     DELETE ANIMATION
  ======================================================= */

  function konfirmasiHapus(
    id
  ) {
    setHapusId(
      id
    );


    setTimeout(
      async () => {
        await hapus(
          id
        );

        setHapusId(
          null
        );
      },
      260
    );
  }


  /* =======================================================
     DATA TAB
  ======================================================= */

  /*
    TAB BARU

    HANYA:
    read_at     NULL
    resolved_at NULL
  */
  const belumDibaca =
    notifs.filter(
      (
        notif
      ) =>
        isActiveUnread(
          notif
        )
    );


  /*
    TAB DIBACA

    Notification informational maupun actionable
    yang memang pernah dibuka user.

    resolved notification yang belum pernah dibaca
    tidak dipindahkan ke sini, karena user memang
    tidak pernah membacanya.
  */
  const sudahDibaca =
    notifs.filter(
      (
        notif
      ) =>
        !!notif.read_at
    );


  const daftar =
    tab ===
    'baru'
      ? belumDibaca
      : sudahDibaca;


  /* =======================================================
     UI
  ======================================================= */

  return (
    <div
      className="relative"
      ref={
        ref
      }
    >
      {/* ===================================================
          BELL BUTTON
      =================================================== */}

      <button
        type="button"
        onClick={
          toggleBell
        }
        className={`relative flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-lg transition-all duration-200 hover:scale-105 hover:bg-slate-200 active:scale-95 ${
          unread > 0
            ? 'anim-wiggle'
            : ''
        }`}
        title="Notifikasi"
        aria-label={`Notifikasi${
          unread > 0
            ? `, ${unread} belum dibaca`
            : ''
        }`}
      >
        {unread >
        0
          ? '🔔'
          : '🔕'}


        {unread >
          0 && (
          <span className="anim-pop absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white shadow">
            {unread >
            99
              ? '99+'
              : unread}
          </span>
        )}
      </button>


      {/* ===================================================
          POPOVER
      =================================================== */}

      {buka && (
        <div className="anim-down absolute right-0 z-50 mt-2 w-[22rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:w-96">

          {/* ===============================================
              HEADER
          =============================================== */}

          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800">
                Notifikasi{' '}

                {unread >
                  0 && (
                  <span className="text-red-500">
                    (
                    {
                      unread
                    }{' '}
                    baru)
                  </span>
                )}
              </p>

              <p className="mt-0.5 text-[10px] text-slate-400">
                Hanya aktivitas
                yang masih
                relevan yang
                dihitung sebagai
                baru.
              </p>
            </div>


            <div className="flex shrink-0 items-center gap-2">

              {/* REFRESH */}

              <button
                type="button"
                onClick={
                  refreshManual
                }
                disabled={
                  refreshing ||
                  loadingNotif
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-40"
                title="Refresh notifikasi"
              >
                <RefreshCw
                  size={
                    15
                  }
                  className={
                    refreshing ||
                    loadingNotif
                      ? 'animate-spin'
                      : ''
                  }
                />
              </button>


              {/* MARK ALL */}

              {unread >
                0 && (
                <button
                  type="button"
                  onClick={
                    tandaiSemuaBaca
                  }
                  className="text-[11px] font-semibold text-indigo-600 hover:underline"
                >
                  Tandai dibaca
                </button>
              )}
            </div>
          </div>


          {/* ===============================================
              TAB
          =============================================== */}

          <div className="flex border-b border-slate-100">
            <button
              type="button"
              onClick={() =>
                setTab(
                  'baru'
                )
              }
              className={`flex-1 py-2.5 text-xs font-bold transition ${
                tab ===
                'baru'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Belum Dibaca (
              {
                belumDibaca.length
              }
              )
            </button>


            <button
              type="button"
              onClick={() =>
                setTab(
                  'dibaca'
                )
              }
              className={`flex-1 py-2.5 text-xs font-bold transition ${
                tab ===
                'dibaca'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Dibaca (
              {
                sudahDibaca.length
              }
              )
            </button>
          </div>


          {/* ===============================================
              LIST
          =============================================== */}

          <div className="max-h-80 overflow-y-auto">
            {(refreshing ||
              loadingNotif) &&
            daftar.length ===
              0 ? (
              <div className="flex flex-col items-center py-10">
                <span className="inline-block h-7 w-7 animate-spin rounded-full border-[3px] border-slate-200 border-t-indigo-600" />

                <p className="mt-3 text-xs font-medium text-slate-400">
                  Menyinkronkan
                  notifikasi...
                </p>
              </div>
            ) : daftar.length ===
              0 ? (
              <div className="flex flex-col items-center py-10">
                <p className="text-3xl opacity-30">
                  {tab ===
                  'baru'
                    ? '🔔'
                    : '📭'}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  {tab ===
                  'baru'
                    ? 'Tidak ada aktivitas yang perlu perhatian'
                    : 'Belum ada notifikasi yang dibaca'}
                </p>

                {tab ===
                  'baru' && (
                  <p className="mt-1 px-8 text-center text-[10px] leading-relaxed text-slate-300">
                    Notifikasi
                    actionable
                    akan hilang
                    otomatis ketika
                    urusannya sudah
                    selesai.
                  </p>
                )}
              </div>
            ) : (
              daftar.map(
                (
                  notif
                ) => {
                  const rute =
                    ruteUntuk(
                      notif,
                      role
                    );


                  const exactReview =
                    role ===
                      'mentor' &&
                    notif.target_url?.includes(
                      'subtask='
                    );


                  return (
                    <div
                      key={
                        notif.id
                      }
                      className={`group relative border-b border-slate-50 transition-all duration-300 ${
                        hapusId ===
                        notif.id
                          ? 'translate-x-8 opacity-0'
                          : 'translate-x-0 opacity-100'
                      }`}
                      style={{
                        transitionProperty:
                          'transform, opacity',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          klikItem(
                            notif
                          )
                        }
                        className={`flex w-full items-start gap-2.5 px-4 py-3 pr-11 text-left transition hover:bg-slate-50 ${
                          isActiveUnread(
                            notif
                          )
                            ? 'bg-indigo-50/40'
                            : ''
                        }`}
                      >
                        {/* ICON */}

                        <span className="mt-0.5 shrink-0 text-lg">
                          {ikonUntuk(
                            notif
                          )}
                        </span>


                        {/* CONTENT */}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`text-sm ${
                                isActiveUnread(
                                  notif
                                )
                                  ? 'font-bold text-slate-800'
                                  : 'font-medium text-slate-600'
                              }`}
                            >
                              {
                                notif.judul
                              }
                            </p>


                            {isActiveUnread(
                              notif
                            ) && (
                              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                            )}
                          </div>


                          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                            {
                              notif.pesan
                            }
                          </p>


                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <p className="text-[10px] text-slate-400">
                              {waktuRelatif(
                                notif.created_at
                              )}
                            </p>


                            {rute && (
                              <span className="text-[10px] font-bold text-indigo-400">
                                {exactReview
                                  ? '→ buka tugas ini'
                                  : '→ lihat'}
                              </span>
                            )}


                            {/* OPTIONAL STATUS HISTORY */}

                            {notif.read_at &&
                              notif.resolved_at && (
                                <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">
                                  selesai
                                </span>
                              )}
                          </div>
                        </div>
                      </button>


                      {/* ===================================
                          DELETE
                      =================================== */}

                      <button
                        type="button"
                        onClick={(
                          event
                        ) => {
                          event.stopPropagation();

                          konfirmasiHapus(
                            notif.id
                          );
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-red-50 p-1.5 text-red-400 opacity-0 transition-all duration-200 hover:bg-red-100 hover:text-red-600 group-hover:opacity-100"
                        title="Hapus notifikasi"
                        aria-label="Hapus notifikasi"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        >
                          <polyline points="3 6 5 6 21 6" />

                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  );
                }
              )
            )}
          </div>


          {/* ===============================================
              FOOTER
          =============================================== */}

          {tab ===
            'dibaca' &&
            sudahDibaca.length >
              0 && (
              <button
                type="button"
                onClick={
                  hapusSemuaDibaca
                }
                className="w-full border-t border-slate-100 py-2.5 text-center text-[11px] font-semibold text-slate-400 transition hover:bg-red-50 hover:text-red-500"
              >
                Hapus semua
                notifikasi yang
                sudah dibaca
              </button>
            )}
        </div>
      )}
    </div>
  );
}