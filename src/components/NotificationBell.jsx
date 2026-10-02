import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  createPortal,
} from 'react-dom';

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
   CONSTANT
========================================================= */

const PANEL_MAX_WIDTH =
  384;

const PANEL_GAP =
  8;

const VIEWPORT_GAP =
  12;


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
        diff / 60000
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
    target_url selalu prioritas.

    Exact deeplink FASE 5-3 tetap dipertahankan.
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
    Fallback untuk notifikasi lama.
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
  ] =
    useState(false);


  const [
    tab,
    setTab,
  ] =
    useState(
      'baru'
    );


  const [
    hapusId,
    setHapusId,
  ] =
    useState(
      null
    );


  const [
    refreshing,
    setRefreshing,
  ] =
    useState(
      false
    );


  /*
    Posisi panel portal.
  */
  const [
    posisi,
    setPosisi,
  ] =
    useState({
      top: 72,
      left: 12,
      width: 320,
      maxHeight: 500,
    });


  const triggerRef =
    useRef(null);


  const panelRef =
    useRef(null);


  const navigate =
    useNavigate();


  /* =======================================================
     HITUNG POSISI PANEL
  ======================================================= */

  function hitungPosisiPanel() {
    const trigger =
      triggerRef.current;


    if (
      !trigger
    ) {
      return;
    }


    const rect =
      trigger.getBoundingClientRect();


    const viewportWidth =
      window.innerWidth;


    const viewportHeight =
      window.innerHeight;


    /*
      MOBILE:
      hampir selebar viewport.

      DESKTOP:
      maksimal 384px.
    */
    const width =
      Math.min(
        PANEL_MAX_WIDTH,

        viewportWidth -
          VIEWPORT_GAP * 2
      );


    /*
      Posisi awal:
      right edge panel mengikuti right edge bell.
    */
    let left =
      rect.right -
      width;


    /*
      Clamp kiri.
    */
    if (
      left <
      VIEWPORT_GAP
    ) {
      left =
        VIEWPORT_GAP;
    }


    /*
      Clamp kanan.

      Ini bagian yang mencegah popup terpotong
      meskipun ada tombol Logout di sebelah bell.
    */
    const maksimumLeft =
      viewportWidth -
      width -
      VIEWPORT_GAP;


    if (
      left >
      maksimumLeft
    ) {
      left =
        maksimumLeft;
    }


    const top =
      rect.bottom +
      PANEL_GAP;


    /*
      Panel tidak boleh melewati bawah layar.

      Sisakan sedikit margin viewport.
    */
    const maxHeight =
      Math.max(
        240,

        viewportHeight -
          top -
          VIEWPORT_GAP
      );


    setPosisi({
      top,
      left,
      width,
      maxHeight,
    });
  }


  /* =======================================================
     CLICK OUTSIDE
  ======================================================= */

  useEffect(() => {
    if (!buka) {
      return undefined;
    }


    function klikLuar(
      event
    ) {
      const target =
        event.target;


      const klikTrigger =
        triggerRef.current?.contains(
          target
        );


      const klikPanel =
        panelRef.current?.contains(
          target
        );


      if (
        !klikTrigger &&
        !klikPanel
      ) {
        setBuka(
          false
        );
      }
    }


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
  }, [
    buka,
  ]);


  /* =======================================================
     REPOSITION SAAT RESIZE / SCROLL
  ======================================================= */

  useEffect(() => {
    if (!buka) {
      return undefined;
    }


    hitungPosisiPanel();


    function reposition() {
      hitungPosisiPanel();
    }


    window.addEventListener(
      'resize',
      reposition
    );


    /*
      true = ikut menangkap scroll dari container lain,
      bukan hanya window.
    */
    window.addEventListener(
      'scroll',
      reposition,
      true
    );


    return () => {
      window.removeEventListener(
        'resize',
        reposition
      );


      window.removeEventListener(
        'scroll',
        reposition,
        true
      );
    };
  }, [
    buka,
  ]);


  /* =======================================================
     ESCAPE
  ======================================================= */

  useEffect(() => {
    if (!buka) {
      return undefined;
    }


    function handleKeyDown(
      event
    ) {
      if (
        event.key ===
        'Escape'
      ) {
        setBuka(
          false
        );
      }
    }


    document.addEventListener(
      'keydown',
      handleKeyDown
    );


    return () => {
      document.removeEventListener(
        'keydown',
        handleKeyDown
      );
    };
  }, [
    buka,
  ]);


  /* =======================================================
     OPEN / REFRESH
  ======================================================= */

  async function toggleBell() {
    if (buka) {
      setBuka(
        false
      );

      return;
    }


    /*
      Hitung dulu sebelum render portal,
      supaya tidak sempat meloncat dari posisi default.
    */
    hitungPosisiPanel();


    setBuka(
      true
    );


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
     CLICK NOTIFICATION
  ======================================================= */

  async function klikItem(
    notif
  ) {
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
     DELETE
  ======================================================= */

  function konfirmasiHapus(
    id
  ) {
    setHapusId(
      id
    );


    window.setTimeout(
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

  const belumDibaca =
    notifs.filter(
      (
        notif
      ) =>
        isActiveUnread(
          notif
        )
    );


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
     POPOVER PORTAL
  ======================================================= */

  const popover =
    buka ? (
      <div
        ref={
          panelRef
        }
        className="anim-down fixed z-[9000] flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/15"
        style={{
          top:
            `${posisi.top}px`,

          left:
            `${posisi.left}px`,

          width:
            `${posisi.width}px`,

          maxHeight:
            `${posisi.maxHeight}px`,
        }}
      >
        <div className="flex min-h-0 w-full flex-col">

          {/* ===============================================
              HEADER
          =============================================== */}

          <div className="shrink-0 border-b border-slate-100 px-3 py-3 sm:px-4">
            <div className="flex items-start justify-between gap-2">

              {/* TITLE */}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-800">
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


                <p className="mt-0.5 line-clamp-2 text-[9px] leading-relaxed text-slate-400 sm:text-[10px]">
                  Hanya aktivitas
                  yang masih relevan
                  yang dihitung
                  sebagai baru.
                </p>
              </div>


              {/* ACTIONS */}

              <div className="flex shrink-0 items-center gap-1">

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
                  aria-label="Refresh notifikasi"
                >
                  <RefreshCw
                    size={
                      14
                    }
                    className={
                      refreshing ||
                      loadingNotif
                        ? 'animate-spin'
                        : ''
                    }
                  />
                </button>


                {unread >
                  0 && (
                  <button
                    type="button"
                    onClick={
                      tandaiSemuaBaca
                    }
                    className="whitespace-nowrap rounded-lg px-2 py-1.5 text-[10px] font-bold text-indigo-600 transition hover:bg-indigo-50 sm:text-[11px]"
                  >
                    Tandai dibaca
                  </button>
                )}
              </div>
            </div>
          </div>


          {/* ===============================================
              TAB
          =============================================== */}

          <div className="flex shrink-0 border-b border-slate-100">
            <button
              type="button"
              onClick={() =>
                setTab(
                  'baru'
                )
              }
              className={`min-w-0 flex-1 px-2 py-2.5 text-[11px] font-bold transition sm:text-xs ${
                tab ===
                'baru'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className="block truncate">
                Belum Dibaca (
                {
                  belumDibaca.length
                }
                )
              </span>
            </button>


            <button
              type="button"
              onClick={() =>
                setTab(
                  'dibaca'
                )
              }
              className={`min-w-0 flex-1 px-2 py-2.5 text-[11px] font-bold transition sm:text-xs ${
                tab ===
                'dibaca'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className="block truncate">
                Dibaca (
                {
                  sudahDibaca.length
                }
                )
              </span>
            </button>
          </div>


          {/* ===============================================
              LIST
          =============================================== */}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
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
              <div className="flex flex-col items-center px-5 py-10 text-center">
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
                  <p className="mt-1 text-[10px] leading-relaxed text-slate-300">
                    Notifikasi
                    actionable akan
                    hilang otomatis
                    ketika urusannya
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
                      className={`group relative border-b border-slate-100 transition-all duration-300 ${
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

                      {/* ITEM */}

                      <button
                        type="button"
                        onClick={() =>
                          klikItem(
                            notif
                          )
                        }
                        className={`flex w-full items-start gap-2.5 px-3 py-3 pr-10 text-left transition hover:bg-slate-50 sm:px-4 sm:pr-11 ${
                          isActiveUnread(
                            notif
                          )
                            ? 'bg-indigo-50/40'
                            : ''
                        }`}
                      >

                        {/* ICON */}

                        <span className="mt-0.5 shrink-0 text-base sm:text-lg">
                          {ikonUntuk(
                            notif
                          )}
                        </span>


                        {/* CONTENT */}

                        <div className="min-w-0 flex-1">

                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`min-w-0 break-words text-[13px] leading-snug sm:text-sm ${
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
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                            )}
                          </div>


                          <p className="mt-1 line-clamp-2 break-words text-[11px] leading-relaxed text-slate-500 sm:text-xs">
                            {
                              notif.pesan
                            }
                          </p>


                          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <p className="text-[9px] text-slate-400 sm:text-[10px]">
                              {waktuRelatif(
                                notif.created_at
                              )}
                            </p>


                            {rute && (
                              <span className="text-[9px] font-bold text-indigo-500 sm:text-[10px]">
                                {exactReview
                                  ? '→ buka tugas ini'
                                  : '→ lihat'}
                              </span>
                            )}


                            {notif.read_at &&
                              notif.resolved_at && (
                                <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[8px] font-bold text-emerald-600 sm:text-[9px]">
                                  selesai
                                </span>
                              )}
                          </div>
                        </div>
                      </button>


                      {/* DELETE */}

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
                        className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg bg-red-50 text-red-400 opacity-100 transition-all duration-200 hover:bg-red-100 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100"
                        title="Hapus notifikasi"
                        aria-label="Hapus notifikasi"
                      >
                        <svg
                          width="13"
                          height="13"
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
                className="shrink-0 border-t border-slate-100 px-3 py-2.5 text-center text-[10px] font-semibold text-slate-400 transition hover:bg-red-50 hover:text-red-500 sm:text-[11px]"
              >
                Hapus semua
                notifikasi yang
                sudah dibaca
              </button>
            )}
        </div>
      </div>
    ) : null;


  /* =======================================================
     UI
  ======================================================= */

  return (
    <>
      {/* ===================================================
          BELL BUTTON
      =================================================== */}

      <button
        ref={
          triggerRef
        }
        type="button"
        onClick={
          toggleBell
        }
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg transition-all duration-200 hover:scale-105 hover:bg-slate-200 active:scale-95 ${
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
        aria-expanded={
          buka
        }
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
          PORTAL

          Panel keluar dari stacking context topbar.
      =================================================== */}

      {popover &&
        createPortal(
          popover,
          document.body
        )}
    </>
  );
}