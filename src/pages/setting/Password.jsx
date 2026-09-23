import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import Greeting from '../../components/Greeting';


const BASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export default function Password() {
  const [lama, setLama] = useState('');
  const [baru, setBaru] = useState('');
  const [konfirmasi, setKonfirmasi] = useState('');
  const [busy, setBusy] = useState(false);
  const [pesan, setPesan] = useState(null);

  async function ganti(e) {
    e.preventDefault();
    setPesan(null);
    if (baru !== konfirmasi)
      return setPesan({ tipe: 'err', teks: 'Konfirmasi password tidak sama.' });
    if (baru.length < 6)
      return setPesan({ tipe: 'err', teks: 'Password baru minimal 6 karakter.' });
    if (!/[A-Za-z]/.test(baru) || !/[0-9]/.test(baru))
      return setPesan({ tipe: 'err', teks: 'Password harus mengandung huruf dan angka.' });

    setBusy(true);
    try {
      const { data: sesiData } = await supabase.auth.getSession();
      const token = sesiData?.session?.access_token;
      if (!token) throw new Error('Sesi berakhir — login ulang.');

      const res = await fetch(`${BASE_URL}/functions/v1/ganti-password`, {
        method: 'POST',
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ password_lama: lama, password_baru: baru }),
      });
      const hasil = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(hasil?.error || `Gagal (HTTP ${res.status}).`);

      setPesan({ tipe: 'ok', teks: '✅ ' + (hasil.message ?? 'Password berhasil diganti.') });
      setLama(''); setBaru(''); setKonfirmasi('');
    } catch (err) {
      setPesan({ tipe: 'err', teks: err.message });
    } finally { setBusy(false); }
  }

  return (
    <div>
      <Greeting subjudul="Ganti password akunmu" />
      <div className="mt-6 max-w-lg rounded-2xl bg-white p-6 shadow">
        <p className="text-xs text-slate-400">
          Gunakan kombinasi huruf &amp; angka, minimal 6 karakter. Jika lupa password, hubungi admin.
        </p>

        {pesan && (
          <p className={`mt-3 rounded-lg p-3 text-sm ${
            pesan.tipe === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {pesan.teks}
          </p>
        )}

        <form onSubmit={ganti} className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Password Saat Ini</label>
            <input type="password" required value={lama}
              onChange={(e) => setLama(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Password Baru</label>
            <input type="password" required value={baru}
              onChange={(e) => setBaru(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Konfirmasi Password Baru</label>
            <input type="password" required value={konfirmasi}
              onChange={(e) => setKonfirmasi(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
          </div>
          <button type="submit" disabled={busy}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
            {busy ? 'Menyimpan...' : 'Ganti Password'}
          </button>
        </form>
      </div>
    </div>
  );
}