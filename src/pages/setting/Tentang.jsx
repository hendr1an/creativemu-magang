import {
  Code2,
  Database,
  GraduationCap,
  MapPin,
  MessageCircle,
  Sparkles,
  Tag,
} from 'lucide-react';

import SettingsShell from '../../components/settings/SettingsShell';

function InfoItem({
  Icon,
  label,
  children,
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

        <div className="mt-1 text-sm font-semibold leading-relaxed text-slate-800">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function Tentang() {
  return (
    <SettingsShell
      icon={
        GraduationCap
      }
      title="Informasi Sistem"
      description="Informasi mengenai platform manajemen magang Creativemu Academy dan teknologi yang digunakan."
      badge="Creativemu Academy"
    >
      <div className="space-y-5">
        {/* HERO */}
        <div className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-purple-50 to-fuchsia-50 p-6 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-white bg-white/80 text-indigo-600 shadow-lg backdrop-blur-xl">
            <GraduationCap
              size={36}
            />
          </div>

          <h2 className="mt-4 text-xl font-extrabold text-slate-900 sm:text-2xl">
            Sistem Manajemen
            Magang
          </h2>

          <p className="mt-1 text-sm font-medium text-slate-500">
            Creativemu Academy
          </p>

          <p className="mx-auto mt-3 max-w-xl text-xs leading-relaxed text-slate-500">
            Platform terintegrasi
            untuk mengelola
            pendaftaran, peserta,
            presensi, logbook,
            projek, mentoring,
            penilaian, notifikasi,
            dan sertifikat magang.
          </p>
        </div>

        {/* SYSTEM INFO */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoItem
            Icon={Tag}
            label="Versi"
          >
            1.0.0
          </InfoItem>

          <InfoItem
            Icon={Code2}
            label="Teknologi"
          >
            React · Vite ·
            Tailwind CSS
          </InfoItem>

          <InfoItem
            Icon={Database}
            label="Backend"
          >
            Supabase ·
            PostgreSQL
          </InfoItem>

          <InfoItem
            Icon={
              MessageCircle
            }
            label="Kontak"
          >
            +62 896 1847 2759
          </InfoItem>

          <InfoItem
            Icon={MapPin}
            label="Lokasi"
          >
            Jl. Gn. Bulu No.89,
            Argorejo, Sedayu,
            Bantul, DIY 55752
          </InfoItem>

          <InfoItem
            Icon={Sparkles}
            label="Fitur Tampilan"
          >
            Light Mode · Dark
            Mode · Responsive
          </InfoItem>
        </div>

        <p className="text-center text-[10px] leading-relaxed text-slate-400">
          © Creativemu Academy —
          Sistem Manajemen Magang
        </p>
      </div>
    </SettingsShell>
  );
}