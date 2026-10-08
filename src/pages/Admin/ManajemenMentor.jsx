
import { useEffect, useMemo, useState } from 'react';
import {
  UsersRound,
  UserRoundPlus,
  UserRound,
  Mail,
  Phone,
  CalendarDays,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  Copy,
  Check,
  X,
  Search,
  RefreshCw,
  Shuffle,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  LockKeyhole,
  UserRoundX,
} from 'lucide-react';

import { supabase } from '../../lib/supabaseClient';
import Modal from '../../components/Modal';
import ConfirmModal from '../../components/ConfirmModal';
import { fmtTanggal } from '../../lib/format';

const BASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const EMPTY_FORM = {
  nama: '',
  email: '',
  wa: '',
  password: '',
};

const INPUT =
  'mm-input h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100';

const LABEL =
  'mb-2 block text-xs font-semibold text-slate-600';

const MOTION = `
@keyframes mmEnter {
  from {
    opacity: 0;
    transform: translateY(16px) scale(.985);
    filter: blur(3px);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

@keyframes mmPop {
  0% {
    opacity: 0;
    transform: scale(.94);
  }
  75% {
    opacity: 1;
    transform: scale(1.02);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes mmShimmer {
  from { transform: translateX(-140%); }
  to { transform: translateX(140%); }
}

.mm-enter {
  animation: mmEnter .46s cubic-bezier(.2,.8,.2,1) both;
}

.mm-pop {
  animation: mmPop .35s cubic-bezier(.2,.8,.2,1) both;
}

.mm-card {
  transition:
    transform .26s cubic-bezier(.2,.8,.2,1),
    box-shadow .26s ease,
    border-color .26s ease;
}

.mm-card:hover {
  transform: translateY(-3px);
  border-color: rgba(99,102,241,.25);
  box-shadow: 0 18px 44px rgba(15,23,42,.07);
}

.mm-card:focus-within {
  border-color: rgba(99,102,241,.35);
}

.mm-button {
  transition:
    transform .17s ease,
    background-color .2s ease,
    box-shadow .2s ease,
    color .2s ease;
}

.mm-button:not(:disabled):hover {
  transform: translateY(-1px);
}

.mm-button:not(:disabled):active {
  transform: scale(.97);
}

.mm-input {
  transition:
    border-color .2s ease,
    box-shadow .2s ease;
}

.mm-shimmer {
  position: relative;
  overflow: hidden;
}

.mm-shimmer::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    110deg,
    transparent 25%,
    rgba(255,255,255,.25) 50%,
    transparent 75%
  );
  transform: translateX(-140%);
}

.mm-shimmer:not(:disabled):hover::after {
  animation: mmShimmer .8s ease;
}

.mm-expand {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition:
    grid-template-rows .3s ease,
    opacity .3s ease;
}

.mm-expand.open {
  grid-template-rows: 1fr;
  opacity: 1;
}

.mm-expand > div {
  overflow: hidden;
}

@media (prefers-reduced-motion: reduce) {
  .mm-enter,
  .mm-pop,
  .mm-shimmer::after {
    animation: none !important;
  }

  .mm-card,
  .mm-button,
  .mm-input,
  .mm-expand {
    transition: none !important;
  }

  .mm-card:hover,
  .mm-button:hover,
  .mm-button:active {
    transform: none !important;
  }
}
`;

function passwordAcak() {
  const huruf =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';

  const angka = '23456789';

  function acak(set, jumlah) {
    const hasil = [];

    // Rejection sampling untuk menghindari bias modulo.
    const batas = Math.floor(256 / set.length) * set.length;

    while (hasil.length < jumlah) {
      const bytes = crypto.getRandomValues(new Uint8Array(16));

      for (const byte of bytes) {
        if (byte >= batas) continue;

        hasil.push(set[byte % set.length]);

        if (hasil.length === jumlah) break;
      }
    }

    return hasil.join('');
  }

  const karakter = (
    acak(huruf, 8) + acak(angka, 4)
  ).split('');

  for (let i = karakter.length - 1; i > 0; i--) {
    const batas = Math.floor(4294967296 / (i + 1)) * (i + 1);
    let angkaAcak;

    do {
      angkaAcak = crypto.getRandomValues(
        new Uint32Array(1)
      )[0];
    } while (angkaAcak >= batas);

    const j = angkaAcak % (i + 1);

    [karakter[i], karakter[j]] = [
      karakter[j],
      karakter[i],
    ];
  }

  return karakter.join('');
}

function initials(nama) {
  return String(nama || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((kata) => kata.charAt(0))
    .join('')
    .toUpperCase();
}

function passwordValid(password) {
  return (
    password.length >= 6 &&
    /[A-Za-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

function Notice({ pesan, onClose }) {
  if (!pesan) return null;

  const sukses = pesan.tipe === 'ok';

  return (
    <div
      role={sukses ? 'status' : 'alert'}
      className={`mm-pop flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${
        sukses
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-red-200 bg-red-50 text-red-700'
      }`}
    >
      <div className="flex items-start gap-2">
        {sukses ? (
          <CheckCircle2
            size={18}
            className="mt-0.5 shrink-0"
          />
        ) : (
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0"
          />
        )}

        <span className="leading-relaxed">
          {pesan.teks}
        </span>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup notifikasi"
        className="mm-button rounded-lg p-1 hover:bg-white/60"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export default function ManajemenMentor() {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pesan, setPesan] = useState(null);

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showPassword, setShowPassword] = useState(false);

  const [kredensial, setKredensial] = useState(null);
  const [showCredentialPassword, setShowCredentialPassword] =
    useState(false);

  const [resetTarget, setResetTarget] = useState(null);
  const [resetPw, setResetPw] = useState('');
  const [showResetPassword, setShowResetPassword] =
    useState(false);

  const [konfirmasiHapus, setKonfirmasiHapus] =
    useState(null);

  const [search, setSearch] = useState('');
  const [expandedMentor, setExpandedMentor] =
    useState(null);

  useEffect(() => {
    muat();
  }, []);

  const mentorTerfilter = useMemo(() => {
    const kata = search.trim().toLowerCase();

    if (!kata) return mentors;

    return mentors.filter((mentor) => {
      const nama = mentor.nama_lengkap || '';
      const email = mentor.email || '';
      const wa = mentor.nomor_whatsapp || '';

      return `${nama} ${email} ${wa}`
        .toLowerCase()
        .includes(kata);
    });
  }, [mentors, search]);

  async function muat() {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          nama_lengkap,
          email,
          nomor_whatsapp,
          created_at
        `)
        .eq('role', 'mentor')
        .order('nama_lengkap');

      if (error) throw error;

      setMentors(data ?? []);
    } catch (err) {
      setPesan({
        tipe: 'err',
        teks: err.message || 'Gagal memuat daftar mentor.',
      });
    } finally {
      setLoading(false);
    }
  }

  async function panggilEdge(payload) {
    const { data: sesi, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) throw sessionError;

    const token = sesi?.session?.access_token;

    if (!token) {
      throw new Error('Sesi berakhir — silakan login ulang.');
    }

    if (!BASE_URL || !ANON_KEY) {
      throw new Error(
        'Konfigurasi Supabase belum lengkap.'
      );
    }

    const res = await fetch(
      `${BASE_URL}/functions/v1/kelola-mentor`,
      {
        method: 'POST',
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const hasil = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        hasil?.error || `Gagal (HTTP ${res.status}).`
      );
    }

    return hasil;
  }

  async function buat(e) {
    e.preventDefault();

    if (busy) return;

    setPesan(null);

    if (!form.nama.trim() || !form.email.trim()) {
      setPesan({
        tipe: 'err',
        teks: 'Nama lengkap dan email wajib diisi.',
      });
      return;
    }

    if (!passwordValid(form.password)) {
      setPesan({
        tipe: 'err',
        teks:
          'Password minimal 6 karakter dan harus memiliki huruf serta angka.',
      });
      return;
    }

    setBusy(true);

    try {
      const nama = form.nama.trim();

      const hasil = await panggilEdge({
        aksi: 'buat',
        nama,
        email: form.email.trim(),
        nomor_whatsapp: form.wa.trim() || undefined,
        password: form.password,
      });

      // Kredensial hanya disimpan sementara di memori halaman.
      setKredensial({
        nama,
        ...hasil.kredensial,
      });

      setShowCredentialPassword(false);
      setForm({ ...EMPTY_FORM });
      setShowPassword(false);

      await muat();

      setPesan({
        tipe: 'ok',
        teks: 'Akun mentor berhasil dibuat.',
      });
    } catch (err) {
      setPesan({
        tipe: 'err',
        teks: err.message || 'Gagal membuat mentor.',
      });
    } finally {
      setBusy(false);
    }
  }

  function bukaReset(mentor) {
    setResetTarget(mentor);
    setResetPw(passwordAcak());
    setShowResetPassword(false);
    setPesan(null);
  }

  function tutupReset() {
    if (busy) return;

    setResetTarget(null);
    setResetPw('');
    setShowResetPassword(false);
  }

  async function kirimReset(e) {
    e.preventDefault();

    if (!resetTarget || busy) return;

    if (!passwordValid(resetPw)) {
      setPesan({
        tipe: 'err',
        teks:
          'Password baru minimal 6 karakter dan harus berisi huruf serta angka.',
      });
      return;
    }

    setBusy(true);
    setPesan(null);

    try {
      const hasil = await panggilEdge({
        aksi: 'reset_password',
        user_id: resetTarget.id,
        password_baru: resetPw,
      });

      setKredensial({
        nama: resetTarget.nama_lengkap,
        email: resetTarget.email,
        password: hasil.kredensial.password,
      });

      setShowCredentialPassword(false);
      setResetTarget(null);
      setResetPw('');
      setShowResetPassword(false);

      await muat();

      setPesan({
        tipe: 'ok',
        teks: 'Password mentor berhasil direset.',
      });
    } catch (err) {
      setPesan({
        tipe: 'err',
        teks: err.message || 'Gagal mereset password.',
      });
    } finally {
      setBusy(false);
    }
  }

  async function hapusMentor() {
    if (!konfirmasiHapus || busy) return;

    const target = konfirmasiHapus;

    setBusy(true);
    setPesan(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        'kelola-akun',
        {
          body: {
            user_id: target.id,
            aksi: 'nonaktifkan',
          },
        }
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setKonfirmasiHapus(null);

      await muat();

      setPesan({
        tipe: 'ok',
        teks:
          `Akun "${target.nama_lengkap}" telah diproses untuk ` +
          'penonaktifan. Data dan relasi kelompok tetap dipertahankan.',
      });
    } catch (err) {
      setPesan({
        tipe: 'err',
        teks: err.message || 'Gagal menonaktifkan mentor.',
      });
    } finally {
      setBusy(false);
    }
  }

  async function copy(teks) {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error(
          'Clipboard tidak tersedia pada browser ini.'
        );
      }

      await navigator.clipboard.writeText(teks);

      setPesan({
        tipe: 'ok',
        teks: 'Informasi berhasil disalin ke clipboard.',
      });
    } catch (err) {
      setPesan({
        tipe: 'err',
        teks:
          err.message || 'Gagal menyalin ke clipboard.',
      });
    }
  }

  function tutupKredensial() {
    setKredensial(null);
    setShowCredentialPassword(false);
  }

  return (
    <div className="space-y-7 pb-8">
      <style>{MOTION}</style>

      {/* HEADER */}

      <header className="mm-enter flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Manajemen Mentor
          </h1>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Buat dan kelola akun pembimbing magang
            dalam satu tempat.
          </p>
        </div>

        <button
          type="button"
          onClick={muat}
          disabled={loading || busy}
          className="mm-button inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={loading ? 'animate-spin' : ''}
          />
          Refresh
        </button>
      </header>

      {/* NOTIFICATION */}

      <Notice
        pesan={pesan}
        onClose={() => setPesan(null)}
      />

      {/* CREATE MENTOR FORM */}

      <form
        onSubmit={buat}
        className="mm-enter mm-card overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm"
        style={{ animationDelay: '80ms' }}
      >

        {/* FORM HEADER */}

        <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-6 sm:flex-row sm:items-center">

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <UserRoundPlus size={24} strokeWidth={1.8} />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">
              Buat akun mentor baru
            </h2>

            <p className="mt-1 text-[13px] leading-5 text-slate-500">
              Isi informasi dasar dan siapkan kredensial login
              untuk pembimbing.
            </p>
          </div>

          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600">
            <UsersRound size={14} />
            {mentors.length} mentor
          </span>
        </div>

        {/* FORM FIELDS */}

        <div className="px-6 py-6">

          <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">

            {/* NAME */}

            <div>
              <label htmlFor="mentor-nama" className={LABEL}>
                Nama lengkap <span className="text-red-500">*</span>
              </label>

              <div className="relative">
                <UserRound
                  size={17}
                  className="pointer-events-none absolute left-4 top-3.5 text-slate-400"
                />

                <input
                  id="mentor-nama"
                  type="text"
                  required
                  autoComplete="off"
                  placeholder="Contoh: Budi Pembimbing"
                  value={form.nama}
                  onChange={(e) =>
                    setForm((previous) => ({
                      ...previous,
                      nama: e.target.value,
                    }))
                  }
                  className={`${INPUT} pl-11`}
                />
              </div>
            </div>

            {/* WHATSAPP */}

            <div>
              <label htmlFor="mentor-wa" className={LABEL}>
                Nomor WhatsApp
                <span className="ml-1 font-normal text-slate-400">
                  (opsional)
                </span>
              </label>

              <div className="relative">
                <Phone
                  size={17}
                  className="pointer-events-none absolute left-4 top-3.5 text-slate-400"
                />

                <input
                  id="mentor-wa"
                  type="tel"
                  autoComplete="off"
                  placeholder="08xxxxxxxxxx"
                  value={form.wa}
                  onChange={(e) =>
                    setForm((previous) => ({
                      ...previous,
                      wa: e.target.value,
                    }))
                  }
                  className={`${INPUT} pl-11`}
                />
              </div>
            </div>

            {/* EMAIL */}

            <div>
              <label htmlFor="mentor-email" className={LABEL}>
                Email <span className="text-red-500">*</span>
              </label>

              <div className="relative">
                <Mail
                  size={17}
                  className="pointer-events-none absolute left-4 top-3.5 text-slate-400"
                />

                <input
                  id="mentor-email"
                  type="email"
                  required
                  autoComplete="off"
                  placeholder="mentor@email.com"
                  value={form.email}
                  onChange={(e) =>
                    setForm((previous) => ({
                      ...previous,
                      email: e.target.value,
                    }))
                  }
                  className={`${INPUT} pl-11`}
                />
              </div>
            </div>

            {/* PASSWORD */}

            <div>
              <label htmlFor="mentor-password" className={LABEL}>
                Password <span className="text-red-500">*</span>
              </label>

              <div className="flex gap-2">

                <div className="relative min-w-0 flex-1">
                  <KeyRound
                    size={17}
                    className="pointer-events-none absolute left-4 top-3.5 text-slate-400"
                  />

                  <input
                    id="mentor-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="Minimal 6 karakter, huruf & angka"
                    value={form.password}
                    onChange={(e) =>
                      setForm((previous) => ({
                        ...previous,
                        password: e.target.value,
                      }))
                    }
                    className={`${INPUT} pl-11 pr-11`}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={
                      showPassword
                        ? 'Sembunyikan password'
                        : 'Tampilkan password'
                    }
                    className="mm-button absolute right-3 top-3 rounded-lg p-1 text-slate-400 hover:text-indigo-600"
                  >
                    {showPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  title="Buat password acak"
                  aria-label="Buat password acak"
                  onClick={() =>
                    setForm((previous) => ({
                      ...previous,
                      password: passwordAcak(),
                    }))
                  }
                  className="mm-button flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-[#F8F9FC] text-slate-600 hover:bg-indigo-50 hover:text-indigo-600"
                >
                  <Shuffle size={18} />
                </button>

              </div>

              <div className="mt-2 flex items-center gap-2 text-[11px]">
                {form.password ? (
                  passwordValid(form.password) ? (
                    <span className="mm-pop inline-flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 size={13} />
                      Format password valid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-600">
                      <AlertCircle size={13} />
                      Harus memiliki huruf, angka, dan minimal 6 karakter
                    </span>
                  )
                ) : (
                  <span className="text-slate-400">
                    Gunakan tombol acak untuk membuat password.
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* SECURITY NOTE */}

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-indigo-100 bg-[#F7F8FF] px-4 py-3">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600">
              <ShieldCheck size={18} />
            </div>

            <div>
              <p className="text-xs font-semibold text-indigo-800">
                Kredensial akun
              </p>

              <p className="mt-1 text-[11px] leading-5 text-indigo-600">
                Setelah akun berhasil dibuat, kredensial
                dapat disalin melalui jendela konfirmasi.
                Bagikan hanya kepada mentor yang bersangkutan.
              </p>
            </div>

          </div>

        </div>

        {/* FORM FOOTER */}

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-[#FAFAFC] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">

          <p className="text-xs text-slate-500">
            Kolom bertanda
            <span className="mx-1 text-red-500">*</span>
            wajib diisi.
          </p>

          <div className="flex gap-2">

            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setForm({ ...EMPTY_FORM });
                setShowPassword(false);
              }}
              className="mm-button h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Reset Form
            </button>

            <button
              type="submit"
              disabled={
                busy ||
                !form.nama.trim() ||
                !form.email.trim() ||
                !passwordValid(form.password)
              }
              className="mm-button mm-shimmer inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <UserRoundPlus size={17} />
              )}

              {busy ? 'Membuat akun...' : 'Buat Akun Mentor'}
            </button>

          </div>
        </div>
      </form>

      {/* MENTOR LIST HEADER */}

      <div
        className="mm-enter flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        style={{ animationDelay: '120ms' }}
      >

        <div>
          <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">
            Daftar Mentor
            <span className="ml-2 rounded-full bg-slate-200/70 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {mentors.length}
            </span>
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Lihat informasi mentor dan kelola akses akun.
          </p>
        </div>

        <div className="relative w-full sm:w-[280px]">
          <Search
            size={17}
            className="pointer-events-none absolute left-3.5 top-3 text-slate-400"
          />

          <input
            type="search"
            placeholder="Cari nama, email, WhatsApp..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${INPUT} h-11 pl-10`}
          />
        </div>

      </div>

      {/* MENTOR CARDS */}

      {loading ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="skeleton h-44 rounded-3xl" />
          <div className="skeleton h-44 rounded-3xl" />
        </div>
      ) : mentorTerfilter.length === 0 ? (
        <div className="mm-enter rounded-[22px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <UsersRound
            size={30}
            className="mx-auto text-slate-300"
          />

          <p className="mt-3 text-sm font-semibold text-slate-700">
            {search
              ? 'Mentor tidak ditemukan'
              : 'Belum ada mentor'}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {search
              ? 'Coba gunakan kata pencarian lain.'
              : 'Buat akun mentor pertama menggunakan form di atas.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">

          {mentorTerfilter.map((mentor, index) => {
            const expanded = expandedMentor === mentor.id;

            return (
              <article
                key={mentor.id}
                className="mm-enter mm-card overflow-hidden rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm"
                style={{
                  animationDelay: `${Math.min(index * 65, 420)}ms`,
                }}
              >

                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                  {/* MENTOR IDENTITY */}

                  <div className="flex min-w-0 flex-1 items-start gap-3">

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-semibold text-white">
                      {initials(mentor.nama_lengkap)}
                    </div>

                    <div className="min-w-0 flex-1">

                      <h3 className="truncate text-sm font-semibold text-slate-900">
                        {mentor.nama_lengkap || 'Tanpa nama'}
                      </h3>

                      <p className="mt-1 truncate text-xs text-slate-500">
                        {mentor.email || '-'}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        <CalendarDays size={13} />

                        <span>
                          Bergabung{' '}
                          {mentor.created_at
                            ? fmtTanggal(mentor.created_at)
                            : '-'}
                        </span>
                      </div>

                    </div>
                  </div>

                  {/* RESET ACTION */}

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => bukaReset(mentor)}
                    className="mm-button inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                  >
                    <KeyRound size={14} />
                    Reset Password
                  </button>

                </div>

                {/* CONTACT */}

                <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-[#F8F9FC] px-3 py-3">

                  <div className="flex min-w-0 items-center gap-2">
                    <Phone
                      size={15}
                      className="shrink-0 text-slate-400"
                    />

                    <span className="truncate text-xs text-slate-600">
                      {mentor.nomor_whatsapp || 'WhatsApp belum diisi'}
                    </span>
                  </div>

                  {mentor.nomor_whatsapp && (
                    <button
                      type="button"
                      title="Salin nomor WhatsApp"
                      aria-label={`Salin WhatsApp ${mentor.nama_lengkap}`}
                      onClick={() => copy(mentor.nomor_whatsapp)}
                      className="mm-button flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-indigo-600"
                    >
                      <Copy size={14} />
                    </button>
                  )}

                </div>

                {/* EXPANDABLE ACCOUNT DETAILS */}

                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`mentor-detail-${mentor.id}`}
                  onClick={() =>
                    setExpandedMentor((current) =>
                      current === mentor.id ? null : mentor.id
                    )
                  }
                  className="mm-button mt-3 flex w-full items-center justify-between rounded-xl px-2 py-2 text-left hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <ShieldCheck size={15} className="text-indigo-500" />
                    {expanded ? 'Tutup pengaturan akun' : 'Pengaturan akun'}
                  </span>

                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform duration-300 ${
                      expanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <div
                  id={`mentor-detail-${mentor.id}`}
                  className={`mm-expand ${expanded ? 'open' : ''}`}
                  aria-hidden={!expanded}
                >
                  <div>
                    <div className="space-y-3 border-t border-slate-100 pt-4">

                      <div className="flex items-start gap-2.5 rounded-xl bg-indigo-50/70 p-3">

                        <LockKeyhole
                          size={17}
                          className="mt-0.5 shrink-0 text-indigo-600"
                        />

                        <div>
                          <p className="text-xs font-semibold text-indigo-700">
                            Password terlindungi
                          </p>

                          <p className="mt-1 text-[11px] leading-5 text-indigo-600">
                            Password lama tidak ditampilkan.
                            Jika mentor kehilangan akses,
                            gunakan fitur reset password.
                          </p>
                        </div>

                      </div>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setKonfirmasiHapus(mentor)}
                        className="mm-button inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                      >
                        <UserRoundX size={16} />
                        Nonaktifkan Akun
                      </button>

                    </div>
                  </div>
                </div>

              </article>
            );
          })}

        </div>
      )}

      {/* CREDENTIAL MODAL */}

      <Modal
        open={!!kredensial}
        onClose={tutupKredensial}
        title="Akun Mentor Siap"
      >
        {kredensial && (
          <div className="space-y-5">

            <div className="mm-pop flex flex-col items-center text-center">

              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={31} />
              </div>

              <h3 className="mt-3 text-base font-semibold text-slate-900">
                Kredensial berhasil disiapkan
              </h3>

              <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
                Salin informasi akun untuk
                <b className="text-slate-700">
                  {' '}{kredensial.nama}
                </b>
                {' '}dan sampaikan melalui saluran yang aman.
              </p>

            </div>

            <div className="space-y-4 rounded-2xl border border-slate-200 bg-[#F8F9FC] p-4">

              <div>
                <label className={LABEL}>
                  Email
                </label>

                <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3">

                  <span className="min-w-0 break-all text-sm text-slate-700">
                    {kredensial.email}
                  </span>

                  <button
                    type="button"
                    title="Salin email"
                    onClick={() => copy(kredensial.email)}
                    className="mm-button rounded-lg p-1.5 text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
                  >
                    <Copy size={16} />
                  </button>

                </div>
              </div>

              <div>
                <label className={LABEL}>
                  Password
                </label>

                <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3">

                  <span className="min-w-0 break-all font-mono text-sm text-slate-700">
                    {showCredentialPassword
                      ? kredensial.password
                      : '••••••••••••'}
                  </span>

                  <div className="flex shrink-0 items-center gap-2">

                    <button
                      type="button"
                      title={
                        showCredentialPassword
                          ? 'Sembunyikan password'
                          : 'Tampilkan password'
                      }
                      onClick={() =>
                        setShowCredentialPassword((value) => !value)
                      }
                      className="mm-button rounded-lg p-1.5 text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
                    >
                      {showCredentialPassword ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>

                    <button
                      type="button"
                      title="Salin password"
                      onClick={() => copy(kredensial.password)}
                      className="mm-button rounded-lg p-1.5 text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
                    >
                      <Copy size={16} />
                    </button>

                  </div>
                </div>
              </div>

            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">

              <button
                type="button"
                onClick={() =>
                  copy(
                    `Email: ${kredensial.email}\n` +
                    `Password: ${kredensial.password}`
                  )
                }
                className="mm-button inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                <Copy size={16} />
                Salin Semua
              </button>

              <button
                type="button"
                onClick={tutupKredensial}
                className="mm-button inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                <Check size={16} />
                Selesai
              </button>

            </div>

            <p className="text-[11px] leading-5 text-slate-400">
              Informasi ini tidak ditampilkan ulang setelah
              jendela ditutup. Gunakan reset password jika
              mentor kehilangan kredensial.
            </p>

          </div>
        )}
      </Modal>

      {/* RESET PASSWORD MODAL */}

      <Modal
        open={!!resetTarget}
        onClose={tutupReset}
        title={`Reset Password — ${resetTarget?.nama_lengkap ?? ''}`}
      >
        {resetTarget && (
          <form onSubmit={kirimReset} className="space-y-5">

            <div className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600">
                <KeyRound size={21} />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {resetTarget.nama_lengkap}
                </p>

                <p className="mt-0.5 break-all text-xs text-slate-500">
                  {resetTarget.email}
                </p>
              </div>

            </div>

            <div>
              <label htmlFor="mentor-reset-password" className={LABEL}>
                Password baru
              </label>

              <div className="flex gap-2">

                <div className="relative min-w-0 flex-1">
                  <input
                    id="mentor-reset-password"
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={resetPw}
                    onChange={(e) => setResetPw(e.target.value)}
                    placeholder="Password baru"
                    className={`${INPUT} pr-11 font-mono`}
                  />

                  <button
                    type="button"
                    onClick={() => setShowResetPassword((value) => !value)}
                    className="mm-button absolute right-3 top-3 rounded-lg p-1 text-slate-400 hover:text-indigo-600"
                    aria-label={
                      showResetPassword
                        ? 'Sembunyikan password'
                        : 'Tampilkan password'
                    }
                  >
                    {showResetPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  title="Buat password acak"
                  onClick={() => setResetPw(passwordAcak())}
                  className="mm-button flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600"
                >
                  <Shuffle size={18} />
                </button>

              </div>

              <p className="mt-2 text-[11px] text-slate-400">
                Minimal 6 karakter, huruf dan angka.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">

              <button
                type="button"
                disabled={busy}
                onClick={tutupReset}
                className="mm-button h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={busy || !passwordValid(resetPw)}
                className="mm-button inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {busy ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <KeyRound size={16} />
                )}

                {busy ? 'Mereset...' : 'Reset Password'}
              </button>

            </div>

          </form>
        )}
      </Modal>

      {/* DISABLE ACCOUNT CONFIRMATION */}

      <ConfirmModal
        open={!!konfirmasiHapus}
        onClose={() => {
          if (!busy) setKonfirmasiHapus(null);
        }}
        onConfirm={hapusMentor}
        busy={busy}
        judul={
          konfirmasiHapus
            ? `Nonaktifkan "${konfirmasiHapus.nama_lengkap}"?`
            : ''
        }
        teks="Akun mentor akan dinonaktifkan. Data dan relasi kelompok tetap tersimpan."
        teksConfirm="Ya, Nonaktifkan"
        tipe="danger"
      />

    </div>
  );
}
