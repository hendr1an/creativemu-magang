import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useIntern } from '../../hooks/useIntern';

const BADGE = {
  Scheduled: 'bg-blue-500',
  Completed: 'bg-emerald-500',
  Cancelled: 'bg-red-500',
};

const waktuWib = (iso) => new Date(iso).toLocaleString('id-ID', {
  weekday: 'long', day: 'numeric', month: 'long',
  hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
});

export default function Mentoring() {
  const { intern, loading } = useIntern();
  const [jadwal, setJadwal] = useState([]);

  useEffect(() => { if (intern?.group_id) muat(); }, [intern]);

  async function muat() {
    const { data } = await supabase.from('mentoring_schedules').select('*')
      .eq('group_id', intern.group_id).order('tanggal_waktu', { ascending: false });
    setJadwal(data ?? []);
  }

  if (loading) return (
    <div>
      <div className="skeleton h-8 w-44 rounded-xl" />
      <div className="mt-6 skeleton h-48 rounded-2xl" />
    </div>
  );

  if (!intern?.group_id) {
    return (
      <div>
        <div className="anim-up">
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Jadwal Mentoring</h1>
        </div>
        <div className="anim-up mt-6 flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="anim-float text-5xl">👥</p>
          <p className="mt-4 text-lg font-bold text-slate-700">Belum Tergabung dalam Kelompok</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Jadwal mentoring akan muncul di sini setelah admin memasukkanmu ke kelompok.
          </p>
        </div>
      </div>
    );
  }

  const sekarang = new Date().toISOString();
  const akanDatang = jadwal.filter((j) => j.tanggal_waktu >= sekarang && j.status_sesi === 'Scheduled');
  const lampau = jadwal.filter((j) => !(j.tanggal_waktu >= sekarang && j.status_sesi === 'Scheduled'));

  return (
    <div>
      <div className="anim-up">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Jadwal Mentoring</h1>
      </div>

      <h2 className="anim-up mt-6 text-base font-bold text-slate-800 [animation-delay:80ms]">🗓️ Akan Datang</h2>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {akanDatang.length === 0 ? (
          <div className="anim-up col-span-full flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center [animation-delay:80ms]">
            <p className="anim-float text-4xl">📅</p>
            <p className="mt-3 text-sm font-semibold text-slate-400">Belum ada jadwal — pembimbing akan mengaturnya</p>
          </div>
        ) : akanDatang.map((j, i) => (
          <div key={j.id}
            className="anim-up card-hover relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 p-5 text-white shadow-xl"
            style={{ animationDelay: `${i * 90}ms` }}>
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />

            <div className="relative">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-200">
                {j.platform ?? 'Sesi Mentoring'}
              </p>
              <p className="mt-1.5 text-base font-extrabold leading-snug">{j.judul_sesi}</p>
              <p className="mt-1.5 text-sm font-medium text-indigo-100">
                🕒 {waktuWib(j.tanggal_waktu)} WIB
              </p>
              {j.catatan && (
                <p className="mt-2 rounded-xl bg-white/10 px-3 py-2 text-[11px] leading-relaxed text-indigo-100">
                  📝 {j.catatan}
                </p>
              )}
              {j.link_meeting && (
                <a href={j.link_meeting} target="_blank" rel="noreferrer"
                  className="btn-press mt-3 inline-block rounded-xl bg-white px-5 py-2.5 text-xs font-extrabold text-indigo-700 shadow-lg hover:bg-indigo-50">
                  🔗 Gabung Sesi
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {lampau.length > 0 && (
        <>
          <h2 className="anim-up mt-8 text-base font-bold text-slate-800 [animation-delay:200ms]">🕘 Riwayat</h2>
          <div className="mt-3 space-y-2">
            {lampau.map((j, i) => (
              <div key={j.id}
                className="anim-up flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
                style={{ animationDelay: `${220 + i * 60}ms` }}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-700">{j.judul_sesi}</p>
                  <p className="text-[11px] font-medium text-slate-400">
                    {waktuWib(j.tanggal_waktu)} WIB{j.platform && ` · ${j.platform}`}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-extrabold text-white ${BADGE[j.status_sesi]}`}>
                  {j.status_sesi.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}