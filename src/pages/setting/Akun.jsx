import {
  CalendarDays,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import {
  useAuth,
} from '../../context/AuthContext';

import SettingsShell from '../../components/settings/SettingsShell';

function getInitials(name) {
  return (
    name ?? 'U'
  )
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (kata) =>
        kata[0]?.toUpperCase()
    )
    .join('');
}

function formatTanggal(value) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat(
    'id-ID',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone:
        'Asia/Jakarta',
    }
  ).format(
    new Date(value)
  );
}

function DetailItem({
  Icon,
  label,
  value,
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm backdrop-blur-md">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        <Icon size={17} />
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-semibold text-slate-800">
          {value || '—'}
        </p>
      </div>
    </div>
  );
}

export default function Akun() {
  const {
    user,
    profile,
    role,
  } = useAuth();

  const nama =
    profile?.nama_lengkap ??
    user?.email?.split('@')[0] ??
    'Pengguna';

  return (
    <SettingsShell
      icon={UserRound}
      title="Detail Info Akun"
      description="Informasi identitas dan akses akun yang sedang kamu gunakan di sistem Creativemu Academy."
      badge="Akun aktif"
    >
      <div className="space-y-5">
        {/* PROFIL UTAMA */}
        <div className="flex flex-col gap-5 rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-purple-50 to-fuchsia-50 p-5 sm:flex-row sm:items-center">
          {profile?.avatar_url ? (
            <img
              src={
                profile.avatar_url
              }
              alt={nama}
              className="h-24 w-24 shrink-0 rounded-3xl border-2 border-white object-cover shadow-lg"
            />
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border-2 border-white bg-gradient-to-br from-indigo-600 to-purple-600 text-3xl font-black text-white shadow-lg">
              {getInitials(
                nama
              )}
            </div>
          )}

          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
              Profil Pengguna
            </p>

            <h2 className="mt-1 break-words text-2xl font-extrabold text-slate-900">
              {nama}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Data utama akun
              Creativemu Academy.
            </p>

            <span className="mt-3 inline-flex rounded-full border border-indigo-200 bg-white/70 px-3 py-1 text-xs font-bold capitalize text-indigo-700">
              {role ?? '—'}
            </span>
          </div>
        </div>

        {/* DETAIL */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DetailItem
            Icon={Mail}
            label="Email"
            value={user?.email}
          />

          <DetailItem
            Icon={Phone}
            label="Nomor WhatsApp"
            value={
              profile?.nomor_whatsapp ??
              '—'
            }
          />

          <DetailItem
            Icon={
              CalendarDays
            }
            label="Bergabung Sejak"
            value={formatTanggal(
              profile?.created_at
            )}
          />

          <DetailItem
            Icon={
              ShieldCheck
            }
            label="Hak Akses"
            value={role}
          />
        </div>

        {role === 'admin' && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <p className="text-xs leading-relaxed text-slate-500">
              🔒 Password akun admin
              dikelola melalui sistem
              administrasi.
            </p>
          </div>
        )}
      </div>
    </SettingsShell>
  );
}