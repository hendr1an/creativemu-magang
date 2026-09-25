import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useIntern } from '../../hooks/useIntern';
import { buatUrlFile } from '../../lib/api';
import { fmtTanggal } from '../../lib/format';

const BADGE = {
  Pending: 'bg-amber-400',
  Approved: 'bg-emerald-500',
  Rejected: 'bg-red-500',
};

const JENIS = [
  {
    key: 'Izin',
    ikon: '📝',
    judul: 'Izin',
    desc: 'Tidak masuk kerja — digantikan presensi Izin (tidak kurangi nilai)',
    warna: 'indigo',
  },
  {
    key: 'Sakit',
    ikon: '🤒',
    judul: 'Sakit',
    desc: 'Tidak masuk karena sakit — wajib lampirkan surat dokter',
    warna: 'amber',
  },
  {
    key: 'WFH',
    ikon: '🏠',
    judul: 'WFH',
    desc: 'Kerja dari rumah — presensi dari mana saja (GPS nonaktif)',
    warna: 'green',
  },
  {
    key: 'Terlambat',
    ikon: '⏰',
    judul: 'Izin Telat',
    desc: 'Datang terlambat — tanpa penalti keterlambatan (tetap dari kantor)',
    warna: 'orange',
  },
];

export default function Izin() {
  const { user } = useAuth();
  const { intern, loading } = useIntern();
  const [form, setForm] = useState({ jenis_izin: 'Izin', tanggal_mulai: '', tanggal_selesai: '', alasan: '' });
  const [bukti, setBukti] = useState(null);
  const [daftar, setDaftar] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [sukses, setSukses] = useState(null);

  useEffect(() => { if (intern) muat(); }, [intern]);

  async function muat() {
    const { data } = await supabase.from('leave_requests').select('*')
      .eq('intern_id', intern.id).order('created_at', { ascending: false });
    setDaftar(data ?? []);
  }

  async function ajukan(e) {
    e.preventDefault();
    setError(null); setSukses(null);
    if (!form.tanggal_mulai || !form.tanggal_selesai)
      return setError('Isi tanggal mulai dan selesai.');
    if (form.tanggal_selesai < form.tanggal_mulai)
      return setError('Tanggal selesai tidak boleh sebelum tanggal mulai.');
    if (!form.alasan.trim())
      return setError('Tuliskan alasan pengajuan.');

    setBusy(true);
    try {
      let path = null;
      if (bukti) {
        if (bukti.size > 5 * 1024 * 1024) throw new Error('Ukuran file maksimal 5 MB.');
        const ext = bukti.name.split('.').pop().toLowerCase();
        path = `${user.id}/leaves/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('intern-files').upload(path, bukti);
        if (upErr) throw new Error('Gagal mengunggah: ' + upErr.message);
      }
      const { error } = await supabase.from('leave_requests').insert({
        intern_id: intern.id,
        jenis_izin: form.jenis_izin,
        tanggal_mulai: form.tanggal_mulai,
        tanggal_selesai: form.tanggal_selesai,
        alasan: form.alasan.trim(),
        bukti_url: path,
      });
      if (error) throw new Error(error.message);
      setSukses(`Pengajuan ${form.jenis_izin} terkirim — menunggu persetujuan admin.`);
      setForm({ jenis_izin: 'Izin', tanggal_mulai: '', tanggal_selesai: '', alasan: '' });
      setBukti(null);
      muat();
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  }

  async function lihatBukti(path) {
    try { window.open(await buatUrlFile(path), '_blank'); }
    catch (e) { setError(e.message); }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <span className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-indigo-600" />
      <p className="text-sm text-slate-400">Memuat data...</p>
    </div>
  );

  const belumMulai = intern.tanggal_mulai > new Date().toISOString().slice(0, 10);
  if (belumMulai) {
    return (
      <div>
        <div className="anim-up">
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Pengajuan Izin</h1>
        </div>
        <div className="anim-up mt-6 flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="anim-float text-5xl">🔒</p>
          <p className="mt-4 text-lg font-bold text-slate-700">Pengajuan Izin Belum Tersedia</p>
          <p className="mt-2 text-sm text-slate-500">
            Terbuka saat masa magang dimulai ({fmtTanggal(intern.tanggal_mulai)}).
          </p>
        </div>
      </div>
    );
  }

  const pilihan = JENIS.find((j) => j.key === form.jenis_izin);

  return (
    <div>
      <div className="anim-up">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Pengajuan Izin</h1>
      </div>

      <form onSubmit={ajukan}
        className="anim-up mt-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm [animation-delay:80ms]">

        {(error || sukses) && (
          <p className={`anim-down mb-4 rounded-xl p-3 text-sm font-medium leading-relaxed ${
            error ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
            {error ?? sukses}
          </p>
        )}

        {/* ===== PILIH JENIS — 4 opsi dengan deskripsi ===== */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Jenis Pengajuan</label>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {JENIS.map((j) => (
              <button key={j.key} type="button"
                onClick={() => setForm((f) => ({ ...f, jenis_izin: j.key }))}
                className={`btn-press rounded-xl border-2 p-3 text-left transition ${
                  form.jenis_izin === j.key
                    ? j.warna === 'green'
                      ? 'border-green-500 bg-green-50'
                      : j.warna === 'orange'
                        ? 'border-orange-500 bg-orange-50'
                        : j.warna === 'amber'
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-indigo-600 bg-indigo-50'
                    : 'border-slate-200 hover:border-slate-300'}`}>
                <p className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
                  <span className="text-base">{j.ikon}</span> {j.judul}
                </p>
                <p className="mt-1 text-[11px] leading-snug text-slate-400">{j.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tanggal Mulai *</label>
            <input type="date" required value={form.tanggal_mulai}
              onChange={(e) => setForm((f) => ({ ...f, tanggal_mulai: e.target.value }))}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold focus:border-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tanggal Selesai *</label>
            <input type="date" required value={form.tanggal_selesai}
              onChange={(e) => setForm((f) => ({ ...f, tanggal_selesai: e.target.value }))}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold focus:border-indigo-500 focus:outline-none" />
          </div>
        </div>

        <div className="mt-3">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Alasan *</label>
          <textarea rows={3} required value={form.alasan}
            onChange={(e) => setForm((f) => ({ ...f, alasan: e.target.value }))}
            placeholder={
              form.jenis_izin === 'WFH'
                ? 'Contoh: Menyusun laporan dari rumah karena ada keperluan keluarga...'
                : form.jenis_izin === 'Terlambat'
                  ? 'Contoh: Kemacetan di jalan raya / Janji temu dokter pagi...'
                  : 'Contoh: menghadiri acara keluarga / kontrol dokter...'
            }
            className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-indigo-500 focus:outline-none" />
        </div>

        {(form.jenis_izin === 'Izin' || form.jenis_izin === 'Sakit') && (
          <div className="mt-3">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Bukti — foto/surat {form.jenis_izin === 'Sakit' ? '(surat dokter disarankan)' : '(opsional)'}
            </label>
            <input type="file" accept="image/*,.pdf" onChange={(e) => setBukti(e.target.files?.[0] ?? null)}
              className="mt-1.5 w-full text-sm text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-indigo-50 file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-indigo-600" />
          </div>
        )}

        <button type="submit" disabled={busy}
          className="btn-press mt-4 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50">
          {busy ? 'Mengirim…' : `Ajukan ${pilihan.judul}`}
        </button>

        <div className="mt-3 rounded-xl bg-slate-50 p-3">
          <p className="text-[11px] leading-relaxed text-slate-400">
            {form.jenis_izin === 'WFH'
              ? '🏠 WFH: Setelah disetujui admin, kamu bisa presensi check-in dari mana saja (GPS tidak diperlukan) pada tanggal yang diajukan.'
              : form.jenis_izin === 'Terlambat'
                ? '⏰ Izin Telat: Setelah disetujui admin, kamu bisa check-in kapan saja tanpa terhitung terlambat. Tetap presensi dari lokasi kantor.'
                : '✨ Izin/Sakit yang disetujui admin tidak mengurangi nilai kedisiplinan.'}
          </p>
        </div>
      </form>

      {/* ===== Riwayat ===== */}
      <h2 className="anim-up mt-8 text-base font-bold text-slate-800 [animation-delay:160ms]">
        Riwayat Pengajuan ({daftar.length})
      </h2>

      <div className="mt-3 space-y-2.5">
        {daftar.length === 0 ? (
          <div className="anim-up flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="anim-float text-5xl">📭</p>
            <p className="mt-4 font-bold text-slate-600">Belum Ada Pengajuan</p>
            <p className="mt-1 text-sm text-slate-400">Pengajuan izinmu akan tercatat di sini</p>
          </div>
        ) : daftar.map((d, i) => (
          <div key={d.id}
            className={`anim-up card-hover relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm`}
            style={{ animationDelay: `${200 + i * 70}ms` }}>
            <div className={`absolute inset-y-0 left-0 w-1.5 ${BADGE[d.status_izin]}`} />

            <div className="flex flex-wrap items-center justify-between gap-2 pl-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800">
                  {d.jenis_izin === 'Sakit' ? '🤒' : d.jenis_izin === 'WFH' ? '🏠' : d.jenis_izin === 'Terlambat' ? '⏰' : '📝'} {d.jenis_izin} — {fmtTanggal(d.tanggal_mulai)}
                  {d.tanggal_selesai !== d.tanggal_mulai && ` s.d. ${fmtTanggal(d.tanggal_selesai)}`}
                </p>
                <p className="mt-0.5 text-xs italic text-slate-500">"{d.alasan}"</p>
              </div>
              <div className="flex items-center gap-2">
                {d.bukti_url && (
                  <button onClick={() => lihatBukti(d.bukti_url)}
                    className="text-sm font-bold text-indigo-600 hover:underline">📎 bukti</button>
                )}
                <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold text-white ${BADGE[d.status_izin]}`}>
                  {d.status_izin.toUpperCase()}
                </span>
              </div>
            </div>

            {d.status_izin !== 'Pending' && d.catatan_reviewer && (
              <p className="mt-2 ml-3 rounded-lg bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500">💬 {d.catatan_reviewer}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}