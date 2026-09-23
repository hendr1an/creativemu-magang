import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { buatUrlFile } from '../lib/api';
import { fmtTanggal } from '../lib/format';
import Modal from './Modal';

const HARI_INI = new Date().toISOString().slice(0, 10);
const sudahMulai = (a) => !a.tanggal_mulai || a.tanggal_mulai <= HARI_INI;

const NILAI_WARNA = {
  A: 'bg-green-600', B: 'bg-teal-500', C: 'bg-amber-400',
  D: 'bg-orange-500', E: 'bg-red-500',
};
const SKALA = { A: 5, B: 4.5, C: 4, D: 3.5, E: 3 };

function grupKartu(subtasks) {
  const map = new Map();
  (subtasks ?? []).forEach((s) => {
    const k = s.assignment_group;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(s);
  });
  return [...map.values()];
}

export default function SubtaskManager({ group, anggota, projekFilter = null }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pesan, setPesan] = useState(null);
  const [formProjek, setFormProjek] = useState({ judul: '', deskripsi: '', deadline: '' });
  const [formSub, setFormSub] = useState({});
  const [bukaForm, setBukaForm] = useState(null);        // id projek yang form-nya terbuka
  const [revisiGrup, setRevisiGrup] = useState(null);
  const [catatanRevisi, setCatatanRevisi] = useState('');
  const [busy, setBusy] = useState(false);

  // ⭐ ref untuk auto-scroll ke form subtugas
  const formRef = useRef(null);

  const anggotaSiap = anggota.filter(sudahMulai);
  const belumMulaiCount = anggota.length - anggotaSiap.length;

  useEffect(() => { muat(); }, [group.id, projekFilter]);

  async function muat() {
    setLoading(true);
    let prj;
    if (projekFilter) {
      // ⭐ mode kartu: SATU projek saja (dipanggil dari kartu projek yang di-expand)
      const { data } = await supabase.from('projects').select('*').eq('id', projekFilter);
      prj = data;
    } else {
      // mode daftar: semua projek kelompok (dipakai saat belum ada projek / tambah baru)
      const { data } = await supabase.from('projects').select('*')
        .eq('group_id', group.id).order('created_at');
      prj = data;
    }
    const ids = (prj ?? []).map((p) => p.id);
    let subs = [];
    if (ids.length > 0) {
      const { data } = await supabase.from('subtasks')
        .select('*, interns(nama_lengkap)').in('project_id', ids).order('created_at');
      subs = data ?? [];
    }
    setProjects((prj ?? []).map((p) => ({
      ...p, subtasks: subs.filter((s) => s.project_id === p.id),
    })));
    setLoading(false);
  }

  const progres = (p) => {
    const gs = grupKartu(p.subtasks);
    const selesai = gs.filter((g) => g.every((r) => r.status === 'Selesai')).length;
    const menunggu = gs.filter((g) =>
      !g.every((r) => r.status === 'Selesai') && g.some((r) => r.status === 'Menunggu Review')).length;
    return { total: gs.length, selesai, menunggu, persen: gs.length ? Math.round((selesai * 100) / gs.length) : 0 };
  };

  const nilaiProjek = (p) => {
    const m = new Map();
    p.subtasks.filter((s) => s.nilai).forEach((s) => {
      if (!m.has(s.intern_id)) m.set(s.intern_id, { nama: s.interns?.nama_lengkap, vals: [] });
      m.get(s.intern_id).vals.push(SKALA[s.nilai]);
    });
    return [...m.values()].map((v) => ({
      nama: v.nama,
      avg: Math.round((v.vals.reduce((a, b) => a + b, 0) / v.vals.length) * 10) / 10,
      n: v.vals.length,
    }));
  };

  // ⭐ auto-scroll halus ke form subtugas
  function scrollKeForm() {
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
  }

  async function buatProjek(e) {
    e.preventDefault(); setPesan(null);
    if (!formProjek.judul.trim()) return setPesan({ tipe: 'err', teks: 'Judul projek wajib diisi.' });
    const { data, error } = await supabase.from('projects').insert({
      group_id: group.id,
      judul_projek: formProjek.judul.trim(),
      deskripsi: formProjek.deskripsi?.trim() || null,
      deadline_projek: formProjek.deadline || null,
    }).select('id').single();
    if (error) return setPesan({ tipe: 'err', teks: error.message });

    // ⭐ notifikasi sukses yang jelas & memandu
    setPesan({
      tipe: 'ok',
      teks: `✅ Projek "${formProjek.judul.trim()}" berhasil dibuat! Sekarang tambahkan subtugas pertama di bawah ini ⬇️`,
    });
    setFormProjek({ judul: '', deskripsi: '', deadline: '' });

    await muat();

    // ⭐ auto-buka form subtugas projek baru + auto-scroll ke sana
    setBukaForm(data.id);
    scrollKeForm();
  }

  async function tambahSubtugas(p) {
    const f = formSub[p.id] ?? {};
    setPesan(null);
    if (!f.judul?.trim()) return setPesan({ tipe: 'err', teks: 'Judul subtugas wajib diisi.' });
    if (anggota.length === 0) return setPesan({ tipe: 'err', teks: 'Kelompok belum punya anggota.' });

    const cek = f.cek ?? {};
    const targets = anggotaSiap.filter((a) => cek[a.id]);
    if (targets.length === 0)
      return setPesan({ tipe: 'err', teks: '⚠ Pilih minimal 1 pengerja (centang nama di atas).' });

    const groupId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const rows = targets.map((t) => ({
      project_id: p.id, intern_id: t.id, assignment_group: groupId,
      judul: f.judul.trim(), deskripsi: f.deskripsi?.trim() || null,
      deadline: f.deadline || null,
    }));
    const { error } = await supabase.from('subtasks').insert(rows);
    if (error) return setPesan({ tipe: 'err', teks: error.message });

    // ⭐ notifikasi sukses jelas: ke projek mana, siapa saja
    setPesan({
      tipe: 'ok',
      teks: `✅ Subtugas "${f.judul.trim()}" berhasil ditambahkan ke projek "${p.judul_projek}" untuk ${targets.length} pengerja (${targets.map((t) => t.nama_lengkap?.split(' ')[0]).join(', ')}) — sudah muncul di dashboard mereka!`,
    });
    setFormSub((s) => ({ ...s, [p.id]: {} }));
    setBukaForm(null);
    await muat();
  }

  async function nilaiGrup(grup, huruf) {
    setBusy(true); setPesan(null);
    const { error } = await supabase.from('subtasks').update({
      nilai: huruf,
      status: 'Selesai',
      reviewed_at: new Date().toISOString(),
    }).eq('assignment_group', grup[0].assignment_group);
    if (error) setPesan({ tipe: 'err', teks: error.message });
    else {
      const nama2 = grup.map((r) => r.interns?.nama_lengkap?.split(' ')[0]).join(' & ');
      setPesan({ tipe: 'ok', teks: `✅ Nilai ${huruf} untuk ${nama2} — nilai projek ter-update otomatis.` });
      await muat();
    }
    setBusy(false);
  }

  async function kirimRevisi(e) {
    e.preventDefault();
    if (!revisiGrup) return;
    if (!catatanRevisi.trim())
      return setPesan({ tipe: 'err', teks: 'Tuliskan catatan revisi.' });
    setBusy(true); setPesan(null);
    const { error } = await supabase.from('subtasks').update({
      status: 'Revisi',
      catatan_revisi: catatanRevisi.trim(),
      nilai: null,
      reviewed_at: new Date().toISOString(),
    }).eq('assignment_group', revisiGrup[0].assignment_group);
    if (error) setPesan({ tipe: 'err', teks: error.message });
    else {
      setPesan({ tipe: 'ok', teks: `🔁 Revisi dikirim ke semua pengerja tugas ini.` });
      setRevisiGrup(null); setCatatanRevisi('');
      await muat();
    }
    setBusy(false);
  }

  async function hapusGrup(grup) {
    const nama = grup.map((r) => r.interns?.nama_lengkap?.split(' ')[0]).join(', ');
    if (!confirm(`Hapus tugas "${grup[0].judul}" (dari ${nama})?`)) return;
    await supabase.from('subtasks').delete().eq('assignment_group', grup[0].assignment_group);
    await muat();
  }

  async function lihatFile(path) {
    try { window.open(await buatUrlFile(path), '_blank'); }
    catch (e) { setPesan({ tipe: 'err', teks: e.message }); }
  }

  const setFS = (pid, field, value) =>
    setFormSub((s) => ({ ...s, [pid]: { ...s[pid], [field]: value } }));
  const toggleCek = (pid, internId) =>
    setFormSub((s) => ({
      ...s,
      [pid]: { ...s[pid], cek: { ...(s[pid]?.cek ?? {}), [internId]: !(s[pid]?.cek ?? {})[internId] } },
    }));

  return (
    <div>
      {/* ⭐ BANNER PESAN (notifikasi interaktif, auto-hide 6 detik) */}
      {pesan && (
        <div className={`anim-down sticky top-16 z-20 mb-3 flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold leading-relaxed shadow-lg ${
          pesan.tipe === 'ok'
            ? 'border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 text-green-800'
            : 'border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 text-red-700'}`}>
          <span className="text-base">{pesan.tipe === 'ok' ? '🎉' : '⚠️'}</span>
          <p className="flex-1">{pesan.teks}</p>
          <button onClick={() => setPesan(null)}
            className="shrink-0 text-slate-400 transition hover:text-slate-600">✕</button>
        </div>
      )}

      {/* ===== form buat projek — HANYA di mode daftar (bukan di dalam kartu projek) ===== */}
      {!projekFilter && (
        <form onSubmit={buatProjek} className="rounded-xl border border-dashed border-slate-300 p-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">➕ Projek Baru (Induk)</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input required placeholder="Judul projek *" value={formProjek.judul}
              onChange={(e) => setFormProjek((f) => ({ ...f, judul: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium focus:border-indigo-500 focus:outline-none sm:col-span-2" />
            <input type="date" value={formProjek.deadline}
              onChange={(e) => setFormProjek((f) => ({ ...f, deadline: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <textarea placeholder="Deskripsi (opsional)" rows={1} value={formProjek.deskripsi}
              onChange={(e) => setFormProjek((f) => ({ ...f, deskripsi: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-3" />
          </div>
          <button type="submit"
            className="btn-press mt-2 w-full rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-green-500/25 hover:from-green-700 hover:to-emerald-700 sm:w-auto">
            Buat Projek
          </button>
        </form>
      )}

      {/* ===== daftar projek ===== */}
      {loading ? (
        <div className="flex justify-center py-6">
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-[3px] border-slate-200 border-t-indigo-600" />
        </div>
      ) : projects.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">Belum ada projek — buat lewat form di atas 👆</p>
      ) : projects.map((p) => {
        const g = progres(p);
        const np = nilaiProjek(p);
        return (
          <div key={p.id} className="mt-4 rounded-xl bg-slate-50 p-3 sm:p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-bold leading-snug text-slate-800">📁 {p.judul_projek}</p>
                <p className="text-[11px] text-slate-400">
                  {p.deadline_projek ? `⏰ deadline ${fmtTanggal(p.deadline_projek)}` : 'tanpa deadline'}
                </p>
              </div>
              {/* tombol tambah subtugas — auto-scroll ke form */}
              <button onClick={() => {
                  setBukaForm(bukaForm === p.id ? null : p.id);
                  if (bukaForm !== p.id) scrollKeForm();
                }}
                className="btn-press w-full rounded-xl bg-indigo-600 px-3 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/25 hover:bg-indigo-700 sm:w-auto">
                {bukaForm === p.id ? '✕ Tutup' : '+ Subtugas'}
              </button>
            </div>

            <div className="mt-3">
              <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                <span className="font-bold text-slate-600">
                  Milestone: {g.persen}% ({g.selesai}/{g.total} tugas)
                  {g.menunggu > 0 && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-700">
                      ⏳ {g.menunggu} menunggu dinilai
                    </span>
                  )}
                </span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white">
                <div className="h-full bg-green-500 transition-all" style={{ width: `${g.persen}%` }} />
              </div>

              {np.length > 0 && (
                <p className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] text-slate-500">
                  ⭐ Nilai (auto):
                  {np.map((v) => (
                    <span key={v.nama}>
                      {v.nama?.split(' ')[0]} <b className="text-slate-700">{v.avg}</b>
                      <span className="text-slate-400"> ({v.n})</span>
                    </span>
                  ))}
                </p>
              )}
            </div>

            {/* ===== daftar tugas per GRUP ===== */}
            {p.subtasks.length > 0 && (
              <ul className="mt-3 space-y-2">
                {grupKartu(p.subtasks).map((grup) => {
                  const g0 = grup[0];
                  const selesaiSemua = grup.every((r) => r.status === 'Selesai');
                  const adaReview = grup.some((r) => r.status === 'Menunggu Review');
                  const telat = g0.deadline && new Date(g0.deadline) < new Date() && !selesaiSemua;
                  return (
                    <li key={g0.assignment_group}
                      className={`rounded-lg bg-white px-3 py-2.5 text-sm ${
                        adaReview ? 'ring-1 ring-amber-300' : ''}`}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <p className={`font-semibold leading-snug ${selesaiSemua ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                            {g0.judul}
                            {grup.length > 1 && (
                              <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
                                👥 {grup.length} pengerja
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                            👤 {grup.map((r) => r.interns?.nama_lengkap?.split(' ')[0] ?? '?').join(', ')}
                            {g0.deadline && <span className={telat ? ' font-bold text-red-500' : ''}>
                              {' '}· ⏰ {fmtTanggal(g0.deadline)}{telat ? ' TERLAMBAT' : ''}
                            </span>}
                          </p>

                          {grup.filter((r) => r.file_bukti || r.catatan_pengumpulan).map((r) => (
                            <p key={r.id} className="mt-1 text-[11px] leading-relaxed text-slate-500">
                              {r.file_bukti && (
                                <button onClick={() => lihatFile(r.file_bukti)}
                                  className="font-semibold text-blue-600 hover:underline">
                                  📎 {r.interns?.nama_lengkap?.split(' ')[0]}
                                </button>
                              )}
                              {r.catatan_pengumpulan && ` 💬 ${r.catatan_pengumpulan}`}
                            </p>
                          ))}

                          {g0.status === 'Revisi' && g0.catatan_revisi && (
                            <p className="mt-1 text-[11px] leading-relaxed text-red-500">🔁 {g0.catatan_revisi}</p>
                          )}

                          {!selesaiSemua && !adaReview && (
                            <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                              {grup.map((r) => `${r.interns?.nama_lengkap?.split(' ')[0]}: ${
                                r.status === 'Belum' ? 'belum' : r.status === 'Revisi' ? 'revisi' : '⏳'
                              }`).join(' · ')}
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:flex-row sm:items-center">
                          {selesaiSemua ? (
                            <span className={`inline-flex items-center justify-center rounded-md px-3 py-2 text-xs font-black text-white ${NILAI_WARNA[g0.nilai] ?? 'bg-slate-400'}`}>
                              Nilai {g0.nilai ?? '—'}
                            </span>
                          ) : adaReview ? (
                            <>
                              <div className="grid grid-cols-5 gap-1">
                                {['A', 'B', 'C', 'D', 'E'].map((h) => (
                                  <button key={h} onClick={() => nilaiGrup(grup, h)} disabled={busy}
                                    title={`Nilai ${h} untuk SEMUA pengerja (${SKALA[h]}/5)`}
                                    className={`h-10 rounded-md text-sm font-black text-white transition active:scale-95 disabled:opacity-50 hover:opacity-90 ${NILAI_WARNA[h]}`}>
                                    {h}
                                  </button>
                                ))}
                              </div>
                              <button onClick={() => { setRevisiGrup(grup); setCatatanRevisi(''); }}
                                className="h-10 rounded-lg bg-orange-500 px-3 text-[11px] font-bold text-white transition active:scale-95 hover:bg-orange-600">
                                🔁 Revisi
                              </button>
                            </>
                          ) : null}
                          <button onClick={() => hapusGrup(grup)}
                            className="h-8 rounded-lg px-2 text-xs text-slate-300 transition hover:text-red-500">
                            ✕
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* ===== form tambah subtugas — ref untuk auto-scroll ===== */}
            {bukaForm === p.id && (
              <div ref={formRef}
                className="anim-down mt-3 space-y-2 rounded-xl border-2 border-indigo-200 bg-white p-3 shadow-md">
                <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-500">
                  ➕ Subtugas untuk: {p.judul_projek}
                </p>
                <input placeholder="Judul subtugas *"
                  value={formSub[p.id]?.judul ?? ''} onChange={(e) => setFS(p.id, 'judul', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium focus:border-indigo-500 focus:outline-none" />
                <textarea placeholder="Instruksi detail (opsional)" rows={2}
                  value={formSub[p.id]?.deskripsi ?? ''} onChange={(e) => setFS(p.id, 'deskripsi', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />

                <div className="rounded-lg bg-slate-50 p-2.5">
                  <p className="text-[11px] font-bold uppercase text-slate-400">Pengerja subtugas *</p>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-2">
                    {anggotaSiap.map((a) => (
                      <label key={a.id} className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-700">
                        <input type="checkbox"
                          checked={!!(formSub[p.id]?.cek ?? {})[a.id]}
                          onChange={() => toggleCek(p.id, a.id)}
                          className="h-4 w-4 accent-indigo-600" />
                        {a.nama_lengkap}
                      </label>
                    ))}
                    {anggotaSiap.length === 0 && (
                      <p className="text-xs text-amber-600">⚠ Semua anggota belum mulai masa magang.</p>
                    )}
                  </div>
                  {belumMulaiCount > 0 && (
                    <p className="mt-1 text-[10px] text-amber-500">
                      ⚠ {belumMulaiCount} anggota belum mulai — tidak dapat dipilih.
                    </p>
                  )}
                  <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                    💡 Tugas multi-pengerja dinilai sebagai satu — semua pengerja mendapat nilai yang sama.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-[11px] font-bold text-slate-500">⏰ Tenggat:</span>
                  <input type="date" value={formSub[p.id]?.deadline ?? ''}
                    onChange={(e) => setFS(p.id, 'deadline', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:w-auto" />
                </div>
                <button onClick={() => tambahSubtugas(p)}
                  className="btn-press w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/25 hover:from-indigo-700 hover:to-purple-700">
                  ✓ Tambahkan Subtugas
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* ===== Modal Revisi ===== */}
      <Modal open={!!revisiGrup} onClose={() => setRevisiGrup(null)} title="🔁 Minta Revisi Subtugas">
        {revisiGrup && (
          <form onSubmit={kirimRevisi}>
            <p className="text-sm leading-relaxed text-slate-600">
              Subtugas <b>"{revisiGrup[0].judul}"</b> akan dikembalikan ke{' '}
              <b>{revisiGrup.map((r) => r.interns?.nama_lengkap).join(', ')}</b> dengan catatan revisimu.
            </p>
            <textarea value={catatanRevisi} onChange={(e) => setCatatanRevisi(e.target.value)} rows={4}
              placeholder="Instruksi perbaikan… (wajib diisi)"
              className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-orange-500 focus:outline-none" />
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setRevisiGrup(null)}
                className="btn-press rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
              <button type="submit" disabled={busy}
                className="btn-press rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50">
                {busy ? 'Mengirim…' : 'Kirim Revisi'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}