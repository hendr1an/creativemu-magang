import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { approveApplication, buatUrlFile } from '../../lib/api';
import { fmtTanggal } from '../../lib/format';
import Modal from '../../components/Modal';

const PAGE_SIZE = 10;
const FILTERS = ['Pending', 'Approved', 'Rejected', 'Semua'];
const BADGE = {
  Pending: 'bg-amber-400',
  Approved: 'bg-emerald-500',
  Rejected: 'bg-red-500',
};

export default function Applicants() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('Pending');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  const [kredensial, setKredensial] = useState(null);
  const [tolak, setTolak] = useState(null);
  const [catatan, setCatatan] = useState('');

  useEffect(() => { setPage(1); muat(); }, [filter]);
  useEffect(() => { muat(); }, [page]);

  async function muat() {
    setLoading(true); setError(null);
    let q = supabase.from('applications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });
    if (filter !== 'Semua') q = q.eq('status_pendaftaran', filter);
    const from = (page - 1) * PAGE_SIZE;
    const { data: rows, count, error: err } = await q.range(from, from + PAGE_SIZE - 1);
    if (err) setError(err.message); else { setData(rows ?? []); setTotal(count ?? 0); }
    setLoading(false);
  }

  async function handleApprove(row) {
    setBusyId(row.id); setError(null);
    try {
      const hasil = await approveApplication({ applicationId: row.id, action: 'approve' });
      setKredensial({
        nama: row.nama_lengkap,
        email: hasil.kredensial?.email ?? row.email,
        password: hasil.kredensial?.password ?? '(dikirim via notifikasi)',
        peringatan: hasil.peringatan ?? null,
      });
      await muat();
    } catch (e) {
      setError(e.message);
    } finally { setBusyId(null); }
  }

  async function konfirmasiTolak() {
    if (!tolak) return;
    setBusyId(tolak.id); setError(null);
    try {
      await approveApplication({ applicationId: tolak.id, action: 'reject', catatan: catatan.trim() || null });
      setTolak(null); setCatatan('');
      await muat();
    } catch (e) { setError(e.message); }
    finally { setBusyId(null); }
  }

  async function lihatCv(path) {
    try { window.open(await buatUrlFile(path), '_blank'); }
    catch (e) { setError(e.message); }
  }

  function copyKredensial() {
    const teks = `Email: ${kredensial.email}\nPassword: ${kredensial.password}\nLogin: ${window.location.origin}/login`;
    navigator.clipboard?.writeText(teks);
  }

  return (
    <div>
      <div className="anim-up">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Pengajuan Magang</h1>
      </div>

      {/* filter chips */}
      <div className="anim-up mt-4 flex flex-wrap items-center gap-2 [animation-delay:60ms]">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`btn-press rounded-full px-4 py-1.5 text-xs font-bold transition ${
              filter === f
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 hover:text-indigo-600'}`}>
            {f}
          </button>
        ))}
        <span className="ml-auto hidden text-[11px] font-semibold text-slate-400 sm:block">
          {total} total
        </span>
      </div>

      {error && (
        <div className="anim-down mt-4 flex items-start justify-between rounded-xl bg-red-50 p-3 text-sm text-red-600">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* daftar pengajuan — kartu baris */}
      {loading ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="anim-up mt-4 flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="anim-float text-5xl">📭</p>
          <p className="mt-4 font-bold text-slate-600">Tidak Ada Pengajuan</p>
          <p className="mt-1 text-sm text-slate-400">Pendaftar baru akan muncul di sini</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {data.map((row, i) => (
            <div key={row.id}
              className="anim-up card-hover relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
              style={{ animationDelay: `${i * 80}ms` }}>

              {/* strip status kiri */}
              <div className={`absolute inset-y-0 left-0 w-1.5 ${BADGE[row.status_pendaftaran] ?? 'bg-slate-300'}`} />

              <div className="flex flex-col gap-3 pl-3 lg:flex-row lg:items-center lg:justify-between">
                {/* info utama */}
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white">
                    {row.nama_lengkap?.split(' ').map((x) => x[0]).slice(0, 2).join('')}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-bold text-slate-800">{row.nama_lengkap}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold text-white ${BADGE[row.status_pendaftaran]}`}>
                        {row.status_pendaftaran.toUpperCase()}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-slate-400">
                      {row.email} · {row.nomor_whatsapp} {row.instansi && `· 🏫 ${row.instansi}`}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-medium">
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-600">
                        📅 {fmtTanggal(row.tanggal_mulai)} · {row.durasi_magang} {row.satuan_durasi ?? 'bulan'}
                      </span>
                      {row.cv_url && (
                        <button onClick={() => lihatCv(row.cv_url)}
                          className="text-indigo-600 hover:underline">📄 CV</button>
                      )}
                      <span className="text-slate-300">{fmtTanggal(row.created_at)}</span>
                    </p>
                  </div>
                </div>

                {/* aksi */}
                <div className="flex shrink-0 items-center gap-2">
                  {row.status_pendaftaran === 'Pending' ? (
                    <>
                      <button disabled={busyId === row.id} onClick={() => handleApprove(row)}
                        className="btn-press flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-500/30 hover:bg-emerald-600 disabled:opacity-50 lg:flex-none">
                        {busyId === row.id
                          ? <span className="flex items-center gap-1.5">
                              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                              Memproses…
                            </span>
                          : '✓ Approve'}
                      </button>
                      <button disabled={busyId === row.id}
                        onClick={() => { setTolak(row); setCatatan(''); }}
                        className="btn-press flex-1 rounded-xl bg-red-50 px-4 py-2.5 text-xs font-bold text-red-600 ring-1 ring-red-200 transition hover:bg-red-100 disabled:opacity-50 lg:flex-none">
                        ✕ Reject
                      </button>
                    </>
                  ) : (
                    <span className="rounded-lg bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-400">
                      selesai diproses
                    </span>
                  )}
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

      {/* modal kredensial */}
      <Modal open={!!kredensial} onClose={() => setKredensial(null)} title="🎉 Peserta Disetujui">
        {kredensial && (
          <div>
            <p className="text-sm leading-relaxed text-slate-600">
              Akun untuk <b>{kredensial.nama}</b> dibuat otomatis dan notifikasi berisi kredensial
              telah masuk antrean WhatsApp/Email.
            </p>
            <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 font-mono text-sm">
              <p>📧 Email&nbsp;&nbsp;&nbsp;: <b className="break-all">{kredensial.email}</b></p>
              <p>🔑 Password: <b>{kredensial.password}</b></p>
            </div>
            {kredensial.peringatan && (
              <p className="mt-3 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-700">
                ⚠️ {kredensial.peringatan}
              </p>
            )}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button onClick={copyKredensial}
                className="btn-press rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                📋 Copy
              </button>
              <button onClick={() => setKredensial(null)}
                className="btn-press rounded-lg bg-indigo-600 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-700">
                Selesai
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* modal reject */}
      <Modal open={!!tolak} onClose={() => setTolak(null)} title="Tolak Pengajuan">
        {tolak && (
          <div>
            <p className="text-sm leading-relaxed text-slate-600">
              Menolak pengajuan <b>{tolak.nama_lengkap}</b>. Pesan penolakan akan dikirim ke peserta.
            </p>
            <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={3}
              placeholder="Catatan untuk peserta (opsional)…"
              className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-red-400 focus:outline-none" />
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button onClick={() => setTolak(null)}
                className="btn-press rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
              <button onClick={konfirmasiTolak} disabled={busyId === tolak.id}
                className="btn-press rounded-lg bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
                {busyId === tolak.id ? 'Memproses…' : 'Tolak Pengajuan'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}