import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useMentor } from '../../hooks/useMentor';

const BADGE = {
  Scheduled: 'bg-blue-100 text-blue-700',
  Completed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-600',
};

const waktuWib = (iso) => new Date(iso).toLocaleString('id-ID', {
  weekday: 'long', day: 'numeric', month: 'long',
  hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
});

export default function Mentoring() {
  const { user } = useAuth();
  const { groups } = useMentor();
  const [jadwal, setJadwal] = useState([]);
  const [form, setForm] = useState({
    group_id: '', judul_sesi: '', tanggal_waktu: '',
    platform: 'Zoom', link_meeting: '', catatan: '',
  });
  const [busy, setBusy] = useState(false);
  const [pesan, setPesan] = useState(null);

  useEffect(() => {
    if (groups.length > 0 && !form.group_id) {
      setForm((f) => ({ ...f, group_id: groups[0].id }));
    }
    muat();
  }, [groups.length]);

  async function muat() {
    if (groups.length === 0) return setJadwal([]);
    const { data } = await supabase.from('mentoring_schedules')
      .select('*')
      .in('group_id', groups.map((g) => g.id))
      .order('tanggal_waktu', { ascending: false });
    setJadwal(data ?? []);
  }

  async function buat(e) {
    e.preventDefault();
    setBusy(true); setPesan(null);
    try {
      if (!form.judul_sesi.trim() || !form.tanggal_waktu) throw new Error('Judul & jadwal wajib diisi.');
      if (!form.group_id) throw new Error('Pilih kelompok terlebih dahulu.');

      // ⭐ FIX: mentor_id WAJIB diisi (kolom NOT NULL)
      const { error } = await supabase.from('mentoring_schedules').insert({
        group_id: form.group_id,
        mentor_id: user.id,
        judul_sesi: form.judul_sesi.trim(),
        tanggal_waktu: new Date(form.tanggal_waktu).toISOString(),
        platform: form.platform || null,
        link_meeting: form.link_meeting.trim() || null,
        catatan: form.catatan.trim() || null,
      });
      if (error) throw new Error(error.message);

      setPesan({ tipe: 'ok', teks: '✅ Jadwal dibuat — otomatis muncul di dashboard seluruh anggota kelompok.' });
      setForm((f) => ({ ...f, judul_sesi: '', tanggal_waktu: '', link_meeting: '', catatan: '' }));
      await muat();
    } catch (err) {
      setPesan({ tipe: 'err', teks: err.message });
    } finally { setBusy(false); }
  }

  async function ubahStatus(j, status) {
    await supabase.from('mentoring_schedules').update({ status_sesi: status }).eq('id', j.id);
    muat();
  }

  const namaGrup = (gid) => groups.find((g) => g.id === gid)?.nama_kelompok ?? '—';
  const sekarang = new Date().toISOString();
  const akanDatang = jadwal.filter((j) => j.tanggal_waktu >= sekarang && j.status_sesi === 'Scheduled');
  const lainnya = jadwal.filter((j) => !(j.tanggal_waktu >= sekarang && j.status_sesi === 'Scheduled'));

  return (
    <div>
      <div className="anim-up">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Jadwal Mentoring</h1>
      </div>

      {pesan && (
        <p className={`anim-down mt-4 rounded-xl p-3 text-sm font-medium ${
          pesan.tipe === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {pesan.teks}
        </p>
      )}

      {/* ===== form buat jadwal ===== */}
      {groups.length > 0 ? (
        <form onSubmit={buat}
          className="anim-up mt-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm [animation-delay:80ms]">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Buat Jadwal Baru</p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select value={form.group_id}
              onChange={(e) => setForm((f) => ({ ...f, group_id: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">
              {groups.map((g) => <option key={g.id} value={g.id}>{g.nama_kelompok}</option>)}
            </select>
            <input required placeholder="Judul sesi * (mis. Sync Mingguan #3)"
              value={form.judul_sesi}
              onChange={(e) => setForm((f) => ({ ...f, judul_sesi: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium" />
            <input type="datetime-local" required
              value={form.tanggal_waktu}
              onChange={(e) => setForm((f) => ({ ...f, tanggal_waktu: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium" />
            <select value={form.platform}
              onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">
              <option>Zoom</option>
              <option>Google Meet</option>
              <option>Offline (Sedayu)</option>
            </select>
            <input placeholder="Link meeting (https://...)"
              value={form.link_meeting}
              onChange={(e) => setForm((f) => ({ ...f, link_meeting: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
            <textarea placeholder="Catatan / agenda (opsional)" rows={2}
              value={form.catatan}
              onChange={(e) => setForm((f) => ({ ...f, catatan: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          </div>
          <button type="submit" disabled={busy}
            className="btn-press mt-4 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 sm:w-auto sm:px-8">
            {busy ? 'Menyimpan…' : 'Buat Jadwal'}
          </button>
        </form>
      ) : (
        <div className="anim-up mt-5 flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="anim-float text-5xl">👥</p>
          <p className="mt-4 font-bold text-slate-600">Belum Punya Kelompok</p>
          <p className="mt-1 text-sm text-slate-400">Jadwal dapat dibuat setelah admin menugaskan kelompok</p>
        </div>
      )}

      {/* ===== akan datang ===== */}
      <h2 className="anim-up mt-8 text-base font-bold text-slate-800 [animation-delay:160ms]">🗓️ Akan Datang</h2>
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {akanDatang.length === 0 ? (
          <p className="anim-up col-span-full flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 text-center [animation-delay:160ms]">
            <span className="anim-float text-4xl">📅</span>
            <span className="mt-2 text-sm text-slate-400">Belum ada jadwal mendatang</span>
          </p>
        ) : akanDatang.map((j, i) => (
          <div key={j.id}
            className="anim-up card-hover relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
            style={{ animationDelay: `${200 + i * 90}ms` }}>
            <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-500" />

            <div className="flex items-start justify-between gap-3 pl-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                  {namaGrup(j.group_id)}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-800">{j.judul_sesi}</p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  🕒 {waktuWib(j.tanggal_waktu)} WIB
                  {j.platform && <span className="ml-2 text-slate-400">💻 {j.platform}</span>}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-1.5">
                <button onClick={() => ubahStatus(j, 'Completed')}
                  className="btn-press rounded-lg bg-green-100 px-3 py-1.5 text-[11px] font-bold text-green-700 hover:bg-green-200">
                  ✓ Selesai
                </button>
                <button onClick={() => ubahStatus(j, 'Cancelled')}
                  className="btn-press rounded-lg bg-red-100 px-3 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-200">
                  ✕ Batalkan
                </button>
              </div>
            </div>

            {j.link_meeting && (
              <a href={j.link_meeting} target="_blank" rel="noreferrer"
                className="btn-press mt-3 ml-2 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700">
                🔗 Gabung Sesi
              </a>
            )}
            {j.catatan && (
              <p className="mt-2 ml-2 text-[11px] leading-relaxed text-slate-400">📝 {j.catatan}</p>
            )}
          </div>
        ))}
      </div>

      {/* ===== riwayat ===== */}
      {lainnya.length > 0 && (
        <>
          <h2 className="anim-up mt-8 text-base font-bold text-slate-800 [animation-delay:300ms]">🕘 Riwayat</h2>
          <div className="mt-3 space-y-2">
            {lainnya.map((j, i) => (
              <div key={j.id}
                className="anim-up flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
                style={{ animationDelay: `${320 + i * 60}ms` }}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-700">{j.judul_sesi}</p>
                  <p className="text-[11px] font-medium text-slate-400">
                    {namaGrup(j.group_id)} · {waktuWib(j.tanggal_waktu)} WIB
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold ${BADGE[j.status_sesi]}`}>
                  {j.status_sesi}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}