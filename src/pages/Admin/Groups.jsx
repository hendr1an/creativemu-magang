
import { useEffect, useState } from 'react';
import {
  UsersRound, Plus, Pencil, Check, X, UserRound,
  CalendarDays, ChevronDown, CheckCircle2,
  AlertCircle, UserPlus, Eye, Sparkles, RotateCcw,
} from 'lucide-react';

import { supabase } from '../../lib/supabaseClient';
import { fmtTanggal } from '../../lib/format';
import ConfirmModal from '../../components/ConfirmModal';

const EMPTY_FORM = {
  nama_kelompok: '',
  batch_label: '',
  mentor_id: '',
};

const INPUT =
  'cm-input h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100';

const LABEL =
  'mb-2 block text-xs font-semibold text-slate-600';

const BUTTON =
  'cm-button inline-flex items-center justify-center gap-2 rounded-xl font-semibold disabled:cursor-not-allowed disabled:opacity-50';

const MOTION_CSS = `
@keyframes cmEnter {
  from { opacity:0; transform:translateY(16px) scale(.985); filter:blur(3px); }
  to { opacity:1; transform:translateY(0) scale(1); filter:blur(0); }
}
@keyframes cmPop {
  0% { opacity:0; transform:scale(.93); }
  75% { opacity:1; transform:scale(1.025); }
  100% { opacity:1; transform:scale(1); }
}
@keyframes cmShimmer {
  from { transform:translateX(-130%); }
  to { transform:translateX(130%); }
}
.cm-enter {
  animation:cmEnter .48s cubic-bezier(.2,.8,.2,1) both;
}
.cm-pop {
  animation:cmPop .36s cubic-bezier(.2,.8,.2,1) both;
}
.cm-card {
  transition:transform .27s cubic-bezier(.2,.8,.2,1),
    box-shadow .27s ease,border-color .27s ease;
}
.cm-card:hover {
  transform:translateY(-3px);
  border-color:rgba(99,102,241,.24);
  box-shadow:0 18px 42px rgba(15,23,42,.07);
}
.cm-card:focus-within {
  border-color:rgba(99,102,241,.32);
}
.cm-button {
  transition:transform .17s ease,box-shadow .2s ease,
    background-color .2s ease;
}
.cm-button:not(:disabled):hover { transform:translateY(-1px); }
.cm-button:not(:disabled):active { transform:scale(.97); }
.cm-input {
  transition:border-color .2s ease,box-shadow .2s ease;
}
.cm-preview {
  display:grid;
  grid-template-rows:0fr;
  opacity:0;
  transition:grid-template-rows .3s ease,opacity .3s ease;
}
.cm-preview.open {
  grid-template-rows:1fr;
  opacity:1;
}
.cm-preview > div { overflow:hidden; }
.cm-shimmer { position:relative; overflow:hidden; }
.cm-shimmer::after {
  content:'';
  position:absolute;
  inset:0;
  pointer-events:none;
  background:linear-gradient(110deg,transparent 25%,
    rgba(255,255,255,.25) 50%,transparent 75%);
  transform:translateX(-130%);
}
.cm-shimmer:hover::after {
  animation:cmShimmer .8s ease;
}
@media(prefers-reduced-motion:reduce) {
  .cm-enter,.cm-pop,.cm-shimmer::after {
    animation:none!important;
  }
  .cm-card,.cm-button,.cm-input,.cm-preview {
    transition:none!important;
  }
  .cm-card:hover,.cm-button:hover,.cm-button:active {
    transform:none!important;
  }
}
`;

function todayWib() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function sudahMulai(intern) {
  return !intern.tanggal_mulai ||
    intern.tanggal_mulai <= todayWib();
}

function initials(name) {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
}

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [direktori, setDirektori] = useState([]);
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sukses, setSukses] = useState(null);

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [creating, setCreating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [pilihIntern, setPilihIntern] = useState({});
  const [editNama, setEditNama] = useState(null);
  const [savingNama, setSavingNama] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyMentor, setBusyMentor] = useState(null);

  const [konfirmasiKeluarkan, setKonfirmasiKeluarkan] =
    useState(null);
  const [konfirmasiMasukkan, setKonfirmasiMasukkan] =
    useState(null);

  useEffect(() => {
    muat();
  }, []);

  async function muat() {
    setLoading(true);

    try {
      const [groupResult, directoryResult, internResult] =
        await Promise.all([
          supabase
            .from('groups')
            .select('*')
            .order('created_at'),

          supabase.rpc('get_profile_directory'),

          supabase
            .from('interns')
            .select(`
              id, nama_lengkap, email, group_id,
              tanggal_mulai, status_magang
            `)
            .eq('status_magang', 'Active')
            .order('nama_lengkap'),
        ]);

      const err = groupResult.error ||
        directoryResult.error ||
        internResult.error;

      if (err) throw err;

      setGroups(groupResult.data ?? []);
      setDirektori(directoryResult.data ?? []);
      setInterns(internResult.data ?? []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Gagal memuat data kelompok.');
    } finally {
      setLoading(false);
    }
  }

  const mentors = direktori.filter(
    (profile) => profile.role === 'mentor'
  );

  const tanpaKelompok = interns.filter(
    (intern) => !intern.group_id
  );

  const anggota = (groupId) =>
    interns.filter((intern) => intern.group_id === groupId);

  const previewMentor = mentors.find(
    (mentor) => mentor.id === form.mentor_id
  );

  function setField(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function buatKelompok(e) {
    e.preventDefault();
    if (creating) return;

    setError(null);
    setSukses(null);

    const nama = form.nama_kelompok.trim();

    if (!nama) {
      setError('Nama kelompok wajib diisi.');
      return;
    }

    setCreating(true);

    try {
      const { error: insertError } = await supabase
        .from('groups')
        .insert({
          nama_kelompok: nama,
          batch_label: form.batch_label.trim() || null,
          mentor_id: form.mentor_id || null,
        });

      if (insertError) throw insertError;

      setForm({ ...EMPTY_FORM });
      setShowPreview(false);

      await muat();
      setSukses('Kelompok baru berhasil dibuat.');
    } catch (err) {
      setError(
        err.code === '23505'
          ? 'Nama kelompok tersebut sudah digunakan.'
          : err.message || 'Gagal membuat kelompok.'
      );
    } finally {
      setCreating(false);
    }
  }

  function mulaiEditNama(group) {
    setError(null);
    setSukses(null);
    setEditNama({
      id: group.id,
      value: group.nama_kelompok ?? '',
    });
  }

  function batalEditNama() {
    if (!savingNama) setEditNama(null);
  }

  async function simpanNamaKelompok(group) {
    if (!editNama || editNama.id !== group.id || savingNama) {
      return;
    }

    setError(null);
    setSukses(null);

    const namaBaru = editNama.value.trim();
    const namaLama = (group.nama_kelompok ?? '').trim();

    if (!namaBaru) {
      setError('Nama kelompok tidak boleh kosong.');
      return;
    }

    if (namaBaru === namaLama) {
      setEditNama(null);
      return;
    }

    setSavingNama(true);

    try {
      const { error: updateError } = await supabase
        .from('groups')
        .update({ nama_kelompok: namaBaru })
        .eq('id', group.id);

      if (updateError) throw updateError;

      setEditNama(null);
      await muat();
      setSukses('Nama kelompok berhasil diperbarui.');
    } catch (err) {
      setError(
        err.code === '23505'
          ? 'Nama kelompok sudah digunakan kelompok lain.'
          : err.message || 'Gagal mengubah nama kelompok.'
      );
    } finally {
      setSavingNama(false);
    }
  }

  function mintaMasukkan(groupId, internId) {
    if (!internId || busy) return;

    setError(null);
    setSukses(null);

    const target = tanpaKelompok.find(
      (intern) => intern.id === internId
    );

    if (!target) {
      setError('Peserta tidak tersedia untuk ditempatkan.');
      return;
    }

    if (!sudahMulai(target)) {
      setKonfirmasiMasukkan({
        groupId,
        intern: target,
      });

      setPilihIntern((previous) => ({
        ...previous,
        [groupId]: '',
      }));

      return;
    }

    eksekusiMasukkan(groupId, internId);
  }

  async function eksekusiMasukkan(groupId, internId) {
    if (!internId || busy) return;

    setBusy(true);
    setError(null);
    setSukses(null);

    try {
      const { data: updated, error: updateError } =
        await supabase
          .from('interns')
          .update({ group_id: groupId })
          .eq('id', internId)
          .eq('status_magang', 'Active')
          .is('group_id', null)
          .select('id');

      if (updateError) throw updateError;

      if (!updated?.length) {
        throw new Error(
          'Peserta sudah ditempatkan atau tidak lagi aktif. Muat ulang halaman.'
        );
      }

      setPilihIntern((previous) => ({
        ...previous,
        [groupId]: '',
      }));

      await muat();
      setSukses('Peserta berhasil dimasukkan ke kelompok.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function eksekusiKeluarkan() {
    if (!konfirmasiKeluarkan || busy) return;

    setBusy(true);
    setError(null);
    setSukses(null);

    const target = konfirmasiKeluarkan;

    try {
      const { error: updateError } = await supabase
        .from('interns')
        .update({ group_id: null })
        .eq('id', target.id);

      if (updateError) throw updateError;

      setKonfirmasiKeluarkan(null);
      await muat();

      setSukses(
        `${target.nama_lengkap} berhasil dikeluarkan dari kelompok.`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function gantiMentor(groupId, mentorId) {
    if (busyMentor) return;

    setBusyMentor(groupId);
    setError(null);
    setSukses(null);

    try {
      const { error: updateError } = await supabase
        .from('groups')
        .update({ mentor_id: mentorId || null })
        .eq('id', groupId);

      if (updateError) throw updateError;

      await muat();
      setSukses('Pembimbing kelompok berhasil diperbarui.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyMentor(null);
    }
  }

  return (
    <div className="space-y-7 pb-8">
      <style>{MOTION_CSS}</style>

      {/* HEADER */}

      <header className="cm-enter">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Kelompok Magang
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Atur kelompok, pembimbing, dan penempatan peserta magang.
        </p>
      </header>

      {/* NOTIFICATIONS */}

      {error && (
        <div
          role="alert"
          className="cm-pop flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span className="flex items-center gap-2">
            <AlertCircle size={17} className="shrink-0" />
            {error}
          </span>

          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Tutup pesan error"
            className="cm-button"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {sukses && (
        <div
          role="status"
          className="cm-pop flex items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 size={17} className="shrink-0" />
            {sukses}
          </span>

          <button
            type="button"
            onClick={() => setSukses(null)}
            aria-label="Tutup pesan sukses"
            className="cm-button"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* CREATE GROUP */}

      <form
        onSubmit={buatKelompok}
        className="cm-enter cm-card overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm"
        style={{ animationDelay: '80ms' }}
      >
        <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-6 sm:flex-row sm:items-center">

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <UsersRound size={24} strokeWidth={1.8} />
          </div>

          <div className="flex-1">
            <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">
              Buat kelompok baru
            </h2>

            <p className="mt-1 text-[13px] leading-5 text-slate-500">
              Lengkapi informasi dasar untuk membentuk kelompok magang.
            </p>
          </div>

          <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">
            {groups.length} kelompok terdaftar
          </span>
        </div>

        <div className="px-6 py-6">

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

            <div>
              <label htmlFor="group-name" className={LABEL}>
                Nama kelompok <span className="text-red-500">*</span>
              </label>

              <input
                id="group-name"
                type="text"
                required
                maxLength={150}
                placeholder="Contoh: Tim Pengembangan Web"
                value={form.nama_kelompok}
                onChange={(e) =>
                  setField('nama_kelompok', e.target.value)
                }
                className={INPUT}
              />

              <p className="mt-2 text-[11px] text-slate-400">
                Gunakan nama yang mudah dikenali.
              </p>
            </div>

            <div>
              <label htmlFor="group-batch" className={LABEL}>
                Batch <span className="font-normal text-slate-400">(opsional)</span>
              </label>

              <div className="relative">
                <CalendarDays
                  size={17}
                  className="pointer-events-none absolute left-4 top-3.5 text-slate-400"
                />

                <input
                  id="group-batch"
                  type="text"
                  maxLength={100}
                  placeholder="Contoh: Batch Oktober 2026"
                  value={form.batch_label}
                  onChange={(e) =>
                    setField('batch_label', e.target.value)
                  }
                  className={`${INPUT} pl-11`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="group-mentor" className={LABEL}>
                Pembimbing <span className="font-normal text-slate-400">(opsional)</span>
              </label>

              <div className="relative">
                <UserRound
                  size={17}
                  className="pointer-events-none absolute left-4 top-3.5 text-slate-400"
                />

                <select
                  id="group-mentor"
                  value={form.mentor_id}
                  onChange={(e) =>
                    setField('mentor_id', e.target.value)
                  }
                  className={`${INPUT} appearance-none pl-11 pr-11`}
                >
                  <option value="">Belum menentukan pembimbing</option>

                  {mentors.map((mentor) => (
                    <option key={mentor.id} value={mentor.id}>
                      {mentor.nama_lengkap}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={17}
                  className="pointer-events-none absolute right-4 top-3.5 text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* LIVE PREVIEW */}

          <div className="mt-6 rounded-2xl border border-slate-200 bg-[#F8F9FC]">

            <button
              type="button"
              onClick={() => setShowPreview((value) => !value)}
              aria-expanded={showPreview}
              aria-controls="group-preview-panel"
              className="cm-button flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                  <Eye size={17} />
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-800">
                    Pratinjau kelompok
                  </p>

                  <p className="text-[11px] text-slate-400">
                    Periksa informasi sebelum disimpan
                  </p>
                </div>
              </div>

              <ChevronDown
                size={17}
                className={`text-slate-400 transition-transform duration-300 ${
                  showPreview ? 'rotate-180' : ''
                }`}
              />
            </button>

            <div
              id="group-preview-panel"
              className={`cm-preview ${showPreview ? 'open' : ''}`}
              aria-hidden={!showPreview}
            >
              <div>
                <div className="border-t border-slate-200 px-4 py-4">
                  <div className="cm-pop rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <UsersRound size={20} />
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          {form.nama_kelompok.trim() ||
                            'Nama kelompok belum diisi'}
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          {form.batch_label.trim() || 'Tanpa batch'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                      <UserRound size={15} />
                      {previewMentor?.nama_lengkap ||
                        'Pembimbing belum ditentukan'}
                    </div>
                  </div>

                  <p className="mt-2 text-[11px] text-slate-400">
                    Pratinjau belum menyimpan data ke database.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* FORM ACTIONS */}

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-[#FAFAFC] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">

          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <Sparkles size={14} className="text-indigo-500" />
            Pembimbing dapat diubah kapan saja.
          </p>

          <div className="flex gap-2">

            <button
              type="button"
              disabled={creating}
              onClick={() => {
                setForm({ ...EMPTY_FORM });
                setShowPreview(false);
              }}
              className={`${BUTTON} h-11 border border-slate-200 bg-white px-4 text-sm text-slate-600 hover:bg-slate-50`}
            >
              <RotateCcw size={15} />
              Reset
            </button>

            <button
              type="submit"
              disabled={creating || !form.nama_kelompok.trim()}
              className={`${BUTTON} cm-shimmer h-11 bg-indigo-600 px-5 text-sm text-white shadow-sm hover:bg-indigo-700 hover:shadow-indigo-200`}
            >
              {creating ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <Plus size={17} />
              )}

              {creating ? 'Menyimpan...' : 'Buat Kelompok'}
            </button>
          </div>

        </div>
      </form>

      {/* GROUP LIST */}

      <div
        className="cm-enter flex flex-wrap items-center justify-between gap-3"
        style={{ animationDelay: '130ms' }}
      >
        <div>
          <h2 className="text-[17px] font-semibold text-slate-900">
            Daftar Kelompok
            <span className="ml-2 rounded-full bg-slate-200/70 px-2.5 py-1 text-xs text-slate-600">
              {groups.length}
            </span>
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Kelola pembimbing dan anggota setiap kelompok.
          </p>
        </div>

        <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500">
          {tanpaKelompok.length} peserta belum ditempatkan
        </span>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-40 rounded-3xl" />
          <div className="skeleton h-40 rounded-3xl" />
        </div>
      ) : (
        <div className="space-y-3">

          {groups.length === 0 ? (
            <div className="cm-enter rounded-[22px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <UsersRound
                size={30}
                className="mx-auto text-slate-300"
              />

              <p className="mt-3 font-semibold text-slate-700">
                Belum ada kelompok
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Gunakan formulir di atas untuk membuat kelompok pertama.
              </p>
            </div>
          ) : (
            groups.map((group, index) => {
              const daftarAnggota = anggota(group.id);

              const belumMulaiCount = daftarAnggota.filter(
                (intern) => !sudahMulai(intern)
              ).length;

              const sedangEdit = editNama?.id === group.id;

              return (
                <article
                  key={group.id}
                  className="cm-enter cm-card rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                  style={{
                    animationDelay: `${Math.min(index * 65, 400)}ms`,
                  }}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                    <div className="flex min-w-0 flex-1 items-start gap-3">

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <UsersRound size={20} />
                      </div>

                      <div className="min-w-0 flex-1">

                        {sedangEdit ? (
                          <div className="flex flex-wrap gap-2">
                            <input
                              autoFocus
                              value={editNama.value}
                              disabled={savingNama}
                              onChange={(e) =>
                                setEditNama((previous) => ({
                                  ...previous,
                                  value: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  simpanNamaKelompok(group);
                                }

                                if (e.key === 'Escape') {
                                  batalEditNama();
                                }
                              }}
                              className={`${INPUT} max-w-sm flex-1`}
                            />

                            <button
                              type="button"
                              disabled={savingNama}
                              onClick={() => simpanNamaKelompok(group)}
                              className={`${BUTTON} h-10 bg-indigo-600 px-3 text-xs text-white`}
                            >
                              {savingNama ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                              ) : (
                                <Check size={15} />
                              )}
                              Simpan
                            </button>

                            <button
                              type="button"
                              disabled={savingNama}
                              onClick={batalEditNama}
                              className={`${BUTTON} h-10 border border-slate-200 px-3 text-xs text-slate-600`}
                            >
                              <X size={15} />
                              Batal
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-slate-900">
                              {group.nama_kelompok}
                            </h3>

                            {group.batch_label && (
                              <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] text-indigo-600">
                                {group.batch_label}
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => mulaiEditNama(group)}
                              title="Edit nama kelompok"
                              className="cm-button rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                            >
                              <Pencil size={15} />
                            </button>
                          </div>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span>{daftarAnggota.length} anggota</span>

                          {belumMulaiCount > 0 && (
                            <span className="text-amber-600">
                              {belumMulaiCount} belum mulai
                            </span>
                          )}
                        </div>

                      </div>
                    </div>

                    {/* MENTOR */}

                    <div className="w-full lg:w-[260px]">
                      <label className="mb-1.5 block text-[11px] text-slate-500">
                        Pembimbing
                      </label>

                      <select
                        value={group.mentor_id ?? ''}
                        disabled={busyMentor === group.id}
                        onChange={(e) =>
                          gantiMentor(group.id, e.target.value)
                        }
                        className={`${INPUT} h-10 text-xs disabled:opacity-50`}
                      >
                        <option value="">Belum ada pembimbing</option>

                        {mentors.map((mentor) => (
                          <option key={mentor.id} value={mentor.id}>
                            {mentor.nama_lengkap}
                          </option>
                        ))}
                      </select>
                    </div>

                  </div>

                  {/* MEMBERS */}

                  <div className="mt-5 border-t border-slate-100 pt-4">

                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Anggota
                    </p>

                    <div className="flex flex-wrap gap-2">

                      {daftarAnggota.length === 0 ? (
                        <p className="text-xs text-slate-400">
                          Belum ada anggota dalam kelompok ini.
                        </p>
                      ) : (
                        daftarAnggota.map((intern) => (
                          <div
                            key={intern.id}
                            className={`cm-pop inline-flex max-w-full items-center gap-2 rounded-full border px-1.5 py-1 pr-2 ${
                              sudahMulai(intern)
                                ? 'border-slate-200 bg-white'
                                : 'border-amber-200 bg-amber-50'
                            }`}
                          >
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
                              {initials(intern.nama_lengkap)}
                            </span>

                            <span className="max-w-[180px] truncate text-xs font-medium text-slate-700">
                              {intern.nama_lengkap}
                              {!sudahMulai(intern) && ' ⏳'}
                            </span>

                            <button
                              type="button"
                              disabled={busy}
                              title="Keluarkan peserta"
                              aria-label={`Keluarkan ${intern.nama_lengkap}`}
                              onClick={() => setKonfirmasiKeluarkan(intern)}
                              className="cm-button rounded-full p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ))
                      )}

                    </div>
                  </div>

                  {/* ADD MEMBER */}

                  {tanpaKelompok.length > 0 && (
                    <div className="mt-4 flex flex-col gap-2 rounded-2xl bg-[#F8F9FC] p-3 sm:flex-row sm:items-center">

                      <div className="flex flex-1 items-center gap-2">
                        <UserPlus size={17} className="shrink-0 text-slate-400" />

                        <select
                          value={pilihIntern[group.id] ?? ''}
                          onChange={(e) =>
                            setPilihIntern((previous) => ({
                              ...previous,
                              [group.id]: e.target.value,
                            }))
                          }
                          className={`${INPUT} h-10 min-w-0 flex-1 text-xs`}
                        >
                          <option value="">
                            Pilih peserta untuk ditambahkan
                          </option>

                          {tanpaKelompok.map((intern) => (
                            <option key={intern.id} value={intern.id}>
                              {intern.nama_lengkap} — {intern.email}
                              {!sudahMulai(intern) ? ' (belum mulai)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        disabled={busy || !pilihIntern[group.id]}
                        onClick={() =>
                          mintaMasukkan(group.id, pilihIntern[group.id])
                        }
                        className={`${BUTTON} h-10 bg-indigo-600 px-4 text-xs text-white hover:bg-indigo-700`}
                      >
                        {busy ? (
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        ) : (
                          <Plus size={15} />
                        )}
                        Tambah Anggota
                      </button>

                    </div>
                  )}

                </article>
              );
            })
          )}

        </div>
      )}

      {/* CONFIRM REMOVE */}

      <ConfirmModal
        open={!!konfirmasiKeluarkan}
        onClose={() => setKonfirmasiKeluarkan(null)}
        onConfirm={eksekusiKeluarkan}
        busy={busy}
        judul={
          konfirmasiKeluarkan
            ? `Keluarkan "${konfirmasiKeluarkan.nama_lengkap}"?`
            : ''
        }
        teks="Peserta akan dikeluarkan dari kelompok ini dan kembali ke daftar tanpa kelompok."
        teksConfirm="Ya, Keluarkan"
        tipe="warn"
      />

      {/* CONFIRM EARLY MEMBER */}

      <ConfirmModal
        open={!!konfirmasiMasukkan}
        onClose={() => setKonfirmasiMasukkan(null)}
        onConfirm={() => {
          const { groupId, intern } = konfirmasiMasukkan ?? {};

          setKonfirmasiMasukkan(null);

          if (groupId && intern) {
            eksekusiMasukkan(groupId, intern.id);
          }
        }}
        busy={busy}
        judul={
          konfirmasiMasukkan
            ? `Masukkan "${konfirmasiMasukkan.intern.nama_lengkap}"?`
            : ''
        }
        teks={
          konfirmasiMasukkan
            ? `Peserta ini BELUM memulai masa magang (mulai ${fmtTanggal(
                konfirmasiMasukkan.intern.tanggal_mulai
              )}). Peserta dapat ditempatkan untuk persiapan, tetapi belum dapat diberi tugas sampai periode magang dimulai.`
            : ''
        }
        teksConfirm="Tetap Masukkan"
        tipe="warn"
      />

    </div>
  );
}
