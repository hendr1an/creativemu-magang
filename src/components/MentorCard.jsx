import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function MentorCard() {
  const [mentor, setMentor] = useState(null); // null = belum ada data
  const [adaGrup, setAdaGrup] = useState(true);

  useEffect(() => {
    supabase.rpc('get_my_mentor').then(({ data }) => {
      const m = Array.isArray(data) ? data[0] : data;
      if (!m || !m.nama_lengkap) setAdaGrup(false);
      setMentor(m ?? null);
    });
  }, []);

  if (!adaGrup) return null; // belum punya kelompok → kartu disembunyikan

  return (
    <div className="rounded-2xl bg-white p-6 shadow">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        🧑‍🏫 Pembimbimgmu
      </p>
      {mentor ? (
        <>
          <div className="mt-3 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
              {mentor.nama_lengkap.split(' ').map((k) => k[0]).slice(0, 2).join('')}
            </div>
            <div>
              <p className="font-bold text-slate-800">{mentor.nama_lengkap}</p>
              <p className="text-xs text-slate-400">
                Kelompok {mentor.nama_kelompok}
                {mentor.batch_label ? ` · ${mentor.batch_label}` : ''}
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between border-b border-slate-100 py-1.5">
              <span className="text-slate-500">📧 Email</span>
              <a href={`mailto:${mentor.email}`} className="font-semibold text-indigo-600 hover:underline">
                {mentor.email}
              </a>
            </div>
            <div className="flex justify-between border-b border-slate-100 py-1.5">
              <span className="text-slate-500">📱 WhatsApp</span>
              {mentor.nomor_whatsapp ? (
                <a href={`https://wa.me/${mentor.nomor_whatsapp.replace(/^0/, '62')}`}
                   target="_blank" rel="noreferrer"
                   className="font-semibold text-green-600 hover:underline">
                  {mentor.nomor_whatsapp} 💬
                </a>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Pembimbing sejak</span>
              <span className="font-semibold text-slate-700">
                {new Date(mentor.bergabung).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-400">Memuat data pembimbing…</p>
      )}
    </div>
  );
}