
import { useEffect, useState } from 'react';
import {
  FolderKanban,
  CalendarDays,
  ChevronDown,
  UploadCloud,
  Link2,
  Paperclip,
  FileText,
  Send,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  RotateCcw,
  LockKeyhole,
  Sparkles,
} from 'lucide-react';

import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useIntern } from '../../hooks/useIntern';
import { buatUrlFile } from '../../lib/api';
import { fmtTanggal } from '../../lib/format';
import Modal from '../../components/Modal';
import { CountUp } from '../../components/Skeleton';

const BADGE_STATUS = {
  Belum: 'bg-slate-100 text-slate-600',
  'Menunggu Review': 'bg-amber-100 text-amber-700',
  Revisi: 'bg-red-100 text-red-600',
  Selesai: 'bg-emerald-100 text-emerald-700',
};

const STRIP_STATUS = {
  Belum: 'bg-slate-300',
  'Menunggu Review': 'bg-amber-400',
  Revisi: 'bg-red-400',
  Selesai: 'bg-emerald-500',
};

const LABEL_STATUS = {
  Belum: 'Belum dikerjakan',
  'Menunggu Review': 'Di Review',
  Revisi: 'Perlu Revisi',
  Selesai: 'Selesai',
};

const NILAI_WARNA = {
  A: 'bg-emerald-600',
  B: 'bg-teal-500',
  C: 'bg-amber-400',
  D: 'bg-orange-500',
  E: 'bg-red-500',
};

const FORMAT_FILE = [
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'zip',
  'doc',
  'docx',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const MOTION = `
@keyframes pjEnter {
  from {
    opacity: 0;
    transform: translateY(15px) scale(.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes pjPop {
  0% {
    opacity: 0;
    transform: scale(.94);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.pj-enter {
  animation: pjEnter .45s cubic-bezier(.2,.8,.2,1) both;
}

.pj-pop {
  animation: pjPop .28s ease both;
}

.pj-card {
  transition:
    transform .25s ease,
    border-color .25s ease,
    box-shadow .25s ease;
}

.pj-card:hover {
  transform: translateY(-2px);
  border-color: rgba(99,102,241,.25);
  box-shadow: 0 15px 35px rgba(15,23,42,.06);
}

.pj-button {
  transition:
    transform .16s ease,
    background-color .2s ease,
    box-shadow .2s ease;
}

.pj-button:not(:disabled):hover {
  transform: translateY(-1px);
}

.pj-button:not(:disabled):active {
  transform: scale(.97);
}

.pj-input {
  transition:
    border-color .2s ease,
    box-shadow .2s ease;
}

.pj-input:focus {
  border-color: #818cf8;
  box-shadow: 0 0 0 4px rgba(99,102,241,.10);
}

@media (prefers-reduced-motion: reduce) {
  .pj-enter,
  .pj-pop {
    animation: none !important;
  }

  .pj-card,
  .pj-button,
  .pj-input {
    transition: none !important;
  }

  .pj-card:hover,
  .pj-button:hover,
  .pj-button:active {
    transform: none !important;
  }
}
`;

function tanggalWib() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function normalisasiLink(value) {
  const raw = String(value || '').trim();

  if (!raw) return null;

  if (raw.length > 2048) {
    throw new Error('Link maksimal 2048 karakter.');
  }

  if (/\s/.test(raw)) {
    throw new Error('Link tidak boleh mengandung spasi.');
  }

  let url;

  try {
    url = new URL(raw);
  } catch {
    throw new Error('Format link tidak valid.');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Link harus diawali http:// atau https://.');
  }

  if (!url.hostname || url.username || url.password) {
    throw new Error('Alamat link tidak valid.');
  }

  return raw;
}

function bukaLink(url) {
  const valid = normalisasiLink(url);

  if (valid) {
    window.open(valid, '_blank', 'noopener,noreferrer');
  }
}

function sudahLewat(tanggal) {
  return Boolean(tanggal && tanggal < tanggalWib());
}

export default function Projek() {
  const { user } = useAuth();
  const { intern, loading } = useIntern();

  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);

  const [toast, setToast] = useState(null);
  const [kumpul, setKumpul] = useState(null);

  const [file, setFile] = useState(null);
  const [link, setLink] = useState('');
  const [catatan, setCatatan] = useState('');
  const [metode, setMetode] = useState('file');

  const [busy, setBusy] = useState(false);
  const [projekBuka, setProjekBuka] = useState(null);

  useEffect(() => {
    if (intern?.id) {
      muat(intern.id);
    }
  }, [intern?.id]);

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast(null);
    }, 4500);

    return () => clearTimeout(timer);
  }, [toast]);

  async function muat(internId = intern?.id) {
    if (!internId) return;

    setLoadingItems(true);

    try {
      const { data, error } = await supabase
        .from('subtasks')
        .select(`
          *,
          projects(
            id,
            judul_projek,
            deskripsi,
            deadline_projek
          )
        `)
        .eq('intern_id', internId)
        .order('created_at');

      if (error) throw error;

      setItems(data ?? []);
    } catch (err) {
      setToast({
        tipe: 'err',
        teks: err.message || 'Gagal memuat proyek.',
      });
    } finally {
      setLoadingItems(false);
    }
  }

  function bukaPengumpulan(subtask) {
    if (!['Belum', 'Menunggu Review', 'Revisi'].includes(subtask.status)) {
      return;
    }

    setKumpul(subtask);
    setFile(null);
    setLink(subtask.link_bukti ?? '');
    setCatatan(subtask.catatan_pengumpulan ?? '');

    if (subtask.file_bukti && subtask.link_bukti) {
      setMetode('both');
    } else if (subtask.link_bukti) {
      setMetode('link');
    } else {
      setMetode('file');
    }
  }

  function tutupPengumpulan() {
    if (busy) return;

    setKumpul(null);
    setFile(null);
    setLink('');
    setCatatan('');
    setMetode('file');
  }

  async function bukaBukti(path) {
    try {
      const url = await buatUrlFile(path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setToast({
        tipe: 'err',
        teks: err.message || 'Gagal membuka file.',
      });
    }
  }

  function lihatLink(url) {
    try {
      bukaLink(url);
    } catch (err) {
      setToast({
        tipe: 'err',
        teks: err.message || 'Link tidak valid.',
      });
    }
  }

  async function kirim(e) {
    e.preventDefault();

    if (busy || !kumpul || !user?.id || !intern?.id) return;

    setToast(null);

    const menggunakanFile =
      metode === 'file' || metode === 'both';

    const menggunakanLink =
      metode === 'link' || metode === 'both';

    let linkValid = null;

    try {
      if (menggunakanLink) {
        linkValid = normalisasiLink(link);
      }
    } catch (err) {
      setToast({ tipe: 'err', teks: err.message });
      return;
    }

    // Pertahankan file/link lama kecuali peserta
    // secara eksplisit menggantinya.
    const fileLama = kumpul.file_bukti || null;
    const linkLama = kumpul.link_bukti || null;

    const adaFile = Boolean(file || fileLama);
    const adaLink = Boolean(
      menggunakanLink ? linkValid : linkLama
    );

    if (!adaFile && !adaLink) {
      setToast({
        tipe: 'err',
        teks: 'Tambahkan minimal satu bukti: file atau link.',
      });
      return;
    }

    if (menggunakanFile && file) {
      const ekstensi = file.name
        .split('.')
        .pop()
        ?.toLowerCase();

      if (file.size > MAX_FILE_SIZE) {
        setToast({
          tipe: 'err',
          teks: 'Ukuran file maksimal 5 MB.',
        });
        return;
      }

      if (!FORMAT_FILE.includes(ekstensi)) {
        setToast({
          tipe: 'err',
          teks: 'Format file tidak didukung.',
        });
        return;
      }
    }

    setBusy(true);

    let uploadedPath = null;
    let berhasilSimpan = false;

    try {
      // Baca status terbaru untuk menghindari update
      // tugas yang telah dinilai saat modal masih terbuka.
      const { data: terkini, error: cekError } = await supabase
        .from('subtasks')
        .select('id, status, file_bukti, link_bukti')
        .eq('id', kumpul.id)
        .eq('intern_id', intern.id)
        .single();

      if (cekError) throw cekError;

      if (!['Belum', 'Menunggu Review', 'Revisi'].includes(terkini.status)) {
        throw new Error(
          'Tugas sudah diproses mentor. Muat ulang halaman.'
        );
      }

      let path = terkini.file_bukti || null;

      if (menggunakanFile && file) {
        const ext = file.name
          .split('.')
          .pop()
          .toLowerCase();

        const uniqueId =
          globalThis.crypto?.randomUUID?.() ||
          `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        uploadedPath =
          `${user.id}/subtasks/${kumpul.id}/${uniqueId}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('intern-files')
          .upload(uploadedPath, file);

        if (uploadError) {
          throw new Error(
            `Gagal upload file: ${uploadError.message}`
          );
        }

        path = uploadedPath;
      }

      const finalLink = menggunakanLink
        ? linkValid
        : terkini.link_bukti || null;

      if (!path && !finalLink) {
        throw new Error(
          'Minimal satu file atau link harus tersedia.'
        );
      }

      const { data: updated, error: saveError } =
        await supabase
          .from('subtasks')
          .update({
            status: 'Menunggu Review',
            file_bukti: path,
            link_bukti: finalLink,
            catatan_pengumpulan: catatan.trim() || null,
            submitted_at: new Date().toISOString(),
          })
          .eq('id', kumpul.id)
          .eq('intern_id', intern.id)
          .in('status', [
            'Belum',
            'Menunggu Review',
            'Revisi',
          ])
          .select('id');

      if (saveError) throw saveError;

      if (!updated?.length) {
        throw new Error(
          'Status tugas sudah berubah. Silakan refresh.'
        );
      }

      berhasilSimpan = true;

      tutupPengumpulanSetelahBerhasil();

      await muat();

      setToast({
        tipe: 'ok',
        teks: 'Tugas berhasil dikumpulkan. Menunggu review pembimbing.',
      });
    } catch (err) {
      if (uploadedPath && !berhasilSimpan) {
        const { error: cleanupError } = await supabase.storage
          .from('intern-files')
          .remove([uploadedPath]);

        if (cleanupError) {
          console.error(
            'Gagal membersihkan file sementara:',
            cleanupError
          );
        }
      }

      setToast({
        tipe: 'err',
        teks: err.message || 'Gagal mengirim pengumpulan.',
      });
    } finally {
      setBusy(false);
    }
  }

  function tutupPengumpulanSetelahBerhasil() {
    setKumpul(null);
    setFile(null);
    setLink('');
    setCatatan('');
    setMetode('file');
  }

  const projekMap = new Map();

  items.forEach((subtask) => {
    const proyek = subtask.projects;

    if (!proyek?.id) return;

    if (!projekMap.has(proyek.id)) {
      projekMap.set(proyek.id, {
        ...proyek,
        subtasks: [],
      });
    }

    projekMap.get(proyek.id).subtasks.push(subtask);
  });

  const projekList = [...projekMap.values()];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-9 w-48 rounded-xl" />
        <div className="skeleton h-44 rounded-2xl" />
        <div className="skeleton h-44 rounded-2xl" />
      </div>
    );
  }

  if (!intern) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-700">
        Data peserta magang belum tersedia.
      </div>
    );
  }

  if (intern.tanggal_mulai > tanggalWib()) {
    return (
      <div className="space-y-6 pb-8">
        <style>{MOTION}</style>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Projek &amp; Tugas
        </h1>

        <div className="pj-enter rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <LockKeyhole size={30} />
          </div>

          <h2 className="mt-4 text-lg font-semibold text-slate-800">
            Tugas Belum Tersedia
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Masa magangmu dimulai pada{' '}
            {fmtTanggal(intern.tanggal_mulai)}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <style>{MOTION}</style>

      {/* HEADER */}

      <header className="pj-enter flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Projek &amp; Tugas
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Pantau pekerjaan dan kumpulkan hasil tugasmu.
          </p>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
          <FolderKanban size={15} className="text-indigo-600" />
          {projekList.length} projek
        </span>
      </header>

      {/* TOAST */}

      {toast && (
        <div
          role={toast.tipe === 'ok' ? 'status' : 'alert'}
          className={`pj-pop flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${
            toast.tipe === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <span className="flex items-start gap-2">
            {toast.tipe === 'ok' ? (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            ) : (
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
            )}

            {toast.teks}
          </span>

          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Tutup notifikasi"
            className="pj-button rounded-lg p-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* DAFTAR PROJEK */}

      {loadingItems ? (
        <div className="space-y-3">
          <div className="skeleton h-44 rounded-3xl" />
          <div className="skeleton h-44 rounded-3xl" />
        </div>
      ) : projekList.length === 0 ? (
        <div className="pj-enter rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <FolderKanban
            size={32}
            className="mx-auto text-indigo-400"
          />

          <h2 className="mt-4 text-base font-semibold text-slate-800">
            Belum Ada Tugas
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Projek dan subtugas dari pembimbing akan muncul di sini.
          </p>
        </div>
      ) : (
        <div className="space-y-4">

          {projekList.map((p, index) => {
            const total = p.subtasks.length;

            const selesai = p.subtasks.filter(
              (s) => s.status === 'Selesai'
            ).length;

            const persen = total
              ? Math.round((selesai * 100) / total)
              : 0;

            const telatProjek =
              sudahLewat(p.deadline_projek) &&
              persen < 100;

            const buka = projekBuka === p.id;

            return (
              <article
                key={p.id}
                className="pj-enter pj-card overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm"
                style={{
                  animationDelay: `${Math.min(index * 65, 400)}ms`,
                }}
              >

                {/* PROJECT HEADER */}

                <button
                  type="button"
                  aria-expanded={buka}
                  onClick={() => setProjekBuka(buka ? null : p.id)}
                  className="w-full p-5 text-left sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">

                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <FolderKanban size={21} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h2 className="break-words text-base font-semibold text-slate-900">
                          {p.judul_projek}
                        </h2>

                        <p className={`mt-1.5 flex items-center gap-1.5 text-xs ${
                          telatProjek
                            ? 'text-red-500'
                            : 'text-slate-500'
                        }`}>
                          <CalendarDays size={14} />

                          {p.deadline_projek
                            ? fmtTanggal(p.deadline_projek)
                            : 'Tanpa deadline'}

                          {telatProjek && ' — terlambat'}
                        </p>

                        {p.deskripsi && (
                          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                            {p.deskripsi}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className={`text-2xl font-bold ${
                        persen === 100
                          ? 'text-emerald-600'
                          : 'text-slate-900'
                      }`}>
                        <CountUp value={persen} suffix="%" />
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {selesai}/{total} selesai
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        persen === 100
                          ? 'bg-emerald-500'
                          : 'bg-indigo-600'
                      }`}
                      style={{ width: `${persen}%` }}
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>
                      {total} subtugas
                    </span>

                    <span className="flex items-center gap-1">
                      {buka ? 'Tutup rincian' : 'Lihat subtugas'}

                      <ChevronDown
                        size={16}
                        className={`transition-transform duration-300 ${
                          buka ? 'rotate-180' : ''
                        }`}
                      />
                    </span>
                  </div>
                </button>

                {/* SUBTASKS */}

                {buka && (
                  <div className="pj-enter divide-y divide-slate-100 border-t border-slate-100">

                    {p.subtasks.map((s) => {
                      const telat =
                        sudahLewat(s.deadline) &&
                        s.status !== 'Selesai';

                      return (
                        <div
                          key={s.id}
                          className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-slate-50/60 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                        >
                          <div className="flex min-w-0 flex-1 items-start gap-3">

                            <div className={`mt-1 h-9 w-1 shrink-0 rounded-full ${
                              STRIP_STATUS[s.status] || 'bg-slate-300'
                            }`} />

                            <div className="min-w-0 flex-1">

                              <h3 className={`text-sm font-semibold ${
                                s.status === 'Selesai'
                                  ? 'text-slate-400 line-through'
                                  : 'text-slate-800'
                              }`}>
                                {s.judul}
                              </h3>

                              {s.deskripsi && (
                                <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-slate-500">
                                  {s.deskripsi}
                                </p>
                              )}

                              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">

                                {s.deadline && (
                                  <span className={`flex items-center gap-1 ${
                                    telat
                                      ? 'font-semibold text-red-500'
                                      : 'text-slate-400'
                                  }`}>
                                    <CalendarDays size={13} />
                                    {fmtTanggal(s.deadline)}
                                    {telat ? ' — terlambat' : ''}
                                  </span>
                                )}

                                {s.file_bukti && (
                                  <button
                                    type="button"
                                    onClick={() => bukaBukti(s.file_bukti)}
                                    className="pj-button flex items-center gap-1 font-medium text-indigo-600 hover:underline"
                                  >
                                    <Paperclip size={13} />
                                    File
                                  </button>
                                )}

                                {s.link_bukti && (
                                  <button
                                    type="button"
                                    onClick={() => lihatLink(s.link_bukti)}
                                    className="pj-button flex items-center gap-1 font-medium text-indigo-600 hover:underline"
                                  >
                                    <Link2 size={13} />
                                    Link
                                    <ExternalLink size={11} />
                                  </button>
                                )}

                              </div>

                              {s.status === 'Revisi' && s.catatan_revisi && (
                                <div className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3">
                                  <p className="flex items-center gap-1.5 text-xs font-semibold text-red-700">
                                    <RotateCcw size={14} />
                                    Catatan revisi mentor
                                  </p>

                                  <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-red-600">
                                    {s.catatan_revisi}
                                  </p>
                                </div>
                              )}

                              {s.catatan_pengumpulan && s.status !== 'Revisi' && (
                                <p className="mt-2 whitespace-pre-wrap break-words text-xs italic text-slate-500">
                                  {s.catatan_pengumpulan}
                                </p>
                              )}

                            </div>
                          </div>

                          {/* STATUS & ACTIONS */}

                          <div className="flex shrink-0 flex-wrap items-center gap-2">

                            {s.nilai && (
                              <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white ${
                                NILAI_WARNA[s.nilai] || 'bg-slate-400'
                              }`}>
                                {s.nilai}
                              </span>
                            )}

                            <span className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                              BADGE_STATUS[s.status] ||
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {LABEL_STATUS[s.status] || s.status}
                            </span>

                            {['Belum', 'Menunggu Review', 'Revisi'].includes(s.status) && (
                              <button
                                type="button"
                                onClick={() => bukaPengumpulan(s)}
                                className={`pj-button h-9 rounded-xl px-4 text-xs font-semibold text-white ${
                                  s.status === 'Revisi'
                                    ? 'bg-red-500 hover:bg-red-600'
                                    : 'bg-indigo-600 hover:bg-indigo-700'
                                }`}
                              >
                                {s.status === 'Belum'
                                  ? 'Kumpulkan'
                                  : s.status === 'Revisi'
                                    ? 'Perbaiki'
                                    : 'Perbarui'}
                              </button>
                            )}

                          </div>
                        </div>
                      );
                    })}

                  </div>
                )}

              </article>
            );
          })}

        </div>
      )}

      {/* SUBMISSION MODAL */}

      <Modal
        open={!!kumpul}
        onClose={tutupPengumpulan}
        title={
          kumpul?.status === 'Revisi'
            ? 'Perbaiki Pengumpulan'
            : kumpul?.status === 'Menunggu Review'
              ? 'Perbarui Pengumpulan'
              : 'Kumpulkan Subtugas'
        }
      >
        {kumpul && (
          <form onSubmit={kirim} className="space-y-5">

            <div className="rounded-2xl bg-[#F8F9FC] p-4">

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <FileText size={19} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {kumpul.judul}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Hasil pekerjaan akan dikirim ke pembimbing
                    untuk diperiksa dan dinilai.
                  </p>
                </div>
              </div>

            </div>

            {kumpul.status === 'Revisi' && kumpul.catatan_revisi && (
              <div className="pj-pop rounded-xl border border-red-100 bg-red-50 p-4">
                <p className="text-xs font-semibold text-red-700">
                  Catatan revisi
                </p>

                <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-red-600">
                  {kumpul.catatan_revisi}
                </p>
              </div>
            )}

            {/* METODE PENGUMPULAN */}

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-700">
                Metode Pengumpulan
              </label>

              <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1">

                {[
                  { key: 'file', title: 'File', Icon: UploadCloud },
                  { key: 'link', title: 'Link', Icon: Link2 },
                  { key: 'both', title: 'Keduanya', Icon: Sparkles },
                ].map((option) => {
                  const Icon = option.Icon;
                  const active = metode === option.key;

                  return (
                    <button
                      type="button"
                      key={option.key}
                      disabled={busy}
                      aria-pressed={active}
                      onClick={() => setMetode(option.key)}
                      className={`pj-button flex flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-xs font-semibold ${
                        active
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      } disabled:opacity-50`}
                    >
                      <Icon size={18} />
                      {option.title}
                    </button>
                  );
                })}

              </div>

              <p className="mt-2 text-[11px] text-slate-400">
                Pilih salah satu cara pengumpulan. Bukti yang
                sebelumnya tersimpan tidak dihapus otomatis.
              </p>
            </div>

            {/* FILE */}

            {(metode === 'file' || metode === 'both') && (
              <div className="pj-enter">
                <label className="mb-2 block text-xs font-semibold text-slate-700">
                  File Hasil Pekerjaan
                </label>

                <div className="rounded-2xl border border-dashed border-slate-300 bg-[#FAFAFC] p-4">

                  <UploadCloud
                    size={23}
                    className="mx-auto text-indigo-500"
                  />

                  <p className="mt-2 text-center text-xs font-medium text-slate-600">
                    Upload laporan atau hasil pekerjaan
                  </p>

                  <p className="mt-1 text-center text-[11px] text-slate-400">
                    PDF, gambar, ZIP, DOC, DOCX — maksimal 5 MB
                  </p>

                  <input
                    type="file"
                    disabled={busy}
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.zip,.doc,.docx"
                    onChange={(e) =>
                      setFile(e.target.files?.[0] ?? null)
                    }
                    className="mt-4 block w-full text-xs text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-indigo-50 file:px-4 file:py-2.5 file:text-xs file:font-semibold file:text-indigo-600"
                  />

                </div>

                {file && (
                  <p className="pj-pop mt-2 flex items-center gap-2 text-xs text-indigo-600">
                    <Paperclip size={14} />
                    {file.name}
                  </p>
                )}

                {kumpul.file_bukti && (
                  <button
                    type="button"
                    onClick={() => bukaBukti(kumpul.file_bukti)}
                    className="pj-button mt-2 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    <Paperclip size={14} />
                    Lihat file yang sudah tersimpan
                  </button>
                )}
              </div>
            )}

            {/* LINK */}

            {(metode === 'link' || metode === 'both') && (
              <div className="pj-enter">

                <label
                  htmlFor="pengumpulan-link"
                  className="mb-2 block text-xs font-semibold text-slate-700"
                >
                  Link Hasil Pekerjaan
                </label>

                <div className="relative">

                  <Link2
                    size={17}
                    className="pointer-events-none absolute left-4 top-3.5 text-slate-400"
                  />

                  <input
                    id="pengumpulan-link"
                    type="url"
                    maxLength={2048}
                    disabled={busy}
                    placeholder="https://drive.google.com/..."
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    className="pj-input h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none placeholder:text-slate-400"
                  />

                </div>

                <p className="mt-2 text-[11px] leading-5 text-slate-400">
                  Bisa menggunakan Google Drive, GitHub, Figma,
                  Canva, Google Docs, atau URL hasil pekerjaan.
                  Pastikan mentor memiliki izin untuk membuka link.
                </p>

                {link.trim() && (
                  <button
                    type="button"
                    onClick={() => lihatLink(link)}
                    className="pj-button mt-2 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    <ExternalLink size={14} />
                    Coba buka link
                  </button>
                )}

              </div>
            )}

            {/* EXISTING EVIDENCE */}

            {(kumpul.file_bukti || kumpul.link_bukti) && (
              <div className="rounded-xl bg-emerald-50 px-4 py-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 size={15} />
                  Bukti sebelumnya tersimpan
                </p>

                <p className="mt-1 text-[11px] leading-5 text-emerald-600">
                  Kamu bisa memperbarui pengumpulan tanpa harus
                  mengunggah ulang bukti yang tidak berubah.
                </p>
              </div>
            )}

            {/* NOTES */}

            <div>
              <label
                htmlFor="pengumpulan-catatan"
                className="mb-2 block text-xs font-semibold text-slate-700"
              >
                Catatan untuk Pembimbing
              </label>

              <textarea
                id="pengumpulan-catatan"
                rows={3}
                disabled={busy}
                placeholder="Jelaskan hasil pekerjaan yang sudah kamu selesaikan..."
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="pj-input w-full resize-y rounded-xl border border-slate-200 p-3 text-sm leading-6 outline-none"
              />
            </div>

            {/* ACTIONS */}

            <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">

              <button
                type="button"
                disabled={busy}
                onClick={tutupPengumpulan}
                className="pj-button h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={busy}
                className="pj-button inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {busy ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <Send size={16} />
                )}

                {busy ? 'Mengirim...' : 'Kirim ke Pembimbing'}
              </button>

            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
