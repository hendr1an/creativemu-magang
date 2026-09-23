import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useIntern } from '../../hooks/useIntern';
import { buatUrlFile } from '../../lib/api';
import { fmtTanggal } from '../../lib/format';

export default function Sertifikat() {
  const { intern, loading } = useIntern();
  const [cert, setCert] = useState(null);
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!intern) return;
    supabase.from('certificates')
      .select('file_url, uploaded_at')
      .eq('intern_id', intern.id)
      .maybeSingle()
      .then(({ data }) => setCert(data ?? null));
  }, [intern]);

  useEffect(() => {
    if (cert?.file_url) {
      buatUrlFile(cert.file_url, 3600)
        .then(setUrl)
        .catch((e) => setError(e.message));
    }
  }, [cert]);

  async function unduh() {
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `Sertifikat - ${intern.nama_lengkap}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, '_blank');
    }
  }

  if (loading) return (
    <div>
      <div className="skeleton h-8 w-36 rounded-xl" />
      <div className="mt-6 skeleton h-80 rounded-2xl" />
    </div>
  );

  const belumSelesai = intern.status_magang !== 'Completed';
  const belumDiunggah = !cert || !cert.file_url;

  if (belumSelesai || belumDiunggah) {
    return (
      <div>
        <div className="anim-up">
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Sertifikat</h1>
        </div>

        <div className="anim-up mt-6 flex flex-col items-center rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 p-12 text-center">
          <p className="anim-float text-6xl">🎓</p>
          <h2 className="mt-5 text-lg font-extrabold text-slate-700">
            {belumSelesai ? 'Sertifikat Belum Tersedia' : 'Sertifikat Sedang Diproses'}
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
            {belumSelesai
              ? <>Sertifikat terbit setelah masa magang selesai dan nilai akhir dihitung.<br />
                 <span className="mt-1 inline-block rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-500">
                   Status: {intern.status_magang} · selesai {fmtTanggal(intern.tanggal_selesai)}
                 </span></>
              : <>Masa magangmu sudah selesai 🎉<br />Sertifikat sedang disiapkan admin — tunggu kabar! 📩</>}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="anim-up">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Sertifikat</h1>
      </div>

      {error && (
        <p className="anim-down mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-600">⚠️ {error}</p>
      )}

      {/* info */}
      <div className="anim-up mt-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 p-5 text-white shadow-xl [animation-delay:80ms]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-green-100">
              🎉 Sertifikat Kamu Sudah Terbit!
            </p>
            <p className="mt-1.5 text-sm font-medium text-green-50">
              Diunggah {new Date(cert.uploaded_at ?? Date.now()).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button onClick={unduh} disabled={!url}
            className="btn-press rounded-xl bg-white px-6 py-3 text-sm font-extrabold text-green-700 shadow-lg hover:bg-green-50 disabled:opacity-50">
            📥 Download PDF
          </button>
        </div>
      </div>

      {/* pratinjau PDF */}
      {url ? (
        <div className="anim-up mt-5 overflow-hidden rounded-2xl border border-slate-200 shadow-lg [animation-delay:160ms]">
          <iframe src={url} title="Sertifikat Magang"
            className="h-[70vh] w-full bg-white" />
        </div>
      ) : (
        <div className="anim-up mt-5 flex justify-center rounded-2xl bg-white p-10 shadow-sm [animation-delay:160ms]">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-indigo-600" />
        </div>
      )}
    </div>
  );
}