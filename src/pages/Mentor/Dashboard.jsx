import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useMentor } from '../../hooks/useMentor';
import { CountUp, SkeletonCard } from '../../components/Skeleton';

const waktuWib = (iso) => new Date(iso).toLocaleString('id-ID', {
  weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  timeZone: 'Asia/Jakarta',
});

export default function Dashboard() {
  const { groups, mentees, loading } = useMentor();
  const [siap, setSiap] = useState(false);
  const [subtasks, setSubtasks] = useState([]);
  const [stats, setStats] = useState({});
  const [rubrik, setRubrik] = useState([]);
  const [mentoringNext, setMentoringNext] = useState(null);

  useEffect(() => { if (!loading) muat(); }, [loading]);

  async function muat() {
    if (mentees.length === 0) { setSiap(true); return; }
    const ids = mentees.map((m) => m.id);

    const [{ data: sub }, { data: rb }, { data: mt }] = await Promise.all([
      supabase.from('subtasks').select('judul, status, submitted_at, intern_id, interns(nama_lengkap)')
        .in('intern_id', ids),
      supabase.from('rubric_scores')
        .select('intern_id, periode, nilai_soft_skill, nilai_hard_skill, created_at')
        .in('intern_id', ids),
      groups.length > 0
        ? supabase.from('mentoring_schedules').select('judul_sesi, tanggal_waktu')
            .in('group_id', groups.map((g) => g.id)).eq('status_sesi', 'Scheduled')
            .gte('tanggal_waktu', new Date().toISOString())
            .order('tanggal_waktu').limit(1)
        : Promise.resolve({ data: [] }),
    ]);

    setSubtasks(sub ?? []);
    setRubrik(rb ?? []);
    setMentoringNext(mt?.[0] ?? null);

    const entri = await Promise.all(mentees.map(async (m) => {
      const { data } = await supabase.rpc('get_attendance_stats', { p_intern_id: m.id });
      return [m.id, data];
    }));
    setStats(Object.fromEntries(entri));
    setSiap(true);
  }

  if (loading || !siap) {
    return (
      <div>
        <div className="skeleton h-8 w-52 rounded-xl" />
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
        <div className="mt-6 skeleton h-40 rounded-2xl" />
      </div>
    );
  }

  const antreanReview = subtasks
    .filter((s) => s.status === 'Menunggu Review')
    .sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at));

  const belumDinilai = mentees.filter((m) =>
    !rubrik.some((r) => {
      if (r.intern_id !== m.id || !r.created_at) return false;
      return Date.now() - new Date(r.created_at).getTime() < 45 * 24 * 60 * 60 * 1000;
    }));

  const progres = (iid) => {
    const total = subtasks.filter((s) => s.intern_id === iid).length;
    const selesai = subtasks.filter((s) => s.intern_id === iid && s.status === 'Selesai').length;
    return total ? Math.round((selesai * 100) / total) : null;
  };
  const kehadiranM = (iid) => stats[iid]?.persen_kehadiran;
  const rubrikM = (iid) => {
    const rows = rubrik.filter((r) => r.intern_id === iid);
    if (!rows.length) return null;
    const avg = (arr) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    return { soft: avg(rows.map((r) => Number(r.nilai_soft_skill))),
             hard: avg(rows.map((r) => Number(r.nilai_hard_skill))) };
  };

  return (
    <div>
      {/* ===== HERO: ringkasan binaan (proporsional) ===== */}
      <div className="anim-up relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-700 shadow-xl">
        {/* dekorasi lingkaran halus */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-14 -left-8 h-40 w-40 rounded-full bg-purple-400/20" />

        <div className="relative flex flex-col gap-5 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between lg:gap-8">

          {/* kiri: angka utama */}
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-200">
              Ringkasan Binaan
            </p>
            <p className="mt-2.5 flex items-baseline gap-2">
              <span className="text-5xl font-extrabold leading-none tracking-tight text-white sm:text-6xl">
                <CountUp value={mentees.length} />
              </span>
              <span className="text-base font-semibold text-indigo-200">peserta aktif</span>
            </p>
            <p className="mt-2 text-[13px] font-medium leading-relaxed text-indigo-100">
              tersebar dalam <span className="font-bold text-white">{groups.length} kelompok</span>
              {' '}· <span className="font-bold text-white">{mentees.length - belumDinilai.length}</span> sudah dinilai bulan ini
            </p>
          </div>

          {/* kanan: dua kartu aksi — grid sejajar */}
          <div className="grid w-full grid-cols-2 gap-3 sm:max-w-sm lg:w-auto">
            <Link to="/mentor/kelompok"
              className="btn-press group rounded-xl bg-white/10 p-3.5 backdrop-blur transition hover:bg-white/20 sm:p-4">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-indigo-200">Review</p>
                <span className="text-base transition group-hover:scale-110">🔍</span>
              </div>
              <p className="mt-1.5 text-2xl font-extrabold leading-none text-white sm:text-3xl">
                <CountUp value={antreanReview.length} />
              </p>
              <p className="mt-1 text-[10px] font-medium text-indigo-200">tugas menunggu</p>
            </Link>

            <Link to="/mentor/penilaian"
              className="btn-press group rounded-xl bg-white/10 p-3.5 backdrop-blur transition hover:bg-white/20 sm:p-4">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-indigo-200">Penilaian</p>
                <span className="text-base transition group-hover:scale-110">⭐</span>
              </div>
              <p className="mt-1.5 text-2xl font-extrabold leading-none text-white sm:text-3xl">
                <CountUp value={belumDinilai.length} />
              </p>
              <p className="mt-1 text-[10px] font-medium text-indigo-200">belum dinilai</p>
            </Link>
          </div>
        </div>
      </div>

      {/* ===== Antrean review ===== */}
      {antreanReview.length > 0 && (
        <>
          <h2 className="anim-up mt-8 text-base font-bold text-slate-800 [animation-delay:150ms]">🔍 Antrean Review Tugas</h2>
          <div className="mt-3 space-y-2">
            {antreanReview.slice(0, 5).map((s, i) => {
              const jamTunggu = Math.floor((Date.now() - new Date(s.submitted_at)) / 3600000);
              return (
                <Link key={`${s.intern_id}-${s.judul}`} to="/mentor/kelompok"
                  className="card-hover anim-right flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
                  style={{ animationDelay: `${200 + i * 90}ms` }}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{s.judul}</p>
                    <p className="text-xs font-medium text-slate-400">👤 {s.interns?.nama_lengkap}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${
                    jamTunggu >= 24 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                    ⏳ {jamTunggu} jam
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* ===== Pengingat penilaian ===== */}
      {belumDinilai.length > 0 && (
        <div className="anim-pop mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-l-4 border-amber-400 bg-amber-50 p-4">
          <div className="min-w-0">
            <p className="text-sm font-bold text-amber-800">
              ⚠️ {belumDinilai.length} binaan belum dinilai
            </p>
            <p className="mt-0.5 truncate text-sm text-amber-600">
              {belumDinilai.map((m) => m.nama_lengkap?.split(' ')[0]).join(', ')}
            </p>
          </div>
          <Link to="/mentor/penilaian"
            className="btn-press shrink-0 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600">
            Nilai Sekarang →
          </Link>
        </div>
      )}

      {/* ===== Rekap Kelompok ===== */}
      <h2 className="anim-up mt-8 text-base font-bold text-slate-800 [animation-delay:300ms]">👥 Rekap Kelompok</h2>
      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {groups.length === 0 ? (
          <p className="anim-up col-span-full rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400 [animation-delay:300ms]">
            <span className="anim-float mr-1 inline-block">👥</span> Belum ada kelompok binaan.
          </p>
        ) : groups.map((g, i) => {
          const anggota = mentees.filter((m) => m.group_id === g.id);
          const arrKehadiran = anggota.map((m) => stats[m.id]?.persen_kehadiran).filter((v) => v != null);
          const rataKehadiran = arrKehadiran.length
            ? Math.round(arrKehadiran.reduce((a, b) => a + b, 0) / arrKehadiran.length) : null;
          return (
            <Link key={g.id} to="/mentor/kelompok"
              className="anim-up card-hover group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
                  style={{ animationDelay: `${350 + i * 100}ms` }}>
              {/* aksen gradasi kiri */}
              <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-500" />

              <div className="flex items-start justify-between gap-3 pl-2">
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-slate-800">{g.nama_kelompok}</p>
                  <p className="text-xs font-medium text-slate-400">
                    {anggota.length} peserta{g.batch_label ? ` · ${g.batch_label}` : ''}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${
                  rataKehadiran === null ? 'bg-slate-100 text-slate-400'
                  : rataKehadiran >= 85 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  🕐 {rataKehadiran ?? '—'}%
                </span>
              </div>

              {/* avatar baris anggota */}
              <div className="mt-4 flex flex-wrap gap-2 pl-2">
                {anggota.length === 0 ? (
                  <p className="text-xs text-slate-300 italic">Belum ada anggota</p>
                ) : anggota.map((m, j) => {
                  const p = progres(m.id);
                  const k = kehadiranM(m.id);
                  const rb = rubrikM(m.id);
                  return (
                    <div key={m.id}
                      className="anim-pop flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 py-1 pl-1 pr-3"
                      style={{ animationDelay: `${450 + i * 100 + j * 70}ms` }}
                      title={`${m.nama_lengkap}${rb ? ` — S${rb.soft}/H${rb.hard}` : ''}`}>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                        {m.nama_lengkap?.split(' ').map((x) => x[0]).slice(0, 2).join('')}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        {m.nama_lengkap?.split(' ')[0]}
                      </span>
                      {p !== null && (
                        <span className={`text-[10px] font-bold ${p >= 60 ? 'text-green-600' : 'text-slate-400'}`}>{p}%</span>
                      )}
                      {k != null && k < 85 && (
                        <span className="text-[10px]" title={`kehadiran ${k}%`}>⚠️</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="mt-3 flex items-center gap-1 pl-2 text-[11px] font-semibold text-indigo-500 opacity-0 transition group-hover:opacity-100">
                Kelola kelompok →
              </p>
            </Link>
          );
        })}
      </div>

      {/* ===== Mentoring berikutnya ===== */}
      {mentoringNext && (
        <div className="anim-up mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-5 text-white shadow-lg [animation-delay:600ms]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-200">📅 Mentoring Berikutnya</p>
            <p className="mt-1 font-bold">{mentoringNext.judul_sesi}</p>
            <p className="text-sm text-indigo-100">🕒 {waktuWib(mentoringNext.tanggal_waktu)} WIB</p>
          </div>
          <Link to="/mentor/mentoring"
            className="btn-press rounded-lg bg-white/20 px-4 py-2 text-xs font-bold hover:bg-white/30">
            Kelola Jadwal →
          </Link>
        </div>
      )}
    </div>
  );
}