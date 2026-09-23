import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import Greeting from '../../components/Greeting';


export default function Kontak() {
  const { user } = useAuth();
  const [wa, setWa] = useState('');
  const [busy, setBusy] = useState(false);
  const [pesan, setPesan] = useState(null);

  useEffect(() => {
    supabase.from('profiles').select('nomor_whatsapp').eq('id', user.id).maybeSingle()
      .then(({ data }) => setWa(data?.nomor_whatsapp ?? ''));
  }, [user]);

  async function simpan(e) {
    e.preventDefault();
    setPesan(null);
    const bersih = wa.replace(/[\s-]/g, '');
    if (!/^(\+?62|0)8\d{7,12}$/.test(bersih))
      return setPesan({ tipe: 'err', teks: 'Nomor tidak valid. Contoh: 081234567890' });

    setBusy(true);
    const { error } = await supabase.from('profiles')
      .update({ nomor_whatsapp: bersih }).eq('id', user.id);
    if (error) setPesan({ tipe: 'err', teks: error.message });
    else setPesan({ tipe: 'ok', teks: '✅ Nomor WhatsApp tersimpan — notifikasi akan dikirim ke nomor ini.' });
    setBusy(false);
  }

  return (
    <div>
      <Greeting subjudul="Nomor WhatsApp untuk menerima notifikasi" />
      <div className="mt-6 max-w-lg rounded-2xl bg-white p-6 shadow">
        {pesan && (
          <p className={`mb-4 rounded-lg p-3 text-sm ${
            pesan.tipe === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-red-600'}`}>
            {pesan.teks}
          </p>
        )}
        <form onSubmit={simpan} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Nomor WhatsApp</label>
            <input required value={wa} onChange={(e) => setWa(e.target.value)}
              placeholder="08xxxxxxxxxx"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
            <p className="mt-1 text-xs text-slate-400">
              Notifikasi penting (tugas, izin, jadwal) dikirim ke nomor ini via gateway WhatsApp.
            </p>
          </div>
          <button type="submit" disabled={busy}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
            {busy ? 'Menyimpan...' : 'Simpan Nomor'}
          </button>
        </form>
      </div>
    </div>
  );
}