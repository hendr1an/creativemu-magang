import {
  useState,
} from 'react';

import {
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';

import {
  supabase,
} from '../../lib/supabaseClient';

import SettingsShell from '../../components/settings/SettingsShell';

const BASE_URL =
  import.meta.env
    .VITE_SUPABASE_URL;

const ANON_KEY =
  import.meta.env
    .VITE_SUPABASE_ANON_KEY;

function PasswordField({
  label,
  value,
  setValue,
  visible,
  setVisible,
  placeholder,
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700">
        {label}
      </label>

      <div className="relative mt-2">
        <input
          type={
            visible
              ? 'text'
              : 'password'
          }
          required
          value={value}
          onChange={(e) =>
            setValue(
              e.target.value
            )
          }
          placeholder={
            placeholder
          }
          className="h-12 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 pr-12 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />

        <button
          type="button"
          onClick={() =>
            setVisible(
              (prev) =>
                !prev
            )
          }
          className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label={
            visible
              ? 'Sembunyikan password'
              : 'Lihat password'
          }
        >
          {visible ? (
            <EyeOff
              size={18}
            />
          ) : (
            <Eye
              size={18}
            />
          )}
        </button>
      </div>
    </div>
  );
}

export default function Password() {
  const [
    lama,
    setLama,
  ] = useState('');

  const [
    baru,
    setBaru,
  ] = useState('');

  const [
    konfirmasi,
    setKonfirmasi,
  ] = useState('');

  const [
    showLama,
    setShowLama,
  ] = useState(false);

  const [
    showBaru,
    setShowBaru,
  ] = useState(false);

  const [
    showKonfirmasi,
    setShowKonfirmasi,
  ] = useState(false);

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    pesan,
    setPesan,
  ] = useState(null);

  async function ganti(e) {
    e.preventDefault();

    setPesan(null);

    if (
      baru !== konfirmasi
    ) {
      return setPesan({
        tipe: 'err',
        teks:
          'Konfirmasi password tidak sama.',
      });
    }

    if (
      baru.length < 6
    ) {
      return setPesan({
        tipe: 'err',
        teks:
          'Password baru minimal 6 karakter.',
      });
    }

    if (
      !/[A-Za-z]/.test(
        baru
      ) ||
      !/[0-9]/.test(
        baru
      )
    ) {
      return setPesan({
        tipe: 'err',
        teks:
          'Password harus mengandung huruf dan angka.',
      });
    }

    if (lama === baru) {
      return setPesan({
        tipe: 'err',
        teks:
          'Password baru harus berbeda dari password saat ini.',
      });
    }

    setBusy(true);

    try {
      const {
        data: sesiData,
      } =
        await supabase.auth.getSession();

      const token =
        sesiData?.session
          ?.access_token;

      if (!token) {
        throw new Error(
          'Sesi berakhir — silakan login ulang.'
        );
      }

      const res =
        await fetch(
          `${BASE_URL}/functions/v1/ganti-password`,
          {
            method: 'POST',

            headers: {
              apikey:
                ANON_KEY,

              Authorization:
                `Bearer ${token}`,

              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify(
                {
                  password_lama:
                    lama,

                  password_baru:
                    baru,
                }
              ),
          }
        );

      const hasil =
        await res
          .json()
          .catch(
            () => ({})
          );

      if (!res.ok) {
        throw new Error(
          hasil?.error ??
            `Gagal mengganti password (HTTP ${res.status}).`
        );
      }

      setPesan({
        tipe: 'ok',

        teks:
          '✅ ' +
          (
            hasil.message ??
            'Password berhasil diganti.'
          ),
      });

      setLama('');
      setBaru('');
      setKonfirmasi('');
    } catch (err) {
      setPesan({
        tipe: 'err',

        teks:
          err?.message ??
          'Gagal mengganti password.',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsShell
      icon={KeyRound}
      title="Perbarui Password"
      description="Perbarui password akun secara aman. Password lama tetap diverifikasi sebelum perubahan disimpan."
      badge={
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck
            size={13}
          />
          Keamanan akun
        </span>
      }
      footer={
        <p className="text-xs leading-relaxed text-slate-500">
          Gunakan password unik
          dan jangan membagikannya
          kepada orang lain.
        </p>
      }
    >
      {pesan && (
        <div
          className={`mb-5 rounded-2xl border px-4 py-3 text-sm font-medium ${
            pesan.tipe === 'ok'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-600'
          }`}
        >
          {pesan.teks}
        </div>
      )}

      <form
        onSubmit={ganti}
        className="space-y-5"
      >
        <PasswordField
          label="Password Saat Ini"
          value={lama}
          setValue={setLama}
          visible={
            showLama
          }
          setVisible={
            setShowLama
          }
          placeholder="Masukkan password saat ini"
        />

        <PasswordField
          label="Password Baru"
          value={baru}
          setValue={setBaru}
          visible={
            showBaru
          }
          setVisible={
            setShowBaru
          }
          placeholder="Minimal 6 karakter"
        />

        <PasswordField
          label="Konfirmasi Password Baru"
          value={konfirmasi}
          setValue={
            setKonfirmasi
          }
          visible={
            showKonfirmasi
          }
          setVisible={
            setShowKonfirmasi
          }
          placeholder="Ulangi password baru"
        />

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
              <LockKeyhole
                size={18}
              />
            </div>

            <div>
              <p className="text-sm font-bold text-slate-800">
                Password yang baik
              </p>

              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Minimal 6 karakter
                dan harus mengandung
                huruf serta angka.
              </p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="btn-press h-12 rounded-2xl bg-blue-600 px-6 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy
            ? 'Menyimpan...'
            : 'Ganti Password'}
        </button>
      </form>
    </SettingsShell>
  );
}