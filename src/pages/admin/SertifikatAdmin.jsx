import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { buatUrlFile } from '../../lib/api';
import { fmtTanggal } from '../../lib/format';
import ConfirmModal from '../../components/ConfirmModal';

const MAX_MB = 10;

export default function SertifikatAdmin() {
  const [lulus, setLulus] = useState([]);
  const [certMap, setCertMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [pesan, setPesan] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const inputRefs = useRef({});

  // ⭐ ConfirmModal
  const [konfirmasiHapus, setKonfirmasiHapus] = useState(null);

  useEffect(() => { muat(); }, []);

  async function muat() {
    setLoading(true);
    const [{ data: intern }, { data: cert }] = await Promise.all([
      supabase.from('interns')
        .select('id, nama_lengkap, email, instansi, tanggal_mulai, tanggal_selesai, nilai_final')
        .eq('status_magang', 'Completed')
        .order('nama_lengkap'),
      supabase.from('certificates').select('intern_id, file_url, uploaded_at'),
    ]);
    setLulus(intern ?? []);
    setCertMap(Object.fromEntries(
      (cert ?? []).filter((c) => c.file_url).map((c) => [c.intern_id, c])
    ));
    setLoading(false);
  }

  async function unggah(intern, file) {
    if (!file) return;
    if (file.type !== 'application/pdf')
      return setPesan({ tipe: 'err', teks: '❌ File harus berformat PDF.' });
    if (file.size > MAX_MB * 1024 * 1024)
      return setPesan({ tipe: 'err', teks: `❌ Ukuran maksimal ${MAX_MB} MB.` });

    setBusyId(intern.id); setPesan(null);
    try {
      const path = `certificates/${intern.id}/${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage
        .from('intern-files')
        .upload(path, file, { contentType: 'application/pdf' });
      if (upErr) throw new Error('Gagal mengunggah: ' + upErr.message);

      const { error: dbErr } = await supabase.from('certificates').upsert({
        intern_id: intern.id,
        file_url: path,
        tanggal_diterbitkan: new Date().toISOString().slice(0, 10),
      }, { onConflict: 'intern_id' });
      if (dbErr) throw new Error(dbErr.message);

      setPesan({ tipe: 'ok', teks: `✅ Sertifikat ${intern.nama_lengkap} terunggah — peserta kini bisa melihat & mengunduhnya.` });
      await muat();
    } catch (e) {
      setPesan({ tipe: 'err', teks: e.message });
    } finally { setBusyId(null); }
  }

  async function eksekusiHapus() {
    if (!konfirmasiHapus) return;
    setBusyId(konfirmasiHapus.id); setPesan(null);
    const { error } = await supabase.from('certificates').delete().eq('intern_id', konfirmasiHapus.id);
    if (error) setPesan({ tipe: 'err', teks: error.message });
    else { setPesan({ tipe: 'ok', teks: '🗑️ Sertifikat dihapus.' }); await muat(); }
    setKonfirmasiHapus(null);
    setBusyId(null);
  }

  async function lihat(fileUrl) {
    try { window.open(await buatUrlFile(fileUrl), '_blank'); }
    catch (e) { setPesan({ tipe: 'err', teks: e.message }); }
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
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Sertifikat Magang</h1>
      </div>

      {pesan && (
        <p className={`anim-down mt-4 rounded-xl p-3 text-sm font-medium ${
          pesan.tipe === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {pesan.teks}
        </p>
      )}

      <div className="anim-up mt-5 overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm [-webkit-overflow-scrolling:touch] [animation-delay:80ms]">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-[10px] uppercase tracking-wider text-slate-400">
              <th className="px-4 py-3">Peserta</th>
              <th className="px-4 py-3">Instansi</th>
              <th className="px-4 py-3">Periode</th>
              <th className="px-4 py-3">Nilai</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {lulus.length === 0 ? (
              <tr><td colSpan={6} className="p-10">
                <div className="flex flex-col items-center">
                  <p className="anim-float text-5xl">🎓</p>
                  <p className="mt-4 font-bold text-slate-600">Belum Ada Peserta Selesai</p>
                  <p className="mt-1 text-sm text-slate-400">Peserta tampil di sini setelah nilai akhir dihitung</p>
                </div>
              </td></tr>
            ) : lulus.map((r, idx) => {
              const cert = certMap[r.id];
              const lulusBeneran = r.nilai_final != null && r.nilai_final >= 70;
              return (
                <tr key={r.id}
                  className="anim-in border-b border-slate-50 transition hover:bg-slate-50/60"
                  style={{ animationDelay: `${idx * 60}ms` }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-[10px] font-bold text-white">
                        {r.nama_lengkap?.split(' ').map((x) => x[0]).slice(0, 2).join('')}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800">{r.nama_lengkap}</p>
                        <p className="truncate text-[11px] text-slate-400">{r.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[13px] font-medium text-slate-600">{r.instansi ?? '—'}</td>
                  <td className="px-4 py-3 text-[11px] font-medium text-slate-500">
                    {fmtTanggal(r.tanggal_mulai)} – {fmtTanggal(r.tanggal_selesai)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-base font-extrabold ${lulusBeneran ? 'text-green-600' : 'text-red-500'}`}>
                      {r.nilai_final ?? '—'}
                    </span>
                    <span className="block text-[10px] font-bold uppercase text-slate-400">
                      {r.nilai_final == null ? 'belum dihitung' : lulusBeneran ? 'lulus' : 'tidak lulus'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {cert ? (
                      <span className="anim-pop inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-[10px] font-extrabold text-green-700">
                        ✓ TERUNGGAH
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-400">belum ada file</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      ref={(el) => (inputRefs.current[r.id] = el)}
                      type="file" accept="application/pdf" className="hidden"
                      onChange={(e) => {
                        unggah(r, e.target.files?.[0]);
                        e.target.value = '';
                      }} />

                    {cert ? (
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => lihat(cert.file_url)}
                          className="btn-press rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-200">
                          👁️
                        </button>
                        <button onClick={() => inputRefs.current[r.id]?.click()} disabled={busyId === r.id}
                          className="btn-press rounded-lg bg-amber-100 px-3 py-1.5 text-[11px] font-bold text-amber-700 hover:bg-amber-200 disabled:opacity-50">
                          {busyId === r.id ? '⏳' : '🔁 Ganti'}
                        </button>
                        <button onClick={() => setKonfirmasiHapus(r)} disabled={busyId === r.id}
                          className="btn-press rounded-lg bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-600 ring-1 ring-red-200 hover:bg-red-100 disabled:opacity-50">
                          🗑️
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => inputRefs.current[r.id]?.click()} disabled={busyId === r.id}
                        className="btn-press rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-[11px] font-bold text-white shadow-md shadow-indigo-500/25 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50">
                        {busyId === r.id ? '⏳ Mengunggah…' : '📤 Upload PDF'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="anim-up mt-3 text-[11px] font-medium text-slate-400 [animation-delay:200ms]">
        💡 Format PDF, maksimal {MAX_MB} MB. Mengganti file = unggah ulang, peserta otomatis melihat versi terbaru.
      </p>

      {/* ⭐ ConfirmModal hapus */}
      <ConfirmModal
        open={!!konfirmasiHapus}
        onClose={() => setKonfirmasiHapus(null)}
        onConfirm={eksekusiHapus}
        busy={busyId != null}
        judul={konfirmasiHapus ? `🗑️ Hapus sertifikat "${konfirmasiHapus.nama_lengkap}"?` : ''}
        teks="Peserta tidak akan bisa melihat sertifikatnya lagi. File PDF bisa diunggah ulang kapan saja."
        teksConfirm="Ya, Hapus"
        tipe="danger"
      />
    </div>
  );
}