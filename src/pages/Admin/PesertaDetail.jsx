import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { fmtTanggal, namaBulan } from '../../lib/format';
import { buatUrlFile } from '../../lib/api';
import { CountUp } from '../../components/Skeleton';

const BADGE_STATUS = {
  Active: 'bg-emerald-500',
  Completed: 'bg-blue-500',
  Dropped: 'bg-red-500',
};
const BADGE_SUB = {
  'Belum': 'bg-slate-100 text-slate-600',
  'Menunggu Review': 'bg-amber-100 text-amber-700',
  'Revisi': 'bg-red-100 text-red-600',
  'Selesai': 'bg-green-100 text-green-700',
};
const BADGE_IZIN = {
  Pending: 'bg-amber-100 text-amber-700',
  Approved: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
};
const NILAI_WARNA = { A:'bg-green-600', B:'bg-teal-500', C:'bg-amber-400', D:'bg-orange-500', E:'bg-red-500' };

const TABS = ['📋 Profil', '🔐 Akun', '🕐 Presensi & Izin', '🗂️ Tugas & Projek', '⭐ Penilaian', '📖 Logbook', '🎓 Sertifikat'];

const jamWib = (iso) => iso
  ? new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
  : '—';

export default function PesertaDetail() {
  const { id } = useParams();
  const [tab, setTab] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { muat(); }, [id]);

  async function muat() {
    setLoading(true); setError(null);
    try {
      const { data: intern, error: err } = await supabase
        .from('interns').select('*').eq('id', id).single();
      if (err || !intern) throw new Error('Peserta tidak ditemukan.');

      let group = null;
      if (intern.group_id) {
        const { data: g } = await supabase.from('groups')
          .select('nama_kelompok, mentor_id').eq('id', intern.group_id).single();
        group = g;
      }

      const [dir, stats, att, lv, sub, rub, cert, lgb, akun] = await Promise.all([
        supabase.rpc('get_profile_directory'),
        supabase.rpc('get_attendance_stats', { p_intern_id: id }),
        supabase.from('attendance').select('*')
          .eq('intern_id', id).order('tanggal_presensi', { ascending: false }).limit(400),
        supabase.from('leave_requests').select('*')
          .eq('intern_id', id).order('created_at', { ascending: false }),
        supabase.from('subtasks')
          .select('*, projects(id, judul_projek, deadline_projek)')
          .eq('intern_id', id).order('created_at'),
        supabase.from('rubric_scores').select('*').eq('intern_id', id).order('periode'),
        supabase.from('certificates').select('*').eq('intern_id', id).maybeSingle(),
        supabase.from('logbook').select('*').eq('intern_id', id).order('tanggal', { ascending: false }),
        supabase.from('profiles').select('email, password_tercatat')
          .eq('id', intern.user_id).maybeSingle(),
      ]);

      setData({
        intern,
        group,
        mentor: group?.mentor_id
          ? (dir.data ?? []).find((p) => p.id === group.mentor_id)?.nama_lengkap ?? '—'
          : null,
        stats: stats.data,
        attendance: att.data ?? [],
        leaves: lv.data ?? [],
        subtasks: sub.data ?? [],
        rubrik: rub.data ?? [],
        cert: cert.data ?? null,
        logbook: lgb.data ?? [],
        akun: akun.data ?? null,
      });
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  }

  if (loading) return (
    <div>
      <div className="skeleton h-4 w-40 rounded-lg" />
      <div className="mt-4 skeleton h-28 rounded-2xl" />
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
      </div>
    </div>
  );
  if (error) {
    return (
      <div>
        <Link to="/admin/peserta"
  className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 hover:shadow-md active:scale-95">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className="transition-transform duration-200 group-hover:-translate-x-1">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
  <span className="hidden sm:inline">Kembali ke Data Peserta</span>
  <span className="sm:hidden">Kembali</span>
</Link>
        <p className="anim-down mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">⚠️ {error}</p>
      </div>
    );
  }

  const { intern, group, mentor, stats, attendance, leaves, subtasks, rubrik, cert, logbook, akun } = data;

  const persen = stats?.persen_kehadiran;
  const totalSub = subtasks.length;
  const selesaiSub = subtasks.filter((s) => s.status === 'Selesai').length;
  const progress = totalSub ? Math.round((selesaiSub * 100) / totalSub) : null;

  const projekList = [];
  subtasks.forEach((s) => {
    let p = projekList.find((x) => x.id === s.projects?.id);
    if (!p) { p = { ...s.projects, subtasks: [] }; projekList.push(p); }
    p.subtasks.push(s);
  });

  const lulus = intern.nilai_final !== null && intern.nilai_final >= 70;

  return (
    <div>
            <Link to="/admin/peserta"
        className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 hover:shadow-md active:scale-95">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="transition-transform duration-200 group-hover:-translate-x-1">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        <span className="hidden sm:inline">Kembali ke Data Peserta</span>
        <span className="sm:hidden">Kembali</span>
      </Link>

      {/* ===== HERO header peserta ===== */}
      <div className="anim-up relative mt-3 overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-indigo-50" />
        <div className="relative flex flex-wrap items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-lg font-extrabold text-white shadow-lg shadow-indigo-500/25">
            {intern.nama_lengkap.split(' ').map((k) => k[0]).slice(0, 2).join('')}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">{intern.nama_lengkap}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold text-white ${BADGE_STATUS[intern.status_magang] ?? 'bg-slate-400'}`}>
                {intern.status_magang.toUpperCase()}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[13px] font-medium text-slate-500">
              {intern.email} · {intern.nomor_whatsapp} {intern.instansi && `· 🏫 ${intern.instansi}`}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              📅 {fmtTanggal(intern.tanggal_mulai)} – {fmtTanggal(intern.tanggal_selesai)}
              {' '}({intern.durasi_magang} {intern.satuan_durasi ?? 'bulan'})
              {group?.nama_kelompok && ` · 👥 ${group.nama_kelompok}`}
            </p>
          </div>
        </div>
      </div>

      {/* ===== kartu ringkasan (CountUp + stagger) ===== */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="anim-up card-hover rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-100">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Kehadiran</p>
          <p className={`mt-1 text-2xl font-extrabold ${persen >= 85 ? 'text-green-600' : 'text-red-500'}`}>
            <CountUp value={persen} suffix="%" />
          </p>
          {Number(stats?.terlambat ?? 0) > 0 && (
            <p className="text-[10px] font-bold text-orange-500">⚠ telat {stats.terlambat}×</p>
          )}
        </div>
        <div className="anim-up card-hover rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-100 [animation-delay:80ms]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Progress Tugas</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-700"><CountUp value={progress} suffix="%" /></p>
          <p className="text-[10px] text-slate-400">{selesaiSub}/{totalSub} subtugas</p>
        </div>
        <div className="anim-up card-hover rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-100 [animation-delay:160ms]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nilai Akhir</p>
          <p className="mt-1 text-2xl font-extrabold text-indigo-700">
            <CountUp value={intern.nilai_final} />
          </p>
        </div>
        <div className={`anim-up card-hover rounded-2xl p-4 text-center text-white shadow-sm [animation-delay:240ms] ${
          intern.nilai_final == null ? 'bg-slate-400' : lulus
            ? 'bg-gradient-to-br from-emerald-500 to-green-600'
            : 'bg-gradient-to-br from-red-500 to-rose-600'}`}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">Kelulusan</p>
          <p className="mt-1 text-2xl font-extrabold">
            {intern.nilai_final == null ? '⏳' : lulus ? 'LULUS' : 'TIDAK LULUS'}
          </p>
        </div>
      </div>

      {/* ===== TAB: segmented control modern ===== */}
      <div className="anim-up mt-6 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-sm [animation-delay:300ms]">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`btn-press flex-1 whitespace-nowrap rounded-xl px-2.5 py-2 text-[11px] font-bold transition sm:text-xs ${
              tab === i
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25'
                : 'text-slate-500 hover:bg-slate-50'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ===== KONTEN TAB — key={tab} memicu animasi slide-up tiap perpindahan ===== */}
      <div key={tab} className="anim-up mt-4">

        {/* ============ TAB 0: PROFIL ============ */}
        {tab === 0 && (
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
            <h3 className="text-sm font-bold text-slate-800">📋 Data Diri Peserta</h3>
            <div className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
              {[
                ['Nama Lengkap', intern.nama_lengkap],
                ['Email', intern.email],
                ['Nomor WhatsApp', intern.nomor_whatsapp ?? '—'],
                ['Asal Instansi', intern.instansi ?? '—'],
                ['Tanggal Mulai', fmtTanggal(intern.tanggal_mulai)],
                ['Tanggal Selesai', fmtTanggal(intern.tanggal_selesai)],
                ['Durasi Magang', `${intern.durasi_magang} ${intern.satuan_durasi ?? 'bulan'}${intern.tanggal_selesai_custom ? ' (selesai custom)' : ''}`],
                ['Kelompok', group?.nama_kelompok ?? 'belum berkelompok'],
                ['Pembimbing', mentor ?? '—'],
                ['Status Magang', intern.status_magang],
              ].map(([label, nilai], idx) => (
                <div key={label}
                  className="anim-in flex justify-between gap-4 border-b border-slate-50 py-2.5"
                  style={{ animationDelay: `${idx * 50}ms` }}>
                  <span className="text-slate-500">{label}</span>
                  <span className="text-right font-semibold text-slate-800">{nilai}</span>
                </div>
              ))}
            </div>
            {intern.keterangan_sertifikat && (
              <p className="anim-up mt-4 rounded-xl bg-slate-50 p-3 text-sm italic text-slate-600 [animation-delay:500ms]">
                📝 Keterangan: "{intern.keterangan_sertifikat}"
              </p>
            )}
          </div>
        )}

        {/* ============ TAB 1: AKUN ============ */}
        {tab === 1 && (
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
            <h3 className="text-sm font-bold text-slate-800">🔐 Informasi Akun Login</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              Untuk dibagikan kepada peserta saat konfirmasi lupa password (verifikasi identitas dulu sebelum dibagikan).
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="anim-in flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3"
                style={{ animationDelay: '60ms' }}>
                <span className="text-slate-500">Email Login</span>
                <span className="font-mono font-bold text-slate-800">{akun?.email ?? '—'}</span>
              </div>
              <div className="anim-in flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3"
                style={{ animationDelay: '120ms' }}>
                <span className="text-slate-500">Password Terakhir</span>
                <span className="flex items-center gap-2">
                  <code className="rounded-lg bg-white px-3 py-1.5 font-mono text-sm font-bold text-slate-800 ring-1 ring-slate-200">
                    {akun?.password_tercatat ?? '(belum tercatat)'}
                  </code>
                  {akun?.password_tercatat && (
                    <button onClick={() => navigator.clipboard?.writeText(akun.password_tercatat)}
                      title="Copy password"
                      className="btn-press rounded-lg bg-white px-2.5 py-1.5 text-xs ring-1 ring-slate-200 hover:bg-slate-50">📋</button>
                  )}
                </span>
              </div>
            </div>
            {!akun?.password_tercatat && (
              <p className="anim-in mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-700 [animation-delay:180ms]">
                ⚠️ Password belum tercatat — terisi otomatis setelah peserta mengganti password melalui menu Setting.
              </p>
            )}
          </div>
        )}

        {/* ============ TAB 2: PRESENSI & IZIN ============ */}
        {tab === 2 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="text-sm font-bold text-slate-800">🕐 Rekap Presensi</h3>
              {!stats || stats.error ? (
                <p className="mt-3 text-sm text-slate-400">Statistik belum tersedia.</p>
              ) : (
                <>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center sm:grid-cols-5">
                    <div className="anim-pop rounded-xl bg-green-50 p-3" style={{ animationDelay: '0ms' }}><b className="block text-xl text-green-700"><CountUp value={stats.hadir} /></b><span className="text-[10px] font-bold uppercase text-green-600">Hadir</span></div>
                    <div className="anim-pop rounded-xl bg-blue-50 p-3" style={{ animationDelay: '70ms' }}><b className="block text-xl text-blue-700"><CountUp value={stats.izin} /></b><span className="text-[10px] font-bold uppercase text-blue-600">Izin</span></div>
                    <div className="anim-pop rounded-xl bg-amber-50 p-3" style={{ animationDelay: '140ms' }}><b className="block text-xl text-amber-700"><CountUp value={stats.sakit} /></b><span className="text-[10px] font-bold uppercase text-amber-600">Sakit</span></div>
                    <div className="anim-pop rounded-xl bg-red-50 p-3" style={{ animationDelay: '210ms' }}><b className="block text-xl text-red-600"><CountUp value={stats.alpha} /></b><span className="text-[10px] font-bold uppercase text-red-500">Alpha</span></div>
                    <div className="anim-pop col-span-3 rounded-xl bg-orange-50 p-3 sm:col-span-1" style={{ animationDelay: '280ms' }}><b className="block text-xl text-orange-500"><CountUp value={stats.terlambat ?? 0} /></b><span className="text-[10px] font-bold uppercase text-orange-600">Telat</span></div>
                  </div>
                  <p className="mt-2 text-[11px] font-medium text-slate-400">
                    Total hari kerja berjalan: {stats.total_hari_kerja} · toleransi {stats.toleransi_hari} hari
                  </p>
                </>
              )}

              <div className="mt-4 max-h-72 overflow-y-auto rounded-xl border border-slate-100">
                <table className="w-full min-w-[480px] text-sm">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400">
                      <th className="px-3 py-2">Tanggal</th>
                      <th className="px-3 py-2">Masuk</th>
                      <th className="px-3 py-2">Keluar</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.length === 0 ? (
                      <tr><td colSpan={4} className="p-6 text-center text-slate-400">Belum ada riwayat presensi.</td></tr>
                    ) : attendance.map((r) => (
                      <tr key={r.id} className="border-t border-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-600">{fmtTanggal(r.tanggal_presensi)}</td>
                        <td className="px-3 py-2">
                          {r.check_in ? jamWib(r.check_in) : '—'}
                          {r.menit_terlambat != null && (
                            <span className="ml-1 text-[10px] font-bold text-orange-500">⚠ +{r.menit_terlambat}m</span>
                          )}
                        </td>
                        <td className="px-3 py-2">{r.check_out ? jamWib(r.check_out) : '—'}</td>
                        <td className="px-3 py-2">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{r.status_kehadiran}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="text-sm font-bold text-slate-800">📝 Riwayat Izin / Sakit</h3>
              <div className="mt-3 space-y-2">
                {leaves.length === 0 ? (
                  <div className="flex flex-col items-center py-6">
                    <p className="anim-float text-3xl">📭</p>
                    <p className="mt-2 text-sm text-slate-400">Tidak ada pengajuan izin</p>
                  </div>
                ) : leaves.map((d, i) => (
                  <div key={d.id}
                    className="anim-up flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3"
                    style={{ animationDelay: `${i * 70}ms` }}>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-700">
                        {d.jenis_izin === 'Sakit' ? '🤒' : '📝'} {d.jenis_izin} — {fmtTanggal(d.tanggal_mulai)}
                        {d.tanggal_selesai !== d.tanggal_mulai && ` s.d. ${fmtTanggal(d.tanggal_selesai)}`}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">"{d.alasan}"</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-extrabold ${BADGE_IZIN[d.status_izin]}`}>{d.status_izin.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============ TAB 3: TUGAS & PROJEK ============ */}
        {tab === 3 && (
          <div className="space-y-4">
            {projekList.length === 0 ? (
              <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
                <p className="anim-float text-4xl">🗂️</p>
                <p className="mt-3 font-bold text-slate-600">Belum Ada Tugas / Projek</p>
                <p className="mt-1 text-sm text-slate-400">Tugas yang ditugaskan mentor akan tampil di sini</p>
              </div>
            ) : projekList.map((p, i) => {
              const total = p.subtasks.length;
              const selesai = p.subtasks.filter((s) => s.status === 'Selesai').length;
              const persenP = total ? Math.round((selesai * 100) / total) : 0;
              return (
                <div key={p.id}
                  className="anim-up card-hover relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
                  style={{ animationDelay: `${i * 90}ms` }}>
                  <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-500" />

                  <div className="flex flex-wrap items-start justify-between gap-2 pl-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800">📁 {p.judul_projek}</p>
                      {p.deadline_projek && (
                        <p className="text-[11px] font-medium text-slate-400">⏰ deadline {fmtTanggal(p.deadline_projek)}</p>
                      )}
                    </div>
                    <span className="text-xl font-extrabold text-slate-700">{persenP}%</span>
                  </div>
                  <div className="mt-2 ml-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full bg-green-500 anim-bar" style={{ width: `${persenP}%` }} />
                  </div>
                  <ul className="mt-3 space-y-1.5 pl-2">
                    {p.subtasks.map((s) => {
                      const telat = s.deadline && new Date(s.deadline) < new Date() && s.status !== 'Selesai';
                      return (
                        <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                          <div className="min-w-0">
                            <p className={`font-medium ${s.status === 'Selesai' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                              {s.judul}
                            </p>
                            {s.deadline && (
                              <p className={`text-[11px] ${telat ? 'font-bold text-red-500' : 'text-slate-400'}`}>
                                ⏰ {fmtTanggal(s.deadline)}{telat ? ' TERLAMBAT' : ''}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {s.file_bukti && <span title="ada file terkumpul">📎</span>}
                            {s.nilai && (
                              <span className={`rounded px-1.5 py-0.5 text-[10px] font-black text-white ${NILAI_WARNA[s.nilai]}`}>
                                {s.nilai}
                              </span>
                            )}
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${BADGE_SUB[s.status]}`}>
                              {s.status === 'Menunggu Review' ? '⏳ review' : s.status}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {/* ============ TAB 4: PENILAIAN ============ */}
        {tab === 4 && (
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
            <h3 className="text-sm font-bold text-slate-800">⭐ Penilaian — Rubrik Resmi (skala 3–5)</h3>
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-[10px] uppercase tracking-wider text-slate-400">
                    <th className="px-3 py-2.5">Periode</th>
                    <th className="px-3 py-2.5">Inisiatif</th>
                    <th className="px-3 py-2.5">Pemecahan</th>
                    <th className="px-3 py-2.5">Teknis</th>
                    <th className="px-3 py-2.5">Komunikasi</th>
                    <th className="px-3 py-2.5">Kualitas</th>
                    <th className="px-3 py-2.5">Disiplin</th>
                    <th className="px-3 py-2.5">Σ/30</th>
                    <th className="px-3 py-2.5">Soft/Hard</th>
                  </tr>
                </thead>
                <tbody>
                  {rubrik.length === 0 ? (
                    <tr><td colSpan={9} className="py-8 text-center text-slate-400">Belum ada penilaian dari mentor.</td></tr>
                  ) : rubrik.map((r, i) => {
                    const keys = ['nilai_inisiatif','nilai_pemecahan','nilai_teknis','nilai_komunikasi','nilai_kualitas','nilai_disiplin'];
                    const total = keys.reduce((s, k) => s + (Number(r[k]) || 0), 0);
                    return (
                      <tr key={r.id} className="anim-in border-b border-slate-50" style={{ animationDelay: `${i * 70}ms` }}>
                        <td className="px-3 py-2.5 font-bold">{r.periode}</td>
                        {keys.map((k) => <td key={k} className="px-3 py-2.5 font-semibold text-slate-600">{r[k] ?? '—'}</td>)}
                        <td className="px-3 py-2.5 font-extrabold text-slate-800">{total ? total.toFixed(1) : '—'}</td>
                        <td className="px-3 py-2.5">
                          <span className="font-extrabold text-amber-600">{r.nilai_soft_skill ?? '—'}</span> / <span className="font-extrabold text-blue-600">{r.nilai_hard_skill ?? '—'}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {ruberNote()}
          </div>
        )}

        {/* ============ TAB 5: LOGBOOK ============ */}
        {tab === 5 && (
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
            <h3 className="text-sm font-bold text-slate-800">📖 Logbook Pribadi Peserta ({logbook.length} catatan)</h3>
            <div className="mt-4 max-h-[26rem] space-y-3 overflow-y-auto pr-1">
              {logbook.length === 0 ? (
                <div className="flex flex-col items-center py-8">
                  <p className="anim-float text-4xl">📖</p>
                  <p className="mt-3 font-bold text-slate-600">Belum Ada Catatan</p>
                  <p className="mt-1 text-sm text-slate-400">Peserta belum menulis logbook</p>
                </div>
              ) : logbook.map((r, i) => (
                <div key={r.id}
                  className="anim-up rounded-xl border border-slate-100 p-4"
                  style={{ animationDelay: `${i * 70}ms` }}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold text-slate-800">{r.judul}</p>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
                      📅 {fmtTanggal(r.tanggal)}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{r.isi}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============ TAB 6: SERTIFIKAT ============ */}
        {tab === 6 && (
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
            <h3 className="text-sm font-bold text-slate-800">🎓 Sertifikat</h3>
            {cert?.file_url ? (
              <div className="mt-4 space-y-2 text-sm">
                <div className="anim-in flex items-center justify-between gap-4 rounded-xl bg-green-50 px-4 py-3">
                  <span className="font-semibold text-green-700">✓ PDF terunggah — dapat dilihat peserta</span>
                </div>
                <div className="anim-in flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3" style={{ animationDelay: '80ms' }}>
                  <span className="text-slate-500">Tanggal Unggah</span>
                  <span className="font-bold text-slate-800">
                    {new Date(cert.uploaded_at ?? cert.tanggal_diterbitkan).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <button onClick={() => buatUrlFile(cert.file_url).then((u) => window.open(u, '_blank'))}
                  className="btn-press mt-1 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/25 hover:bg-indigo-700">
                  👁️ Lihat PDF Sertifikat
                </button>
              </div>
            ) : intern.status_magang !== 'Completed' ? (
              <div className="mt-3 flex flex-col items-center rounded-2xl bg-slate-50 py-8">
                <p className="anim-float text-4xl">🎓</p>
                <p className="mt-3 text-sm font-semibold text-slate-500">
                  Peserta masih <b>{intern.status_magang}</b>
                </p>
                <p className="mt-1 text-xs text-slate-400">Sertifikat diterbitkan setelah masa magang selesai & nilai akhir dihitung</p>
              </div>
            ) : (
              <div className="anim-in mt-4 flex flex-col items-center gap-2 rounded-2xl bg-indigo-50 py-8">
                <p className="text-3xl">🎓</p>
                <p className="text-sm font-semibold text-indigo-700">Peserta sudah Completed — sertifikat belum diterbitkan</p>
                <Link to="/admin/sertifikat"
                  className="btn-press mt-1 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/25 hover:bg-indigo-700">
                  Terbitkan Sekarang →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  function ruberNote() {
    if (rubrik.length === 0 || intern.nilai_final == null) return null;
    return (
      <p className="anim-up mt-3 text-[11px] font-medium text-slate-400">
        📊 Rumus nilai akhir: (Kehadiran × 0.3) + (Soft × 0.3) + (Hard × 0.4) → <b className="text-slate-600">{intern.nilai_final}</b>
      </p>
    );
  }
}