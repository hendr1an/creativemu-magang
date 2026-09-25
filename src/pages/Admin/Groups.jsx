import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { namaBulan, fmtTanggal } from '../../lib/format';
import ConfirmModal from '../../components/ConfirmModal';

const HARI_INI = new Date().toISOString().slice(0, 10);
const sudahMulai = (i) => !i.tanggal_mulai || i.tanggal_mulai <= HARI_INI;

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [direktori, setDirektori] = useState([]);
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ nama_kelompok: '', batch_label: '', mentor_id: '' });
  const [pilihIntern, setPilihIntern] = useState({});

  // ⭐ state ConfirmModal
  const [konfirmasiKeluarkan, setKonfirmasiKeluarkan] = useState(null);
  const [konfirmasiMasukkan, setKonfirmasiMasukkan] = useState(null); // { groupId, intern }
  const [busy, setBusy] = useState(false);

  useEffect(() => { muat(); }, []);

  async function muat() {
    setLoading(true);
    const [{ data: g }, { data: dir }, { data: itn }] = await Promise.all([
      supabase.from('groups').select('*').order('created_at'),
      supabase.rpc('get_profile_directory'),
      supabase.from('interns')
        .select('id, nama_lengkap, email, group_id, tanggal_mulai, status_magang')
        .eq('status_magang', 'Active')
        .order('nama_lengkap'),
    ]);
    setGroups(g ?? []); setDirektori(dir ?? []); setInterns(itn ?? []);
    setLoading(false);
  }

  const mentors = direktori.filter((p) => p.role === 'mentor');
  const namaMentor = (id) => direktori.find((p) => p.id === id)?.nama_lengkap ?? '—';
  const anggota = (gid) => interns.filter((i) => i.group_id === gid);
  const tanpaKelompok = interns.filter((i) => !i.group_id);

  async function buatKelompok(e) {
    e.preventDefault(); setError(null);
    const { error } = await supabase.from('groups').insert({
      nama_kelompok: form.nama_kelompok.trim(),
      batch_label: form.batch_label.trim() || null,
      mentor_id: form.mentor_id || null,
    });
    if (error) return setError(error.message);
    setForm({ nama_kelompok: '', batch_label: '', mentor_id: '' });
    await muat();
  }

  // ⭐ masukkan — cek guard dulu, lalu ConfirmModal bila perlu
  function mintaMasukkan(groupId, internId) {
    if (!internId) return;
    setError(null);
    const target = tanpaKelompok.find((i) => i.id === internId);
    if (target && !sudahMulai(target)) {
      setKonfirmasiMasukkan({ groupId, intern: target });
      setPilihIntern((s) => ({ ...s, [groupId]: '' }));
      return;
    }
    eksekusiMasukkan(groupId, internId);
  }

  async function eksekusiMasukkan(groupId, internId) {
    if (!internId) return;
    setBusy(true); setError(null);
    const { error } = await supabase.from('interns').update({ group_id: groupId }).eq('id', internId);
    if (error) setError(error.message);
    setPilihIntern((s) => ({ ...s, [groupId]: '' }));
    await muat();
    setBusy(false);
  }

  async function eksekusiKeluarkan() {
    if (!konfirmasiKeluarkan) return;
    setBusy(true); setError(null);
    const { error } = await supabase.from('interns')
      .update({ group_id: null }).eq('id', konfirmasiKeluarkan.id);
    if (error) setError(error.message);
    setKonfirmasiKeluarkan(null);
    await muat();
    setBusy(false);
  }

  async function gantiMentor(groupId, mentorId) {
    const { error } = await supabase.from('groups')
      .update({ mentor_id: mentorId || null }).eq('id', groupId);
    if (error) return setError(error.message);
    await muat();
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <span className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-indigo-600" />
      <p className="text-sm text-slate-400">Memuat data...</p>
    </div>
  );

  return (
    <div>
      <div className="anim-up">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Kelompok Magang</h1>
      </div>

      {error && <p className="anim-down mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      {/* ===== form buat kelompok ===== */}
      <form onSubmit={buatKelompok}
        className="anim-up mt-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm [animation-delay:80ms]">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Buat Kelompok Baru</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input required placeholder="Nama kelompok *" value={form.nama_kelompok}
            onChange={(e) => setForm((f) => ({ ...f, nama_kelompok: e.target.value }))}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium focus:border-indigo-500 focus:outline-none" />
          <input placeholder="Batch (opsional)" value={form.batch_label}
            onChange={(e) => setForm((f) => ({ ...f, batch_label: e.target.value }))}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium focus:border-indigo-500 focus:outline-none" />
          <select value={form.mentor_id}
            onChange={(e) => setForm((f) => ({ ...f, mentor_id: e.target.value }))}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold focus:border-indigo-500 focus:outline-none">
            <option value="">Pilih pembimbing… (opsional)</option>
            {mentors.map((m) => <option key={m.id} value={m.id}>{m.nama_lengkap}</option>)}
          </select>
        </div>
        <button type="submit"
          className="btn-press mt-4 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 hover:from-indigo-700 hover:to-purple-700 sm:w-auto">
          Buat Kelompok
        </button>
      </form>

      {/* ===== daftar kelompok ===== */}
      <h2 className="anim-up mt-8 text-base font-bold text-slate-800 [animation-delay:160ms]">👥 Daftar Kelompok ({groups.length})</h2>

      <div className="mt-3 space-y-4">
        {groups.length === 0 ? (
          <div className="anim-up flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="anim-float text-5xl">👥</p>
            <p className="mt-4 font-bold text-slate-600">Belum Ada Kelompok</p>
            <p className="mt-1 text-sm text-slate-400">Buat kelompok pertama lewat form di atas</p>
          </div>
        ) : groups.map((g, i) => {
          const belumMulaiCount = anggota(g.id).filter((x) => !sudahMulai(x)).length;
          return (
            <div key={g.id}
              className="anim-up card-hover relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
              style={{ animationDelay: `${200 + i * 90}ms` }}>
              <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-500" />

              <div className="flex flex-wrap items-start justify-between gap-3 pl-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">{g.nama_kelompok}</h3>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-400">
                    {g.batch_label ?? 'tanpa batch'} ·
                    <select
                      value={g.mentor_id ?? ''}
                      onChange={(e) => gantiMentor(g.id, e.target.value)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold">
                      <option value="">— pilih pembimbing —</option>
                      {mentors.map((m) => (
                        <option key={m.id} value={m.id}>🧑‍🏫 {m.nama_lengkap}</option>
                      ))}
                    </select>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-bold text-indigo-600">
                    {anggota(g.id).length} anggota
                  </span>
                  {belumMulaiCount > 0 && (
                    <span className="anim-pop rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-600">
                      ⏳ {belumMulaiCount} belum mulai
                    </span>
                  )}
                </div>
              </div>

              {/* anggota — chip dengan avatar */}
              <div className="mt-4 flex flex-wrap gap-2 pl-3">
                {anggota(g.id).length === 0 ? (
                  <p className="text-xs italic text-slate-300">Belum ada anggota…</p>
                ) : anggota(g.id).map((a, j) => (
                  <span key={a.id}
                    className={`anim-pop group inline-flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-xs font-bold ${
                      sudahMulai(a) ? 'border-slate-100 bg-slate-50 text-slate-700' : 'border-amber-200 bg-amber-50 text-amber-600'}`}
                    style={{ animationDelay: `${250 + i * 90 + j * 60}ms` }}>
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-extrabold text-white ${
                      sudahMulai(a) ? 'bg-indigo-600' : 'bg-amber-400'}`}>
                      {a.nama_lengkap?.split(' ').map((x) => x[0]).slice(0, 2).join('')}
                    </span>
                    {a.nama_lengkap}
                    {!sudahMulai(a) && ` ⏳`}
                    <button onClick={() => setKonfirmasiKeluarkan(a)}
                      title="Keluarkan dari kelompok"
                      className="ml-0.5 text-slate-300 transition hover:text-red-500">✕</button>
                  </span>
                ))}
              </div>

              {/* tambah anggota */}
              {tanpaKelompok.length > 0 && (
                <div className="mt-4 flex flex-col gap-2 pl-3 sm:flex-row">
                  <select value={pilihIntern[g.id] ?? ''}
                    onChange={(e) => setPilihIntern((s) => ({ ...s, [g.id]: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium focus:border-indigo-500 focus:outline-none">
                    <option value="">+ Masukkan peserta ke kelompok ini…</option>
                    {tanpaKelompok.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nama_lengkap} — {t.email}
                        {!sudahMulai(t) ? ' (belum mulai)' : ''}
                      </option>
                    ))}
                  </select>
                  <button onClick={() => mintaMasukkan(g.id, pilihIntern[g.id])}
                    className="btn-press w-full shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/25 hover:bg-indigo-700 sm:w-auto">
                    Masukkan
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ===== ConfirmModal: keluarkan anggota ===== */}
      <ConfirmModal
        open={!!konfirmasiKeluarkan}
        onClose={() => setKonfirmasiKeluarkan(null)}
        onConfirm={eksekusiKeluarkan}
        busy={busy}
        judul={konfirmasiKeluarkan ? `Keluarkan "${konfirmasiKeluarkan.nama_lengkap}"?` : ''}
        teks="Peserta akan dikeluarkan dari kelompok ini dan kembali ke daftar tanpa kelompok."
        teksConfirm="Ya, Keluarkan"
        tipe="warn"
      />

      {/* ===== ConfirmModal: masukkan peserta yang belum mulai ===== */}
      <ConfirmModal
        open={!!konfirmasiMasukkan}
        onClose={() => setKonfirmasiMasukkan(null)}
        onConfirm={() => {
          const { groupId, intern } = konfirmasiMasukkan ?? {};
          setKonfirmasiMasukkan(null);
          if (groupId && intern) eksekusiMasukkan(groupId, intern.id);
        }}
        judul={konfirmasiMasukkan ? `Masukkan "${konfirmasiMasukkan.intern.nama_lengkap}"?` : ''}
        teks={konfirmasiMasukkan
          ? `⚠️ Peserta ini BELUM memulai masa magang (mulai ${fmtTanggal(konfirmasiMasukkan.intern.tanggal_mulai)}). Dia tetap bisa dimasukkan untuk persiapan, namun TIDAK akan bisa diberi tugas sampai masa magangnya dimulai.`
          : ''}
        teksConfirm="Tetap Masukkan"
        tipe="warn"
      />
    </div>
  );
}