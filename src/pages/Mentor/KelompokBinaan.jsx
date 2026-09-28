import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useMentor } from '../../hooks/useMentor';
import SubtaskManager from '../../components/SubtaskManager';
import RadarNilai from '../../components/RadarNilai';
import { fmtTanggal } from '../../lib/format';
import Modal from '../../components/Modal';

const HARI_INI = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

function fmtTanggalLogbook(tanggal) {
  if (!tanggal) return '—';
  const [tahun, bulan, hari] = tanggal.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(Date.UTC(tahun, bulan - 1, hari)));
}

export default function KelompokBinaan() {
  const { groups, mentees, loading } = useMentor();
  const [siap, setSiap] = useState(false);

  const [grupBuka, setGrupBuka] = useState(null);
  const [projekBuka, setProjekBuka] = useState({});
  const [anggotaDetail, setAnggotaDetail] = useState(null);
  const [logbookTerbuka, setLogbookTerbuka] = useState(null);
  const [tampilkanSemuaLogbook, setTampilkanSemuaLogbook] = useState(false);

  const [projects, setProjects] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [rubrik, setRubrik] = useState([]);
  const [logbook, setLogbook] = useState([]);
  const [stats, setStats] = useState({});
  const [search, setSearch] = useState('');

  const [params] = useSearchParams();

  useEffect(() => {
    if (!loading) muat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  async function muat() {
    if (mentees.length === 0 && groups.length === 0) {
      setSiap(true);
      return;
    }

    const ids = mentees.map((m) => m.id);
    const gids = groups.map((g) => g.id);

    const [prj, sub, rub, lgb] = await Promise.all([
      gids.length > 0
        ? supabase.from('projects').select('*').in('group_id', gids).order('created_at')
        : { data: [] },
      ids.length > 0
        ? supabase
            .from('subtasks')
            .select('*, projects(group_id, judul_projek), interns(nama_lengkap)')
            .in('intern_id', ids)
            .order('created_at')
        : { data: [] },
      ids.length > 0
        ? supabase
            .from('rubric_scores')
            .select(
              'intern_id, nilai_soft_skill, nilai_hard_skill, nilai_inisiatif, nilai_pemecahan, nilai_teknis, nilai_komunikasi, nilai_kualitas, nilai_disiplin, periode'
            )
            .in('intern_id', ids)
        : { data: [] },
      ids.length > 0
        ? supabase
            .from('logbook')
            .select('id, intern_id, judul, isi, tanggal')
            .in('intern_id', ids)
            .order('tanggal', { ascending: false })
        : { data: [] },
    ]);

    setProjects(prj.data ?? []);
    setSubtasks(sub.data ?? []);
    setRubrik(rub.data ?? []);
    setLogbook(lgb.data ?? []);

    const entri = await Promise.all(
      mentees.map(async (m) => {
        const { data } = await supabase.rpc('get_attendance_stats', {
          p_intern_id: m.id,
        });
        return [m.id, data];
      })
    );

    setStats(Object.fromEntries(entri));
    setSiap(true);

    const targetGroup = params.get('group');
    const targetProject = params.get('project');
    const targetSubtask = params.get('subtask');

    // Exact notification → kelompok → projek → kartu subtugas yang relevan.
    if (targetGroup) {
      setGrupBuka(targetGroup);

      if (targetProject) {
        setProjekBuka((state) => ({
          ...state,
          [targetGroup]: targetProject,
        }));

        const target = targetSubtask
          ? (sub.data ?? []).find((item) => item.id === targetSubtask)
          : null;

        setTimeout(() => {
          const projectEl = document.getElementById(`projek-${targetProject}`);

          if (projectEl && target) {
            const targetTitle = (target.judul ?? '').trim();
            const titleElements = Array.from(
              projectEl.querySelectorAll('li p')
            );

            const titleEl = titleElements.find(
              (el) => (el.textContent ?? '').trim() === targetTitle
            );

            const taskCard = titleEl?.closest('li');

            if (taskCard) {
              taskCard.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
              });

              taskCard.classList.add(
                'ring-4',
                'ring-purple-300',
                'ring-offset-2'
              );

              setTimeout(() => {
                taskCard.classList.remove(
                  'ring-4',
                  'ring-purple-300',
                  'ring-offset-2'
                );
              }, 3000);

              return;
            }
          }

          projectEl?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }, 700);

        return;
      }
    }

    // Fallback untuk notifikasi lama yang belum memiliki metadata target.
    if (params.get('panel') === 'review') {
      setTimeout(() => {
        document
          .getElementById('panel-review')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }

  const anggota = (gid) => mentees.filter((m) => m.group_id === gid);
  const projek = (gid) => projects.filter((p) => p.group_id === gid);

  const progresM = (iid) => {
    const total = subtasks.filter((s) => s.intern_id === iid).length;
    const selesai = subtasks.filter(
      (s) => s.intern_id === iid && s.status === 'Selesai'
    ).length;

    return total ? Math.round((selesai * 100) / total) : null;
  };

  const rubrikM = (iid) => {
    const rows = rubrik.filter((r) => r.intern_id === iid);
    if (!rows.length) return null;

    const avg = (arr) =>
      Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);

    return {
      soft: avg(rows.map((r) => Number(r.nilai_soft_skill))),
      hard: avg(rows.map((r) => Number(r.nilai_hard_skill))),
    };
  };

  const menungguReview = (gid) => {
    const ids = anggota(gid).map((a) => a.id);
    return subtasks.filter(
      (s) => ids.includes(s.intern_id) && s.status === 'Menunggu Review'
    ).length;
  };

  const antreanReview = subtasks
    .filter((s) => s.status === 'Menunggu Review')
    .sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at));

  const cari = search.toLowerCase().trim();
  const antreanFiltered = cari
    ? antreanReview.filter(
        (s) =>
          s.judul?.toLowerCase().includes(cari) ||
          s.interns?.nama_lengkap?.toLowerCase().includes(cari) ||
          s.projects?.judul_projek?.toLowerCase().includes(cari)
      )
    : antreanReview;

  function bukaDariAntrean(s) {
    const gid = s.projects?.group_id;
    if (!gid) return;

    setGrupBuka(gid);
    setProjekBuka((prev) => ({ ...prev, [gid]: s.project_id }));

    setTimeout(() => {
      document
        .getElementById(`projek-${s.project_id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 400);
  }

  function bukaAnggota(m) {
    setAnggotaDetail(m);
    setLogbookTerbuka(null);
    setTampilkanSemuaLogbook(false);
  }

  function tutupAnggota() {
    setAnggotaDetail(null);
    setLogbookTerbuka(null);
    setTampilkanSemuaLogbook(false);
  }

  if (loading || !siap) {
    return (
      <div>
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="mt-6 skeleton h-32 rounded-2xl" />
        <div className="mt-4 skeleton h-24 rounded-2xl" />
      </div>
    );
  }

  return (
    <div>
      {/* PANEL ANTREAN REVIEW */}
      <div
        id="panel-review"
        className="anim-up rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm sm:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
            🔍 Tugas Menunggu Review
            {antreanReview.length > 0 && (
              <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-black text-amber-900">
                {antreanReview.length}
              </span>
            )}
          </h2>

          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari tugas / peserta / projek..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none sm:w-72"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="hover:text-slate-600"
                >
                  ✕
                </button>
              ) : (
                '🔎'
              )}
            </span>
          </div>
        </div>

        {antreanFiltered.length === 0 ? (
          <p className="mt-3 rounded-xl bg-white/70 py-4 text-center text-xs font-semibold text-slate-400">
            {antreanReview.length === 0
              ? 'Tidak ada tugas menunggu review — semua beres! ✨'
              : `Tidak ada hasil untuk "${search}"`}
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {antreanFiltered.slice(0, 8).map((s, i) => {
              const jamTunggu = Math.max(
                0,
                Math.floor((Date.now() - new Date(s.submitted_at)) / 3600000)
              );

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => bukaDariAntrean(s)}
                  className="card-hover anim-in flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-3.5 text-left shadow-sm"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800">
                      {s.judul}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-400">
                      👤 {s.interns?.nama_lengkap}
                      {s.projects?.judul_projek &&
                        ` · 📁 ${s.projects.judul_projek}`}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      jamTunggu >= 24
                        ? 'bg-red-100 text-red-600'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    ⏳ {jamTunggu} jam
                  </span>
                </button>
              );
            })}

            {antreanFiltered.length > 8 && (
              <p className="text-center text-[11px] font-semibold text-slate-400">
                +{antreanFiltered.length - 8} lagi — gunakan search untuk
                mempersempit
              </p>
            )}
          </div>
        )}
      </div>

      <div className="anim-up mt-5">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
          Kelompok Binaan
        </h1>
      </div>

      {groups.length === 0 ? (
        <div className="anim-up mt-6 flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="anim-float text-5xl">👥</p>
          <p className="mt-4 font-bold text-slate-600">
            Belum Ada Kelompok Binaan
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Admin akan menugaskan kelompok kepadamu
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {groups.map((g, i) => {
            const buka = grupBuka === g.id;
            const nReview = menungguReview(g.id);
            const nProjek = projek(g.id).length;

            return (
              <div
                key={g.id}
                className="anim-up relative overflow-hidden rounded-2xl border shadow-sm transition-shadow hover:shadow-md"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <button
                  type="button"
                  onClick={() => setGrupBuka(buka ? null : g.id)}
                  className={`w-full p-4 text-left transition sm:p-5 ${
                    buka ? 'bg-slate-50' : 'bg-white hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-extrabold text-white">
                        {g.nama_kelompok?.slice(0, 2).toUpperCase()}
                      </span>

                      <div className="min-w-0">
                        <p className="truncate text-base font-bold text-slate-800">
                          {g.nama_kelompok}
                        </p>
                        <p className="text-xs text-slate-400">
                          {anggota(g.id).length} peserta
                          {nProjek > 0 && ` · ${nProjek} projek`}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {nReview > 0 && (
                        <span className="anim-pop rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black text-amber-900">
                          ⏳ {nReview}
                        </span>
                      )}
                      <span
                        className={`text-xs text-slate-400 transition-transform duration-300 ${
                          buka ? 'rotate-180' : ''
                        }`}
                      >
                        ▼
                      </span>
                    </div>
                  </div>
                </button>

                {buka && (
                  <div className="anim-down border-t border-slate-100 bg-white p-4 sm:p-5">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      Anggota ({anggota(g.id).length})
                    </p>

                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {anggota(g.id).length === 0 ? (
                        <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-400">
                          Belum ada anggota di kelompok ini.
                        </p>
                      ) : (
                        anggota(g.id).map((m, j) => {
                          const s = stats[m.id];
                          const persen = s?.persen_kehadiran;
                          const prog = progresM(m.id);
                          const rb = rubrikM(m.id);

                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => bukaAnggota(m)}
                              className="anim-up card-hover flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50/40"
                              style={{ animationDelay: `${j * 60}ms` }}
                            >
                              <div className="flex min-w-0 items-center gap-2.5">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                                  {m.nama_lengkap
                                    ?.split(' ')
                                    .map((x) => x[0])
                                    .slice(0, 2)
                                    .join('')}
                                </span>

                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-slate-800">
                                    {m.nama_lengkap}
                                  </p>
                                  <p className="truncate text-[11px] text-slate-400">
                                    {m.email}
                                  </p>
                                </div>
                              </div>

                              <div className="flex shrink-0 flex-col items-end gap-0.5 text-[11px]">
                                <div className="flex items-center gap-1.5 font-bold">
                                  <span
                                    className={
                                      persen >= 85
                                        ? 'text-green-600'
                                        : 'text-red-500'
                                    }
                                  >
                                    🕐 {persen ?? '—'}%
                                  </span>
                                  {prog !== null && (
                                    <span className="text-slate-500">
                                      📊 {prog}%
                                    </span>
                                  )}
                                </div>

                                <span className="text-[10px] text-slate-400">
                                  {rb ? (
                                    <>
                                      <span className="text-amber-600">
                                        S{rb.soft}
                                      </span>{' '}
                                      ·{' '}
                                      <span className="text-blue-600">
                                        H{rb.hard}
                                      </span>
                                    </>
                                  ) : (
                                    'belum dinilai'
                                  )}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>

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
                              <div
                                key={p.id}
                                id={`projek-${p.id}`}
                                className={`anim-up overflow-hidden rounded-xl border transition-colors ${
                                  pb
                                    ? 'border-indigo-300 bg-indigo-50/30'
                                    : 'border-slate-200 bg-white'
                                }`}
                                style={{ animationDelay: `${j * 60}ms` }}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setProjekBuka((s) => ({
                                      ...s,
                                      [g.id]: pb ? null : p.id,
                                    }))
                                  }
                                  className="flex w-full items-center justify-between gap-3 p-3.5 text-left transition hover:bg-slate-50"
                                >
                                  <div className="flex min-w-0 items-center gap-3">
                                    <span className="text-lg">📁</span>
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-bold text-slate-800">
                                        {p.judul_projek}
                                      </p>
                                      <p className="text-[11px] text-slate-400">
                                        {p.deadline_projek
                                          ? `⏰ ${fmtTanggal(p.deadline_projek)}`
                                          : 'tanpa deadline'}
                                      </p>
                                    </div>
                                  </div>

                                  <span
                                    className={`shrink-0 text-xs text-slate-400 transition-transform duration-300 ${
                                      pb ? 'rotate-180' : ''
                                    }`}
                                  >
                                    ▼
                                  </span>
                                </button>

                                {pb && (
                                  <div className="anim-down border-t border-indigo-100">
                                    <SubtaskManager
                                      group={g}
                                      anggota={anggota(g.id)}
                                      projekFilter={p.id}
                                    />
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

      {/* DETAIL PESERTA */}
      <Modal
        open={!!anggotaDetail}
        onClose={tutupAnggota}
        title={anggotaDetail?.nama_lengkap ?? ''}
      >
        {anggotaDetail &&
          (() => {
            const s = stats[anggotaDetail.id];
            const persen = s?.persen_kehadiran;
            const prog = progresM(anggotaDetail.id);
            const rbFull = rubrik
              .filter((r) => r.intern_id === anggotaDetail.id)
              .sort((a, b) =>
                (b.periode ?? '').localeCompare(a.periode ?? '')
              )[0];

            const semuaLogs = logbook.filter(
              (l) => l.intern_id === anggotaDetail.id
            );

            const logsTampil = tampilkanSemuaLogbook
              ? semuaLogs
              : semuaLogs.slice(0, 5);

            return (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-sm font-bold text-white">
                    {anggotaDetail.nama_lengkap
                      .split(' ')
                      .map((k) => k[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800">
                      {anggotaDetail.nama_lengkap}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {anggotaDetail.email}
                    </p>
                  </div>
                </div>

                {rbFull && rbFull.nilai_inisiatif != null ? (
                  <div className="rounded-xl border border-slate-100 p-3">
                    <RadarNilai
                      size={200}
                      nilai={{
                        inisiatif: rbFull.nilai_inisiatif,
                        pemecahan: rbFull.nilai_pemecahan,
                        teknis: rbFull.nilai_teknis,
                        komunikasi: rbFull.nilai_komunikasi,
                        kualitas: rbFull.nilai_kualitas,
                        disiplin: rbFull.nilai_disiplin,
                      }}
                    />
                    <p className="mt-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Penilaian periode {rbFull.periode}
                    </p>
                  </div>
                ) : (
                  <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-center text-[11px] font-semibold text-slate-400">
                    Belum dinilai — buka menu ⭐ Rubrik Penilaian
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-white p-3 text-center ring-1 ring-slate-100">
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                      Kehadiran
                    </p>
                    <p
                      className={`mt-1 text-xl font-extrabold ${
                        persen >= 85 ? 'text-green-600' : 'text-red-500'
                      }`}
                    >
                      {persen ?? '—'}%
                    </p>
                    {Number(s?.terlambat ?? 0) > 0 && (
                      <p className="text-[10px] font-medium text-orange-500">
                        ⚠ telat {s.terlambat}×
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl bg-white p-3 text-center ring-1 ring-slate-100">
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                      Progress Tugas
                    </p>
                    <p className="mt-1 text-xl font-extrabold text-slate-700">
                      {prog === null ? '—' : `${prog}%`}
                    </p>
                  </div>
                </div>

                {/* LOGBOOK — BISA EXPAND DAN LIHAT SEMUA */}
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      📖 Logbook Harian ({semuaLogs.length})
                    </p>

                    {semuaLogs.length > 5 && (
                      <button
                        type="button"
                        onClick={() => {
                          setTampilkanSemuaLogbook((v) => !v);
                          setLogbookTerbuka(null);
                        }}
                        className="text-[10px] font-bold text-indigo-600 hover:underline"
                      >
                        {tampilkanSemuaLogbook
                          ? 'Tampilkan 5 terbaru'
                          : `Lihat semua (${semuaLogs.length})`}
                      </button>
                    )}
                  </div>

                  {semuaLogs.length === 0 ? (
                    <p className="py-3 text-center text-[11px] italic text-slate-400">
                      Peserta belum menulis logbook
                    </p>
                  ) : (
                    <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                      {logsTampil.map((log) => {
                        const terbuka = logbookTerbuka === log.id;

                        return (
                          <button
                            key={log.id}
                            type="button"
                            onClick={() =>
                              setLogbookTerbuka(terbuka ? null : log.id)
                            }
                            className={`w-full rounded-lg border bg-white px-3 py-2.5 text-left transition ${
                              terbuka
                                ? 'border-indigo-200 shadow-sm'
                                : 'border-transparent hover:border-slate-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-[11px] font-bold text-slate-700">
                                {log.judul}
                              </p>

                              <div className="flex shrink-0 items-center gap-1.5">
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-400">
                                  {fmtTanggalLogbook(log.tanggal)}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {terbuka ? '▲' : '▼'}
                                </span>
                              </div>
                            </div>

                            <p
                              className={`mt-1 text-[10px] leading-relaxed text-slate-500 ${
                                terbuka ? 'whitespace-pre-wrap' : 'line-clamp-2'
                              }`}
                            >
                              {log.isi}
                            </p>

                            {!terbuka && (
                              <p className="mt-1 text-[9px] font-semibold text-indigo-400">
                                Klik untuk membaca selengkapnya
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {s && !s.error && (
                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    <div className="rounded-lg bg-green-50 py-2.5">
                      <b className="block text-lg text-green-700">{s.hadir}</b>
                      <span className="text-[10px] font-semibold text-green-600">
                        Hadir
                      </span>
                    </div>
                    <div className="rounded-lg bg-blue-50 py-2.5">
                      <b className="block text-lg text-blue-700">{s.izin}</b>
                      <span className="text-[10px] font-semibold text-blue-600">
                        Izin
                      </span>
                    </div>
                    <div className="rounded-lg bg-amber-50 py-2.5">
                      <b className="block text-lg text-amber-700">{s.sakit}</b>
                      <span className="text-[10px] font-semibold text-amber-600">
                        Sakit
                      </span>
                    </div>
                    <div className="rounded-lg bg-red-50 py-2.5">
                      <b className="block text-lg text-red-600">{s.alpha}</b>
                      <span className="text-[10px] font-semibold text-red-500">
                        Alpha
                      </span>
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
