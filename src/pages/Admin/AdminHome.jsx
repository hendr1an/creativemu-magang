import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { namaBulan, fmtTanggal } from '../../lib/format';
import { CountUp, SkeletonCard } from '../../components/Skeleton';
import Modal from '../../components/Modal';

const HARI_INI = new Date().toISOString().slice(0, 10);
const KUOTA_MAKS = 20;

const BADGE_PRESENSI = {
  Hadir: 'bg-emerald-500',
  Izin: 'bg-blue-500',
  Sakit: 'bg-amber-400',
  Alpha: 'bg-red-500',
  Belum: 'bg-slate-300',
};

const jamWib = (iso) => iso
  ? new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
  : '—';

function warnaKuota(persen) {
  if (persen >= 100) return { bar: 'bg-red-500', badge: 'PENUH', warna: 'text-red-600' };
  if (persen >= 85) return { bar: 'bg-orange-500', badge: 'HAMPIR PENUH', warna: 'text-orange-600' };
  if (persen >= 50) return { bar: 'bg-amber-400', badge: '', warna: 'text-amber-600' };
  return { bar: 'bg-green-500', badge: '', warna: 'text-green-600' };
}

export default function AdminHome() {
  const [kuota, setKuota] = useState([]);
  const [stat, setStat] = useState({ pending: 0, aktif: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [tgl, setTgl] = useState(HARI_INI);
  const [presensi, setPresensi] = useState(null);
  const [muatPres, setMuatPres] = useState(false);

  const [bulanBuka, setBulanBuka] = useState(null);
  const [pesertaBulan, setPesertaBulan] = useState([]);
  const [muatBulan, setMuatBulan] = useState(false);

  const bulanIni = new Date().toISOString().slice(0, 7);

  useEffect(() => { muat(); }, []);
  useEffect(() => { muatPresensi(tgl); }, [tgl]);

  async function muat() {
    setLoading(true); setError(null);
    const mulai = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
    const [{ data: k, error: errK },
           { count: pending },
           { count: aktif }] = await Promise.all([
      supabase.rpc('get_quota_usage', { p_mulai: mulai, p_jumlah_bulan: 12 }),
      supabase.from('applications').select('id', { count: 'exact', head: true })
        .eq('status_pendaftaran', 'Pending'),
      supabase.from('interns').select('id', { count: 'exact', head: true })
        .eq('status_magang', 'Active'),
    ]);
    if (errK) setError(errK.message); else setKuota(k ?? []);
    setStat({ pending: pending ?? 0, aktif: aktif ?? 0 });
    setLoading(false);
  }

  async function muatPresensi(tanggal) {
    setMuatPres(true);
    const [{ data: aktif }, { data: att }, { data: izin }] = await Promise.all([
      supabase.from('interns').select('id, nama_lengkap, email')
        .eq('status_magang', 'Active')
        .lte('tanggal_mulai', tanggal)
        .gt('tanggal_selesai', tanggal)
        .order('nama_lengkap'),
      supabase.from('attendance').select('intern_id, check_in, check_out, status_kehadiran, menit_terlambat')
        .eq('tanggal_presensi', tanggal),
      supabase.from('leave_requests').select('intern_id, jenis_izin, alasan')
        .eq('status_izin', 'Approved')
        .lte('tanggal_mulai', tanggal)
        .gte('tanggal_selesai', tanggal),
    ]);
    const attMap = new Map((att ?? []).map((r) => [r.intern_id, r]));
    const izinMap = new Map((izin ?? []).map((r) => [r.intern_id, r]));
    setPresensi((aktif ?? []).map((i) => ({
      ...i,
      att: attMap.get(i.id) ?? null,
      izin: izinMap.get(i.id) ?? null,
    })));
    setMuatPres(false);
  }

  async function bukaBulan(label) {
    const bulanIso = `${label}-01`;
    const bulanAkhir = new Date(
      new Date(bulanIso + 'T00:00:00Z').getUTCFullYear(),
      new Date(bulanIso + 'T00:00:00Z').getUTCMonth() + 1, 0
    ).toISOString().slice(0, 10);

    setBulanBuka(label);
    setMuatBulan(true);
    const { data } = await supabase.from('interns')
      .select('nama_lengkap, email, instansi, nomor_whatsapp, tanggal_mulai, tanggal_selesai, durasi_magang, satuan_durasi, status_magang, nilai_final, groups(nama_kelompok)')
      .neq('status_magang', 'Dropped')
      .lte('tanggal_mulai', bulanAkhir)
      .gt('tanggal_selesai', bulanIso)
      .order('tanggal_mulai');
    setPesertaBulan(data ?? []);
    setMuatBulan(false);
  }

  const kuotaSekarang = kuota.find((k) => k.bulan_label === bulanIni);

  return (
    <div>
      <div className="anim-up">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Dashboard</h1>
      </div>

      {error && <p className="anim-down mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      {/* ===== kartu ringkasan ===== */}
      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="anim-up card-hover rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <p className="text-2xl">📥</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Pengajuan Menunggu</p>
            <p className="mt-1 text-3xl font-extrabold text-slate-800"><CountUp value={stat.pending} /></p>
          </div>
          <div className="anim-up card-hover rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 [animation-delay:100ms]">
            <p className="text-2xl">🧑‍💻</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Peserta Aktif</p>
            <p className="mt-1 text-3xl font-extrabold text-slate-800"><CountUp value={stat.aktif} /></p>
          </div>
          <div className="anim-up card-hover rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 [animation-delay:200ms]">
            <p className="text-2xl">📊</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Kuota {namaBulan(bulanIni)}</p>
            <p className="mt-1 text-3xl font-extrabold text-slate-800">
              <CountUp value={kuotaSekarang?.kuota_terisi ?? 0} />
              <span className="text-base font-normal text-slate-400">/{KUOTA_MAKS}</span>
            </p>
          </div>
        </div>
      )}

      {/* ================= PRESENSI PESERTA — versi cantik ================= */}
      <div className="anim-up mt-8 [animation-delay:250ms]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-800">🕐 Presensi Peserta</h2>
          <input type="date" value={tgl} max={HARI_INI}
            onChange={(e) => setTgl(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm focus:border-indigo-500 focus:outline-none" />
        </div>

        {muatPres ? (
          <div className="mt-4 flex justify-center rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
            <span className="inline-block h-7 w-7 animate-spin rounded-full border-[3px] border-slate-200 border-t-indigo-600" />
          </div>
        ) : !presensi || presensi.length === 0 ? (
          <div className="mt-4 flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
            <p className="anim-float text-4xl">📭</p>
            <p className="mt-3 text-sm font-semibold text-slate-500">Tidak ada peserta aktif pada tanggal ini</p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {presensi.map((p, i) => {
              const status = p.att ? p.att.status_kehadiran : p.izin ? p.izin.jenis_izin : 'Belum';
              const sudahPresensi = !!p.att;
              const telat = p.att?.menit_terlambat;
              return (
                <div key={p.id}
                  className={`anim-up card-hover relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm ring-1 ${
                    status === 'Belum' ? 'ring-slate-100' : 'ring-transparent'}`}
                  style={{ animationDelay: `${i * 70}ms` }}>

                  {/* strip warna status di kiri */}
                  <div className={`absolute inset-y-0 left-0 w-1.5 ${BADGE_PRESENSI[status] ?? 'bg-slate-300'}`} />

                  <div className="flex items-start justify-between gap-3 pl-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
                        {p.nama_lengkap?.split(' ').map((x) => x[0]).slice(0, 2).join('')}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-800">{p.nama_lengkap}</p>
                        <p className="truncate text-[11px] text-slate-400">{p.email}</p>
                      </div>
                    </div>

                    {/* badge status */}
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold text-white ${BADGE_PRESENSI[status] ?? 'bg-slate-300'}`}>
                      {status === 'Belum' ? 'BELUM' : status.toUpperCase()}
                    </span>
                  </div>

                  {/* baris waktu */}
                  <div className="mt-3 flex items-center justify-between gap-2 pl-3">
                    {sudahPresensi ? (
                      <div className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-50 py-2">
                        <div className="text-center">
                          <p className="text-[9px] font-bold uppercase text-slate-400">Masuk</p>
                          <p className="text-sm font-extrabold text-slate-700">{jamWib(p.att.check_in)}</p>
                        </div>
                        <span className="text-slate-300">→</span>
                        <div className="text-center">
                          <p className="text-[9px] font-bold uppercase text-slate-400">Keluar</p>
                          <p className="text-sm font-extrabold text-slate-700">{jamWib(p.att.check_out)}</p>
                        </div>
                        {telat != null && (
                          <span className="ml-1 rounded-md bg-orange-100 px-1.5 py-0.5 text-[9px] font-extrabold text-orange-600">
                            ⚠ +{telat}m
                          </span>
                        )}
                      </div>
                    ) : p.izin ? (
                      <p className="flex-1 truncate rounded-xl bg-blue-50 px-3 py-2 text-center text-[11px] font-semibold text-blue-600">
                        📝 izin: "{p.izin.alasan}"
                      </p>
                    ) : (
                      <p className="flex-1 rounded-xl bg-slate-50 px-3 py-2 text-center text-[11px] font-semibold text-slate-400">
                        Belum check-in hari ini
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== Kuota 12 bulan ===== */}
      <h2 className="anim-up mt-8 text-base font-bold text-slate-800 [animation-delay:300ms]">
        📊 Slot 12 Bulan ke Depan
        <span className="text-xs font-normal text-slate-400"> — klik bulan untuk melihat pesertanya</span>
      </h2>
      {loading ? (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {kuota.map((k, i) => {
            const w = warnaKuota(Number(k.persen_terisi));
            const aktif = k.bulan_label === bulanIni;
            return (
              <button key={k.bulan_label} onClick={() => bukaBulan(k.bulan_label)}
                style={{ animationDelay: `${i * 60}ms` }}
                className={`anim-up card-hover rounded-xl border bg-white p-4 text-left shadow-sm hover:ring-2 hover:ring-indigo-300 ${
                  aktif ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">
                    {namaBulan(k.bulan_label)}{aktif && ' ⭐'}
                  </span>
                  {w.badge && (
                    <span className={`rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold ${w.warna}`}>
                      {w.badge}
                    </span>
                  )}
                </div>
                <p className={`mt-2 text-3xl font-extrabold ${w.warna}`}>
                  <CountUp value={k.kuota_terisi} />
                  <span className="text-base font-normal text-slate-400">/{KUOTA_MAKS}</span>
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded bg-slate-100">
                  <div className={`h-full ${w.bar} anim-bar`}
                    style={{ width: `${Math.min(Number(k.persen_terisi), 100)}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">sisa {k.kuota_tersisa} slot · ▼ lihat peserta</p>
              </button>
            );
          })}
        </div>
      )}

      {/* ===== Modal peserta per bulan ===== */}
      <Modal open={!!bulanBuka} onClose={() => setBulanBuka(null)}
        title={`📊 Peserta Magang — ${bulanBuka ? namaBulan(bulanBuka) : ''}`}>
        {muatBulan ? (
          <div className="flex justify-center py-8">
            <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500" />
          </div>
        ) : pesertaBulan.length === 0 ? (
          <p className="py-8 text-center text-slate-400">Belum ada peserta yang menempati bulan ini.</p>
        ) : (
          <div>
            <p className="mb-3 text-sm text-slate-500">
              <b>{pesertaBulan.length}</b> peserta menempati bulan ini:
            </p>
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {pesertaBulan.map((p, i) => (
                <div key={p.email} className="anim-pop rounded-xl border border-slate-100 bg-slate-50 p-3"
                  style={{ animationDelay: `${i * 70}ms` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{p.nama_lengkap}</p>
                      <p className="text-xs text-slate-500">{p.email} · {p.nomor_whatsapp ?? '—'}</p>
                      {p.instansi && <p className="text-xs text-slate-400">🏫 {p.instansi}</p>}
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      p.status_magang === 'Active' ? 'bg-green-100 text-green-700'
                      : p.status_magang === 'Completed' ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-500'}`}>
                      {p.status_magang}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    📅 {fmtTanggal(p.tanggal_mulai)} – {fmtTanggal(p.tanggal_selesai)} ({p.durasi_magang} {p.satuan_durasi ?? 'bulan'})
                    {p.groups?.nama_kelompok && ` · 👥 ${p.groups.nama_kelompok}`}
                    {p.status_magang === 'Completed' && p.nilai_final != null && ` · 🎓 nilai ${p.nilai_final}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}