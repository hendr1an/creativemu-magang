import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, user, profile } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user && profile) navigate(`/${profile.role}`, { replace: true });
  }, [user, profile]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch {
      setError('Email atau password salah.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4">
      {/* ===== Blobs latar animasi ===== */}
      <div className="bg-blob anim-float" style={{ width: 420, height: 420, background: '#6366f1', top: '-8%', left: '-8%' }} />
      <div className="bg-blob anim-float" style={{ width: 380, height: 380, background: '#a855f7', bottom: '-10%', right: '-6%', animationDelay: '1.2s' }} />
      <div className="bg-blob anim-float" style={{ width: 300, height: 300, background: '#ec4899', top: '52%', left: '12%', animationDelay: '.6s' }} />

      {/* ===== Kartu login ===== */}
      <div className="anim-pop relative w-full max-w-sm rounded-3xl border border-white/10 bg-white/95 p-8 shadow-2xl backdrop-blur">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-2xl shadow-lg">
            🎓
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-800">Creativemu Academy</h1>
          <p className="mt-0.5 text-sm text-slate-500">Sistem Manajemen Magang</p>
        </div>

        {error && (
          <p className="anim-down mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input
              type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              placeholder="nama@email.com" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Password</label>
            <input
              type="password" required value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              placeholder="••••••••" />
          </div>
          <button
            type="submit" disabled={busy}
            className="btn-press anim-pulse-ring w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 font-bold text-white shadow-lg shadow-indigo-500/30 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-60">
            {busy ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Memproses...
              </span>
            ) : 'Masuk'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Belum punya akun?{' '}
          <Link to="/register" className="font-bold text-indigo-600 transition hover:text-indigo-800 hover:underline">
            Daftar Magang →
          </Link>
        </p>

        <p className="mt-4 text-center text-[10px] text-slate-400">
          Jl. Gn. Bulu No.89, Sedayu, Bantul, DIY
        </p>
      </div>
    </div>
  );
}