import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useIntern } from '../../hooks/useIntern';
import { fmtTanggal } from '../../lib/format';
import ConfirmModal from '../../components/ConfirmModal';

const HARI_INI = new Date().toISOString().slice(0, 10);

export default function Logbook() {
  const { intern, loading } = useIntern();
  const [form, setForm] = useState({ tanggal: HARI_INI, judul: '', isi: '' });
  const [entri, setEntri] = useState([]);
  const [editId, setEditId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pesan, setPesan] = useState(null);
  const [hapusTarget, setHapusTarget] = useState(null);

  useEffect(() => { if (intern) muat(); }, [intern]);

  async function muat() {
    const { data } = await supabase.from('logbook').select('*')
      .eq('intern_id', intern.id).order('tanggal', { ascending: false });
    setEntri(data ?? []);
  }

  async function simpan(e) {
    e.preventDefault();
    setPesan(null);
    if (!form.judul.trim() || !form.isi.trim())
      return setPesan({ tipe: 'err', teks: 'Judul dan isi catatan wajib diisi.' });

    setBusy(true);
    try {
      if (editId) {
        const { error } = await supabase.from('logbook').update({
          judul: form.judul.trim(), isi: form.isi.trim(),
        }).eq('id', editId);
        if (error) throw new Error(error.message);
        setPesan({ tipe: 'ok', teks: '✅ Catatan diperbarui.' });
      } else {
        const { error } = await supabase.from('logbook').insert({
          intern_id: intern.id,
          tanggal: form.tanggal,
          judul: form.judul.trim(),
          isi: form.isi.trim(),
        });
        if (error) {
          if (error.code === '23505')
            throw new Error('Sudah ada catatan untuk tanggal ini — edit yang sudah ada.');
          throw new Error(error.message);
        }
        setPesan({ tipe: 'ok', teks: '✅ Catatan tersimpan.' });
      }
      setForm({ tanggal: HARI_INI, judul: '', isi: '' });
      setEditId(null);
      await muat();
    } catch (err) {
      setPesan({ tipe: 'err', teks: err.message });
    } finally { setBusy(false); }
  }

  function mulaiEdit(r) {
    setEditId(r.id);
    setForm({ tanggal: r.tanggal, judul: r.judul, isi: r.isi });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function eksekusiHapus() {
    if (!hapusTarget) return;
    setBusy(true);
    await supabase.from('logbook').delete().eq('id', hapusTarget.id);
    setHapusTarget(null);
    await muat();
    setBusy(false);
  }

  if (loading) return (
    <div>
      <div className="skeleton h-8 w-36 rounded-xl" />
      <div className="mt-6 skeleton h-64 rounded-2xl" />
      <div className="mt-4 skeleton h-32 rounded-2xl" />
    </div>
  );

  const belumMulai = intern.tanggal_mulai > HARI_INI;
  if (belumMulai) {
    return (
      <div>
        <div className="anim-up">
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Logbook</h1>
        </div>
        <div className="anim-up mt-6 flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="anim-float text-5xl">🔒</p>
          <p className="mt-4 text-lg font-bold text-slate-700">Logbook Belum Tersedia</p>
          <p className="mt-2 text-sm text-slate-500">
            Terbuka saat masa magang dimulai ({fmtTanggal(intern.tanggal_mulai)}).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="anim-up">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Logbook</h1>
      </div>

      {pesan && (
        <p className={`anim-down mt-4 rounded-xl p-3 text-sm font-medium leading-relaxed ${
          pesan.tipe === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {pesan.teks}
        </p>
      )}

      {/* ===== form ===== */}
      <form onSubmit={simpan}
        className="anim-up mt-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm [animation-delay:80ms]">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          {editId ? `✏️ Edit Catatan — ${fmtTanggal(form.tanggal)}` : '➕ Catatan Hari Ini'}
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tanggal</label>
            <input type="date" required value={form.tanggal}
              disabled={!!editId}
              onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold focus:border-indigo-500 focus:outline-none disabled:bg-slate-50" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Judul *</label>
            <input required placeholder="mis. Riset kompetitor untuk landing page"
              value={form.judul}
              onChange={(e) => setForm((f) => ({ ...f, judul: e.target.value }))}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium focus:border-indigo-500 focus:outline-none" />
          </div>
        </div>
        <div className="mt-3">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Aktivitas / refleksi *</label>
          <textarea rows={4} required value={form.isi}
            placeholder="Apa yang kamu kerjakan, pelajari, atau temukan hari ini?"
            onChange={(e) => setForm((f) => ({ ...f, isi: e.target.value }))}
            className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-indigo-500 focus:outline-none" />
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button type="submit" disabled={busy}
            className="btn-press flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 sm:flex-none sm:px-8">
            {busy ? 'Menyimpan…' : editId ? 'Perbarui Catatan' : 'Simpan Catatan'}
          </button>
          {editId && (
            <button type="button" onClick={() => { setEditId(null); setForm({ tanggal: HARI_INI, judul: '', isi: '' }); }}
              className="btn-press rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Batal Edit
            </button>
          )}
        </div>
      </form>

      {/* ===== riwayat ===== */}
      <h2 className="anim-up mt-8 text-base font-bold text-slate-800 [animation-delay:160ms]">
        📖 Riwayat Catatan ({entri.length})
      </h2>

      <div className="mt-3 space-y-3">
        {entri.length === 0 ? (
          <div className="anim-up flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="anim-float text-5xl">📖</p>
            <p className="mt-4 font-bold text-slate-600">Belum Ada Catatan</p>
            <p className="mt-1 text-sm text-slate-400">Mulai tulis aktivitas hari ini! ✍️</p>
          </div>
        ) : entri.map((r, i) => (
          <div key={r.id}
            className="anim-up card-hover relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
            style={{ animationDelay: `${200 + i * 70}ms` }}>
            <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-500" />

            <div className="flex flex-wrap items-start justify-between gap-2 pl-3">
              <div className="min-w-0">
                <p className="font-bold text-slate-800">{r.judul}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-400">📅 {fmtTanggal(r.tanggal)}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button onClick={() => mulaiEdit(r)}
                  className="btn-press rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-200">✏️ Edit</button>
                <button onClick={() => setHapusTarget(r)}
                  className="btn-press rounded-lg bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-600 ring-1 ring-red-200 hover:bg-red-100">🗑️</button>
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap pl-3 text-sm leading-relaxed text-slate-600">{r.isi}</p>
          </div>
        ))}
      </div>

      {/* ConfirmModal hapus */}
      <ConfirmModal
        open={!!hapusTarget}
        onClose={() => setHapusTarget(null)}
        onConfirm={eksekusiHapus}
        busy={busy}
        judul={hapusTarget ? `Hapus catatan "${hapusTarget.judul}"?` : ''}
        teks="Catatan ini akan dihapus permanen."
        teksConfirm="Ya, Hapus"
        tipe="danger"
      />
    </div>
  );
}