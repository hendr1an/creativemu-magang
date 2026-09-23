import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useMentor } from '../../hooks/useMentor';
import SubtaskManager from '../../components/SubtaskManager';
import { fmtTanggal } from '../../lib/format';
import Modal from '../../components/Modal';
import RadarNilai from '../../components/RadarNilai';

const HARI_INI = new Date().toISOString().slice(0, 10);

export default function KelompokBinaan() {
  const { groups, mentees, loading } = useMentor();
  const [siap, setSiap] = useState(false);

  const [grupBuka, setGrupBuka] = useState(null);
  const [projekBuka, setProjekBuka] = useState({});
  const [anggotaDetail, setAnggotaDetail] = useState(null);

  const [projects, setProjects] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [rubrik, setRubrik] = useState([]);
  const [stats, setStats] = useState({});

  useEffect(() => { if (!loading) muat(); }, [loading]);

  async function muat() {
    if (groups.length === 0) { setSiap(true); return; }
    const ids = mentees.map((m) => m.id);
    const gids = groups.map((g) => g.id);

    const [prj, sub, rub] = await Promise.all([
      supabase.from('projects').select('*').in('group_id', gids).order('created_at'),
      ids.length > 0
        ? supabase.from('subtasks').select('intern_id, status').in('intern_id', ids)
        : { data: [] },
            supabase.from('rubric_scores')
        .select('intern_id, nilai_soft_skill, nilai_hard_skill, nilai_inisiatif, nilai_pemecahan, nilai_teknis, nilai_komunikasi, nilai_kualitas, nilai_disiplin, periode')
        .in('intern_id', ids),
    ]);
    setProjects(prj.data ?? []);
    setSubtasks(sub.data ?? []);
    setRubrik(rub.data ?? []);

    const entri = await Promise.all(mentees.map(async (m) => {
      const { data } = await supabase.rpc('get_attendance_stats', { p_intern_id: m.id });
      return [m.id, data];
    }));
    setStats(Object.fromEntries(entri));
    setSiap(true);
  }

  const anggota = (gid) => mentees.filter((m) => m.group_id === gid);
  const projek = (gid) => projects.filter((p) => p.group_id === gid);
  const progresM = (iid) => {
    const total = subtasks.filter((s) => s.intern_id === iid).length;
    const selesai = subtasks.filter((s) => s.intern_id === iid && s.status === 'Selesai').length;
    return total ? Math.round((selesai * 100) / total) : null;
  };
  const rubrikM = (iid) => {
    const rows = rubrik.filter((r) => r.intern_id === iid);
    if (!rows.length) return null;
    const avg = (arr) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    return { soft: avg(rows.map((r) => Number(r.nilai_soft_skill))),
             hard: avg(rows.map((r) => Number(r.nilai_hard_skill))) };
  };
  const menungguReview = (gid) => {
    const ids = anggota(gid).map((a) => a.id);
    return subtasks.filter((s) => ids.includes(s.intern_id) && s.status === 'Menunggu Review').length;
  };

  if (loading || !siap) {
    return (
      <div>
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="mt-6 space-y-3">
          <div className="skeleton h-20 rounded-2xl" />
          <div className="skeleton h-20 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="anim-up">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Kelompok Binaan</h1>
      </div>

      {groups.length === 0 ? (
        <div className="anim-up mt-6 flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="anim-float text-5xl">👥</p>
          <p className="mt-4 font-bold text-slate-600">Belum Ada Kelompok Binaan</p>
          <p className="mt-1 text-sm text-slate-400">Admin akan menugaskan kelompok kepadamu</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {groups.map((g, i) => {
            const buka = grupBuka === g.id;
            const nReview = menungguReview(g.id);
            const nProjek = projek(g.id).length;
            return (
              /* ===== TINGKAT 1: kartu kelompok ===== */
              <div key={g.id}
                className="anim-up overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-shadow hover:shadow-md"
                style={{ animationDelay: `${i * 90}ms` }}>

                {/* header kelompok (tombol expand) */}
                <button onClick={() => setGrupBuka(buka ? null : g.id)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-slate-50 sm:p-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-extrabold text-white">
                      {g.nama_kelompok?.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-slate-800">{g.nama_kelompok}</p>
                      <p className="text-xs font-medium text-slate-400">
                        {anggota(g.id).length} peserta{nProjek > 0 && ` · ${nProjek} projek`}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {nReview > 0 && (
                      <span className="anim-pop rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-700">
                        ⏳ {nReview}
                      </span>
                    )}
                    <span className={`text-xs text-slate-400 transition-transform duration-300 ${buka ? 'rotate-180' : ''}`}>▼</span>
                  </div>
                </button>

                {/* ===== KONTEN KELUPOK — slide-down saat expand ===== */}
                {buka && (
                  <div className="anim-down border-t border-slate-100 p-4 sm:p-5">

                    {/* anggota */}
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      Anggota ({anggota(g.id).length})
                    </p>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {anggota(g.id).length === 0 ? (
                        <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-400">
                          Belum ada anggota di kelompok ini.
                        </p>
                      ) : anggota(g.id).map((m, j) => {
                        const s = stats[m.id];
                        const persen = s?.persen_kehadiran;
                        const prog = progresM(m.id);
                        const rb = rubrikM(m.id);
                        return (
                          <button key={m.id} onClick={() => setAnggotaDetail(m)}
                            className="anim-up card-hover flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50/40"
                            style={{ animationDelay: `${j * 80}ms` }}>
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                                {m.nama_lengkap?.split(' ').map((x) => x[0]).slice(0, 2).join('')}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-slate-800">{m.nama_lengkap}</p>
                                <p className="truncate text-[11px] text-slate-400">{m.email}</p>
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                              <div className="flex items-center gap-1.5 text-[11px] font-bold">
                                <span className={persen >= 85 ? 'text-green-600' : 'text-red-500'}>🕐 {persen ?? '—'}%</span>
                                {prog !== null && <span className="text-slate-500">📊 {prog}%</span>}
                              </div>
                              <span className="text-[10px] text-slate-400">
                                {rb ? <><span className="text-amber-600">S{rb.soft}</span> · <span className="text-blue-600">H{rb.hard}</span></>
                                    : 'belum dinilai'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* projek induk */}
                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                        Projek Induk
                      </p>

                      {nProjek === 0 ? (
                        <div className="anim-in mt-2">
                          <SubtaskManager group={g} anggota={anggota(g.id)} />
                        </div>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {projek(g.id).map((p, j) => {
                            const pb = projekBuka[g.id] === p.id;
                            return (
                              <div key={p.id}
                                className={`anim-up overflow-hidden rounded-xl border transition-colors ${pb ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200 bg-white'}`}
                                style={{ animationDelay: `${j * 80}ms` }}>
                                <button onClick={() => setProjekBuka((s) => ({ ...s, [g.id]: pb ? null : p.id }))}
                                  className="flex w-full items-center justify-between gap-3 p-3.5 text-left transition hover:bg-slate-50">
                                  <div className="flex min-w-0 items-center gap-3">
                                    <span className="text-lg">📁</span>
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-bold text-slate-800">{p.judul_projek}</p>
                                      <p className="text-[11px] font-medium text-slate-400">
                                        {p.deadline_projek ? `⏰ ${fmtTanggal(p.deadline_projek)}` : 'tanpa deadline'}
                                      </p>
                                    </div>
                                  </div>
                                  <span className={`shrink-0 text-xs text-slate-400 transition-transform duration-300 ${pb ? 'rotate-180' : ''}`}>▼</span>
                                </button>

                                {/* ===== subtugas slide-down ===== */}
                                {pb && (
                                  <div className="anim-down border-t border-indigo-100">
                                    <SubtaskManager group={g} anggota={anggota(g.id)} projekFilter={p.id} />
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          <details className="anim-up rounded-xl border border-dashed border-slate-300">
                            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                              ➕ Tambah projek induk baru
                            </summary>
                            <div className="border-t border-slate-100 p-3">
                              <SubtaskManager group={g} anggota={anggota(g.id)} />
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ===== POPUP DETAIL ANGGOTA ===== */}
            {/* ===== POPUP DETAIL ANGGOTA (radar + aspek + presensi kotak) ===== */}
      <Modal open={!!anggotaDetail} onClose={() => setAnggotaDetail(null)}
        title={anggotaDetail?.nama_lengkap ?? ''}>
        {anggotaDetail && (() => {
          const s = stats[anggotaDetail.id];
          const persen = s?.persen_kehadiran;
          const prog = progresM(anggotaDetail.id);

          // penilaian terbaru → radar + rincian
          const rbFull = rubrik.filter((r) => r.intern_id === anggotaDetail.id)
            .sort((a, b) => (b.periode ?? '').localeCompare(a.periode ?? ''))[0];

          const ASPEK_LIST = [
            ['1. Inisiatif', rbFull?.nilai_inisiatif],
            ['2. Pemecahan Masalah', rbFull?.nilai_pemecahan],
            ['3. Kemampuan Teknis', rbFull?.nilai_teknis],
            ['4. Komunikasi', rbFull?.nilai_komunikasi],
            ['5. Kualitas Hasil Kerja', rbFull?.nilai_kualitas],
            ['6. Kedisiplinan & Etika', rbFull?.nilai_disiplin],
          ];

          return (
            <div className="space-y-4">
              {/* header anggota */}
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-sm font-bold text-white">
                  {anggotaDetail.nama_lengkap.split(' ').map((k) => k[0]).slice(0, 2).join('')}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800">{anggotaDetail.nama_lengkap}</p>
                  <p className="truncate text-[11px] text-slate-400">
                    {fmtTanggal(anggotaDetail.tanggal_mulai)} – {fmtTanggal(anggotaDetail.tanggal_selesai)}
                  </p>
                </div>
              </div>

              {/* ⭐ RADAR + rincian 6 aspek (jika sudah dinilai) */}
              {rbFull && rbFull.nilai_inisiatif != null ? (
                <div className="rounded-xl border border-slate-100 p-3">
                  <RadarNilai size={200} nilai={{
                    inisiatif: rbFull.nilai_inisiatif, pemecahan: rbFull.nilai_pemecahan,
                    teknis: rbFull.nilai_teknis, komunikasi: rbFull.nilai_komunikasi,
                    kualitas: rbFull.nilai_kualitas, disiplin: rbFull.nilai_disiplin,
                  }} />
                  <div className="mt-2 space-y-1">
                    {ASPEK_LIST.map(([label, v]) => (
                      <div key={label} className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5">
                        <span className="text-[11px] font-semibold text-slate-600">{label}</span>
                        <span className={`inline-flex h-6 min-w-[2.4rem] items-center justify-center rounded-md px-1.5 text-[11px] font-extrabold ${
                          v >= 4.8 ? 'bg-emerald-500 text-white'
                          : v >= 4.3 ? 'bg-green-500 text-white'
                          : v >= 3.8 ? 'bg-amber-400 text-white'
                          : v >= 3.3 ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                          {v ?? '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-lg bg-amber-50 py-2">
                      <p className="text-[9px] font-bold uppercase text-slate-400">Soft</p>
                      <p className="text-sm font-extrabold text-amber-600">{rbFull.nilai_soft_skill}</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 py-2">
                      <p className="text-[9px] font-bold uppercase text-slate-400">Hard</p>
                      <p className="text-sm font-extrabold text-blue-600">{rbFull.nilai_hard_skill}</p>
                    </div>
                  </div>
                  {rbFull.catatan_mentor && (
                    <p className="mt-2 rounded-lg bg-slate-50 p-2.5 text-[11px] italic text-slate-500">
                      💬 "{rbFull.catatan_mentor}"
                    </p>
                  )}
                </div>
              ) : (
                <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-center text-[11px] font-semibold text-slate-400">
                  Belum dinilai — buka menu ⭐ Rubrik Penilaian
                </p>
              )}

              {/* statistik ringkas */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-white p-3 text-center ring-1 ring-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Kehadiran</p>
                  <p className={`mt-1 text-xl font-extrabold ${persen >= 85 ? 'text-green-600' : 'text-red-500'}`}>{persen ?? '—'}%</p>
                  {Number(s?.terlambat ?? 0) > 0 && (
                    <p className="text-[10px] font-medium text-orange-500">⚠ telat {s.terlambat}×</p>
                  )}
                </div>
                <div className="rounded-xl bg-white p-3 text-center ring-1 ring-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Progress Tugas</p>
                  <p className="mt-1 text-xl font-extrabold text-slate-700">{prog === null ? '—' : `${prog}%`}</p>
                </div>
              </div>

              {/* ⭐ PRESENSI: kotak-kotak (gaya halaman presensi) */}
              {s && !s.error && (
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  <div className="rounded-lg bg-green-50 py-2.5">
                    <b className="block text-lg text-green-700">{s.hadir}</b>
                    <span className="text-[10px] font-semibold text-green-600">Hadir</span>
                  </div>
                  <div className="rounded-lg bg-blue-50 py-2.5">
                    <b className="block text-lg text-blue-700">{s.izin}</b>
                    <span className="text-[10px] font-semibold text-blue-600">Izin</span>
                  </div>
                  <div className="rounded-lg bg-amber-50 py-2.5">
                    <b className="block text-lg text-amber-700">{s.sakit}</b>
                    <span className="text-[10px] font-semibold text-amber-600">Sakit</span>
                  </div>
                  <div className="rounded-lg bg-red-50 py-2.5">
                    <b className="block text-lg text-red-600">{s.alpha}</b>
                    <span className="text-[10px] font-semibold text-red-500">Alpha</span>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}