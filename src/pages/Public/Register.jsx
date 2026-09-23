import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

const MAX_QUOTA = 20;
const HARI_INI = new Date().toISOString().slice(0, 10);

export default function Register() {
  const [form, setForm] = useState({
    nama_lengkap: '', email: '', nomor_whatsapp: '', instansi: '',
    portofolio_url: '', tanggal_mulai: '', durasi_magang: 1, satuan: 'bulan',
    tanggal_selesai_custom: '',
  });
  const [cvFile, setCvFile] = useState(null);
  const [quota, setQuota] = useState(null);
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // cek kuota real-time
  useEffect(() => {
    if (!form.tanggal_mulai) { setQuota(null); return; }
    let aktif = true;
    setQuotaLoading(true);
    supabase.functions.invoke('check-quota', {
      body: {
        tanggal_mulai: form.tanggal_mulai,
        durasi: Number(form.durasi_magang),
        satuan: form.satuan,
        tanggal_selesai: form.tanggal_selesai_custom || undefined,
      },
    }).then(({ data, error }) => {
      if (!aktif) return;
      setQuotaLoading(false);
      setQuota(error ? { error: true } : data);
    });
    return () => { aktif = false; };
  }, [form.tanggal_mulai, form.durasi_magang, form.satuan, form.tanggal_selesai_custom]);

  const update = (f, v) => setForm((s) => ({ ...s, [f]: v }));

  function pilihCv(e) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return setCvFile(null);
    if (!file.name.toLowerCase().endsWith('.pdf'))
      return setFeedback({ type: 'error', text: 'CV harus berformat PDF.' });
    if (file.size > 5 * 1024 * 1024)
      return setFeedback({ type: 'error', text: 'Ukuran CV maksimal 5 MB.' });
    setFeedback(null);
    setCvFile(file);
  }

  // tampilkan tanggal selesai efektif (dari respons kuota)
  const selesaiEfektif = quota?.tanggal_selesai;

  async function handleSubmit(e) {
    e.preventDefault();
    setFeedback(null);
    if (!cvFile) return setFeedback({ type: 'error', text: 'Lampirkan CV (PDF).' });
    if (!/^(\+?62|0)8\d{7,12}$/.test(form.nomor_whatsapp.replace(/[\s-]/g, '')))
      return setFeedback({ type: 'error', text: 'Nomor WhatsApp tidak valid. Contoh: 081234567890' });
    if (form.tanggal_selesai_custom && form.tanggal_selesai_custom <= form.tanggal_mulai)
      return setFeedback({ type: 'error', text: 'Tanggal selesai custom harus setelah tanggal mulai.' });

    setSubmitting(true);
    try {
      const { data: cek, error: cekErr } = await supabase.functions.invoke('check-quota', {
        body: {
          tanggal_mulai: form.tanggal_mulai,
          durasi: Number(form.durasi_magang),
          satuan: form.satuan,
          tanggal_selesai: form.tanggal_selesai_custom || undefined,
        },
      });
      if (cekErr) throw new Error('Gagal memeriksa kuota. Periksa koneksi.');
      if (cek?.error) throw new Error(cek.message);
      if (!cek?.tersedia) {
        const penuh = (cek.detail_bulan || []).filter((m) => m.penuh).map((m) => m.bulan);
        throw new Error(`Kuota penuh pada bulan: ${penuh.join(', ')}. Pilih tanggal lain.`);
      }

      const ext = cvFile.name.split('.').pop().toLowerCase();
      const path = `applications/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('intern-files').upload(path, cvFile);
      if (upErr) throw new Error('Gagal mengunggah CV: ' + upErr.message);

      const { error: insErr } = await supabase.from('applications').insert({
        nama_lengkap: form.nama_lengkap.trim(),
        email: form.email.trim().toLowerCase(),
        nomor_whatsapp: form.nomor_whatsapp.trim(),
        instansi: form.instansi.trim(),
        portofolio_url: form.portofolio_url.trim() || null,
        cv_url: path,
        tanggal_mulai: form.tanggal_mulai,
        durasi_magang: Number(form.durasi_magang),
        satuan_durasi: form.satuan,
        tanggal_selesai_custom: form.tanggal_selesai_custom || null,
        status_pendaftaran: 'Pending',
      });
      if (insErr) {
        if (insErr.code === '23505')
          throw new Error('Email ini sudah terdaftar sebagai pendaftar aktif.');
        throw new Error('Gagal menyimpan: ' + insErr.message);
      }

      setFeedback({ type: 'success', text: '🎉 Pendaftaran terkirim! Tim kami akan menghubungi kamu setelah seleksi.' });
      setForm({ nama_lengkap: '', email: '', nomor_whatsapp: '', instansi: '', portofolio_url: '', tanggal_mulai: '', durasi_magang: 1, satuan: 'bulan', tanggal_selesai_custom: '' });
      setCvFile(null); setQuota(null);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally { setSubmitting(false); }
  }

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4">
      <div className="mx-auto max-w-2xl">
                <div className="anim-up rounded-t-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 bg-[length:200%_auto] p-6 text-white [animation:gradientMove_8s_linear_infinite]">
          <h1 className="text-2xl font-bold"><span className="anim-wiggle mr-1">🚀</span> Pendaftaran Magang</h1>
          <h1 className="text-2xl font-bold">Pendaftaran Magang</h1>
          <p className="text-sm text-indigo-100">Creativemu Academy — Sedayu</p>
        </div>

                <form onSubmit={handleSubmit} className="anim-up space-y-5 rounded-b-2xl bg-white p-6 shadow-lg [animation-delay:200ms]">
          {feedback && (
            <p className={`rounded-lg p-3 text-sm ${
              feedback.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
            }`}>{feedback.text}</p>
          )}

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Nama Lengkap *</label>
              <input required value={form.nama_lengkap}
                onChange={(e) => update('nama_lengkap', e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Email *</label>
              <input type="email" required value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Nomor WhatsApp *</label>
              <input required placeholder="08xxxxxxxxxx" value={form.nomor_whatsapp}
                onChange={(e) => update('nomor_whatsapp', e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Asal Instansi/Sekolah/Kampus *</label>
              <input required placeholder="mis. SMKN 1 Sedayu / Universitas X" value={form.instansi}
                onChange={(e) => update('instansi', e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-slate-700">Link Portofolio (opsional)</label>
              <input placeholder="github.com/..." value={form.portofolio_url}
                onChange={(e) => update('portofolio_url', e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none" />
            </div>

            {/* ===== Tanggal mulai ===== */}
            <div>
              <label className="text-sm font-medium text-slate-700">Tanggal Rencana Mulai *</label>
              <input type="date" required min={HARI_INI} value={form.tanggal_mulai}
                onChange={(e) => update('tanggal_mulai', e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none" />
            </div>

            {/* ===== Durasi: satuan + angka ===== */}
                        <div>
              <label className="text-sm font-medium text-slate-700">Durasi Magang *</label>
              <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                <select value={form.satuan}
                  onChange={(e) => { update('satuan', e.target.value); update('durasi_magang', 1); }}
                  className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm sm:w-24">
                  <option value="bulan">Bulan</option>
                  <option value="minggu">Minggu</option>
                </select>
                <select value={form.durasi_magang}
                  onChange={(e) => update('durasi_magang', Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm sm:flex-1">
                  {Array.from({ length: form.satuan === 'minggu' ? 26 : 6 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n} {form.satuan}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ===== ⭐ Tanggal selesai CUSTOM (opsional) ===== */}
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                Tanggal Selesai Khusus <span className="font-normal text-slate-400">(opsional — mis. sesuai surat kampus; kosongkan untuk otomatis dari durasi)</span>
              </label>
              <input type="date" value={form.tanggal_selesai_custom}
                min={form.tanggal_mulai}
                onChange={(e) => update('tanggal_selesai_custom', e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none" />
              {form.tanggal_mulai && !form.tanggal_selesai_custom && selesaiEfektif && (
                <p className="mt-1 text-xs text-slate-400">
                  ℹ️ Otomatis: selesai {new Date(selesaiEfektif).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">CV (PDF, maks 5 MB) *</label>
            <input type="file" accept="application/pdf" onChange={pilihCv}
              className="mt-1 w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-600" />
          </div>

          {quotaLoading && <p className="text-sm text-slate-500">Memeriksa kuota...</p>}
          {quota?.error && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
              Tidak dapat memeriksa kuota saat ini. Coba beberapa saat lagi.
            </p>
          )}
                    {quota && !quota.error && (
            <div className={`anim-pop rounded-lg p-4 text-sm ${
              quota.tersedia ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              <p className="font-semibold">
                {quota.tersedia ? '✓ Kuota tersedia — silakan daftar!' : '✗ Kuota penuh — pilih tanggal lain.'}
              </p>
              <div className="mt-2 space-y-1.5">
                {quota.detail_bulan?.map((m) => (
                  <div key={m.bulan} className="flex items-center gap-2">
                    <span className="w-16 font-mono text-xs">{m.bulan}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded bg-slate-200">
                      <div className={`h-full ${m.penuh ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min((m.terisi / MAX_QUOTA) * 100, 100)}%` }} />
                    </div>
                    <span className="w-14 text-xs">{m.terisi}/{MAX_QUOTA}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

                    <button type="submit" disabled={submitting || (quota && !quota.error && !quota.tersedia)}
            className="btn-press w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3.5 font-bold text-white shadow-lg shadow-indigo-500/30 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50">
            {submitting ? 'Mengirim...' : 'Kirim Pendaftaran'}
          </button>

          <p className="text-center text-sm text-slate-500">
            Sudah punya akun? <Link to="/login" className="font-semibold text-indigo-600">Masuk →</Link>
          </p>
        </form>
      </div>
    </div>
  );
}