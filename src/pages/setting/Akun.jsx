import { useAuth } from '../../context/AuthContext';
import Greeting from '../../components/Greeting';


export default function Akun() {
  const { user, profile, role } = useAuth();

  return (
    <div>
      <Greeting subjudul="Informasi akun kamu" />
      <div className="mt-6 rounded-2xl bg-white p-6 shadow">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">
            {(profile?.nama_lengkap ?? 'U').split(' ').map((k) => k[0]).slice(0, 2).join('')}
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800">{profile?.nama_lengkap ?? '—'}</p>
            <p className="text-sm text-slate-400 capitalize">{role}</p>
          </div>
        </div>

        <div className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between border-b border-slate-100 py-2">
            <span className="text-slate-500">Email</span>
            <span className="font-semibold text-slate-800">{user?.email}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 py-2">
            <span className="text-slate-500">Nomor WhatsApp</span>
            <span className="font-semibold text-slate-800">{profile?.nomor_whatsapp ?? '—'}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 py-2">
            <span className="text-slate-500">Bergabung sejak</span>
            <span className="font-semibold text-slate-800">
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                : '—'}
            </span>
          </div>
        </div>

        {role === 'admin' && (
          <p className="mt-4 rounded-lg border-l-4 border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
            🔒 Password akun admin dikelola langsung melalui database.
          </p>
        )}
      </div>
    </div>
  );
}