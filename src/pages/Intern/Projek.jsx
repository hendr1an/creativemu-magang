import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useIntern } from '../../hooks/useIntern';
import { buatUrlFile } from '../../lib/api';
import { fmtTanggal } from '../../lib/format';
import Modal from '../../components/Modal';
import { CountUp } from '../../components/Skeleton';

const BADGE_STATUS = {
  'Belum': 'bg-slate-200 text-slate-600',
  'Menunggu Review': 'bg-amber-100 text-amber-700',
  'Revisi': 'bg-red-100 text-red-600',
  'Selesai': 'bg-green-100 text-green-700',
};

const NILAI_WARNA = {
  A: 'bg-green-600', B: 'bg-teal-500', C: 'bg-amber-400',
  D: 'bg-orange-500', E: 'bg-red-500',
};

const STRIP_STATUS = {
  'Belum': 'bg-slate-300',
  'Menunggu Review': 'bg-amber-400',
  'Revisi': 'bg-red-400',
  'Selesai': 'bg-green-400',
};

const LABEL_STATUS = {
  'Belum': 'Belum dikerjakan',
  'Menunggu Review': 'Di Review',
  'Revisi': 'Perlu Revisi',
  'Selesai': 'Selesai',
};

export default function Projek() {
  const { user } = useAuth();
  const { intern, loading } = useIntern();
  const [items, setItems] = useState([]);
  const [toast, setToast] = useState(null);
  const [kumpul, setKumpul] = useState(null);
  const [file, setFile] = useState(null);
  const [catatan, setCatatan] = useState('');
  const [busy, setBusy] = useState(false);
  const [projekBuka, setProjekBuka] = useState(null);

  useEffect(() => {
    if (intern) muat();
  }, [intern]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  async function muat() {
    const { data } = await supabase
      .from('subtasks')
      .select('*, projects(id, judul_projek, deskripsi, deadline_projek)')
      .eq('intern_id', intern.id)
      .order('created_at');
    setItems(data ?? []);
  }

  const projekList = [];
  items.forEach((s) => {
    let p = projekList.find((x) => x.id === s.projects?.id);
    if (!p) {
      p = { ...s.projects, subtasks: [] };
      projekList.push(p);
    }
    p.subtasks.push(s);
  });

  async function kirim(e) {
    e.preventDefault();
    if (!kumpul) return;
    if (!file && !kumpul.file_bukti) {
      setToast({ tipe: 'err', teks: 'Lampirkan file/laporan hasil kerjamu dulu.' });
      return;
    }

    setBusy(true);
    try {
      let path = kumpul.file_bukti;
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          throw new Error('Ukuran file maksimal 5 MB.');
        }
        const ext = file.name.split('.').pop().toLowerCase();
        path = `${user.id}/subtasks/${kumpul.id}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('intern-files')
          .upload(path, file);
        if (upErr) throw new Error('Gagal mengunggah: ' + upErr.message);
      }
      const { error } = await supabase
        .from('subtasks')
        .update({
          status: 'Menunggu Review',
          file_bukti: path,
          catatan_pengumpulan: catatan.trim() || null,
          submitted_at: new Date().toISOString(),
        })
        .eq('id', kumpul.id);
      if (error) throw new Error(error.message);

      setKumpul(null);
      setFile(null);
      setCatatan('');
      setToast({ tipe: 'ok', teks: 'Subtugas dikumpulkan — menunggu review pembimbing.' });
      await muat();
    } catch (err) {
      setToast({ tipe: 'err', teks: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function bukaBukti(path) {
    try {
      window.open(await buatUrlFile(path), '_blank');
    } catch (e) {
      setToast({ tipe: 'err', teks: e.message });
    }
  }

  if (loading) {
    return (
      <div>
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="mt-6 skeleton h-36 rounded-2xl" />
        <div className="mt-4 skeleton h-36 rounded-2xl" />
      </div>
    );
  }

  const belumMulai = intern.tanggal_mulai > new Date().toISOString().slice(0, 10);

  if (belumMulai) {
    return (
      <div>
        <div className="anim-up">
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
            Projek &amp; Tugas
          </h1>
        </div>
        <div className="anim-up mt-6 flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="anim-float text-5xl">🔒</p>
          <p className="mt-4 text-lg font-bold text-slate-700">Tugas Belum Tersedia</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Masa magangmu dimulai pada <b>{fmtTanggal(intern.tanggal_mulai)}</b>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="anim-up">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
          Projek &amp; Tugas
        </h1>
      </div>

      {toast && (
        <p className={`anim-down mt-4 rounded-xl p-3 text-sm font-medium leading-relaxed ${
          toast.tipe === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {toast.teks}
        </p>
      )}

      {projekList.length === 0 ? (
        <div className="anim-up mt-6 flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="anim-float text-5xl">🗂️</p>
          <p className="mt-4 text-lg font-bold text-slate-700">Belum Ada Tugas</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Projek &amp; subtugas dari pembimbing akan muncul di sini.
          </p>
        </div>
      ) : (
        projekList.map((p, pi) => {
          const total = p.subtasks.length;
          const selesai = p.subtasks.filter((s) => s.status === 'Selesai').length;
          const persen = total ? Math.round((selesai * 100) / total) : 0;
          const telatProjek = p.deadline_projek && new Date(p.deadline_projek) < new Date() && persen < 100;
          const buka = projekBuka === p.id;

          return (
            <div key={p.id}
              className={`anim-up relative mt-5 overflow-hidden rounded-2xl border bg-white transition-all duration-300 ${
                buka ? 'border-indigo-200 shadow-lg' : 'border-slate-200 shadow-sm hover:shadow-md'}`}
              style={{ animationDelay: `${pi * 100}ms` }}>

              <button onClick={() => setProjekBuka(buka ? null : p.id)}
                className="w-full p-5 text-left transition hover:bg-slate-50/50 sm:p-6">

                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-bold tracking-tight text-slate-800">
                      {p.judul_projek}
                    </h2>
                    <p className="mt-1 text-[12px] font-medium text-slate-400">
                      {p.deadline_projek
                        ? `${telatProjek ? '⚠️ ' : '📅 '}${fmtTanggal(p.deadline_projek)}${telatProjek ? ' — terlambat' : ''}`
                        : 'Tanpa deadline'}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className={`text-2xl font-extrabold leading-none ${
                      persen === 100 ? 'text-green-600' : 'text-slate-800'}`}>
                      <CountUp value={persen} suffix="%" />
                    </p>
                    <p className="mt-0.5 text-[11px] font-bold text-slate-400">
                      {selesai}/{total} selesai
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={`anim-bar h-full rounded-full ${
                      persen === 100 ? 'bg-green-500' : 'bg-indigo-500'}`}
                      style={{ width: `${persen}%` }} />
                  </div>
                  {persen === 100 && (
                    <p className="anim-pop mt-2.5 inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-[10px] font-extrabold text-green-600">
                      ✓ PROJEK TUNTAS
                    </p>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {buka ? 'Tutup' : `${total} subtugas`}
                  </span>
                  <span className={`text-slate-400 transition-transform duration-300 ${buka ? 'rotate-180' : ''}`}>▼</span>
                </div>
              </button>

              {buka && (
                <div className="anim-down border-t border-slate-100">

                  {p.subtasks.map((s, si) => {
                    const telat = s.deadline && new Date(s.deadline) < new Date() && s.status !== 'Selesai';
                    const statusLabel = LABEL_STATUS[s.status] ?? s.status;

                    return (
                      <div key={s.id}
                        className={`anim-in flex flex-col gap-2 border-b border-slate-50 px-5 py-3.5 transition hover:bg-slate-50/50 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${
                          si === p.subtasks.length - 1 ? 'border-b-0' : ''}`}
                        style={{ animationDelay: `${si * 50}ms` }}>

                        <div className="flex min-w-0 items-center gap-3">
                          <span className={`h-8 w-1 shrink-0 rounded-full ${STRIP_STATUS[s.status] ?? 'bg-slate-300'}`} />

                          <div className="min-w-0">
                            <p className={`truncate text-sm font-bold ${
                              s.status === 'Selesai' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                              {s.judul}
                            </p>
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-400">
                              {s.deadline && (
                                <span className={telat ? 'font-bold text-red-500' : ''}>
                                  {fmtTanggal(s.deadline)}{telat ? ' — terlambat' : ''}
                                </span>
                              )}
                              {s.file_bukti && (
                                <button onClick={() => bukaBukti(s.file_bukti)}
                                  className="font-bold text-indigo-500 hover:underline">
                                  📎 file
                                </button>
                              )}
                            </p>

                            {s.status === 'Revisi' && s.catatan_revisi && (
                              <p className="mt-1 text-[11px] text-red-500">
                                🔁 {s.catatan_revisi}
                              </p>
                            )}
                            {s.catatan_pengumpulan && s.status !== 'Revisi' && (
                              <p className="mt-1 text-[11px] italic text-slate-400">
                                💬 {s.catatan_pengumpulan}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2.5">
                          {s.nilai && (
                            <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-black text-white ${NILAI_WARNA[s.nilai]}`}>
                              {s.nilai}
                            </span>
                          )}

                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${BADGE_STATUS[s.status]}`}>
                            {statusLabel}
                          </span>

                          {s.status === 'Belum' && (
                            <button onClick={() => {
                              setKumpul(s);
                              setFile(null);
                              setCatatan(s.catatan_pengumpulan ?? '');
                            }}
                              className="btn-press rounded-lg bg-indigo-600 px-3.5 py-1.5 text-[11px] font-bold text-white hover:bg-indigo-700">
                              Kumpulkan
                            </button>
                          )}
                          {s.status === 'Menunggu Review' && (
                            <button onClick={() => {
                              setKumpul(s);
                              setFile(null);
                              setCatatan(s.catatan_pengumpulan ?? '');
                            }}
                              className="btn-press rounded-lg border border-amber-300 bg-white px-3.5 py-1.5 text-[11px] font-bold text-amber-600 hover:bg-amber-50">
                              Perbarui
                            </button>
                          )}
                          {s.status === 'Revisi' && (
                            <button onClick={() => {
                              setKumpul(s);
                              setFile(null);
                              setCatatan(s.catatan_pengumpulan ?? '');
                            }}
                              className="btn-press rounded-lg bg-red-500 px-3.5 py-1.5 text-[11px] font-bold text-white hover:bg-red-600">
                              Perbaiki
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                </div>
              )}
            </div>
          );
        })
      )}

      <Modal open={!!kumpul} onClose={() => setKumpul(null)}
        title={kumpul && (kumpul.status !== 'Belum' && kumpul.file_bukti)
          ? '✏️ Perbarui Pengumpulan'
          : '📤 Kumpulkan Subtugas'}>
        {kumpul && (
          <form onSubmit={kirim}>
            <p className="text-sm leading-relaxed text-slate-600">
              Tugas: <b>{kumpul.judul}</b> — dikirim ke pembimbing untuk direview &amp; dinilai (A–E).
            </p>
            {kumpul.catatan_revisi && (
              <div className="mt-3 rounded-xl bg-red-50 p-3 text-[11px] font-medium leading-relaxed text-red-600">
                <b>🔁 Perbaiki sesuai catatan:</b> {kumpul.catatan_revisi}
              </div>
            )}
            <div className="mt-4">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                File / laporan {kumpul.file_bukti ? '(ganti jika perlu)' : '*'}
              </label>
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                accept=".pdf,image/*,.zip,.doc,.docx"
                className="mt-1.5 w-full text-sm text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-indigo-50 file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-indigo-600" />
              {kumpul.file_bukti && (
                <button type="button" onClick={() => bukaBukti(kumpul.file_bukti)}
                  className="mt-1.5 text-[11px] font-bold text-indigo-600 hover:underline">
                  📎 lihat file saat ini
                </button>
              )}
            </div>
            <div className="mt-3">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Catatan untuk pembimbing
              </label>
              <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={3}
                placeholder="Ceritakan apa yang sudah kamu kerjakan…"
                className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-indigo-500 focus:outline-none" />
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setKumpul(null)}
                className="btn-press rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Batal
              </button>
              <button type="submit" disabled={busy}
                className="btn-press rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50">
                {busy ? 'Mengirim…' : 'Kirim ke Pembimbing'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}