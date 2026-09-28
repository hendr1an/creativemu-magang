import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

const HARI_INI = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

const DIVISI_INFO = {
  Admin: {
    icon: '📋',
    title: 'Admin',
    description:
      'Cocok untuk kamu yang tertarik pada administrasi, pengelolaan data, dokumentasi, dan koordinasi operasional.',
  },
  Sosmed: {
    icon: '📱',
    title: 'Sosmed',
    description:
      'Cocok untuk kamu yang tertarik pada content creation, desain, copywriting, video, dan pengelolaan media sosial.',
  },
  Marketplace: {
    icon: '🛒',
    title: 'Marketplace',
    description:
      'Cocok untuk kamu yang tertarik pada e-commerce, pengelolaan produk, promosi, dan digital marketing.',
  },
  'Web Developer': {
    icon: '💻',
    title: 'Web Developer',
    description:
      'Cocok untuk kamu yang tertarik pada coding, website, UI web, dan pengembangan aplikasi.',
  },
};

function formatTanggalIndonesia(value) {
  if (!value) return '';

  const [tahun, bulan, tanggal] = value
    .split('-')
    .map(Number);

  if (!tahun || !bulan || !tanggal) {
    return value;
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(
    new Date(
      Date.UTC(
        tahun,
        bulan - 1,
        tanggal
      )
    )
  );
}

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

  const [cvFile, setCvFile] =
    useState(null);

  const [quota, setQuota] =
    useState(null);

  const [quotaLoading, setQuotaLoading] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [feedback, setFeedback] =
    useState(null);

  const [sukses, setSukses] =
    useState(false);

  const update = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  useEffect(() => {
    if (
      !form.tanggal_mulai ||
      !form.divisi
    ) {
      setQuota(null);
      return;
    }

    let aktif = true;

    async function cekQuota() {
      setQuotaLoading(true);

      const {
        data: cek,
        error: cekErr,
      } =
        await supabase.functions.invoke(
          'check-quota',
          {
            body: {
              tanggal_mulai:
                form.tanggal_mulai,

              durasi: Number(
                form.durasi_magang
              ),

              satuan:
                form.satuan,

              tanggal_selesai:
                form.tanggal_selesai_custom ||
                undefined,

              divisi:
                form.divisi,
            },
          }
        );

      if (!aktif) {
        return;
      }

      setQuotaLoading(false);

      if (cekErr) {
        setQuota({
          error: true,
          message:
            'Gagal memeriksa kuota.',
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

  function pilihCv(e) {
    const file =
      e.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    const nama =
      file.name.toLowerCase();

    if (!nama.endsWith('.pdf')) {
      setCvFile(null);

      setFeedback({
        type: 'error',
        text:
          'CV / Resume harus berformat PDF.',
      });

      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setCvFile(null);

      setFeedback({
        type: 'error',
        text:
          'Ukuran CV / Resume maksimal 5 MB.',
      });

      return;
    }

    setFeedback(null);
    setCvFile(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setFeedback(null);

    if (!form.divisi) {
      setFeedback({
        type: 'error',
        text:
          'Pilih divisi yang diminati.',
      });

      return;
    }

    if (!cvFile) {
      setFeedback({
        type: 'error',
        text:
          'Lampirkan CV / Resume dalam format PDF.',
      });

      return;
    }

    const nomorBersih =
      form.nomor_whatsapp.replace(
        /[\s-]/g,
        ''
      );

    if (
      !/^(\+?62|0)8\d{7,12}$/.test(
        nomorBersih
      )
    ) {
      setFeedback({
        type: 'error',
        text:
          'Nomor WhatsApp tidak valid. Contoh: 081234567890.',
      });

      return;
    }

    setSubmitting(true);

    try {
      // ==================================================
      // CEK ULANG KUOTA SAAT SUBMIT
      // ==================================================

      const {
        data: cek,
        error: cekErr,
      } =
        await supabase.functions.invoke(
          'check-quota',
          {
            body: {
              tanggal_mulai:
                form.tanggal_mulai,

              durasi: Number(
                form.durasi_magang
              ),

              satuan:
                form.satuan,

              tanggal_selesai:
                form.tanggal_selesai_custom ||
                undefined,

              divisi:
                form.divisi,
            },
          }
        );

      if (cekErr) {
        throw new Error(
          'Gagal memeriksa kuota. Periksa koneksi internet lalu coba lagi.'
        );
      }

      if (cek?.error) {
        throw new Error(
          cek.message ??
            'Gagal memeriksa kuota.'
        );
      }

      if (!cek?.tersedia) {
        const detail =
          cek?.detail_bulan ?? [];

        if (
          cek?.tersedia_total ===
          false
        ) {
          const bulanPenuh =
            detail
              .filter(
                (m) =>
                  m.total_penuh
              )
              .map(
                (m) =>
                  m.bulan
              );

          throw new Error(
            `Kuota total magang penuh pada ${bulanPenuh.join(
              ', '
            )}. Pilih periode lain.`
          );
        }

        if (
          cek?.tersedia_divisi ===
          false
        ) {
          const bulanPenuh =
            detail
              .filter(
                (m) =>
                  m.divisi_penuh
              )
              .map(
                (m) =>
                  m.bulan
              );

          throw new Error(
            `Kuota divisi ${form.divisi} penuh pada ${bulanPenuh.join(
              ', '
            )}. Silakan pilih divisi atau periode lain.`
          );
        }

        throw new Error(
          'Kuota magang untuk periode ini tidak tersedia.'
        );
      }

      // ==================================================
      // UPLOAD CV
      // ==================================================

      const ext =
        cvFile.name
          .split('.')
          .pop()
          .toLowerCase();

      const path =
        `applications/` +
        `${Date.now()}-` +
        `${Math.random()
          .toString(36)
          .slice(2, 8)}.` +
        `${ext}`;

      const {
        error: upErr,
      } =
        await supabase.storage
          .from('intern-files')
          .upload(
            path,
            cvFile
          );

      if (upErr) {
        throw new Error(
          'Gagal mengunggah CV: ' +
            upErr.message
        );
      }

      // ==================================================
      // SIMPAN PENDAFTARAN
      // ==================================================

      const {
        error: insErr,
      } =
        await supabase
          .from('applications')
          .insert({
            nama_lengkap:
              form.nama_lengkap.trim(),

            email:
              form.email
                .trim()
                .toLowerCase(),

            nomor_whatsapp:
              form.nomor_whatsapp.trim(),

            instansi:
              form.instansi.trim(),

            divisi:
              form.divisi,

            portofolio_url:
              form.portofolio_url.trim() ||
              null,

            cv_url:
              path,

            tanggal_mulai:
              form.tanggal_mulai,

            durasi_magang:
              Number(
                form.durasi_magang
              ),

            satuan_durasi:
              form.satuan,

            tanggal_selesai_custom:
              form.tanggal_selesai_custom ||
              null,

            status_pendaftaran:
              'Pending',
          });

      if (insErr) {
        if (
          insErr.code ===
          '23505'
        ) {
          throw new Error(
            'Email ini sudah terdaftar sebagai pendaftar aktif.'
          );
        }

        throw new Error(
          'Gagal menyimpan pendaftaran: ' +
            insErr.message
        );
      }

      setSukses(true);
    } catch (err) {
      setFeedback({
        type: 'error',
        text:
          err?.message ??
          'Terjadi kesalahan saat mengirim pendaftaran.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  const selesaiEfektif =
    quota?.tanggal_selesai;

  const divisiAktif =
    DIVISI_INFO[
      form.divisi
    ] ?? null;

  if (sukses) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="anim-pop w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#16a34a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h2 className="mt-6 text-xl font-semibold text-slate-900">
            Pendaftaran Terkirim
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Pengajuanmu sudah kami
            terima. Tim Creativemu
            Academy akan menghubungimu
            melalui WhatsApp dan Email
            setelah proses seleksi.
          </p>

          <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500">
            Pastikan nomor WhatsApp dan
            email yang kamu masukkan
            tetap aktif agar informasi
            hasil seleksi tidak
            terlewat.
          </p>

          <Link
            to="/login"
            className="mt-7 inline-block w-full rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Kembali ke Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:py-12">
      <div className="mx-auto w-full max-w-lg">

        {/* =========================================
            HEADER
        ========================================= */}

        <div className="anim-up text-center">
          <img
            src="/images/logo-creativemu.png"
            alt="Creativemu Academy"
            className="mx-auto h-10 w-auto"
          />

          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900">
            Daftar Magang
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Isi formulir berikut untuk
            mengajukan magang di
            Creativemu Academy.
          </p>
        </div>

        {/* =========================================
            INFO SEBELUM MENDAFTAR
        ========================================= */}

        <div className="anim-up mt-6 rounded-2xl border border-purple-100 bg-purple-50/70 p-5 [animation-delay:70ms]">
          <p className="text-sm font-bold text-purple-800">
            📎 Sebelum mendaftar
          </p>

          <p className="mt-2 text-xs leading-relaxed text-purple-700">
            Siapkan data diri, periode
            magang, dan CV / Resume dalam
            format PDF. Portofolio dapat
            dilampirkan melalui link jika
            tersedia.
          </p>

          <div className="mt-4 rounded-xl border border-purple-100 bg-white/80 p-4">
            <p className="text-xs font-bold text-slate-700">
              🎓 Untuk siswa SMA / SMK
            </p>

            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              Kamu tetap boleh mendaftar
              meskipun belum memiliki
              pengalaman kerja. CV dapat
              berisi jurusan, kemampuan,
              organisasi, project sekolah,
              sertifikat, prestasi, atau
              karya pribadi yang pernah
              dibuat.
            </p>
          </div>

          <div className="mt-3 rounded-xl border border-purple-100 bg-white/80 p-4">
            <p className="text-xs font-bold text-slate-700">
              🏫 Surat Pengantar
            </p>

            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              Jika sekolah atau kampusmu
              memiliki Surat Pengantar
              Magang, siapkan dokumen
              tersebut sesuai ketentuan
              instansi. Form ini belum
              meminta upload Surat
              Pengantar.
            </p>
          </div>
        </div>

        {/* =========================================
            FORM
        ========================================= */}

        <form
          onSubmit={handleSubmit}
          className="anim-up mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 [animation-delay:100ms]"
        >

          {/* FEEDBACK */}

          {feedback && (
            <div className="anim-down mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-medium leading-relaxed text-red-600">
                {feedback.text}
              </p>
            </div>
          )}

          <div className="space-y-5">

            {/* =====================================
                DATA DIRI
            ===================================== */}

            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Data Diri
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Nama Lengkap
              </label>

              <input
                required
                value={form.nama_lengkap}
                onChange={(e) =>
                  update(
                    'nama_lengkap',
                    e.target.value
                  )
                }
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-[#9647FE] focus:ring-2 focus:ring-purple-200"
                placeholder="Nama sesuai identitas"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Email
              </label>

              <input
                type="email"
                required
                value={form.email}
                onChange={(e) =>
                  update(
                    'email',
                    e.target.value
                  )
                }
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-[#9647FE] focus:ring-2 focus:ring-purple-200"
                placeholder="nama@email.com"
              />

              <p className="mt-1.5 text-xs text-slate-400">
                Gunakan email yang aktif
                karena informasi akun
                magang dapat dikirim ke
                alamat ini.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Nomor WhatsApp
              </label>

              <input
                required
                inputMode="tel"
                value={
                  form.nomor_whatsapp
                }
                onChange={(e) =>
                  update(
                    'nomor_whatsapp',
                    e.target.value
                  )
                }
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-[#9647FE] focus:ring-2 focus:ring-purple-200"
                placeholder="08xxxxxxxxxx"
              />

              <p className="mt-1.5 text-xs text-slate-400">
                Pastikan nomor dapat
                menerima WhatsApp.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Asal Instansi
              </label>

              <input
                required
                value={form.instansi}
                onChange={(e) =>
                  update(
                    'instansi',
                    e.target.value
                  )
                }
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-[#9647FE] focus:ring-2 focus:ring-purple-200"
                placeholder="Contoh: SMK Negeri 1 ... / Universitas ..."
              />
            </div>

            {/* =====================================
                DIVISI
            ===================================== */}

            <div className="border-t border-slate-100 pt-5">
              <label className="text-sm font-medium text-slate-700">
                Divisi yang Diminati
              </label>

              <select
                required
                value={form.divisi}
                onChange={(e) =>
                  update(
                    'divisi',
                    e.target.value
                  )
                }
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-[#9647FE] focus:ring-2 focus:ring-purple-200"
              >
                <option value="">
                  Pilih divisi...
                </option>

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

              {divisiAktif ? (
                <div className="mt-3 rounded-xl border border-purple-100 bg-purple-50 p-3">
                  <p className="text-xs font-bold text-purple-700">
                    {divisiAktif.icon}{' '}
                    {divisiAktif.title}
                  </p>

                  <p className="mt-1 text-[11px] leading-relaxed text-purple-600">
                    {
                      divisiAktif.description
                    }
                  </p>
                </div>
              ) : (
                <p className="mt-1.5 text-xs text-slate-400">
                  Pilih bidang yang paling
                  sesuai dengan minat dan
                  kemampuanmu.
                </p>
              )}
            </div>

            {/* PORTOFOLIO */}

            <div>
              <label className="text-sm font-medium text-slate-700">
                Link Portofolio{' '}
                <span className="font-normal text-slate-400">
                  (opsional)
                </span>
              </label>

              <input
                value={
                  form.portofolio_url
                }
                onChange={(e) =>
                  update(
                    'portofolio_url',
                    e.target.value
                  )
                }
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-[#9647FE] focus:ring-2 focus:ring-purple-200"
                placeholder="GitHub, Behance, Google Drive, Instagram, dll."
              />

              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                Jika belum memiliki
                portofolio, bagian ini
                boleh dikosongkan.
              </p>
            </div>

            {/* =====================================
                PERIODE MAGANG
            ===================================== */}

            <div className="border-t border-slate-100 pt-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Periode Magang
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Tanggal Mulai
              </label>

              <input
                type="date"
                required
                min={HARI_INI}
                value={
                  form.tanggal_mulai
                }
                onChange={(e) =>
                  update(
                    'tanggal_mulai',
                    e.target.value
                  )
                }
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-[#9647FE] focus:ring-2 focus:ring-purple-200"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Durasi
              </label>

              <div className="mt-1.5 flex gap-2">
                <select
                  value={
                    form.satuan
                  }
                  onChange={(e) => {
                    update(
                      'satuan',
                      e.target.value
                    );

                    update(
                      'durasi_magang',
                      1
                    );
                  }}
                  className="w-28 rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#9647FE] focus:ring-2 focus:ring-purple-200"
                >
                  <option value="bulan">
                    Bulan
                  </option>

                  <option value="minggu">
                    Minggu
                  </option>
                </select>

                <select
                  value={
                    form.durasi_magang
                  }
                  onChange={(e) =>
                    update(
                      'durasi_magang',
                      Number(
                        e.target.value
                      )
                    )
                  }
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#9647FE] focus:ring-2 focus:ring-purple-200"
                >
                  {Array.from(
                    {
                      length:
                        form.satuan ===
                        'minggu'
                          ? 26
                          : 6,
                    },
                    (_, i) =>
                      i + 1
                  ).map((n) => (
                    <option
                      key={n}
                      value={n}
                    >
                      {n}{' '}
                      {form.satuan}
                    </option>
                  ))}
                </select>
              </div>

              {form.tanggal_mulai &&
                !form.tanggal_selesai_custom &&
                selesaiEfektif && (
                  <p className="mt-2 text-xs text-slate-400">
                    Berakhir otomatis:{' '}
                    {formatTanggalIndonesia(
                      selesaiEfektif
                    )}
                  </p>
                )}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Tanggal Selesai Khusus{' '}
                <span className="font-normal text-slate-400">
                  (opsional)
                </span>
              </label>

              <input
                type="date"
                value={
                  form.tanggal_selesai_custom
                }
                min={
                  form.tanggal_mulai ||
                  HARI_INI
                }
                onChange={(e) =>
                  update(
                    'tanggal_selesai_custom',
                    e.target.value
                  )
                }
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-[#9647FE] focus:ring-2 focus:ring-purple-200"
              />

              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                Gunakan jika sekolah /
                kampus menetapkan tanggal
                selesai tertentu. Jika
                tidak, kosongkan agar
                sistem menghitungnya dari
                durasi.
              </p>
            </div>

            {/* =====================================
                DOKUMEN
            ===================================== */}

            <div className="border-t border-slate-100 pt-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Dokumen
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                CV / Resume
              </label>

              <label
                className={`mt-1.5 flex cursor-pointer items-center justify-between rounded-lg border-2 px-4 py-4 transition ${
                  cvFile
                    ? 'border-green-400 bg-green-50'
                    : 'border-dashed border-slate-300 bg-white hover:border-purple-400 hover:bg-purple-50/30'
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={
                      cvFile
                        ? '#16a34a'
                        : '#94a3b8'
                    }
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line
                      x1="12"
                      y1="3"
                      x2="12"
                      y2="15"
                    />
                  </svg>

                  <div className="min-w-0">
                    <p
                      className={`truncate text-sm ${
                        cvFile
                          ? 'font-medium text-green-700'
                          : 'text-slate-500'
                      }`}
                    >
                      {cvFile
                        ? cvFile.name
                        : 'Unggah CV / Resume'}
                    </p>

                    <p className="mt-0.5 text-[10px] text-slate-400">
                      PDF · maksimal 5 MB
                    </p>
                  </div>
                </div>

                {cvFile && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#16a34a"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}

                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={pilihCv}
                  className="hidden"
                />
              </label>

              <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2.5">
                <p className="text-[10px] leading-relaxed text-slate-500">
                  <b>
                    Belum pernah bekerja?
                  </b>{' '}
                  Tidak masalah. CV untuk
                  siswa dapat berisi
                  pendidikan, jurusan,
                  skill, pengalaman
                  organisasi, project
                  sekolah, pelatihan,
                  sertifikat, atau
                  prestasi.
                </p>
              </div>
            </div>

            {/* =====================================
                QUOTA
            ===================================== */}

            {quotaLoading && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-xs font-medium text-slate-500">
                  Memeriksa kuota{' '}
                  {form.divisi}...
                </p>
              </div>
            )}

            {quota?.error && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-700">
                  Kuota belum dapat
                  diperiksa
                </p>

                <p className="mt-1 text-xs text-amber-600">
                  {quota.message ??
                    'Silakan coba lagi beberapa saat.'}
                </p>
              </div>
            )}

            {quota &&
              !quota.error &&
              quota.tersedia !==
                undefined && (
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
                      : quota.tersedia_total ===
                          false
                        ? 'Kuota total magang penuh'
                        : `Kuota divisi ${form.divisi} penuh`}
                  </p>

                  {!quota.tersedia &&
                    quota.tersedia_divisi ===
                      false &&
                    quota.tersedia_total !==
                      false && (
                      <p className="mt-1 text-xs leading-relaxed text-red-500">
                        Kamu dapat memilih
                        divisi lain yang
                        masih memiliki
                        kuota pada periode
                        yang sama.
                      </p>
                    )}

                  <div className="mt-3 space-y-3">
                    {quota.detail_bulan?.map(
                      (m) => (
                        <div
                          key={
                            m.bulan
                          }
                          className="rounded-lg border border-slate-200 bg-white p-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-700">
                              {
                                m.bulan
                              }
                            </span>

                            <span className="text-[11px] text-slate-400">
                              {
                                m.divisi
                              }
                            </span>
                          </div>

                          {/* TOTAL */}

                          <div className="mt-3">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-500">
                                Total
                                peserta
                              </span>

                              <span
                                className={
                                  m.total_penuh
                                    ? 'font-semibold text-red-500'
                                    : 'text-slate-600'
                                }
                              >
                                {
                                  m.total_terisi
                                }
                                /
                                {
                                  m.total_kuota
                                }
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
                                    m.total_kuota >
                                      0
                                      ? (m.total_terisi /
                                          m.total_kuota) *
                                          100
                                      : 100,
                                    100
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>

                          {/* DIVISI */}

                          <div className="mt-3">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-500">
                                Divisi{' '}
                                {
                                  m.divisi
                                }
                              </span>

                              <span
                                className={
                                  m.divisi_penuh
                                    ? 'font-semibold text-red-500'
                                    : 'text-slate-600'
                                }
                              >
                                {
                                  m.divisi_terisi
                                }
                                /
                                {
                                  m.divisi_kuota
                                }
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
                                    m.divisi_kuota >
                                      0
                                      ? (m.divisi_terisi /
                                          m.divisi_kuota) *
                                          100
                                      : 100,
                                    100
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

            {/* =====================================
                KONFIRMASI
            ===================================== */}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] leading-relaxed text-slate-500">
                Dengan mengirim formulir
                ini, pastikan nama,
                nomor WhatsApp, email,
                instansi, divisi, dan
                periode magang sudah
                benar. Data tersebut akan
                digunakan dalam proses
                seleksi dan pembuatan akun
                jika pendaftaran
                disetujui.
              </p>
            </div>

            {/* SUBMIT */}

            <button
              type="submit"
              disabled={
                submitting ||
                quotaLoading ||
                (
                  quota &&
                  !quota.error &&
                  quota.tersedia ===
                    false
                )
              }
              className="w-full rounded-lg bg-[#9647FE] py-3 text-sm font-semibold text-white transition hover:bg-[#7c36d9] focus:outline-none focus:ring-4 focus:ring-purple-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? 'Mengirim...'
                : quotaLoading
                  ? 'Memeriksa Kuota...'
                  : 'Kirim Pendaftaran'}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Sudah punya akun?{' '}
          <Link
            to="/login"
            className="font-semibold text-[#9647FE] hover:underline"
          >
            Masuk
          </Link>
        </p>
      </div>
    </div>
  );
}