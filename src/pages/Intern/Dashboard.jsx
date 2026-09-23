import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useIntern } from '../../hooks/useIntern';
import { fmtTanggal } from '../../lib/format';
import MentorCard from '../../components/MentorCard';
import { CountUp, SkeletonCard } from '../../components/Skeleton';

const HARI_INI = new Date().toISOString().slice(0, 10);

const waktuWib = (iso) => new Date(iso).toLocaleString('id-ID', {
  weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  timeZone: 'Asia/Jakarta',
});

export default function Dashboard() {
  const { intern, loading } = useIntern();
  const [stats, setStats] = useState(null);
  const [attHariIni, setAttHariIni] = useState(null);
  const [subtasks, setSubtasks] = useState([]);
  const [mentoringNext, setMentoringNext] = useState(null);
  const [logbookHariIni, setLogbookHariIni] = useState(null);

  useEffect(() => { if (intern) muat(); }, [intern]);

  async function muat() {
    const [st, att, sub, lg] = await Promise.all([
      supabase.rpc('get_attendance_stats', { p_intern_id: intern.id }),
      supabase.from('attendance').select('*')
        .eq('intern_id', intern.id).eq('tanggal_presensi', HARI_INI).maybeSingle(),
      supabase.from('subtasks').select('judul, status, deadline, projects(judul_projek)')
        .eq('intern_id', intern.id),
      supabase.from('logbook').select('id').eq('intern_id', intern.id)
        .eq('tanggal', HARI_INI).maybeSingle(),
    ]);
    setStats(st.data);
    setAttHariIni(att.data ?? null);
    setSubtasks(sub.data ?? []);
    setLogbookHariIni(lg.data ?? null);
    if (intern.group_id) {
      const { data: mt } = await supabase.from('mentoring_schedules').select('*')
        .eq('group_id', intern.group_id).eq('status_sesi', 'Scheduled')
        .gte('tanggal_waktu', new Date().toISOString())
        .order('tanggal_waktu').limit(1);
      setMentoringNext(mt?.[0] ?? null);
    }
  }

  if (loading) {
    return (
      <div>
        <div className="skeleton h-8 w-52 rounded-xl" />
        <div className="mt-6 skeleton h-36 rounded-2xl" />
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="skeleton h-28 rounded-2xl" />
          <div className="skeleton h-28 rounded-2xl" />
        </div>
        <div className="mt-4 space-y-2">
          <div className="skeleton h-16 rounded-xl" />
          <div className="skeleton h-16 rounded-xl" />
        </div>
      </div>
    );
  }

  const belumMulai = intern.tanggal_mulai > HARI_INI;
  const totalSub = subtasks.length;
  const selesaiSub = subtasks.filter((s) => s.status === 'Selesai').length;
  const progress = totalSub ? Math.round((selesaiSub * 100) / totalSub) : null;
  const persen = stats?.persen_kehadiran;

  const aktif = subtasks.filter((s) => s.status !== 'Selesai' && s.deadline)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  const deadlineTerdekat = aktif.slice(0, 5);
  const telatCount = aktif.filter((s) => new Date(s.deadline) < new Date(HARI_INI)).length;

  const badgeDeadline = (d) => {
    const selisih = Math.round((new Date(d) - new Date(HARI_INI)) / 86400000);
    if (selisih < 0) return { t: `${Math.abs(selisih)} HARI TERLAMBAT`, c: 'bg-red-500 text-white' };
    if (selisih === 0) return { t: 'HARI INI!', c: 'bg-red-500 text-white' };
    if (selisih === 1) return { t: 'BESOK', c: 'bg-amber-400 text-amber-900' };
    if (selisih <= 3) return { t: `${selisih} hari lagi`, c: 'bg-amber-100 text-amber-700' };
    return { t: `${selisih} hari lagi`, c: 'bg-slate-100 text-slate-500' };
  };

  return (
    <div>
      {/* ===== HERO: ringkasan magang ===== */}
      <div className="anim-up relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-700 shadow-xl">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-14 -left-8 h-40 w-40 rounded-full bg-purple-400/20" />

        <div className="relative flex flex-col gap-5 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between lg:gap-8">

          {/* kiri: angka utama */}
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-200">
              Ringkasan Magangmu
            </p>
            <p className="mt-2.5 flex items-baseline gap-2">
              <span className={`text-5xl font-extrabold leading-none tracking-tight sm:text-6xl ${persen >= 85 ? 'text-green-300' : 'text-orange-300'}`}>
                <CountUp value={persen} suffix="%" />
              </span>
              <span className="text-base font-semibold text-indigo-200">kehadiran</span>
            </p>
            <p className="mt-2 text-[13px] font-medium leading-relaxed text-indigo-100">
              🎯 target 85% · 📊 <b className="text-white">{progress === null ? '—' : `${progress}%`}</b> progres tugas
              {Number(stats?.terlambat ?? 0) > 0 && ` · ⚠ telat ${stats.terlambat}×`}
            </p>
            <p className="mt-1 text-[11px] text-indigo-200/70">
              {fmtTanggal(intern.tanggal_mulai)} – {fmtTanggal(intern.tanggal_selesai)}
            </p>
          </div>

          {/* kanan: 2 kartu aksi */}
          <div className="grid w-full grid-cols-2 gap-3 sm:max-w-sm lg:w-auto">
            <Link to="/intern/presensi"
              className={`btn-press group rounded-xl p-3.5 backdrop-blur transition sm:p-4 ${
                !attHariIni && !belumMulai ? 'bg-white shadow-lg shadow-black/10 hover:bg-indigo-50' : 'bg-white/10 hover:bg-white/20'}`}>
              <div className="flex items-center justify-between">
                <p className={`text-[9px] font-bold uppercase tracking-[0.2em] ${!attHariIni && !belumMulai ? 'text-indigo-400' : 'text-indigo-200'}`}>
                  Presensi
                </p>
                <span className="text-base transition group-hover:scale-110">
                  {!attHariIni && !belumMulai ? '⏰' : attHariIni?.check_out ? '✅' : '💪'}
                </span>
              </div>
              <p className={`mt-1.5 text-2xl font-extrabold leading-none sm:text-3xl ${!attHariIni && !belumMulai ? 'text-indigo-700' : 'text-white'}`}>
                {!attHariIni ? (belumMulai ? '🔒' : 'Belum') : attHariIni?.check_out ? 'Done' : 'Ongoing'}
              </p>
              <p className={`mt-1 text-[10px] font-medium ${!attHariIni && !belumMulai ? 'text-indigo-500' : 'text-indigo-200'}`}>
                {!attHariIni ? (belumMulai ? 'belum mulai' : 'check-in sekarang!') : attHariIni?.check_out ? 'selesai hari ini' : 'sedang bekerja'}
              </p>
            </Link>

            <Link to="/intern/logbook"
              className={`btn-press group rounded-xl p-3.5 backdrop-blur transition sm:p-4 ${
                !logbookHariIni ? 'bg-white shadow-lg shadow-black/10 hover:bg-indigo-50' : 'bg-white/10 hover:bg-white/20'}`}>
              <div className="flex items-center justify-between">
                <p className={`text-[9px] font-bold uppercase tracking-[0.2em] ${!logbookHariIni ? 'text-indigo-400' : 'text-indigo-200'}`}>
                  Logbook
                </p>
                <span className="text-base transition group-hover:scale-110">{logbookHariIni ? '✍️' : '📖'}</span>
              </div>
              <p className={`mt-1.5 text-2xl font-extrabold leading-none sm:text-3xl ${!logbookHariIni ? 'text-indigo-700' : 'text-white'}`}>
                {logbookHariIni ? 'Done' : 'Kosong'}
              </p>
              <p className={`mt-1 text-[10px] font-medium ${!logbookHariIni ? 'text-indigo-500' : 'text-indigo-200'}`}>
                {logbookHariIni ? 'terisi hari ini' : 'tulis catatan!'}
              </p>
            </Link>
          </div>
        </div>
      </div>

      {/* ===== mentor + presensi detail + logbook ===== */}
      <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
        <div className="anim-up [animation-delay:400ms]">
          <MentorCard />
        </div>

        <Link to="/intern/presensi"
          className="anim-up card-hover rounded-2xl border border-slate-100 bg-white p-5 shadow-sm [animation-delay:500ms]">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">🕐 Presensi Hari Ini</p>
            <span className="text-[10px] font-bold text-indigo-500">Detail →</span>
          </div>
          {!attHariIni ? (
            <p className="mt-3 text-sm font-bold text-slate-600">
              {belumMulai ? 'Masa magang belum dimulai' : 'Belum check-in hari ini ⏰'}
            </p>
          ) : attHariIni.check_out ? (
            <p className="mt-3 text-sm font-bold text-green-600">✅ Hari ini selesai — kerja bagus!</p>
          ) : (
            <p className="mt-3 text-sm font-bold text-slate-700">
              💪 Sedang bekerja sejak {new Date(attHariIni.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB
            </p>
          )}
        </Link>

        <Link to="/intern/mentoring"
          className="anim-up card-hover rounded-2xl border border-slate-100 bg-white p-5 shadow-sm [animation-delay:600ms]">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">📅 Mentoring Berikutnya</p>
            <span className="text-[10px] font-bold text-indigo-500">Detail →</span>
          </div>
          {mentoringNext ? (
            <>
              <p className="mt-3 truncate text-sm font-bold text-slate-700">{mentoringNext.judul_sesi}</p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                🕒 {waktuWib(mentoringNext.tanggal_waktu)} WIB
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm font-medium text-slate-400">Belum ada jadwal</p>
          )}
        </Link>

        <Link to="/intern/logbook"
          className="anim-up card-hover rounded-2xl border border-slate-100 bg-white p-5 shadow-sm [animation-delay:700ms]">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">📖 Logbook Hari Ini</p>
            <span className="text-[10px] font-bold text-indigo-500">Detail →</span>
          </div>
          <p className={`mt-3 text-sm font-bold ${logbookHariIni ? 'text-green-600' : 'text-slate-600'}`}>
            {logbookHariIni ? '✅ Catatan hari ini sudah terisi' : 'Belum menulis catatan ✍️'}
          </p>
        </Link>
      </div>

      {/* ===== tenggat terdekat ===== */}
      <h2 className="anim-up mt-8 text-base font-bold text-slate-800 [animation-delay:800ms]">⏳ Tenggat Terdekat</h2>
      <div className="mt-3 space-y-2">
        {deadlineTerdekat.length === 0 ? (
          <div className="anim-up flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-6 text-center [animation-delay:800ms]">
            <p className="anim-bounce-soft text-4xl">🎉</p>
            <p className="mt-3 text-sm font-semibold text-slate-500">Tidak ada tugas ber-tenggat aktif — aman!</p>
          </div>
        ) : deadlineTerdekat.map((s, i) => {
          const b = badgeDeadline(s.deadline);
          return (
            <Link key={`${s.judul}-${s.deadline}`} to="/intern/projek"
              className={`card-hover anim-right flex items-center justify-between gap-3 rounded-2xl border p-4 shadow-sm ${
                b.c.includes('red') ? 'border-red-200 bg-red-50/50' : 'border-slate-100 bg-white'}`}
              style={{ animationDelay: `${850 + i * 90}ms` }}>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-800">{s.judul}</p>
                <p className="text-[11px] font-medium text-slate-400">
                  📁 {s.projects?.judul_projek ?? '—'} · ⏰ {fmtTanggal(s.deadline)}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-extrabold ${b.c}`}>{b.t}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}