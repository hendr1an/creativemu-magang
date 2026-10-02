import {
  useEffect,
  useState,
} from 'react';

import {
  useSearchParams,
} from 'react-router-dom';

import {
  supabase,
} from '../../lib/supabaseClient';

import {
  useMentor,
} from '../../hooks/useMentor';

import SubtaskManager from '../../components/SubtaskManager';
import RadarNilai from '../../components/RadarNilai';
import Modal from '../../components/Modal';

import {
  fmtTanggal,
} from '../../lib/format';


function fmtTanggalLogbook(
  tanggal
) {
  if (!tanggal) {
    return '—';
  }

  const [
    tahun,
    bulan,
    hari,
  ] =
    tanggal
      .split('-')
      .map(Number);

  return new Intl.DateTimeFormat(
    'id-ID',
    {
      day:
        'numeric',

      month:
        'short',

      year:
        'numeric',

      timeZone:
        'Asia/Jakarta',
    }
  ).format(
    new Date(
      Date.UTC(
        tahun,
        bulan - 1,
        hari
      )
    )
  );
}


function inisial(
  nama
) {
  if (!nama) {
    return '?';
  }

  return nama
    .split(' ')
    .filter(Boolean)
    .map(
      (
        bagian
      ) =>
        bagian[0]
    )
    .slice(
      0,
      2
    )
    .join('')
    .toUpperCase();
}


export default function KelompokBinaan() {
  const {
    groups,
    mentees,
    loading,
  } =
    useMentor();


  const [
    siap,
    setSiap,
  ] =
    useState(
      false
    );


  const [
    grupBuka,
    setGrupBuka,
  ] =
    useState(
      null
    );


  const [
    projekBuka,
    setProjekBuka,
  ] =
    useState(
      {}
    );


  const [
    anggotaDetail,
    setAnggotaDetail,
  ] =
    useState(
      null
    );


  const [
    logbookTerbuka,
    setLogbookTerbuka,
  ] =
    useState(
      null
    );


  const [
    tampilkanSemuaLogbook,
    setTampilkanSemuaLogbook,
  ] =
    useState(
      false
    );


  const [
    projects,
    setProjects,
  ] =
    useState(
      []
    );


  const [
    subtasks,
    setSubtasks,
  ] =
    useState(
      []
    );


  const [
    rubrik,
    setRubrik,
  ] =
    useState(
      []
    );


  const [
    logbook,
    setLogbook,
  ] =
    useState(
      []
    );


  const [
    stats,
    setStats,
  ] =
    useState(
      {}
    );


  const [
    search,
    setSearch,
  ] =
    useState(
      ''
    );


  const [
    params,
  ] =
    useSearchParams();


  /* =====================================================
     LOAD DATA
  ===================================================== */

  useEffect(
    () => {
      if (!loading) {
        muat();
      }

      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [
      loading,
    ]
  );


  async function muat() {
    if (
      mentees.length ===
        0 &&
      groups.length ===
        0
    ) {
      setSiap(
        true
      );

      return;
    }


    const ids =
      mentees.map(
        (
          mentee
        ) =>
          mentee.id
      );


    const groupIds =
      groups.map(
        (
          group
        ) =>
          group.id
      );


    const [
      projectResult,
      subtaskResult,
      rubricResult,
      logbookResult,
    ] =
      await Promise.all([
        groupIds.length >
        0
          ? supabase
              .from(
                'projects'
              )
              .select(
                '*'
              )
              .in(
                'group_id',
                groupIds
              )
              .order(
                'created_at'
              )
          : {
              data:
                [],
            },

        ids.length >
        0
          ? supabase
              .from(
                'subtasks'
              )
              .select(
                `
                *,
                projects(
                  group_id,
                  judul_projek
                ),
                interns(
                  nama_lengkap
                )
                `
              )
              .in(
                'intern_id',
                ids
              )
              .order(
                'created_at'
              )
          : {
              data:
                [],
            },

        ids.length >
        0
          ? supabase
              .from(
                'rubric_scores'
              )
              .select(
                `
                intern_id,
                nilai_soft_skill,
                nilai_hard_skill,
                nilai_inisiatif,
                nilai_pemecahan,
                nilai_teknis,
                nilai_komunikasi,
                nilai_kualitas,
                nilai_disiplin,
                periode
                `
              )
              .in(
                'intern_id',
                ids
              )
          : {
              data:
                [],
            },

        ids.length >
        0
          ? supabase
              .from(
                'logbook'
              )
              .select(
                `
                id,
                intern_id,
                judul,
                isi,
                tanggal
                `
              )
              .in(
                'intern_id',
                ids
              )
              .order(
                'tanggal',
                {
                  ascending:
                    false,
                }
              )
          : {
              data:
                [],
            },
      ]);


    setProjects(
      projectResult.data ??
        []
    );


    setSubtasks(
      subtaskResult.data ??
        []
    );


    setRubrik(
      rubricResult.data ??
        []
    );


    setLogbook(
      logbookResult.data ??
        []
    );


    /* ===================================================
       STATISTIK PRESENSI TIAP PESERTA
    =================================================== */

    const entriStatistik =
      await Promise.all(
        mentees.map(
          async (
            mentee
          ) => {
            const {
              data,
            } =
              await supabase.rpc(
                'get_attendance_stats',
                {
                  p_intern_id:
                    mentee.id,
                }
              );

            return [
              mentee.id,
              data,
            ];
          }
        )
      );


    setStats(
      Object.fromEntries(
        entriStatistik
      )
    );


    setSiap(
      true
    );


    /* ===================================================
       EXACT DEEPLINK NOTIFIKASI REVIEW

       /mentor/kelompok
         ?panel=review
         &group=...
         &project=...
         &subtask=...
    =================================================== */

    const targetGroup =
      params.get(
        'group'
      );


    const targetProject =
      params.get(
        'project'
      );


    const targetSubtask =
      params.get(
        'subtask'
      );


    if (
      targetGroup
    ) {
      setGrupBuka(
        targetGroup
      );


      if (
        targetProject
      ) {
        setProjekBuka(
          (
            sebelumnya
          ) => ({
            ...sebelumnya,

            [targetGroup]:
              targetProject,
          })
        );


        const target =
          targetSubtask
            ? (
                subtaskResult.data ??
                []
              ).find(
                (
                  item
                ) =>
                  item.id ===
                  targetSubtask
              )
            : null;


        setTimeout(
          () => {
            const projectElement =
              document.getElementById(
                `projek-${targetProject}`
              );


            if (
              projectElement &&
              target
            ) {
              const judulTarget =
                (
                  target.judul ??
                  ''
                ).trim();


              const daftarJudul =
                Array.from(
                  projectElement.querySelectorAll(
                    'li p'
                  )
                );


              const elementJudul =
                daftarJudul.find(
                  (
                    element
                  ) =>
                    (
                      element.textContent ??
                      ''
                    ).trim() ===
                    judulTarget
                );


              const kartuTugas =
                elementJudul?.closest(
                  'li'
                );


              if (
                kartuTugas
              ) {
                kartuTugas.scrollIntoView(
                  {
                    behavior:
                      'smooth',

                    block:
                      'center',
                  }
                );


                kartuTugas.classList.add(
                  'ring-4',
                  'ring-purple-300',
                  'ring-offset-2'
                );


                setTimeout(
                  () => {
                    kartuTugas.classList.remove(
                      'ring-4',
                      'ring-purple-300',
                      'ring-offset-2'
                    );
                  },
                  3000
                );


                return;
              }
            }


            projectElement?.scrollIntoView(
              {
                behavior:
                  'smooth',

                block:
                  'center',
              }
            );
          },
          700
        );


        return;
      }
    }


    if (
      params.get(
        'panel'
      ) ===
      'review'
    ) {
      setTimeout(
        () => {
          document
            .getElementById(
              'panel-review'
            )
            ?.scrollIntoView(
              {
                behavior:
                  'smooth',

                block:
                  'start',
              }
            );
        },
        300
      );
    }
  }


  /* =====================================================
     HELPER DATA
  ===================================================== */

  const anggota =
    (
      groupId
    ) =>
      mentees.filter(
        (
          mentee
        ) =>
          mentee.group_id ===
          groupId
      );


  const projek =
    (
      groupId
    ) =>
      projects.filter(
        (
          project
        ) =>
          project.group_id ===
          groupId
      );


  function progresM(
    internId
  ) {
    const semua =
      subtasks.filter(
        (
          subtask
        ) =>
          subtask.intern_id ===
          internId
      );


    const selesai =
      semua.filter(
        (
          subtask
        ) =>
          subtask.status ===
          'Selesai'
      ).length;


    if (
      semua.length ===
      0
    ) {
      return null;
    }


    return Math.round(
      (
        selesai *
        100
      ) /
        semua.length
    );
  }


  function rubrikM(
    internId
  ) {
    const rows =
      rubrik.filter(
        (
          row
        ) =>
          row.intern_id ===
          internId
      );


    if (
      rows.length ===
      0
    ) {
      return null;
    }


    const average =
      (
        values
      ) => {
        const valid =
          values
            .map(Number)
            .filter(
              (
                value
              ) =>
                Number.isFinite(
                  value
                )
            );


        if (
          valid.length ===
          0
        ) {
          return null;
        }


        return Math.round(
          valid.reduce(
            (
              total,
              value
            ) =>
              total +
              value,
            0
          ) /
            valid.length
        );
      };


    return {
      soft:
        average(
          rows.map(
            (
              row
            ) =>
              row.nilai_soft_skill
          )
        ),

      hard:
        average(
          rows.map(
            (
              row
            ) =>
              row.nilai_hard_skill
          )
        ),
    };
  }


  function menungguReview(
    groupId
  ) {
    const ids =
      anggota(
        groupId
      ).map(
        (
          item
        ) =>
          item.id
      );


    return subtasks.filter(
      (
        subtask
      ) =>
        ids.includes(
          subtask.intern_id
        ) &&
        subtask.status ===
          'Menunggu Review'
    ).length;
  }


  /* =====================================================
     ANTREAN REVIEW
  ===================================================== */

  const antreanReview =
    subtasks
      .filter(
        (
          subtask
        ) =>
          subtask.status ===
          'Menunggu Review'
      )
      .sort(
        (
          a,
          b
        ) => {
          const waktuA =
            a.submitted_at
              ? new Date(
                  a.submitted_at
                ).getTime()
              : 0;


          const waktuB =
            b.submitted_at
              ? new Date(
                  b.submitted_at
                ).getTime()
              : 0;


          return (
            waktuA -
            waktuB
          );
        }
      );


  const kataCari =
    search
      .toLowerCase()
      .trim();


  const antreanFiltered =
    kataCari
      ? antreanReview.filter(
          (
            subtask
          ) =>
            subtask.judul
              ?.toLowerCase()
              .includes(
                kataCari
              ) ||

            subtask.interns
              ?.nama_lengkap
              ?.toLowerCase()
              .includes(
                kataCari
              ) ||

            subtask.projects
              ?.judul_projek
              ?.toLowerCase()
              .includes(
                kataCari
              )
        )
      : antreanReview;


  function bukaDariAntrean(
    subtask
  ) {
    const groupId =
      subtask.projects
        ?.group_id;


    if (
      !groupId
    ) {
      return;
    }


    setGrupBuka(
      groupId
    );


    setProjekBuka(
      (
        sebelumnya
      ) => ({
        ...sebelumnya,

        [groupId]:
          subtask.project_id,
      })
    );


    setTimeout(
      () => {
        document
          .getElementById(
            `projek-${subtask.project_id}`
          )
          ?.scrollIntoView(
            {
              behavior:
                'smooth',

              block:
                'center',
            }
          );
      },
      400
    );
  }


  /* =====================================================
     MODAL PESERTA
  ===================================================== */

  function bukaAnggota(
    mentee
  ) {
    setAnggotaDetail(
      mentee
    );


    setLogbookTerbuka(
      null
    );


    setTampilkanSemuaLogbook(
      false
    );
  }


  function tutupAnggota() {
    setAnggotaDetail(
      null
    );


    setLogbookTerbuka(
      null
    );


    setTampilkanSemuaLogbook(
      false
    );
  }


  /* =====================================================
     LOADING
  ===================================================== */

  if (
    loading ||
    !siap
  ) {
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
      {/* =================================================
          PANEL REVIEW
      ================================================= */}

      <div
        id="panel-review"
        className="anim-up rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm sm:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
            🔍 Tugas
            Menunggu Review

            {antreanReview.length >
              0 && (
              <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-black text-amber-900">
                {
                  antreanReview.length
                }
              </span>
            )}
          </h2>


          <div className="relative">
            <input
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target
                    .value
                )
              }
              placeholder="Cari tugas / peserta / projek..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none sm:w-72"
            />


            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
              {search ? (
                <button
                  type="button"
                  onClick={() =>
                    setSearch(
                      ''
                    )
                  }
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


        {antreanFiltered.length ===
        0 ? (
          <p className="mt-3 rounded-xl bg-white/70 py-4 text-center text-xs font-semibold text-slate-400">
            {antreanReview.length ===
            0
              ? 'Tidak ada tugas menunggu review — semua beres! ✨'
              : `Tidak ada hasil untuk "${search}"`}
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {antreanFiltered
              .slice(
                0,
                8
              )
              .map(
                (
                  subtask,
                  index
                ) => {
                  const submittedAt =
                    subtask.submitted_at
                      ? new Date(
                          subtask.submitted_at
                        ).getTime()
                      : Date.now();


                  const jamTunggu =
                    Math.max(
                      0,

                      Math.floor(
                        (
                          Date.now() -
                          submittedAt
                        ) /
                          3600000
                      )
                    );


                  return (
                    <button
                      key={
                        subtask.id
                      }
                      type="button"
                      onClick={() =>
                        bukaDariAntrean(
                          subtask
                        )
                      }
                      className="card-hover anim-in flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-3.5 text-left shadow-sm"
                      style={{
                        animationDelay:
                          `${index * 50}ms`,
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-800">
                          {
                            subtask.judul
                          }
                        </p>


                        <p className="mt-0.5 truncate text-[11px] text-slate-400">
                          👤{' '}

                          {
                            subtask
                              .interns
                              ?.nama_lengkap
                          }


                          {subtask
                            .projects
                            ?.judul_projek &&
                            ` · 📁 ${subtask.projects.judul_projek}`}
                        </p>
                      </div>


                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                          jamTunggu >=
                          24
                            ? 'bg-red-100 text-red-600'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        ⏳{' '}
                        {
                          jamTunggu
                        }{' '}
                        jam
                      </span>
                    </button>
                  );
                }
              )}


            {antreanFiltered.length >
              8 && (
              <p className="text-center text-[11px] font-semibold text-slate-400">
                +
                {antreanFiltered.length -
                  8}{' '}
                lagi — gunakan
                search untuk
                mempersempit
              </p>
            )}
          </div>
        )}
      </div>


      {/* =================================================
          HEADER
      ================================================= */}

      <div className="anim-up mt-5">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
          Mentoring
        </h1>


        <p className="mt-1 text-sm text-slate-500">
          Kelola peserta,
          projek, review tugas,
          dan perkembangan
          kelompok yang menjadi
          tanggung jawabmu.
        </p>
      </div>


      {/* =================================================
          KELOMPOK
      ================================================= */}

      {groups.length ===
      0 ? (
        <div className="anim-up mt-6 flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="anim-float text-5xl">
            👥
          </p>

          <p className="mt-4 font-bold text-slate-600">
            Belum Ada Kelompok
            Mentoring
          </p>

          <p className="mt-1 text-sm text-slate-400">
            Admin akan
            menugaskan kelompok
            kepadamu
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {groups.map(
            (
              group,
              groupIndex
            ) => {
              const terbuka =
                grupBuka ===
                group.id;


              const jumlahReview =
                menungguReview(
                  group.id
                );


              const daftarProjek =
                projek(
                  group.id
                );


              const daftarAnggota =
                anggota(
                  group.id
                );


              return (
                <div
                  key={
                    group.id
                  }
                  className="anim-up relative overflow-hidden rounded-2xl border border-slate-200 shadow-sm transition-shadow hover:shadow-md"
                  style={{
                    animationDelay:
                      `${groupIndex * 80}ms`,
                  }}
                >
                  {/* HEADER KELOMPOK */}

                  <button
                    type="button"
                    onClick={() =>
                      setGrupBuka(
                        terbuka
                          ? null
                          : group.id
                      )
                    }
                    className={`w-full p-4 text-left transition sm:p-5 ${
                      terbuka
                        ? 'bg-slate-50'
                        : 'bg-white hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-extrabold text-white">
                          {group.nama_kelompok
                            ?.slice(
                              0,
                              2
                            )
                            .toUpperCase()}
                        </span>


                        <div className="min-w-0">
                          <p className="truncate text-base font-bold text-slate-800">
                            {
                              group.nama_kelompok
                            }
                          </p>


                          <p className="text-xs text-slate-400">
                            {
                              daftarAnggota.length
                            }{' '}
                            peserta

                            {daftarProjek.length >
                              0 &&
                              ` · ${daftarProjek.length} projek`}
                          </p>
                        </div>
                      </div>


                      <div className="flex shrink-0 items-center gap-2">
                        {jumlahReview >
                          0 && (
                          <span className="anim-pop rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black text-amber-900">
                            ⏳{' '}
                            {
                              jumlahReview
                            }
                          </span>
                        )}


                        <span
                          className={`text-xs text-slate-400 transition-transform duration-300 ${
                            terbuka
                              ? 'rotate-180'
                              : ''
                          }`}
                        >
                          ▼
                        </span>
                      </div>
                    </div>
                  </button>


                  {/* ISI KELOMPOK */}

                  {terbuka && (
                    <div className="anim-down border-t border-slate-100 bg-white p-4 sm:p-5">
                      {/* ===================================
                          ANGGOTA
                      =================================== */}

                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                        Anggota (
                        {
                          daftarAnggota.length
                        }
                        )
                      </p>


                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {daftarAnggota.length ===
                        0 ? (
                          <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-400 sm:col-span-2">
                            Belum ada
                            anggota di
                            kelompok ini.
                          </p>
                        ) : (
                          daftarAnggota.map(
                            (
                              mentee,
                              index
                            ) => {
                              const statistik =
                                stats[
                                  mentee.id
                                ];


                              const kehadiran =
                                statistik
                                  ?.persen_kehadiran;


                              const progress =
                                progresM(
                                  mentee.id
                                );


                              const nilaiRubrik =
                                rubrikM(
                                  mentee.id
                                );


                              return (
                                <button
                                  key={
                                    mentee.id
                                  }
                                  type="button"
                                  onClick={() =>
                                    bukaAnggota(
                                      mentee
                                    )
                                  }
                                  className="anim-up card-hover flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50/40"
                                  style={{
                                    animationDelay:
                                      `${index * 60}ms`,
                                  }}
                                >
                                  <div className="flex min-w-0 items-center gap-2.5">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                                      {inisial(
                                        mentee.nama_lengkap
                                      )}
                                    </span>


                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-bold text-slate-800">
                                        {
                                          mentee.nama_lengkap
                                        }
                                      </p>


                                      <p className="truncate text-[11px] text-slate-400">
                                        {
                                          mentee.email
                                        }
                                      </p>


                                      {/* =====================
                                          FASE 5-7E — JURUSAN
                                      ===================== */}

                                      <p
                                        className={`mt-0.5 truncate text-[10px] font-semibold ${
                                          mentee.jurusan
                                            ? 'text-purple-600'
                                            : 'text-amber-500'
                                        }`}
                                      >
                                        🎓{' '}

                                        {mentee.jurusan ??
                                          'Jurusan / Program Studi belum diisi'}
                                      </p>


                                      {mentee.instansi && (
                                        <p className="mt-0.5 truncate text-[10px] text-slate-400">
                                          🏫{' '}

                                          {
                                            mentee.instansi
                                          }
                                        </p>
                                      )}
                                    </div>
                                  </div>


                                  <div className="flex shrink-0 flex-col items-end gap-0.5 text-[11px]">
                                    <div className="flex items-center gap-1.5 font-bold">
                                      <span
                                        className={
                                          kehadiran >=
                                          85
                                            ? 'text-green-600'
                                            : 'text-red-500'
                                        }
                                      >
                                        🕐{' '}

                                        {kehadiran ??
                                          '—'}
                                        %
                                      </span>


                                      {progress !==
                                        null && (
                                        <span className="text-slate-500">
                                          📊{' '}

                                          {
                                            progress
                                          }
                                          %
                                        </span>
                                      )}
                                    </div>


                                    <span className="text-[10px] text-slate-400">
                                      {nilaiRubrik ? (
                                        <>
                                          <span className="text-amber-600">
                                            S
                                            {
                                              nilaiRubrik.soft ??
                                              '—'
                                            }
                                          </span>

                                          {' · '}

                                          <span className="text-blue-600">
                                            H
                                            {
                                              nilaiRubrik.hard ??
                                              '—'
                                            }
                                          </span>
                                        </>
                                      ) : (
                                        'belum dinilai'
                                      )}
                                    </span>
                                  </div>
                                </button>
                              );
                            }
                          )
                        )}
                      </div>


                      {/* ===================================
                          PROJEK INDUK
                      =================================== */}

                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                          Projek Induk
                        </p>


                        {daftarProjek.length ===
                        0 ? (
                          <div className="anim-in mt-2">
                            <SubtaskManager
                              group={
                                group
                              }
                              anggota={
                                daftarAnggota
                              }
                            />
                          </div>
                        ) : (
                          <div className="mt-2 space-y-2">
                            {daftarProjek.map(
                              (
                                project,
                                projectIndex
                              ) => {
                                const projectTerbuka =
                                  projekBuka[
                                    group.id
                                  ] ===
                                  project.id;


                                return (
                                  <div
                                    key={
                                      project.id
                                    }
                                    id={`projek-${project.id}`}
                                    className={`anim-up overflow-hidden rounded-xl border transition-colors ${
                                      projectTerbuka
                                        ? 'border-indigo-300 bg-indigo-50/30'
                                        : 'border-slate-200 bg-white'
                                    }`}
                                    style={{
                                      animationDelay:
                                        `${projectIndex * 60}ms`,
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setProjekBuka(
                                          (
                                            sebelumnya
                                          ) => ({
                                            ...sebelumnya,

                                            [group.id]:
                                              projectTerbuka
                                                ? null
                                                : project.id,
                                          })
                                        )
                                      }
                                      className="flex w-full items-center justify-between gap-3 p-3.5 text-left transition hover:bg-slate-50"
                                    >
                                      <div className="flex min-w-0 items-center gap-3">
                                        <span className="text-lg">
                                          📁
                                        </span>


                                        <div className="min-w-0">
                                          <p className="truncate text-sm font-bold text-slate-800">
                                            {
                                              project.judul_projek
                                            }
                                          </p>


                                          <p className="text-[11px] text-slate-400">
                                            {project.deadline_projek
                                              ? `⏰ ${fmtTanggal(
                                                  project.deadline_projek
                                                )}`
                                              : 'tanpa deadline'}
                                          </p>
                                        </div>
                                      </div>


                                      <span
                                        className={`shrink-0 text-xs text-slate-400 transition-transform duration-300 ${
                                          projectTerbuka
                                            ? 'rotate-180'
                                            : ''
                                        }`}
                                      >
                                        ▼
                                      </span>
                                    </button>


                                    {projectTerbuka && (
                                      <div className="anim-down border-t border-indigo-100">
                                        <SubtaskManager
                                          group={
                                            group
                                          }
                                          anggota={
                                            daftarAnggota
                                          }
                                          projekFilter={
                                            project.id
                                          }
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                            )}


                            <details className="anim-up rounded-xl border border-dashed border-slate-300">
                              <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                                ➕ Tambah
                                projek induk
                                baru
                              </summary>


                              <div className="border-t border-slate-100 p-3">
                                <SubtaskManager
                                  group={
                                    group
                                  }
                                  anggota={
                                    daftarAnggota
                                  }
                                />
                              </div>
                            </details>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            }
          )}
        </div>
      )}


      {/* =================================================
          MODAL DETAIL PESERTA
      ================================================= */}

      <Modal
        open={
          !!anggotaDetail
        }
        onClose={
          tutupAnggota
        }
        title={
          anggotaDetail
            ?.nama_lengkap ??
          ''
        }
      >
        {anggotaDetail &&
          (() => {
            const statistik =
              stats[
                anggotaDetail.id
              ];


            const persenKehadiran =
              statistik
                ?.persen_kehadiran;


            const progressTugas =
              progresM(
                anggotaDetail.id
              );


            const rubrikTerakhir =
              rubrik
                .filter(
                  (
                    row
                  ) =>
                    row.intern_id ===
                    anggotaDetail.id
                )
                .sort(
                  (
                    a,
                    b
                  ) =>
                    (
                      b.periode ??
                      ''
                    ).localeCompare(
                      a.periode ??
                        ''
                    )
                )[0];


            const semuaLogbook =
              logbook.filter(
                (
                  row
                ) =>
                  row.intern_id ===
                  anggotaDetail.id
              );


            const logbookDitampilkan =
              tampilkanSemuaLogbook
                ? semuaLogbook
                : semuaLogbook.slice(
                    0,
                    5
                  );


            return (
              <div className="space-y-3 text-sm">
                {/* ================================
                    IDENTITAS PESERTA
                ================================ */}

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-sm font-bold text-white">
                      {inisial(
                        anggotaDetail.nama_lengkap
                      )}
                    </div>


                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800">
                        {
                          anggotaDetail.nama_lengkap
                        }
                      </p>


                      <p className="truncate text-xs text-slate-500">
                        {
                          anggotaDetail.email
                        }
                      </p>


                      {/* ==========================
                          FASE 5-7E — IDENTITAS
                      ========================== */}

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span
                          className={`max-w-full rounded-full px-2.5 py-1 text-[9px] font-bold ${
                            anggotaDetail.jurusan
                              ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-200'
                              : 'bg-amber-100 text-amber-700 ring-1 ring-amber-200'
                          }`}
                        >
                          🎓{' '}

                          {anggotaDetail.jurusan ??
                            'Jurusan / Program Studi belum diisi'}
                        </span>


                        {anggotaDetail.instansi && (
                          <span className="max-w-full rounded-full bg-white px-2.5 py-1 text-[9px] font-semibold text-slate-600 ring-1 ring-slate-200">
                            🏫{' '}

                            {
                              anggotaDetail.instansi
                            }
                          </span>
                        )}


                        {anggotaDetail.divisi && (
                          <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[9px] font-bold text-indigo-700 ring-1 ring-indigo-200">
                            🧩{' '}

                            {
                              anggotaDetail.divisi
                            }
                          </span>
                        )}
                      </div>


                      {(anggotaDetail.tanggal_mulai ||
                        anggotaDetail.tanggal_selesai) && (
                        <p className="mt-2 text-[10px] font-medium text-slate-400">
                          📅{' '}

                          {fmtTanggal(
                            anggotaDetail.tanggal_mulai
                          )}

                          {' – '}

                          {fmtTanggal(
                            anggotaDetail.tanggal_selesai
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>


                {/* ================================
                    RADAR NILAI
                ================================ */}

                {rubrikTerakhir &&
                rubrikTerakhir.nilai_inisiatif !=
                  null ? (
                  <div className="rounded-xl border border-slate-100 p-3">
                    <RadarNilai
                      size={
                        200
                      }
                      nilai={{
                        inisiatif:
                          rubrikTerakhir.nilai_inisiatif,

                        pemecahan:
                          rubrikTerakhir.nilai_pemecahan,

                        teknis:
                          rubrikTerakhir.nilai_teknis,

                        komunikasi:
                          rubrikTerakhir.nilai_komunikasi,

                        kualitas:
                          rubrikTerakhir.nilai_kualitas,

                        disiplin:
                          rubrikTerakhir.nilai_disiplin,
                      }}
                    />


                    <p className="mt-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Penilaian
                      periode{' '}

                      {
                        rubrikTerakhir.periode
                      }
                    </p>
                  </div>
                ) : (
                  <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-center text-[11px] font-semibold text-slate-400">
                    Belum dinilai —
                    buka menu ⭐
                    Rubrik Penilaian
                  </p>
                )}


                {/* ================================
                    RINGKASAN
                ================================ */}

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-white p-3 text-center ring-1 ring-slate-100">
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                      Kehadiran
                    </p>


                    <p
                      className={`mt-1 text-xl font-extrabold ${
                        persenKehadiran >=
                        85
                          ? 'text-green-600'
                          : 'text-red-500'
                      }`}
                    >
                      {persenKehadiran ??
                        '—'}
                      %
                    </p>


                    {Number(
                      statistik
                        ?.terlambat ??
                        0
                    ) > 0 && (
                      <p className="text-[10px] font-medium text-orange-500">
                        ⚠ telat{' '}

                        {
                          statistik.terlambat
                        }
                        ×
                      </p>
                    )}
                  </div>


                  <div className="rounded-xl bg-white p-3 text-center ring-1 ring-slate-100">
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                      Progress Tugas
                    </p>


                    <p className="mt-1 text-xl font-extrabold text-slate-700">
                      {progressTugas ===
                      null
                        ? '—'
                        : `${progressTugas}%`}
                    </p>
                  </div>
                </div>


                {/* ================================
                    LOGBOOK PESERTA
                ================================ */}

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      📖 Logbook
                      Harian (
                      {
                        semuaLogbook.length
                      }
                      )
                    </p>


                    {semuaLogbook.length >
                      5 && (
                      <button
                        type="button"
                        onClick={() => {
                          setTampilkanSemuaLogbook(
                            (
                              sebelumnya
                            ) =>
                              !sebelumnya
                          );


                          setLogbookTerbuka(
                            null
                          );
                        }}
                        className="text-[10px] font-bold text-indigo-600 hover:underline"
                      >
                        {tampilkanSemuaLogbook
                          ? 'Tampilkan 5 terbaru'
                          : `Lihat semua (${semuaLogbook.length})`}
                      </button>
                    )}
                  </div>


                  {semuaLogbook.length ===
                  0 ? (
                    <p className="py-3 text-center text-[11px] italic text-slate-400">
                      Peserta belum
                      menulis logbook
                    </p>
                  ) : (
                    <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                      {logbookDitampilkan.map(
                        (
                          item
                        ) => {
                          const terbuka =
                            logbookTerbuka ===
                            item.id;


                          return (
                            <button
                              key={
                                item.id
                              }
                              type="button"
                              onClick={() =>
                                setLogbookTerbuka(
                                  terbuka
                                    ? null
                                    : item.id
                                )
                              }
                              className={`w-full rounded-lg border bg-white px-3 py-2.5 text-left transition ${
                                terbuka
                                  ? 'border-indigo-200 shadow-sm'
                                  : 'border-transparent hover:border-slate-200'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-[11px] font-bold text-slate-700">
                                  {
                                    item.judul
                                  }
                                </p>


                                <div className="flex shrink-0 items-center gap-1.5">
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-400">
                                    {fmtTanggalLogbook(
                                      item.tanggal
                                    )}
                                  </span>


                                  <span className="text-[10px] text-slate-400">
                                    {terbuka
                                      ? '▲'
                                      : '▼'}
                                  </span>
                                </div>
                              </div>


                              <p
                                className={`mt-1 text-[10px] leading-relaxed text-slate-500 ${
                                  terbuka
                                    ? 'whitespace-pre-wrap'
                                    : 'line-clamp-2'
                                }`}
                              >
                                {
                                  item.isi
                                }
                              </p>


                              {!terbuka && (
                                <p className="mt-1 text-[9px] font-semibold text-indigo-400">
                                  Klik untuk
                                  membaca
                                  selengkapnya
                                </p>
                              )}
                            </button>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>


                {/* ================================
                    DETAIL PRESENSI
                ================================ */}

                {statistik &&
                !statistik.error && (
                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    <div className="rounded-lg bg-green-50 py-2.5">
                      <b className="block text-lg text-green-700">
                        {
                          statistik.hadir
                        }
                      </b>

                      <span className="text-[10px] font-semibold text-green-600">
                        Hadir
                      </span>
                    </div>


                    <div className="rounded-lg bg-blue-50 py-2.5">
                      <b className="block text-lg text-blue-700">
                        {
                          statistik.izin
                        }
                      </b>

                      <span className="text-[10px] font-semibold text-blue-600">
                        Izin
                      </span>
                    </div>


                    <div className="rounded-lg bg-amber-50 py-2.5">
                      <b className="block text-lg text-amber-700">
                        {
                          statistik.sakit
                        }
                      </b>

                      <span className="text-[10px] font-semibold text-amber-600">
                        Sakit
                      </span>
                    </div>


                    <div className="rounded-lg bg-red-50 py-2.5">
                      <b className="block text-lg text-red-600">
                        {
                          statistik.alpha
                        }
                      </b>

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