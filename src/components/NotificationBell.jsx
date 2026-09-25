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

function ruteUntuk(judul, role) {
  const j = (judul ?? '').toLowerCase();
  if (role === 'intern') {
    if (j.includes('tugas baru') || j.includes('dinilai') || j.includes('revisi') || j.includes('deadline') || j.includes('terlambat')) return '/intern/projek';
    if (j.includes('check-in')) return '/intern/presensi';
    if (j.includes('izin disetujui')) return '/intern/presensi';
    if (j.includes('izin ditolak')) return '/intern/izin';
    if (j.includes('pulang awal')) return '/intern/presensi';
    if (j.includes('mentoring')) return '/intern/mentoring';
    if (j.includes('lolos')) return '/intern';
    if (j.includes('penilaian akhir')) return '/intern/sertifikat';
  }
  if (role === 'mentor') {
    if (j.includes('review')) return '/mentor/kelompok?panel=review';
    if (j.includes('anggota baru')) return '/mentor/kelompok';
  }
  if (role === 'admin') {
    if (j.includes('pengajuan magang baru')) return '/admin/pengajuan';
    if (j.includes('izin') || j.includes('pulang awal')) return '/admin/izin';
    if (j.includes('peserta selesai')) return '/admin/sertifikat';
    if (j.includes('password diganti') || j.includes('whatsapp')) return '/admin/peserta';
  }
  return null;
}

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
  const { notifs, unread, tandaiBaca, tandaiSemuaBaca, hapus, hapusSemuaDibaca } = useNotifications();
  const { role } = useAuth();
  const [buka, setBuka] = useState(false);
  const [tab, setTab] = useState('baru'); // 'baru' | 'dibaca'
  const [hapusId, setHapusId] = useState(null); // animasi keluar
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
  }

  function konfirmasiHapus(id) {
    setHapusId(id);
    setTimeout(() => {
      hapus(id);
      setHapusId(null);
    }, 300);
  }

  const belumDibaca = notifs.filter((n) => !n.read_at);
  const sudahDibaca = notifs.filter((n) => n.read_at);

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
        <div className="anim-down absolute right-0 z-50 mt-2 w-[22rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:w-96">

          {/* header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-bold text-slate-800">
              Notifikasi {unread > 0 && <span className="text-red-500">({unread} baru)</span>}
            </p>
            {unread > 0 && (
              <button onClick={tandaiSemuaBaca}
                className="text-[11px] font-semibold text-indigo-600 hover:underline">
                Tandai dibaca
              </button>
            )}
          </div>

          {/* tab baru/dibaca */}
          <div className="flex border-b border-slate-100">
            <button onClick={() => setTab('baru')}
              className={`flex-1 py-2.5 text-xs font-bold transition ${
                tab === 'baru'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-slate-400 hover:text-slate-600'}`}>
              Belum Dibaca ({belumDibaca.length})
            </button>
            <button onClick={() => setTab('dibaca')}
              className={`flex-1 py-2.5 text-xs font-bold transition ${
                tab === 'dibaca'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-slate-400 hover:text-slate-600'}`}>
              Dibaca ({sudahDibaca.length})
            </button>
          </div>

          {/* daftar */}
          <div className="max-h-80 overflow-y-auto">
            {(tab === 'baru' ? belumDibaca : sudahDibaca).length === 0 ? (
              <div className="flex flex-col items-center py-10">
                <p className="text-3xl opacity-30">{tab === 'baru' ? '🔔' : '📭'}</p>
                <p className="mt-2 text-xs text-slate-400">
                  {tab === 'baru' ? 'Tidak ada notifikasi baru' : 'Belum ada yang dibaca'}
                </p>
              </div>
            ) : (
              (tab === 'baru' ? belumDibaca : sudahDibaca).map((n) => {
                const rute = ruteUntuk(n.judul, role);
                return (
                  <div key={n.id}
                    className={`group relative border-b border-slate-50 transition-all duration-300 ${
                      hapusId === n.id
                        ? 'translate-x-8 opacity-0'  // ⭐ animasi slide-out saat hapus
                        : 'translate-x-0 opacity-100'}`}
                    style={{ transitionProperty: 'transform, opacity' }}>

                    <button onClick={() => klikItem(n)}
                      className={`flex w-full items-start gap-2.5 px-4 py-3 text-left transition hover:bg-slate-50 ${
                        !n.read_at ? 'bg-indigo-50/40' : ''}`}>
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
                          {rute && <span className="text-[10px] font-bold text-indigo-400">→ lihat</span>}
                        </div>
                      </div>
                    </button>

                    {/* tombol hapus — muncul saat hover */}
                    <button
                      onClick={(e) => { e.stopPropagation(); konfirmasiHapus(n.id); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-red-50 p-1.5 text-red-400 opacity-0 transition-all duration-200 hover:bg-red-100 hover:text-red-600 group-hover:opacity-100"
                      title="Hapus notifikasi">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* footer — hapus semua dibaca */}
          {tab === 'dibaca' && sudahDibaca.length > 0 && (
            <button onClick={hapusSemuaDibaca}
              className="w-full border-t border-slate-100 py-2.5 text-center text-[11px] font-semibold text-slate-400 transition hover:bg-red-50 hover:text-red-500">
              Hapus semua notifikasi yang sudah dibaca
            </button>
          )}

        </div>
      )}
    </div>
  );
}