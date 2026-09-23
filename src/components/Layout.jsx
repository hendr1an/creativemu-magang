import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const NAV = {
  admin: [
    { to: '/admin', label: 'Dashboard', ikon: '📊', end: true },
    { to: '/admin/pengajuan', label: 'Pengajuan Magang', ikon: '📥' },
    { to: '/admin/peserta', label: 'Data Peserta', ikon: '🧑‍💻' },
    { to: '/admin/mentor', label: 'Manajemen Mentor', ikon: '🧑‍🏫' },
    { to: '/admin/izin', label: 'Persetujuan Izin', ikon: '📝' },
    { to: '/admin/tracer', label: 'Tracer Magang', ikon: '📅' },
    { to: '/admin/kelompok', label: 'Kelompok Magang', ikon: '👥' },
    { to: '/admin/sertifikat', label: 'Sertifikat', ikon: '🎓' },
  ],
  intern: [
    { to: '/intern', label: 'Dashboard', ikon: '🏠', end: true },
    { to: '/intern/projek', label: 'Projek & Tugas', ikon: '🗂️' },
    { to: '/intern/presensi', label: 'Presensi', ikon: '🕐' },
    { to: '/intern/logbook', label: 'Logbook', ikon: '📖' },
    { to: '/intern/izin', label: 'Pengajuan Izin', ikon: '📝' },
    { to: '/intern/mentoring', label: 'Jadwal Mentoring', ikon: '📅' },
    { to: '/intern/sertifikat', label: 'Sertifikat', ikon: '🎓' },
  ],
  mentor: [
    { to: '/mentor', label: 'Dashboard', ikon: '🏠', end: true },
    { to: '/mentor/kelompok', label: 'Kelompok Binaan', ikon: '👥' },
    { to: '/mentor/penilaian', label: 'Rubrik Penilaian', ikon: '⭐' },
    { to: '/mentor/mentoring', label: 'Jadwal Mentoring', ikon: '📅' },
  ],
};

const PENGATURAN = {
  admin: [
    { to: '/admin/setting/akun', label: 'Info Akun', ikon: '👤' },
    { to: '/admin/setting/tampilan', label: 'Tampilan', ikon: '🌙' },
    { to: '/admin/setting/tentang', label: 'Tentang Sistem', ikon: 'ℹ️' },
  ],
  intern: [
    { to: '/intern/setting/akun', label: 'Info Akun', ikon: '👤' },
    { to: '/intern/setting/password', label: 'Ganti Password', ikon: '🔐' },
    { to: '/intern/setting/kontak', label: 'Kontak WhatsApp', ikon: '📱' },
    { to: '/intern/setting/tampilan', label: 'Tampilan', ikon: '🌙' },
    { to: '/intern/setting/tentang', label: 'Tentang Sistem', ikon: 'ℹ️' },
  ],
  mentor: [
    { to: '/mentor/setting/akun', label: 'Info Akun', ikon: '👤' },
    { to: '/mentor/setting/password', label: 'Ganti Password', ikon: '🔐' },
    { to: '/mentor/setting/kontak', label: 'Kontak WhatsApp', ikon: '📱' },
    { to: '/mentor/setting/tampilan', label: 'Tampilan', ikon: '🌙' },
    { to: '/mentor/setting/tentang', label: 'Tentang Sistem', ikon: 'ℹ️' },
  ],
};

const LABEL_PERAN = { admin: 'Administrator', mentor: 'Pembimbing', intern: 'Peserta Magang' };

// ===== ⭐ helper sapaan & tanggal (WIB) =====
function jamSapaan() {
  const jam = parseInt(
    new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', hour12: false })
      .format(new Date()), 10
  );
  if (jam < 12) return { teks: 'Selamat Pagi', ikon: '👋' };
  if (jam < 17) return { teks: 'Selamat Siang', ikon: '☀️' };
  if (jam < 20) return { teks: 'Selamat Sore', ikon: '🌇' };
  return { teks: 'Selamat Malam', ikon: '🌙' };
}

const tanggalWib = () =>
  new Intl.DateTimeFormat('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Jakarta',
  }).format(new Date());

export default function Layout() {
  const { profile, role, user, logout } = useAuth();
  const lokasi = useLocation();

  const namaPendek = () =>
    profile?.nama_lengkap?.split(' ').slice(0, 2).join(' ')
    ?? user?.email?.split('@')[0] ?? '';

  // ⭐ ACCORDION Pengaturan
  const [bukaSetting, setBukaSetting] = useState(
    () => window.location.pathname.includes('/setting/')
  );
  const sedangDiSetting = lokasi.pathname.includes('/setting/');
  useEffect(() => {
    if (lokasi.pathname.includes('/setting/')) setBukaSetting(true);
  }, [lokasi.pathname]);

  // ⭐ HAMBURGER
  const [menuBuka, setMenuBuka] = useState(false);
  useEffect(() => { setMenuBuka(false); }, [lokasi.pathname]);
  useEffect(() => {
    document.body.style.overflow = menuBuka ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuBuka]);

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      {/* ================= SIDEBAR ================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 max-w-[85vw] flex-col overflow-y-auto bg-slate-900 text-white transition-transform duration-300 lg:static lg:translate-x-0 lg:overflow-visible ${
          menuBuka ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* ===== Brand ===== */}
        <div className="flex items-center justify-between border-b border-slate-800 p-5">
          <div>
            <p className="text-lg font-bold tracking-wide">CREATIVEMU</p>
            <p className="text-[10px] font-semibold tracking-[0.25em] text-slate-400">
              {LABEL_PERAN[role] ?? role}
            </p>
          </div>
          <button onClick={() => setMenuBuka(false)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Tutup menu">
            ✕
          </button>
        </div>

        {/* ===== Menu utama ===== */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {(NAV[role] ?? []).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  isActive
                    ? 'bg-indigo-600 font-semibold text-white'
                    : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              <span className="text-base">{item.ikon}</span>
              {item.label}
            </NavLink>
          ))}

          {/* ===== ACCORDION Pengaturan — ⭐ ANIMASI SLIDE ===== */}
          <div className="pt-3">
            <button
              onClick={() => setBukaSetting(!bukaSetting)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition ${
                sedangDiSetting
                  ? 'bg-slate-800 font-semibold text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="text-base">⚙️</span>
                Pengaturan
              </span>
              <span className={`text-xs transition-transform duration-300 ${bukaSetting ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {/* ⭐ Sub-menu: meluncur turun saat dibuka, menyusut naik saat ditutup */}
            <div
              className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out ${
                bukaSetting ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="min-h-0">
                <div className="mt-1 space-y-0.5 pl-3">
                  {(PENGATURAN[role] ?? []).map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition ${
                          isActive
                            ? 'bg-slate-800 font-semibold text-white'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`
                      }
                    >
                      <span className="text-sm">{item.ikon}</span>
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* ===== Logout ===== */}
        <div className="border-t border-slate-800 p-3">
          <button
            onClick={() => logout()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
          >
            <span className="text-base">🚪</span>
            Logout
          </button>
        </div>
      </aside>

      {/* ===== BACKDROP ===== */}
      {menuBuka && (
        <div
          onClick={() => setMenuBuka(false)}
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* ================= AREA UTAMA ================= */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* ===== TOPBAR ===== */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setMenuBuka(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-xl text-slate-600 transition hover:bg-slate-100 lg:hidden"
              aria-label="Buka menu">☰</button>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-800 sm:text-base">
                <span className="anim-wiggle mr-1 inline-block">{jamSapaan().ikon}</span>
                {jamSapaan().teks}, <span className="gradient-text">{namaPendek()}</span>!
              </p>
              <p className="hidden truncate text-[11px] font-medium text-slate-400 sm:block">
                {LABEL_PERAN[role] ?? role} · {tanggalWib()}
              </p>
            </div>
          </div>
          <NotificationBell />
        </header>

        {/* ===== Konten ===== */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div key={lokasi.pathname} className="anim-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}