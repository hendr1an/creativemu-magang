import {
  useEffect,
  useState,
} from 'react';

import {
  NavLink,
  Outlet,
  useLocation,
} from 'react-router-dom';

import {
  useAuth,
} from '../context/AuthContext';

import NotificationBell from './NotificationBell';
import LogoutButton from './LogoutButton';

import {
  LayoutDashboard,
  Inbox,
  Users,
  GraduationCap,
  FileText,
  Calendar,
  ClipboardList,
  Award,
  Settings,
  Briefcase,
  Clock,
  BookOpen,
  Star,
  ChevronDown,
  User,
  SlidersHorizontal,
  BarChart3,
} from 'lucide-react';


const NAV = {
  admin: [
    {
      to: '/admin',
      label: 'Dashboard',
      Icon: LayoutDashboard,
      end: true,
    },

    {
      to: '/admin/pengajuan',
      label: 'Pengajuan Magang',
      Icon: Inbox,
    },

    {
      to: '/admin/peserta',
      label: 'Data Peserta',
      Icon: Users,
    },

    {
      to: '/admin/mentor',
      label: 'Manajemen Mentor',
      Icon: GraduationCap,
    },

    {
      to: '/admin/izin',
      label: 'Persetujuan Izin',
      Icon: FileText,
    },

    {
      to: '/admin/tracer',
      label: 'Tracer Magang',
      Icon: Calendar,
    },

    {
      to: '/admin/kelompok',
      label: 'Kelompok Magang',
      Icon: ClipboardList,
    },

    {
      to: '/admin/kuota',
      label: 'Kuota Divisi',
      Icon: SlidersHorizontal,
    },

    {
      to: '/admin/statistik',
      label: 'Statistik Administrasi',
      Icon: BarChart3,
    },

    {
      to: '/admin/sertifikat',
      label: 'Sertifikat',
      Icon: Award,
    },
  ],


  intern: [
    {
      to: '/intern',
      label: 'Dashboard',
      Icon: LayoutDashboard,
      end: true,
    },

    {
      to: '/intern/projek',
      label: 'Projek & Tugas',
      Icon: Briefcase,
    },

    {
      to: '/intern/presensi',
      label: 'Presensi',
      Icon: Clock,
    },

    {
      to: '/intern/logbook',
      label: 'Logbook',
      Icon: BookOpen,
    },

    {
      to: '/intern/izin',
      label: 'Pengajuan Izin',
      Icon: FileText,
    },

    {
      to: '/intern/mentoring',
      label: 'Jadwal Mentoring',
      Icon: Calendar,
    },

    {
      to: '/intern/sertifikat',
      label: 'Sertifikat',
      Icon: Award,
    },
  ],


  mentor: [
    {
      to: '/mentor',
      label: 'Dashboard',
      Icon: LayoutDashboard,
      end: true,
    },

    {
      to: '/mentor/kelompok',
      label: 'Mentoring',
      Icon: Users,
    },

    {
      to: '/mentor/penilaian',
      label: 'Rubrik Penilaian',
      Icon: Star,
    },

    {
      to: '/mentor/mentoring',
      label: 'Jadwal Mentoring',
      Icon: Calendar,
    },
  ],
};


const PENGATURAN = {
  admin: [
    {
      to: '/admin/setting/akun',
      label: 'Info Akun',
      Icon: User,
    },

    {
      to: '/admin/setting/tampilan',
      label: 'Tampilan',
      Icon: Star,
    },

    {
      to: '/admin/setting/tentang',
      label: 'Tentang Sistem',
      Icon: FileText,
    },
  ],


  intern: [
    {
      to: '/intern/setting/akun',
      label: 'Info Akun',
      Icon: User,
    },

    {
      to: '/intern/setting/password',
      label: 'Ganti Password',
      Icon: GraduationCap,
    },

    {
      to: '/intern/setting/kontak',
      label: 'Kontak WhatsApp',
      Icon: FileText,
    },

    {
      to: '/intern/setting/tampilan',
      label: 'Tampilan',
      Icon: Star,
    },

    {
      to: '/intern/setting/tentang',
      label: 'Tentang Sistem',
      Icon: FileText,
    },
  ],


  mentor: [
    {
      to: '/mentor/setting/akun',
      label: 'Info Akun',
      Icon: User,
    },

    {
      to: '/mentor/setting/password',
      label: 'Ganti Password',
      Icon: GraduationCap,
    },

    {
      to: '/mentor/setting/kontak',
      label: 'Kontak WhatsApp',
      Icon: FileText,
    },

    {
      to: '/mentor/setting/tampilan',
      label: 'Tampilan',
      Icon: Star,
    },

    {
      to: '/mentor/setting/tentang',
      label: 'Tentang Sistem',
      Icon: FileText,
    },
  ],
};


const LABEL_PERAN = {
  admin:
    'Administrator',

  mentor:
    'Pembimbing',

  intern:
    'Peserta Magang',
};


function jamSapaan() {
  const jam =
    parseInt(
      new Intl.DateTimeFormat(
        'id-ID',
        {
          timeZone:
            'Asia/Jakarta',

          hour:
            '2-digit',

          hour12:
            false,
        }
      ).format(
        new Date()
      ),

      10
    );


  if (
    jam < 12
  ) {
    return {
      teks:
        'Selamat Pagi',

      ikon:
        '👋',
    };
  }


  if (
    jam < 17
  ) {
    return {
      teks:
        'Selamat Siang',

      ikon:
        '☀️',
    };
  }


  if (
    jam < 20
  ) {
    return {
      teks:
        'Selamat Sore',

      ikon:
        '🌇',
    };
  }


  return {
    teks:
      'Selamat Malam',

    ikon:
      '🌙',
  };
}


const tanggalWib =
  () =>
    new Intl.DateTimeFormat(
      'id-ID',
      {
        weekday:
          'long',

        day:
          'numeric',

        month:
          'long',

        timeZone:
          'Asia/Jakarta',
      }
    ).format(
      new Date()
    );


export default function Layout() {
  const {
    profile,
    role,
    user,
  } =
    useAuth();


  const lokasi =
    useLocation();


  const namaPendek =
    () =>
      profile?.nama_lengkap
        ?.split(' ')
        .slice(
          0,
          2
        )
        .join(' ') ??
      user?.email
        ?.split('@')[0] ??
      '';


  /* =======================================================
     SETTINGS
  ======================================================= */

  const [
    bukaSetting,
    setBukaSetting,
  ] =
    useState(
      () =>
        window.location.pathname.includes(
          '/setting/'
        )
    );


  const sedangDiSetting =
    lokasi.pathname.includes(
      '/setting/'
    );


  useEffect(
    () => {
      if (
        lokasi.pathname.includes(
          '/setting/'
        )
      ) {
        setBukaSetting(
          true
        );
      }
    },
    [
      lokasi.pathname,
    ]
  );


  /* =======================================================
     MOBILE SIDEBAR
  ======================================================= */

  const [
    menuBuka,
    setMenuBuka,
  ] =
    useState(
      false
    );


  useEffect(
    () => {
      setMenuBuka(
        false
      );
    },
    [
      lokasi.pathname,
    ]
  );


  useEffect(
    () => {
      document.body.style.overflow =
        menuBuka
          ? 'hidden'
          : '';


      return () => {
        document.body.style.overflow =
          '';
      };
    },
    [
      menuBuka,
    ]
  );


  return (
    <div className="min-h-screen bg-slate-100 lg:flex">

      {/* ===================================================
          SIDEBAR
      =================================================== */}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 max-w-[85vw] flex-col overflow-y-auto sidebar-gradient text-white transition-transform duration-300 lg:static lg:translate-x-0 ${
          menuBuka
            ? 'translate-x-0'
            : '-translate-x-full'
        }`}
      >

        {/* LOGO */}

        <div className="flex items-center justify-between border-b border-white/15 p-5">
          <div>
            <p className="text-lg font-bold tracking-wide">
              CREATIVEMU
            </p>

            <p className="text-[10px] font-semibold tracking-[0.25em] text-white/60">
              {LABEL_PERAN[
                role
              ] ??
                role}
            </p>
          </div>


          <button
            type="button"
            onClick={() =>
              setMenuBuka(
                false
              )
            }
            className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Tutup menu"
          >
            ✕
          </button>
        </div>


        {/* NAV */}

        <nav className="flex-1 space-y-1 px-3 py-4">
          {(
            NAV[
              role
            ] ??
            []
          ).map(
            (
              item
            ) => (
              <NavLink
                key={
                  item.to
                }
                to={
                  item.to
                }
                end={
                  item.end
                }
                className={({
                  isActive,
                }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                    isActive
                      ? 'sidebar-item-active'
                      : 'text-white/70 sidebar-item-hover'
                  }`
                }
              >
                <item.Icon
                  size={
                    18
                  }
                  strokeWidth={
                    2
                  }
                  className="shrink-0"
                />

                <span>
                  {
                    item.label
                  }
                </span>
              </NavLink>
            )
          )}


          {/* SETTINGS */}

          <div className="pt-3">
            <button
              type="button"
              onClick={() =>
                setBukaSetting(
                  !bukaSetting
                )
              }
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition ${
                sedangDiSetting
                  ? 'sidebar-item-active'
                  : 'text-white/70 sidebar-item-hover'
              }`}
            >
              <span className="flex items-center gap-3">
                <Settings
                  size={
                    18
                  }
                  strokeWidth={
                    2
                  }
                  className="shrink-0"
                />

                Pengaturan
              </span>


              <ChevronDown
                size={
                  14
                }
                className={`text-white/60 transition-transform duration-300 ${
                  bukaSetting
                    ? 'rotate-180'
                    : ''
                }`}
              />
            </button>


            <div
              className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out ${
                bukaSetting
                  ? 'grid-rows-[1fr] opacity-100'
                  : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="min-h-0">
                <div className="mt-1 space-y-0.5 pl-3">
                  {(
                    PENGATURAN[
                      role
                    ] ??
                    []
                  ).map(
                    (
                      item
                    ) => (
                      <NavLink
                        key={
                          item.to
                        }
                        to={
                          item.to
                        }
                        className={({
                          isActive,
                        }) =>
                          `flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition ${
                            isActive
                              ? 'sidebar-item-active'
                              : 'text-white/60 sidebar-item-hover'
                          }`
                        }
                      >
                        <item.Icon
                          size={
                            16
                          }
                          strokeWidth={
                            2
                          }
                          className="shrink-0"
                        />

                        {
                          item.label
                        }
                      </NavLink>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </nav>


        {/* =================================================
            LOGOUT SUDAH DIPINDAHKAN KE TOPBAR
        ================================================= */}

        <div className="border-t border-white/10 px-5 py-3">
          <p className="text-center text-[9px] font-semibold tracking-wide text-white/30">
            Creativemu Academy
          </p>
        </div>
      </aside>


      {/* ===================================================
          MOBILE BACKDROP
      =================================================== */}

      {menuBuka && (
        <div
          onClick={() =>
            setMenuBuka(
              false
            )
          }
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
        />
      )}


      {/* ===================================================
          CONTENT
      =================================================== */}

      <div className="flex min-w-0 flex-1 flex-col">

        {/* =================================================
            TOPBAR
        ================================================= */}

        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-md sm:px-6">

          {/* LEFT */}

          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setMenuBuka(
                  true
                )
              }
              className="flex h-10 w-10 items-center justify-center rounded-lg text-xl text-slate-600 transition hover:bg-slate-100 lg:hidden"
              aria-label="Buka menu"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line
                  x1="3"
                  y1="6"
                  x2="21"
                  y2="6"
                />

                <line
                  x1="3"
                  y1="12"
                  x2="21"
                  y2="12"
                />

                <line
                  x1="3"
                  y1="18"
                  x2="21"
                  y2="18"
                />
              </svg>
            </button>


            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-800 sm:text-base">
                <span className="anim-wiggle mr-1 inline-block">
                  {
                    jamSapaan()
                      .ikon
                  }
                </span>

                {
                  jamSapaan()
                    .teks
                }
                ,{' '}

                <span className="gradient-text">
                  {
                    namaPendek()
                  }
                </span>
                !
              </p>


              <p className="hidden truncate text-[11px] font-medium text-slate-400 sm:block">
                {LABEL_PERAN[
                  role
                ] ??
                  role}{' '}

                ·{' '}

                {
                  tanggalWib()
                }
              </p>
            </div>
          </div>


          {/* ===============================================
              RIGHT ACTIONS
          =============================================== */}

          <div className="flex shrink-0 items-center gap-2">

            <NotificationBell />

            <div
              className="h-6 w-px bg-slate-200"
              aria-hidden="true"
            />

            <LogoutButton />

          </div>
        </header>


        {/* =================================================
            PAGE
        ================================================= */}

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div
            key={
              lokasi.pathname
            }
            className="anim-in"
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}