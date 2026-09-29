import {
  useEffect,
  useState,
} from 'react';

import {
  Download,
  FileBadge2,
  GraduationCap,
} from 'lucide-react';

import {
  supabase,
} from '../../lib/supabaseClient';

import {
  useIntern,
} from '../../hooks/useIntern';

import {
  buatUrlFile,
} from '../../lib/api';

import {
  fmtTanggal,
} from '../../lib/format';

export default function Sertifikat() {
  const {
    intern,
    loading,
  } = useIntern();

  const [
    cert,
    setCert,
  ] = useState(null);

  const [
    url,
    setUrl,
  ] = useState(null);

  const [
    error,
    setError,
  ] = useState(null);

  useEffect(() => {
    if (!intern) {
      return;
    }

    let aktif = true;

    supabase
      .from(
        'certificates'
      )
      .select(
        `
        file_url,
        uploaded_at,
        nomor_sertifikat,
        tanggal_diterbitkan
        `
      )
      .eq(
        'intern_id',
        intern.id
      )
      .maybeSingle()
      .then(
        ({
          data,
          error: err,
        }) => {
          if (!aktif) {
            return;
          }

          if (err) {
            setError(
              err.message
            );

            return;
          }

          setCert(
            data ?? null
          );
        }
      );

    return () => {
      aktif = false;
    };
  }, [intern]);

  useEffect(() => {
    if (
      !cert?.file_url
    ) {
      setUrl(null);
      return;
    }

    let aktif = true;

    buatUrlFile(
      cert.file_url,
      3600
    )
      .then(
        (signedUrl) => {
          if (aktif) {
            setUrl(
              signedUrl
            );
          }
        }
      )
      .catch(
        (e) => {
          if (aktif) {
            setError(
              e.message
            );
          }
        }
      );

    return () => {
      aktif = false;
    };
  }, [cert]);

  async function unduh() {
    if (!url) {
      return;
    }

    try {
      const res =
        await fetch(url);

      const blob =
        await res.blob();

      const objectUrl =
        URL.createObjectURL(
          blob
        );

      const a =
        document.createElement(
          'a'
        );

      a.href =
        objectUrl;

      a.download =
        `Sertifikat - ${intern.nama_lengkap}.pdf`;

      a.click();

      URL.revokeObjectURL(
        objectUrl
      );
    } catch {
      window.open(
        url,
        '_blank'
      );
    }
  }

  if (loading) {
    return (
      <div>
        <div className="skeleton h-8 w-36 rounded-xl" />

        <div className="mt-6 skeleton h-80 rounded-3xl" />
      </div>
    );
  }

  const belumSelesai =
    intern.status_magang !==
    'Completed';

  const belumDiunggah =
    !cert ||
    !cert.file_url;

  return (
    <div>
      {/* HEADER */}
      <div className="anim-up">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
          Sertifikat
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Sertifikat akhir
          program magang
          Creativemu Academy.
        </p>
      </div>

      {error && (
        <div className="anim-down mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600">
          ⚠️ {error}
        </div>
      )}

      {/* ==================================================
          BELUM TERSEDIA
      ================================================== */}

      {(
        belumSelesai ||
        belumDiunggah
      ) && (
        <div className="anim-up mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white/80 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.4)] backdrop-blur-xl">

          <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500" />

          <div className="flex flex-col items-center px-6 py-12 text-center sm:px-10">

            <div className="anim-float flex h-20 w-20 items-center justify-center rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50 text-indigo-600 shadow-lg">
              <GraduationCap
                size={38}
              />
            </div>

            <h2 className="mt-6 text-xl font-extrabold text-slate-900">
              {belumSelesai
                ? 'Sertifikat Belum Tersedia'
                : 'Sertifikat Sedang Diproses'}
            </h2>

            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
              {belumSelesai
                ? 'Sertifikat akan diterbitkan setelah masa magang selesai dan nilai akhir peserta telah dihitung.'
                : 'Masa magangmu sudah selesai. Sertifikat sedang disiapkan oleh admin Creativemu Academy.'}
            </p>

            <div className="mt-5 inline-flex max-w-full flex-wrap items-center justify-center gap-1 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-md">
              <span>
                Status:
              </span>

              <span>
                {
                  intern.status_magang
                }
              </span>

              {intern.tanggal_selesai && (
                <>
                  <span>
                    ·
                  </span>

                  <span>
                    selesai{' '}
                    {fmtTanggal(
                      intern.tanggal_selesai
                    )}
                  </span>
                </>
              )}
            </div>

            {intern.keterangan_sertifikat && (
              <div className="mt-5 max-w-lg rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-700">
                {
                  intern.keterangan_sertifikat
                }
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================
          SUDAH TERBIT
      ================================================== */}

      {!belumSelesai &&
        !belumDiunggah && (
          <>
            <div className="anim-up mt-6 overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-500 to-green-600 p-5 text-white shadow-xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md">
                    <FileBadge2
                      size={24}
                    />
                  </div>

                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-green-100">
                      Sertifikat
                      Tersedia
                    </p>

                    <h2 className="mt-1 text-lg font-extrabold">
                      Sertifikat
                      kamu sudah
                      terbit 🎉
                    </h2>

                    <p className="mt-1 text-xs text-green-100">
                      Diunggah{' '}
                      {new Date(
                        cert.uploaded_at ??
                          Date.now()
                      ).toLocaleDateString(
                        'id-ID',
                        {
                          day:
                            'numeric',

                          month:
                            'long',

                          year:
                            'numeric',
                        }
                      )}
                    </p>

                    {cert.nomor_sertifikat && (
                      <p className="mt-1 text-xs text-green-100">
                        Nomor:{' '}
                        {
                          cert.nomor_sertifikat
                        }
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    unduh
                  }
                  disabled={!url}
                  className="btn-press flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-extrabold text-green-700 shadow-lg transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download
                    size={18}
                  />

                  Download PDF
                </button>
              </div>
            </div>

            {/* PDF PREVIEW */}
            {url ? (
              <div className="anim-up mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white/80 shadow-lg backdrop-blur-xl">
                <div className="border-b border-slate-200 px-4 py-3">
                  <p className="text-sm font-bold text-slate-700">
                    Pratinjau
                    Sertifikat
                  </p>
                </div>

                <iframe
                  src={url}
                  title="Sertifikat Magang"
                  className="h-[70vh] w-full bg-white"
                />
              </div>
            ) : (
              <div className="anim-up mt-5 flex justify-center rounded-3xl border border-slate-200 bg-white/80 p-10 shadow-sm backdrop-blur-xl">
                <span className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-indigo-600" />
              </div>
            )}
          </>
        )}
    </div>
  );
}