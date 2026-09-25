import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { kelolaAkun } from '../../lib/api';
import { fmtTanggal } from '../../lib/format';
import ConfirmModal from '../../components/ConfirmModal';
import Modal from '../../components/Modal';

const PAGE_SIZE = 10;
const STATUS = ['Semua', 'Active', 'Completed', 'Dropped'];
const BADGE = {
  Active: 'bg-emerald-500',
  Completed: 'bg-blue-500',
  Dropped: 'bg-red-500',
};
const ALASAN_NONAKTIF = [
  'Melanggar aturan presensi berulang',
  'Mengundurkan diri',
  'Magang dihentikan oleh sekolah/kampus',
  'Tidak aktif tanpa keterangan',
  'Alasan lain (tulis manual)',
];

export default function Peserta() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('Semua');
  const [bulan, setBulan] = useState('');
  const [cari, setCari] = useState('');
  const [cariFinal, setCariFinal] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pesan, setPesan] = useState(null);
  const [busyAkun, setBusyAkun] = useState(null);
  const [konfirmasi, setKonfirmasi] = useState(null);
  const [alasanModal, setAlasanModal] = useState(null);
  const [alasanText, setAlasanText] = useState('');
  const [alasanLain, setAlasanLain] = useState(false);

  useEffect(() => { setPage(1); muat(); }, [status, bulan, cariFinal]);
  useEffect(() => { muat(); }, [page]);

  async function muat() {
    setLoading(true); setError(null);
    let q = supabase.from('interns')
      .select('*', { count: 'exact' })
      .order('tanggal_mulai', { ascending: false });
    if (status !== 'Semua') q = q.eq('status_magang', status);
    if (bulan) q = q.gte('tanggal_mulai', `${bulan}-01`).lte('tanggal_mulai', `${bulan}-31`);
    const kata = cariFinal.trim().replace(/%/g, '');
    if (kata) q = q.or(`nama_lengkap.ilike.%${kata}%,email.ilike.%${kata}%`);
    const from = (page - 1) * PAGE_SIZE;
    const { data: rows, count, error: err } = await q.range(from, from + PAGE_SIZE - 1);
    if (err) setError(err.message); else { setData(rows ?? []); setTotal(count ?? 0); }
    setLoading(false);
  }

  function toggleAkun(row) {
    const aksi = row.status_magang === 'Dropped' ? 'aktifkan' : 'nonaktifkan';
    if (aksi === 'aktifkan') {
      setKonfirmasi({
        judul: `🟢 Aktifkan akun "${row.nama_lengkap}"?`,
        teks: 'Peserta akan bisa login kembali seperti biasa.',
        teksConfirm: 'Ya, Aktifkan',
        tipe: 'info',
        row, aksi,
      });
    } else {
      setAlasanModal({ row });
      setAlasanText('');
      setAlasanLain(false);
    }
  }

  async function eksekusiKonfirmasi() {
    if (!konfirmasi) return;
    const { row, aksi } = konfirmasi;
    setBusyAkun(row.user_id); setPesan(null);
    try {
      const hasil = await kelolaAkun(row.user_id, aksi);
      setPesan({ tipe: 'ok', teks: `✅ ${hasil.pesan}` });
      setKonfirmasi(null);
      await muat();
    } catch (e) {
      setPesan({ tipe: 'err', teks: e.message });
    } finally { setBusyAkun(null); }
  }

  async function eksekusiDenganAlasan() {
    if (!alasanModal) return;
    const { row } = alasanModal;
    if (!alasanText.trim() || alasanText === 'Alasan lain (tulis manual)') return;

    setBusyAkun(row.user_id); setPesan(null);
    try {
      const hasil = await kelolaAkun(row.user_id, 'nonaktifkan');

      const { data: sesi } = await supabase.auth.getSession();
      await supabase.from('account_suspensions').insert({
        intern_id: row.id,
        alasan: alasanText.trim(),
        suspended_by: sesi?.session?.user?.id,
      });

      setPesan({ tipe: 'ok', teks: `✅ ${hasil.pesan}` });
      setAlasanModal(null);
      setAlasanText('');
      setAlasanLain(false);
      await muat();
    } catch (e) {
      setPesan({ tipe: 'err', teks: e.message });
    } finally { setBusyAkun(null); }
  }

  return (
    <div>
      <div className="anim-up">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Data Peserta Magang</h1>
      </div>

      {error && <p className="anim-down mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      {pesan && (
        <p className={`anim-down mt-4 rounded-xl p-3 text-sm ${
          pesan.tipe === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {pesan.teks}
        </p>
      )}

      {/* filter */}
      <div className="anim-up mt-4 flex flex-wrap items-center gap-2 [animation-delay:60ms]">
        {STATUS.map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            className={`btn-press rounded-full px-4 py-1.5 text-xs font-bold transition ${
              status === s
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 hover:text-indigo-600'}`}>
            {s}
          </button>
        ))}
        <input type="month" value={bulan} onChange={(e) => setBulan(e.target.value)}
          title="Filter bulan mulai"
          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold" />
        <form onSubmit={(e) => { e.preventDefault(); setCariFinal(cari); setPage(1); }} className="flex gap-2">
          <input value={cari} onChange={(e) => setCari(e.target.value)}
            placeholder="Cari nama / email…"
            className="min-w-[140px] rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none" />
          <button type="submit"
            className="btn-press rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white">🔍</button>
        </form>
      </div>

      {/* daftar peserta */}
      {loading ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      ) : data.length === 0 ? (
        <div className="anim-up mt-4 flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="anim-float text-5xl">🔍</p>
          <p className="mt-4 font-bold text-slate-600">Tidak Ada Data</p>
          <p className="mt-1 text-sm text-slate-400">Coba ubah filter atau kata pencarian</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {data.map((r, i) => (
            <div key={r.id}
              className="anim-up card-hover relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
              style={{ animationDelay: `${i * 70}ms` }}>

              <div className={`absolute inset-y-0 left-0 w-1.5 ${BADGE[r.status_magang] ?? 'bg-slate-300'}`} />

              <div className="flex flex-col gap-3 pl-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white">
                    {r.nama_lengkap?.split(' ').map((x) => x[0]).slice(0, 2).join('')}
                  </span>
                  <div className="min-w-0">
                    <Link to={`/admin/peserta/${r.id}`} className="text-sm font-bold text-indigo-600 hover:underline">
                      {r.nama_lengkap} ↗
                    </Link>
                    <p className="mt-0.5 truncate text-[11px] text-slate-400">
                      {r.email} · {r.nomor_whatsapp} {r.instansi && `· 🏫 ${r.instansi}`}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] font-medium text-slate-500">
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5">
                        📅 {fmtTanggal(r.tanggal_mulai)} – {fmtTanggal(r.tanggal_selesai)} ({r.durasi_magang} {r.satuan_durasi ?? 'bulan'})
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold text-white ${BADGE[r.status_magang]}`}>
                        {r.status_magang.toUpperCase()}
                      </span>
                      <span className="text-slate-700">🎓 {r.nilai_final ?? '—'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button onClick={() => toggleAkun(r)}
                    disabled={busyAkun === r.user_id || !r.user_id}
                    className={`btn-press rounded-xl px-4 py-2.5 text-xs font-bold shadow disabled:opacity-50 ${
                      r.status_magang === 'Dropped'
                        ? 'bg-emerald-500 text-white shadow-emerald-500/30 hover:bg-emerald-600'
                        : 'bg-red-50 text-red-600 ring-1 ring-red-200 hover:bg-red-100'}`}>
                    {busyAkun === r.user_id ? '⏳'
                      : r.status_magang === 'Dropped' ? '🟢 Aktifkan' : '🔴 Nonaktifkan'}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* pagination */}
          <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 text-sm text-slate-600 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <span>Menampilkan <b>{total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}</b> dari <b>{total}</b> data</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(page - 1)} disabled={page <= 1}
                className="btn-press rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40">
                ← Sebelumnya
              </button>
              <span className="text-xs">Hal. <b>{page}</b> / {Math.max(Math.ceil(total / PAGE_SIZE), 1)}</span>
              <button onClick={() => setPage(page + 1)} disabled={page >= Math.ceil(total / PAGE_SIZE)}
                className="btn-press rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40">
                Berikutnya →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal konfirmasi (aktifkan) */}
      <ConfirmModal
        open={!!konfirmasi}
        onClose={() => setKonfirmasi(null)}
        onConfirm={eksekusiKonfirmasi}
        busy={busyAkun != null}
        judul={konfirmasi?.judul}
        teks={konfirmasi?.teks}
        teksConfirm={konfirmasi?.teksConfirm}
        tipe={konfirmasi?.tipe}
      />

      {/* ⭐ #9: Modal alasan — dropdown + manual */}
      <Modal open={!!alasanModal} onClose={() => { setAlasanModal(null); setAlasanLain(false); }}
        title={`🔴 Nonaktifkan "${alasanModal?.row?.nama_lengkap ?? ''}"`}>
        {alasanModal && (
          <form onSubmit={(e) => { e.preventDefault(); eksekusiDenganAlasan(); }}>
            <p className="text-sm leading-relaxed text-slate-600">
              Pilih alasan penonaktifan — akan tersimpan untuk rekap statistik administrasi.
            </p>

            <div className="mt-3 space-y-2">
              {ALASAN_NONAKTIF.map((a) => (
                <button key={a} type="button"
                  onClick={() => {
                    setAlasanText(a);
                    setAlasanLain(a.includes('lain'));
                  }}
                  className={`w-full rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition ${
                    alasanText === a
                      ? 'border-red-400 bg-red-50 text-red-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-red-200'}`}>
                  {alasanText === a ? '✓ ' : ''}{a}
                </button>
              ))}
            </div>

            {alasanLain && (
              <input
                type="text"
                value={alasanText === 'Alasan lain (tulis manual)' ? '' : alasanText}
                onChange={(e) => setAlasanText(e.target.value)}
                placeholder="Tulis alasan di sini…"
                className="anim-down mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-red-400 focus:outline-none"
              />
            )}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => { setAlasanModal(null); setAlasanLain(false); }}
                className="btn-press rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Batal
              </button>
              <button type="submit" disabled={busyAkun || !alasanText.trim() || alasanText === 'Alasan lain (tulis manual)'}
                className="btn-press rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
                {busyAkun ? 'Memproses...' : 'Ya, Nonaktifkan'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}