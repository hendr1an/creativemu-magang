import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const FOTO_LOGIN = [
  '/images/login-1.jpg',
  '/images/login-2.jpg',
  '/images/login-3.jpg',
];

const DURASI_SLIDE = 5000;

export default function Login() {
  const { login, user, profile } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [slide, setSlide] = useState(0);
  const [passwordVisible, setPasswordVisible] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setSlide((s) => (s + 1) % FOTO_LOGIN.length);
    }, DURASI_SLIDE);
    return () => clearInterval(t);
  }, []);

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
    <div className="flex h-screen overflow-hidden">

      {/* ================= KIRI: FOTO (60%) ================= */}
      <div className="relative hidden w-[60%] overflow-hidden lg:block">

        {FOTO_LOGIN.map((src, i) => (
          <div key={src}
            className={`login-slide bg-cover bg-center ${i === slide ? 'active' : ''}`}
            style={{ backgroundImage: `url(${src})` }} />
        ))}

        <div className="absolute inset-0 bg-gradient-to-t from-[#4235BA]/85 via-[#4235BA]/25 to-transparent" />

        {/* teks overlay */}
        <div className="absolute inset-x-0 bottom-0 p-12">
          <h2 className="text-3xl font-bold leading-tight text-white">
            Tingkatkan Skill,
            <br />Bangun Portofolio.
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/70">
            Sistem Manajemen Magang Creativemu Academy, Sedayu.
          </p>

          <div className="mt-8 flex gap-2">
            {FOTO_LOGIN.map((_, i) => (
              <button key={i} onClick={() => setSlide(i)}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i === slide ? 'w-8 bg-white' : 'w-3 bg-white/40 hover:bg-white/60'
                }`} />
            ))}
          </div>
        </div>
      </div>

      {/* ================= KANAN: FORM (40%) ================= */}
      {/* ⭐ background PUTIH — menyatu dengan kotak putih logo */}
      <div className="flex w-full flex-col bg-white lg:w-[40%]">

        <div className="flex flex-1 items-center justify-center px-6 py-10">

          <div className="w-full max-w-sm">

            {/* ⭐ logo — tanpa mix-blend-mode, menyatu dengan bg putih */}
            <div className="anim-up mb-8 flex justify-center">
              <img src="/images/logo-creativemu.png" alt="Creativemu Academy"
                className="h-14 w-auto transition-transform duration-300 hover:scale-105" />
            </div>

            {/* judul */}
            <div className="anim-up text-center [animation-delay:100ms]">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Masuk ke akun Anda
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Sistem Manajemen Magang Creativemu Academy
              </p>
            </div>

            {error && (
              <div className="anim-down mt-6 flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50 px-4 py-3">
                <span className="mt-0.5 shrink-0 text-sm text-red-500">✕</span>
                <p className="text-sm font-medium text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">

              <div className="anim-up [animation-delay:200ms]">
                <label className="text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition-all duration-200 focus:border-[#9647FE] focus:ring-4 focus:ring-purple-200/60 hover:border-slate-400"
                  placeholder="nama@email.com" />
              </div>

              <div className="anim-up [animation-delay:300ms]">
                <label className="text-sm font-medium text-slate-700">Password</label>
                <div className="relative">
                  <input
                    type={passwordVisible ? 'text' : 'password'}
                    required value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm outline-none transition-all duration-200 focus:border-[#9647FE] focus:ring-4 focus:ring-purple-200/60 hover:border-slate-400"
                    placeholder="Password Anda" />
                  <button
                    type="button"
                    onClick={() => setPasswordVisible(!passwordVisible)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#9647FE]"
                    title={passwordVisible ? 'Sembunyikan password' : 'Lihat password'}>
                    {passwordVisible ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="anim-up [animation-delay:400ms]">
                <button
                  type="submit" disabled={busy}
                  className="btn-press w-full rounded-lg bg-[#9647FE] py-2.5 text-sm font-semibold text-white shadow-md shadow-purple-300/40 transition-all duration-200 hover:bg-[#7c36d9] hover:shadow-lg hover:shadow-purple-400/40 focus:ring-4 focus:ring-purple-300 focus:ring-offset-1 disabled:opacity-60">
                  {busy ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Memproses...
                    </span>
                  ) : 'Masuk'}
                </button>
              </div>
            </form>

            <div className="anim-up mt-6 text-center text-sm text-slate-500 [animation-delay:500ms]">
              Belum punya akun?{' '}
              <Link to="/register"
                className="font-semibold text-[#9647FE] transition hover:text-[#4235BA] hover:underline">
                Daftar Magang
              </Link>
            </div>

          </div>
        </div>

        {/* ⭐ footer putih — konsisten */}
        <footer className="border-t border-slate-100 bg-white px-6 py-3">
          <p className="text-center text-[10px] text-slate-400">
            © 2026 Creativemu Academy · Jl. Gn. Bulu No.89, Sedayu, Bantul, DIY 55752
          </p>
        </footer>

      </div>
    </div>
  );
}