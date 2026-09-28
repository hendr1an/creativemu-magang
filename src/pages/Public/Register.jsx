import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

const MAX_QUOTA = 20;
const HARI_INI = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

export default function Register() {
  const [form, setForm] = useState({
  nama_lengkap: '',
  email: '',
  nomor_whatsapp: '',
  instansi: '',
  divisi: '',
  portofolio_url: '',
  tanggal_mulai: '',
  durasi_magang: 1,
  satuan: 'bulan',
  tanggal_selesai_custom: '',
});

  const [cvFile, setCvFile] = useState(null);
  const [quota, setQuota] = useState(null);
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [sukses, setSukses] = useState(false);

  useEffect(() => {
  if (!form.tanggal_mulai || !form.divisi) {
    setQuota(null);
    return;
  }

  let aktif = true;

  async function cekQuota() {
    setQuotaLoading(true);

    const { data: cek, error: cekErr } = await supabase.functions.invoke('check-quota', {
  body: {
    tanggal_mulai: form.tanggal_mulai,
    durasi: Number(form.durasi_magang),
    satuan: form.satuan,
    tanggal_selesai: form.tanggal_selesai_custom || undefined,
    divisi: form.divisi,
  },
});

    if (!aktif) return;

    setQuotaLoading(false);

    if (cekErr) {
      setQuota({
        error: true,
        message: 'Gagal memeriksa kuota.',
      });
      return;
    }

    setQuota(cek);
  }

  cekQuota();

  return () => {
    aktif = false;
  };
}, [
  form.tanggal_mulai,
  form.durasi_magang,
  form.satuan,
  form.tanggal_selesai_custom,
  form.divisi,
]);

  const update = (f, v) => setForm((s) => ({ ...s, [f]: v }));

  function pilihCv(e) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf'))
      return setFeedback({ type: 'error', text: 'CV harus berformat PDF.' });
    if (file.size > 5 * 1024 * 1024)
      return setFeedback({ type: 'error', text: 'Ukuran CV maksimal 5 MB.' });
    setFeedback(null);
    setCvFile(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFeedback(null);
    if (!cvFile) return setFeedback({ type: 'error', text: 'Lampirkan CV (PDF).' });
    if (!/^(\+?62|0)8\d{7,12}$/.test(form.nomor_whatsapp.replace(/[\s-]/g, '')))
      return setFeedback({ type: 'error', text: 'Nomor WhatsApp tidak valid. Contoh: 081234567890' });

    setSubmitting(true);
    try {
      const { data: cek, error: cekErr } = await supabase.functions.invoke('check-quota', {
        body: {
          tanggal_mulai: form.tanggal_mulai,
          durasi: Number(form.durasi_magang),
          satuan: form.satuan,
          tanggal_selesai: form.tanggal_selesai_custom || undefined,
          divisi: form.divisi,
        },
      });
      if (cekErr) throw new Error('Gagal memeriksa kuota. Periksa koneksi.');
      if (cek?.error) throw new Error(cek.message);
      if (!cek?.tersedia) {
  const detail = cek?.detail_bulan || [];

  if (cek?.tersedia_total === false) {
    const bulanPenuh = detail
      .filter((m) => m.total_penuh)
      .map((m) => m.bulan);

    throw new Error(
      `Kuota total magang penuh pada ${bulanPenuh.join(', ')}. Pilih periode lain.`
    );
  }

  if (cek?.tersedia_divisi === false) {
    const bulanPenuh = detail
      .filter((m) => m.divisi_penuh)
      .map((m) => m.bulan);

    throw new Error(
      `Kuota divisi ${form.divisi} penuh pada ${bulanPenuh.join(', ')}. Silakan pilih divisi atau periode lain.`
    );
  }

  throw new Error('Kuota magang untuk periode ini tidak tersedia.');
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
        divisi: form.divisi,
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
      setSukses(true);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  const selesaiEfektif = quota?.tanggal_selesai;

  if (sukses) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="anim-pop w-full max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="mt-6 text-xl font-semibold text-slate-900">Pendaftaran Terkirim</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Pengajuanmu sudah kami terima. Tim Creativemu Academy akan
            menghubungimu melalui WhatsApp dan Email setelah proses seleksi.
          </p>
          <Link to="/login"
            className="mt-8 inline-block w-full rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
            Kembali ke Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto w-full max-w-lg">

        {/* ===== HEADER ===== */}
        <div className="anim-up text-center">
          <img src="/images/logo-creativemu.png" alt="Creativemu Academy"
            className="mx-auto h-10 w-auto" />
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900">
            Daftar Magang
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Isi formulir di bawah untuk mengajukan magang di Creativemu Academy
          </p>
        </div>

        {/* ===== FORM ===== */}
        <form onSubmit={handleSubmit}
          className="anim-up mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 [animation-delay:100ms]">

          {feedback && (
            <div className="anim-down mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-medium text-red-600">{feedback.text}</p>
            </div>
          )}

          <div className="space-y-5">

            {/* data diri */}
            <div>
              <label className="text-sm font-medium text-slate-700">Nama Lengkap</label>
              <input required value={form.nama_lengkap}
                onChange={(e) => update('nama_lengkap', e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-[#9647FE] focus:ring-2 focus:ring-purple-200"
                placeholder="Nama sesuai identitas" />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input type="email" required value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-[#9647FE] focus:ring-2 focus:ring-purple-200"
                placeholder="nama@email.com" />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Nomor WhatsApp</label>
              <input required value={form.nomor_whatsapp}
                onChange={(e) => update('nomor_whatsapp', e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-[#9647FE] focus:ring-2 focus:ring-purple-200"
                placeholder="08xxxxxxxxxx" />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Asal Instansi</label>
              <input required value={form.instansi}
                onChange={(e) => update('instansi', e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-[#9647FE] focus:ring-2 focus:ring-purple-200"
                placeholder="Sekolah / Kampus" />
            </div>

            <div>
  <label className="text-sm font-medium text-slate-700">
    Divisi yang Diminati
  </label>

  <select
    required
    value={form.divisi}
    onChange={(e) => update('divisi', e.target.value)}
    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-[#9647FE] focus:ring-2 focus:ring-purple-200"
  >
    <option value="">Pilih divisi...</option>

    <option value="Admin">
      Admin — Administrasi & Operasional
    </option>

    <option value="Sosmed">
      Sosmed — Social Media & Content
    </option>

    <option value="Marketplace">
      Marketplace — E-commerce & Digital Marketing
    </option>

    <option value="Web Developer">
      Web Developer — Website & Programming
    </option>
  </select>

  <p className="mt-1.5 text-xs text-slate-400">
    Pilih bidang yang paling sesuai dengan minat dan kemampuanmu.
  </p>
</div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Link Portofolio <span className="font-normal text-slate-400">(opsional)</span>
              </label>
              <input value={form.portofolio_url}
                onChange={(e) => update('portofolio_url', e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-[#9647FE] focus:ring-2 focus:ring-purple-200"
                placeholder="github.com/username" />
            </div>

            <div className="border-t border-slate-100 pt-5">
              <label className="text-sm font-medium text-slate-700">Tanggal Mulai</label>
              <input type="date" required min={HARI_INI} value={form.tanggal_mulai}
                onChange={(e) => update('tanggal_mulai', e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-[#9647FE] focus:ring-2 focus:ring-purple-200" />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Durasi</label>
              <div className="mt-1.5 flex gap-2">
                <select value={form.satuan}
                  onChange={(e) => { update('satuan', e.target.value); update('durasi_magang', 1); }}
                  className="w-24 rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#9647FE] focus:ring-2 focus:ring-purple-200">
                  <option value="bulan">Bulan</option>
                  <option value="minggu">Minggu</option>
                </select>
                <select value={form.durasi_magang}
                  onChange={(e) => update('durasi_magang', Number(e.target.value))}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#9647FE] focus:ring-2 focus:ring-purple-200">
                  {Array.from({ length: form.satuan === 'minggu' ? 26 : 6 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n} {form.satuan}</option>
                  ))}
                </select>
              </div>
              {form.tanggal_mulai && !form.tanggal_selesai_custom && selesaiEfektif && (
                <p className="mt-2 text-xs text-slate-400">
                  Berakhir otomatis: {new Date(selesaiEfektif).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Tanggal Selesai Khusus <span className="font-normal text-slate-400">(opsional)</span>
              </label>
              <input type="date" value={form.tanggal_selesai_custom}
                min={form.tanggal_mulai}
                onChange={(e) => update('tanggal_selesai_custom', e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-[#9647FE] focus:ring-2 focus:ring-purple-200" />
              <p className="mt-1.5 text-xs text-slate-400">
                Sesuai surat kampus — kosongkan untuk otomatis dari durasi
              </p>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <label className="text-sm font-medium text-slate-700">CV / Resume</label>
              <label className={`mt-1.5 flex cursor-pointer items-center justify-between rounded-lg border-2 px-4 py-4 transition ${
                cvFile
                  ? 'border-green-400 bg-green-50'
                  : 'border-dashed border-slate-300 bg-white hover:border-slate-400'}`}>
                <div className="flex min-w-0 items-center gap-3">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke={cvFile ? '#16a34a' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span className={`truncate text-sm ${cvFile ? 'font-medium text-green-700' : 'text-slate-500'}`}>
                    {cvFile ? cvFile.name : 'Unggah CV (PDF, maks 5 MB)'}
                  </span>
                </div>
                {cvFile && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                <input type="file" accept="application/pdf" onChange={pilihCv} className="hidden" />
              </label>
            </div>

            {/* kuota */}
            {quotaLoading && (
              <p className="text-center text-xs text-slate-400">Memeriksa kuota...</p>
            )}
            {quota && !quota.error && quota.tersedia !== undefined && (
  <div
    className={`rounded-xl border p-4 ${
      quota.tersedia
        ? 'border-green-200 bg-green-50'
        : 'border-red-200 bg-red-50'
    }`}
  >
    <p
      className={`text-sm font-semibold ${
        quota.tersedia
          ? 'text-green-700'
          : 'text-red-600'
      }`}
    >
      {quota.tersedia
        ? `Kuota ${form.divisi} tersedia`
        : quota.tersedia_total === false
          ? 'Kuota total magang penuh'
          : `Kuota divisi ${form.divisi} penuh`}
    </p>

    <div className="mt-3 space-y-3">
      {quota.detail_bulan?.map((m) => (
        <div
          key={m.bulan}
          className="rounded-lg border border-slate-200 bg-white p-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              {m.bulan}
            </span>

            <span className="text-[11px] text-slate-400">
              {m.divisi}
            </span>
          </div>

          <div className="mt-3">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">
                Total peserta
              </span>

              <span
                className={
                  m.total_penuh
                    ? 'font-semibold text-red-500'
                    : 'text-slate-600'
                }
              >
                {m.total_terisi}/{m.total_kuota}
              </span>
            </div>

            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${
                  m.total_penuh
                    ? 'bg-red-400'
                    : 'bg-green-400'
                }`}
                style={{
                  width: `${Math.min(
                    (m.total_terisi / m.total_kuota) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="mt-3">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">
                Divisi {m.divisi}
              </span>

              <span
                className={
                  m.divisi_penuh
                    ? 'font-semibold text-red-500'
                    : 'text-slate-600'
                }
              >
                {m.divisi_terisi}/{m.divisi_kuota}
              </span>
            </div>

            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${
                  m.divisi_penuh
                    ? 'bg-red-400'
                    : 'bg-[#9647FE]'
                }`}
                style={{
                  width: `${Math.min(
                    m.divisi_kuota > 0
                      ? (m.divisi_terisi / m.divisi_kuota) * 100
                      : 100,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)}

            <button type="submit"
              disabled={submitting || (quota && !quota.error && quota.tersedia === false)}
              className="w-full rounded-lg bg-[#9647FE] py-3 text-sm font-semibold text-white transition hover:bg-[#7c36d9] focus:outline-none focus:ring-4 focus:ring-purple-200 disabled:opacity-50">
              {submitting ? 'Mengirim...' : 'Kirim Pendaftaran'}
            </button>

          </div>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Sudah punya akun?{' '}
          <Link to="/login" className="font-semibold text-[#9647FE] hover:underline">
            Masuk
          </Link>
        </p>

      </div>
    </div>
  );
}