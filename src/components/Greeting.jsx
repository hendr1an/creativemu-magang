import { useAuth } from '../context/AuthContext';

function sapaanWib() {
  const jam = parseInt(
    new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', hour12: false })
      .format(new Date()), 10
  );
  if (jam < 12) return { teks: 'Selamat Pagi', ikon: '👋' };
  if (jam < 17) return { teks: 'Selamat Siang', ikon: '☀️' };
  if (jam < 20) return { teks: 'Selamat Sore', ikon: '🌇' };
  return { teks: 'Selamat Malam', ikon: '🌙' };
}

export default function Greeting({ subjudul, judul }) {
  return (
    <div className="anim-up">
      <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
        {judul ?? 'Dashboard'}
      </h1>
      {subjudul && (
        <p className="mt-1 text-sm font-medium text-slate-500">{subjudul}</p>
      )}
    </div>
  );
}