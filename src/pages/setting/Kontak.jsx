import {
  useEffect,
  useState,
} from 'react';

import {
  MessageCircleMore,
  Phone,
  Save,
} from 'lucide-react';

import {
  supabase,
} from '../../lib/supabaseClient';

import {
  useAuth,
} from '../../context/AuthContext';

import SettingsShell from '../../components/settings/SettingsShell';

export default function Kontak() {
  const {
    user,
  } = useAuth();

  const [
    wa,
    setWa,
  ] = useState('');

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    pesan,
    setPesan,
  ] = useState(null);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let aktif = true;

    async function muat() {
      setLoading(true);

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'profiles'
          )
          .select(
            'nomor_whatsapp'
          )
          .eq(
            'id',
            user.id
          )
          .maybeSingle();

      if (!aktif) {
        return;
      }

      if (error) {
        setPesan({
          tipe: 'err',
          teks:
            error.message,
        });
      } else {
        setWa(
          data?.nomor_whatsapp ??
            ''
        );
      }

      setLoading(false);
    }

    muat();

    return () => {
      aktif = false;
    };
  }, [user]);

  async function simpan(e) {
    e.preventDefault();

    setPesan(null);

    const bersih =
      wa.replace(
        /[\s-]/g,
        ''
      );

    if (
      !/^(\+?62|0)8\d{7,12}$/.test(
        bersih
      )
    ) {
      return setPesan({
        tipe: 'err',

        teks:
          'Nomor tidak valid. Contoh: 081234567890',
      });
    }

    setBusy(true);

    const {
      error,
    } =
      await supabase
        .from(
          'profiles'
        )
        .update({
          nomor_whatsapp:
            bersih,
        })
        .eq(
          'id',
          user.id
        );

    if (error) {
      setPesan({
        tipe: 'err',
        teks:
          error.message,
      });
    } else {
      setWa(
        bersih
      );

      setPesan({
        tipe: 'ok',

        teks:
          '✅ Nomor WhatsApp tersimpan — notifikasi akan dikirim ke nomor ini.',
      });
    }

    setBusy(false);
  }

  return (
    <SettingsShell
      icon={
        MessageCircleMore
      }
      title="Konfigurasi WhatsApp"
      description="Atur nomor WhatsApp yang digunakan untuk menerima komunikasi dan notifikasi penting dari Creativemu Academy."
      badge="Kontak notifikasi"
      footer={
        <p className="text-xs leading-relaxed text-slate-500">
          Pastikan nomor masih
          aktif dan dapat
          menerima pesan
          WhatsApp.
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

      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-12 rounded-2xl" />
          <div className="skeleton h-16 rounded-2xl" />
        </div>
      ) : (
        <form
          onSubmit={simpan}
          className="space-y-5"
        >
          <div>
            <label className="text-sm font-semibold text-slate-700">
              Nomor WhatsApp
            </label>

            <div className="relative mt-2">
              <Phone
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                required
                value={wa}
                onChange={(e) =>
                  setWa(
                    e.target.value
                  )
                }
                placeholder="08xxxxxxxxxx"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white/80 pl-11 pr-4 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Notifikasi penting
              seperti tugas, izin,
              jadwal mentoring, dan
              informasi akun dapat
              dikirim melalui nomor
              ini.
            </p>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="btn-press flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save
              size={17}
            />

            {busy
              ? 'Menyimpan...'
              : 'Simpan Nomor'}
          </button>
        </form>
      )}
    </SettingsShell>
  );
}