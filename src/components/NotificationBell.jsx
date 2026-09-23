import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from '../context/AuthContext';

const waktuRelatif = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} mnt lalu`;
  const j = Math.floor(m / 60);
  if (j < 24) return `${j} jam lalu`;
  const h = Math.floor(j / 24);
  return h === 1 ? 'kemarin' : `${h} hari lalu`;
};

// ===== ⭐ ROUTING PRECISE: judul notifikasi → halaman relevan =====
function ruteUntuk(judul, role) {
  const j = (judul ?? '').toLowerCase();

  // ---------- INTERN ----------
  if (role === 'intern') {
    if (j.includes('tugas baru')) return '/intern/projek';
    if (j.includes('dinilai')) return '/intern/projek';
    if (j.includes('revisi')) return '/intern/projek';
    if (j.includes('deadline')) return '/intern/projek';
    if (j.includes('terlambat')) return '/intern/projek';
    if (j.includes('check-in')) return '/intern/presensi';
    if (j.includes('izin disetujui')) return '/intern/presensi';
    if (j.includes('izin ditolak')) return '/intern/izin';
    if (j.includes('pulang awal disetujui') || j.includes('pulang awal ditolak')) return '/intern/presensi';
    if (j.includes('jadwal mentoring')) return '/intern/mentoring';
    if (j.includes('lolos')) return '/intern';
    if (j.includes('penilaian akhir')) return '/intern/sertifikat';
  }

  // ---------- MENTOR ----------
  if (role === 'mentor') {
    if (j.includes('review')) return '/mentor/kelompok';
    if (j.includes('anggota baru')) return '/mentor/kelompok';
    if (j.includes('password diganti')) return '/mentor';
  }

  // ---------- ADMIN ----------
  if (role === 'admin') {
    if (j.includes('pengajuan magang baru')) return '/admin/pengajuan';
    if (j.includes('izin/sakit') || (j.includes('pengajuan izin'))) return '/admin/izin';
    if (j.includes('pulang awal')) return '/admin/izin';
    if (j.includes('peserta selesai')) return '/admin/sertifikat';
    if (j.includes('password diganti')) return '/admin/peserta';
    if (j.includes('whatsapp diperbarui')) return '/admin/peserta';
  }

  return null; // tidak ada rute spesifik → cukup tutup dropdown
}

// ===== ikon per jenis notifikasi =====
function ikonUntuk(judul) {
  const j = (judul ?? '').toLowerCase();
  if (j.includes('tugas baru')) return '📌';
  if (j.includes('dinilai')) return '✅';
  if (j.includes('revisi')) return '🔁';
  if (j.includes('deadline')) return '⏳';
  if (j.includes('terlambat')) return '⚠️';
  if (j.includes('check-in')) return '⏰';
  if (j.includes('izin')) return '📝';
  if (j.includes('pulang awal')) return '🏃';
  if (j.includes('mentoring')) return '📅';
  if (j.includes('review')) return '🔍';
  if (j.includes('lolos')) return '🎉';
  if (j.includes('penilaian akhir')) return '🏆';
  if (j.includes('password')) return '🔐';
  if (j.includes('whatsapp')) return '📱';
  if (j.includes('anggota baru')) return '👥';
  if (j.includes('pengajuan')) return '📥';
  if (j.includes('peserta selesai')) return '🎓';
  return '🔔';
}

export default function NotificationBell() {
  const { notifs, unread, tandaiBaca, tandaiSemuaBaca } = useNotifications();
  const { role } = useAuth();
  const [buka, setBuka] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const klikLuar = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setBuka(false);
    };
    document.addEventListener('mousedown', klikLuar);
    return () => document.removeEventListener('mousedown', klikLuar);
  }, []);

  function klikItem(n) {
    if (!n.read_at) tandaiBaca(n.id);
    const rute = ruteUntuk(n.judul, role);
    setBuka(false);
    if (rute) navigate(rute);
    // rute null → cukup tutup dropdown (notifikasi informasional)
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setBuka(!buka)}
        className={`relative flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-lg transition hover:bg-slate-200 ${unread > 0 ? 'anim-wiggle' : ''}`}
        title="Notifikasi">
        {unread > 0 ? '🔔' : '🔕'}
        {unread > 0 && (
          <span className="anim-pop absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white shadow">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {buka && (
        <div className="absolute right-0 z-50 mt-2 w-[22rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:w-96">
          {/* header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-bold text-slate-800">
              Notifikasi {unread > 0 && <span className="text-red-500">({unread} baru)</span>}
            </p>
            {unread > 0 && (
              <button onClick={tandaiSemuaBaca}
                className="text-[11px] font-semibold text-indigo-600 hover:underline">
                Tandai semua dibaca
              </button>
            )}
          </div>

          {/* daftar */}
          <div className="max-h-96 overflow-y-auto">
            {notifs.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">
                Belum ada notifikasi — semuanya tenang ✨
              </p>
            ) : notifs.map((n, i) => {
              const rute = ruteUntuk(n.judul, role);
              return (
                <button key={n.id} onClick={() => klikItem(n)}
                  className={`anim-in block w-full border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50 ${
                    !n.read_at ? 'bg-indigo-50/60' : ''} ${rute ? 'cursor-pointer' : 'cursor-default'}`}
                  style={{ animationDelay: `${i * 40}ms` }}>
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 shrink-0 text-lg">{ikonUntuk(n.judul)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${!n.read_at ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>
                          {n.judul}
                        </p>
                        {!n.read_at && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">{n.pesan}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="text-[10px] text-slate-400">{waktuRelatif(n.created_at)}</p>
                        {rute && (
                          <span className="text-[10px] font-bold text-indigo-400">→ lihat</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}