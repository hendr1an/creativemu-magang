import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { buatUrlFile } from '../../lib/api';
import { fmtTanggal } from '../../lib/format';

const BADGE = {
  Pending: 'bg-amber-400',
  Approved: 'bg-emerald-500',
  Rejected: 'bg-red-500',
};
const FILTERS = ['Pending', 'Approved', 'Rejected', 'Semua'];

export default function Izin() {
  const { user } = useAuth();
  const [daftar, setDaftar] = useState([]);
  const [pulang, setPulang] = useState([]);
  const [filter, setFilter] = useState('Pending');
  const [catatan, setCatatan] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [pesan, setPesan] = useState(null);

  useEffect(() => { muatIzin(); muatPulang(); }, [filter]);

  async function muatIzin() {
    let q = supabase.from('leave_requests')
      .select('*, interns(nama_lengkap, instansi)')
      .order('created_at', { ascending: false });
    if (filter !== 'Semua') q = q.eq('status_izin', filter);
    const { data } = await q;
    setDaftar(data ?? []);
  }

  // ⭐ FIX: pulang awal ikut terfilter — tidak menempel di Pending setelah diproses
  async function muatPulang() {
    let q = supabase.from('early_checkouts')
      .select('*, interns(nama_lengkap)')
      .order('created_at', { ascending: false });
    if (filter !== 'Semua') q = q.eq('status', filter);
    const { data } = await q;
    setPulang(data ?? []);
  }

  async function prosesIzin(row, status) {
    setBusyId(row.id); setPesan(null);
    const { error } = await supabase.from('leave_requests').update({
      status_izin: status,
      reviewed_by: user.id,
      catatan_reviewer: catatan[row.id]?.trim() || null,
    }).eq('id', row.id);
    if (error) setPesan({ tipe: 'err', teks: error.message });
    else {
      setPesan({ tipe: 'ok', teks: status === 'Approved'
        ? `✅ Izin ${row.interns?.nama_lengkap} disetujui — presensi Izin/Sakit tercatat otomatis.`
        : `❌ Izin ${row.interns?.nama_lengkap} ditolak.` });
      await muatIzin();
    }
    setBusyId(null);
  }

  async function prosesPulang(row, status) {
    setBusyId(row.id); setPesan(null);
    const { error } = await supabase.from('early_checkouts').update({
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', row.id);
    if (error) setPesan({ tipe: 'err', teks: error.message });
    else {
      setPesan({ tipe: 'ok', teks: status === 'Approved'
        ? `✅ Pulang awal ${row.interns?.nama_lengkap} disetujui — tombol check-out peserta terbuka.`
        : `❌ Pengajuan pulang awal ${row.interns?.nama_lengkap} ditolak.` });
      await muatPulang();
    }
    setBusyId(null);
  }

  async function lihatBukti(path) {
    try { window.open(await buatUrlFile(path), '_blank'); }
    catch (e) { setPesan({ tipe: 'err', teks: e.message }); }
  }

  return (
    <div>
      <div className="anim-up">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Persetujuan Izin</h1>
      </div>

      {pesan && (
        <p className={`anim-down mt-4 rounded-xl p-3 text-sm font-medium ${
          pesan.tipe === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {pesan.teks}
        </p>
      )}

      {/* filter */}
      <div className="anim-up mt-4 flex flex-wrap gap-2 [animation-delay:60ms]">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`btn-press rounded-full px-4 py-1.5 text-xs font-bold transition ${
              filter === f
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 hover:text-indigo-600'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* ===== izin / sakit ===== */}
      <h2 className="anim-up mt-6 text-base font-bold text-slate-800 [animation-delay:100ms]">📝 Izin / Sakit</h2>
      <div className="mt-3 space-y-3">
        {daftar.length === 0 ? (
          <div className="anim-up flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="anim-float text-4xl">📭</p>
            <p className="mt-3 text-sm font-semibold text-slate-400">Tidak ada data</p>
          </div>
        ) : daftar.map((d, i) => (
          <div key={d.id}
            className="anim-up card-hover relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
            style={{ animationDelay: `${i * 80}ms` }}>
            <div className={`absolute inset-y-0 left-0 w-1.5 ${BADGE[d.status_izin] ?? 'bg-slate-300'}`} />

            <div className="flex flex-wrap items-start justify-between gap-3 pl-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white">
                  {d.interns?.nama_lengkap?.split(' ').map((x) => x[0]).slice(0, 2).join('')}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-slate-800">
                      {d.jenis_izin === 'Sakit' ? '🤒' : '📝'} {d.jenis_izin} — {d.interns?.nama_lengkap}
                    </p>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold text-white ${BADGE[d.status_izin]}`}>
                      {d.status_izin.toUpperCase()}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                    {fmtTanggal(d.tanggal_mulai)}
                    {d.tanggal_selesai !== d.tanggal_mulai && ` s.d. ${fmtTanggal(d.tanggal_selesai)}`}
                    {d.interns?.instansi && ` · 🏫 ${d.interns.instansi}`}
                  </p>
                  <p className="mt-1.5 max-w-lg text-xs leading-relaxed text-slate-500">"{d.alasan}"</p>
                </div>
              </div>
              {d.bukti_url && (
                <button onClick={() => lihatBukti(d.bukti_url)}
                  className="btn-press shrink-0 text-xs font-bold text-indigo-600 hover:underline">📎 Lihat Bukti</button>
              )}
            </div>

            {d.status_izin === 'Pending' && (
              <div className="mt-4 flex flex-col gap-2 pl-3 sm:flex-row">
                <input
                  value={catatan[d.id] ?? ''}
                  onChange={(e) => setCatatan((c) => ({ ...c, [d.id]: e.target.value }))}
                  placeholder="Catatan untuk peserta (opsional)…"
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none" />
                <div className="flex gap-2">
                  <button onClick={() => prosesIzin(d, 'Approved')} disabled={busyId === d.id}
                    className="btn-press flex-1 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-500/30 hover:bg-emerald-600 disabled:opacity-50 sm:flex-none">
                    ✓ Setujui
                  </button>
                  <button onClick={() => prosesIzin(d, 'Rejected')} disabled={busyId === d.id}
                    className="btn-press flex-1 rounded-xl bg-red-50 px-5 py-2.5 text-xs font-bold text-red-600 ring-1 ring-red-200 hover:bg-red-100 disabled:opacity-50 sm:flex-none">
                    ✕ Tolak
                  </button>
                </div>
              </div>
            )}
            {d.status_izin !== 'Pending' && d.catatan_reviewer && (
              <p className="mt-2 ml-3 rounded-lg bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500">💬 {d.catatan_reviewer}</p>
            )}
          </div>
        ))}
      </div>

      {/* ===== pulang awal (⭐ mengikuti filter di atas) ===== */}
      <h2 className="anim-up mt-8 text-base font-bold text-slate-800 [animation-delay:200ms]">
        🏃 Pulang Awal (check-out &lt; 17:00)
        <span className="ml-2 text-xs font-medium text-slate-400">— mengikuti filter di atas</span>
      </h2>
      <div className="mt-3 space-y-2">
        {pulang.length === 0 ? (
          <div className="anim-up flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="anim-float text-4xl">🏃</p>
            <p className="mt-3 text-sm font-semibold text-slate-400">Tidak ada data</p>
          </div>
        ) : pulang.map((p, i) => (
          <div key={p.id}
            className={`anim-up card-hover flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm`}
            style={{ animationDelay: `${i * 70}ms` }}>
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 text-xs font-bold text-white">
                {p.interns?.nama_lengkap?.split(' ').map((x) => x[0]).slice(0, 2).join('')}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-800">{p.interns?.nama_lengkap}</p>
                <p className="text-[11px] text-slate-400">📅 {fmtTanggal(p.tanggal)} · "{p.alasan}"</p>
              </div>
            </div>
            {p.status === 'Pending' ? (
              <div className="flex shrink-0 gap-2">
                <button onClick={() => prosesPulang(p, 'Approved')} disabled={busyId === p.id}
                  className="btn-press rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-600 disabled:opacity-50">✓ Setujui</button>
                <button onClick={() => prosesPulang(p, 'Rejected')} disabled={busyId === p.id}
                  className="btn-press rounded-xl bg-red-50 px-4 py-2 text-xs font-bold text-red-600 ring-1 ring-red-200 hover:bg-red-100 disabled:opacity-50">✕ Tolak</button>
              </div>
            ) : (
              <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-extrabold text-white ${BADGE[p.status]}`}>
                {p.status.toUpperCase()}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}