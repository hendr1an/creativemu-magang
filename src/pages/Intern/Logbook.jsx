
import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  FilePenLine,
  PenLine,
  Save,
  X,
  Trash2,
  CheckCircle2,
  AlertCircle,
  LockKeyhole,
  Clock3,
  ChevronDown,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

import { supabase } from '../../lib/supabaseClient';
import { useIntern } from '../../hooks/useIntern';
import { fmtTanggal } from '../../lib/format';
import ConfirmModal from '../../components/ConfirmModal';

function hariIniWib() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function formKosong() {
  return {
    tanggal: hariIniWib(),
    judul: '',
    isi: '',
  };
}

const FIELD =
  'lb-input w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50';

const LABEL =
  'mb-2 block text-xs font-semibold tracking-wide text-slate-600';

const MOTION = `
@keyframes lbEnter {
  from {
    opacity: 0;
    transform: translateY(18px) scale(.985);
    filter: blur(3px);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}
@keyframes lbPop {
  0% { opacity:0; transform:scale(.94); }
  75% { opacity:1; transform:scale(1.02); }
  100% { opacity:1; transform:scale(1); }
}
.lb-enter {
  animation: lbEnter .48s cubic-bezier(.2,.8,.2,1) both;
}
.lb-pop {
  animation: lbPop .35s cubic-bezier(.2,.8,.2,1) both;
}
.lb-card {
  transition:
    transform .28s cubic-bezier(.2,.8,.2,1),
    box-shadow .28s ease,
    border-color .28s ease;
}
.lb-card:hover {
  transform: translateY(-3px);
  border-color:rgba(99,102,241,.25);
  box-shadow:0 18px 42px rgba(15,23,42,.065);
}
.lb-button {
  transition:
    transform .17s ease,
    background-color .2s ease,
    box-shadow .2s ease;
}
.lb-button:not(:disabled):hover {
  transform:translateY(-1px);
}
.lb-button:not(:disabled):active {
  transform:scale(.97);
}
.lb-input {
  transition:border-color .2s ease,box-shadow .2s ease;
}
.lb-expand {
  display:grid;
  grid-template-rows:0fr;
  opacity:0;
  transition:grid-template-rows .32s ease,opacity .32s ease;
}
.lb-expand.open {
  grid-template-rows:1fr;
  opacity:1;
}
.lb-expand > div {
  min-height:0;
  overflow:hidden;
}
@media (prefers-reduced-motion:reduce) {
  .lb-enter,.lb-pop {
    animation:none!important;
  }
  .lb-card,.lb-button,.lb-input,.lb-expand {
    transition:none!important;
  }
  .lb-card:hover,
  .lb-button:hover,
  .lb-button:active {
    transform:none!important;
  }
}
`;

export default function Logbook() {
  const { intern, loading } = useIntern();

  const formRef = useRef(null);

  const [form, setForm] = useState(formKosong);
  const [entri, setEntri] = useState([]);
  const [editId, setEditId] = useState(null);

  const [busy, setBusy] = useState(false);
  const [loadingEntri, setLoadingEntri] = useState(true);
  const [pesan, setPesan] = useState(null);
  const [hapusTarget, setHapusTarget] = useState(null);

  const [expanded, setExpanded] = useState({});
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (intern?.id) {
      muat(intern.id);
    }
  }, [intern?.id]);

  async function muat(internId = intern?.id) {
    if (!internId) return;

    setLoadingEntri(true);

    try {
      const { data, error } = await supabase
        .from('logbook')
        .select('*')
        .eq('intern_id', internId)
        .order('tanggal', { ascending: false });

      if (error) throw error;

      setEntri(data ?? []);
    } catch (err) {
      setPesan({
        tipe: 'err',
        teks: err.message || 'Gagal memuat logbook.',
      });
    } finally {
      setLoadingEntri(false);
    }
  }

  function setField(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(formKosong());
    setEditId(null);
    setPreview(false);
  }

  async function simpan(e) {
    e.preventDefault();
    if (busy || !intern?.id) return;

    setPesan(null);

    if (!form.judul.trim() || !form.isi.trim()) {
      setPesan({
        tipe: 'err',
        teks: 'Judul dan isi catatan wajib diisi.',
      });
      return;
    }

    if (!form.tanggal) {
      setPesan({
        tipe: 'err',
        teks: 'Tanggal logbook wajib diisi.',
      });
      return;
    }

    setBusy(true);

    try {
      if (editId) {
        const { data: updated, error } = await supabase
          .from('logbook')
          .update({
            judul: form.judul.trim(),
            isi: form.isi.trim(),
          })
          .eq('id', editId)
          .eq('intern_id', intern.id)
          .select('id');

        if (error) throw error;

        if (!updated?.length) {
          throw new Error(
            'Catatan tidak ditemukan atau tidak dapat diperbarui.'
          );
        }
      } else {
        const { error } = await supabase
          .from('logbook')
          .insert({
            intern_id: intern.id,
            tanggal: form.tanggal,
            judul: form.judul.trim(),
            isi: form.isi.trim(),
          });

        if (error) {
          if (error.code === '23505') {
            throw new Error(
              'Sudah ada catatan untuk tanggal ini. Edit catatan yang sudah ada.'
            );
          }
          throw error;
        }
      }

      const sedangEdit = Boolean(editId);

      resetForm();
      await muat();

      setPesan({
        tipe: 'ok',
        teks: sedangEdit
          ? 'Catatan berhasil diperbarui.'
          : 'Catatan logbook berhasil disimpan.',
      });
    } catch (err) {
      setPesan({
        tipe: 'err',
        teks: err.message || 'Gagal menyimpan catatan.',
      });
    } finally {
      setBusy(false);
    }
  }

  function mulaiEdit(row) {
    setEditId(row.id);

    setForm({
      tanggal: row.tanggal,
      judul: row.judul ?? '',
      isi: row.isi ?? '',
    });

    setPreview(false);
    setPesan(null);

    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({
        behavior: window.matchMedia?.(
          '(prefers-reduced-motion: reduce)'
        )?.matches
          ? 'instant'
          : 'smooth',
        block: 'start',
      });
    });
  }

  async function eksekusiHapus() {
    if (!hapusTarget || !intern?.id || busy) return;

    setBusy(true);
    setPesan(null);

    try {
      const { data: deleted, error } = await supabase
        .from('logbook')
        .delete()
        .eq('id', hapusTarget.id)
        .eq('intern_id', intern.id)
        .select('id');

      if (error) throw error;

      if (!deleted?.length) {
        throw new Error(
          'Catatan tidak ditemukan atau tidak dapat dihapus.'
        );
      }

      if (editId === hapusTarget.id) {
        resetForm();
      }

      setHapusTarget(null);

      await muat();

      setPesan({
        tipe: 'ok',
        teks: 'Catatan berhasil dihapus.',
      });
    } catch (err) {
      setPesan({
        tipe: 'err',
        teks: err.message || 'Gagal menghapus catatan.',
      });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="skeleton h-10 w-40 rounded-xl" />
        <div className="skeleton h-80 rounded-3xl" />
        <div className="skeleton h-40 rounded-3xl" />
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

  const hariIni = hariIniWib();
  const belumMulai = intern.tanggal_mulai > hariIni;

  if (belumMulai) {
    return (
      <div className="space-y-6 pb-8">
        <style>{MOTION}</style>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Logbook
        </h1>

        <div className="lb-enter rounded-[24px] border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <LockKeyhole size={30} />
          </div>

          <h2 className="mt-5 text-lg font-semibold text-slate-900">
            Logbook Belum Tersedia
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Fitur logbook akan terbuka saat masa magang dimulai,
            yaitu {fmtTanggal(intern.tanggal_mulai)}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-8">
      <style>{MOTION}</style>

      {/* PAGE HEADER */}

      <header className="lb-enter flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Logbook
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Catat aktivitas, pembelajaran, dan perkembangan magangmu.
          </p>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500">
          <BookOpen size={15} className="text-indigo-600" />
          {entri.length} catatan
        </span>
      </header>

      {/* NOTIFICATION */}

      {pesan && (
        <div
          role={pesan.tipe === 'ok' ? 'status' : 'alert'}
          className={`lb-pop flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${
            pesan.tipe === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <div className="flex items-start gap-2">
            {pesan.tipe === 'ok' ? (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            ) : (
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
            )}

            <p className="leading-6">{pesan.teks}</p>
          </div>

          <button
            type="button"
            onClick={() => setPesan(null)}
            aria-label="Tutup pesan"
            className="lb-button rounded-lg p-1 hover:bg-white/60"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* LOGBOOK FORM */}

      <form
        ref={formRef}
        onSubmit={simpan}
        className="lb-enter lb-card scroll-mt-24 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm"
        style={{ animationDelay: '80ms' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              {editId ? (
                <FilePenLine size={21} />
              ) : (
                <PenLine size={21} />
              )}
            </div>

            <div>
              <h2 className="text-[16px] font-semibold text-slate-900">
                {editId ? 'Edit Catatan' : 'Tulis Catatan Baru'}
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                {editId
                  ? `Memperbarui catatan ${fmtTanggal(form.tanggal)}`
                  : 'Dokumentasikan pekerjaan dan pengalamanmu.'}
              </p>
            </div>
          </div>

          {editId && (
            <span className="lb-pop rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600">
              Mode Edit
            </span>
          )}
        </div>

        <div className="space-y-5 px-6 py-6">

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">

            <div>
              <label htmlFor="logbook-date" className={LABEL}>
                Tanggal
              </label>

              <div className="relative">
                <input
                  id="logbook-date"
                  type="date"
                  required
                  value={form.tanggal}
                  disabled={!!editId || busy}
                  onChange={(e) => setField('tanggal', e.target.value)}
                  className={`${FIELD} font-medium`}
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="logbook-title" className={LABEL}>
                Judul Catatan <span className="text-red-500">*</span>
              </label>

              <input
                id="logbook-title"
                type="text"
                required
                maxLength={200}
                disabled={busy}
                placeholder="Contoh: Riset kompetitor untuk landing page"
                value={form.judul}
                onChange={(e) => setField('judul', e.target.value)}
                className={FIELD}
              />
            </div>

          </div>

          <div>
            <label htmlFor="logbook-content" className={LABEL}>
              Aktivitas / Refleksi <span className="text-red-500">*</span>
            </label>

            <textarea
              id="logbook-content"
              rows={5}
              required
              disabled={busy}
              value={form.isi}
              placeholder="Ceritakan apa yang kamu kerjakan, pelajari, atau temukan hari ini..."
              onChange={(e) => setField('isi', e.target.value)}
              className={`${FIELD} min-h-[150px] resize-y leading-6`}
            />

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Sparkles size={13} className="text-indigo-500" />
                Tulis aktivitas dengan jelas agar mudah ditinjau mentor.
              </p>

              <span className="text-[11px] tabular-nums text-slate-400">
                {form.isi.length} karakter
              </span>
            </div>
          </div>

          {/* PREVIEW */}

          <div className="rounded-2xl border border-slate-200 bg-[#F8F9FC]">

            <button
              type="button"
              onClick={() => setPreview((value) => !value)}
              aria-expanded={preview}
              aria-controls="logbook-preview"
              className="lb-button flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <BookOpen size={16} className="text-indigo-600" />
                Pratinjau Catatan
              </span>

              <ChevronDown
                size={17}
                className={`text-slate-400 transition-transform duration-300 ${
                  preview ? 'rotate-180' : ''
                }`}
              />
            </button>

            <div
              id="logbook-preview"
              className={`lb-expand ${preview ? 'open' : ''}`}
              aria-hidden={!preview}
            >
              <div>
                <div className="border-t border-slate-200 px-4 py-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <h3 className="font-semibold text-slate-900">
                      {form.judul.trim() || 'Judul belum diisi'}
                    </h3>

                    <p className="mt-1 text-xs text-slate-400">
                      {form.tanggal
                        ? fmtTanggal(form.tanggal)
                        : 'Tanggal belum diisi'}
                    </p>

                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                      {form.isi.trim() || 'Isi catatan akan terlihat di sini.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* FORM FOOTER */}

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-[#FAFAFC] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">

          <p className="text-xs text-slate-500">
            Pastikan judul dan isi catatan sudah benar.
          </p>

          <div className="flex gap-2">

            {editId ? (
              <button
                type="button"
                disabled={busy}
                onClick={resetForm}
                className="lb-button inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <X size={15} />
                Batal Edit
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={resetForm}
                className="lb-button inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <RotateCcw size={15} />
                Reset
              </button>
            )}

            <button
              type="submit"
              disabled={
                busy ||
                !form.judul.trim() ||
                !form.isi.trim() ||
                !form.tanggal
              }
              className="lb-button inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <Save size={16} />
              )}

              {busy
                ? 'Menyimpan...'
                : editId
                  ? 'Perbarui Catatan'
                  : 'Simpan Catatan'}
            </button>

          </div>
        </div>
      </form>

      {/* HISTORY */}

      <section className="space-y-4">

        <div className="lb-enter flex items-center justify-between">
          <div>
            <h2 className="text-[17px] font-semibold text-slate-900">
              Riwayat Catatan
              <span className="ml-2 rounded-full bg-slate-200/70 px-2.5 py-1 text-xs text-slate-600">
                {entri.length}
              </span>
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Semua aktivitas magang yang telah kamu catat.
            </p>
          </div>
        </div>

        {loadingEntri ? (
          <div className="space-y-3">
            <div className="skeleton h-32 rounded-2xl" />
            <div className="skeleton h-32 rounded-2xl" />
          </div>
        ) : entri.length === 0 ? (
          <div className="lb-enter rounded-[22px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <BookOpen size={25} />
            </div>

            <p className="mt-4 text-sm font-semibold text-slate-700">
              Belum ada catatan
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Mulai dokumentasikan aktivitas magangmu melalui form di atas.
            </p>

          </div>
        ) : (
          <div className="space-y-3">

            {entri.map((row, index) => {
              const terbuka = expanded[row.id] ?? true;

              return (
                <article
                  key={row.id}
                  className="lb-enter lb-card rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm"
                  style={{
                    animationDelay: `${Math.min(index * 65, 390)}ms`,
                  }}
                >

                  <div className="flex flex-wrap items-start justify-between gap-3">

                    <div className="flex min-w-0 flex-1 items-start gap-3">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <BookOpen size={19} />
                      </div>

                      <div className="min-w-0">
                        <h3 className="break-words text-sm font-semibold text-slate-900">
                          {row.judul}
                        </h3>

                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                          <CalendarDays size={13} />
                          {fmtTanggal(row.tanggal)}
                        </p>
                      </div>

                    </div>

                    <div className="flex items-center gap-2">

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => mulaiEdit(row)}
                        className="lb-button inline-flex h-9 items-center gap-1.5 rounded-xl bg-slate-100 px-3 text-xs font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50"
                      >
                        <FilePenLine size={14} />
                        Edit
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        title="Hapus catatan"
                        aria-label={`Hapus catatan ${row.judul}`}
                        onClick={() => setHapusTarget(row)}
                        className="lb-button flex h-9 w-9 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-50"
                      >
                        <Trash2 size={15} />
                      </button>

                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setExpanded((previous) => ({
                        ...previous,
                        [row.id]: !terbuka,
                      }))
                    }
                    aria-expanded={terbuka}
                    aria-controls={`logbook-entry-${row.id}`}
                    className="lb-button mt-4 flex w-full items-center justify-between border-t border-slate-100 pt-3 text-left"
                  >
                    <span className="text-[11px] font-medium text-slate-400">
                      {terbuka ? 'Sembunyikan isi' : 'Lihat isi catatan'}
                    </span>

                    <ChevronDown
                      size={16}
                      className={`text-slate-400 transition-transform duration-300 ${
                        terbuka ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <div
                    id={`logbook-entry-${row.id}`}
                    className={`lb-expand ${terbuka ? 'open' : ''}`}
                    aria-hidden={!terbuka}
                  >
                    <div>
                      <p className="pt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
                        {row.isi}
                      </p>
                    </div>
                  </div>

                </article>
              );
            })}

          </div>
        )}

      </section>

      {/* DELETE CONFIRMATION */}

      <ConfirmModal
        open={!!hapusTarget}
        onClose={() => {
          if (!busy) setHapusTarget(null);
        }}
        onConfirm={eksekusiHapus}
        busy={busy}
        judul={
          hapusTarget
            ? `Hapus catatan "${hapusTarget.judul}"?`
            : ''
        }
        teks="Catatan ini akan dihapus secara permanen."
        teksConfirm="Ya, Hapus"
        tipe="danger"
      />

    </div>
  );
}
