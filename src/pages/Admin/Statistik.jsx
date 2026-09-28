import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleX,
  Clock3,
  RefreshCw,
  TrendingUp,
  UserMinus,
  Users,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const DIVISI_META = {
  Admin: {
    ikon: '📋',
    label: 'Admin',
    deskripsi: 'Administrasi & Operasional',
  },

  Sosmed: {
    ikon: '📱',
    label: 'Sosmed',
    deskripsi: 'Social Media & Content',
  },

  Marketplace: {
    ikon: '🛒',
    label: 'Marketplace',
    deskripsi: 'E-commerce & Digital Marketing',
  },

  'Web Developer': {
    ikon: '💻',
    label: 'Web Developer',
    deskripsi: 'Website & Programming',
  },
};

function angka(value) {
  const n = Number(value ?? 0);

  return Number.isFinite(n)
    ? n
    : 0;
}

function persen(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return '0%';
  }

  return `${Number(n.toFixed(2))}%`;
}

function nilai(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return '—';
  }

  const n = Number(value);

  if (!Number.isFinite(n)) {
    return '—';
  }

  return n.toFixed(2);
}

function namaBulan(label) {
  if (!label) {
    return '—';
  }

  const [tahun, bulan] =
    label.split('-').map(Number);

  if (!tahun || !bulan) {
    return label;
  }

  return new Intl.DateTimeFormat('id-ID', {
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(
    new Date(
      Date.UTC(
        tahun,
        bulan - 1,
        1
      )
    )
  );
}

function namaBulanPanjang(label) {
  if (!label) {
    return '—';
  }

  const [tahun, bulan] =
    label.split('-').map(Number);

  if (!tahun || !bulan) {
    return label;
  }

  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(
    new Date(
      Date.UTC(
        tahun,
        bulan - 1,
        1
      )
    )
  );
}

function tanggalWaktu(iso) {
  if (!iso) {
    return '—';
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(
    new Date(iso)
  );
}

function KartuRingkasan({
  label,
  value,
  detail,
  Icon,
  tone = 'slate',
}) {
  const toneClass = {
    indigo: {
      bg: 'bg-indigo-50',
      icon: 'text-indigo-600',
      value: 'text-indigo-700',
    },

    green: {
      bg: 'bg-green-50',
      icon: 'text-green-600',
      value: 'text-green-700',
    },

    amber: {
      bg: 'bg-amber-50',
      icon: 'text-amber-600',
      value: 'text-amber-700',
    },

    red: {
      bg: 'bg-red-50',
      icon: 'text-red-600',
      value: 'text-red-700',
    },

    slate: {
      bg: 'bg-slate-50',
      icon: 'text-slate-600',
      value: 'text-slate-800',
    },
  }[tone] ?? {
    bg: 'bg-slate-50',
    icon: 'text-slate-600',
    value: 'text-slate-800',
  };

  return (
    <div className="anim-up rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {label}
          </p>

          <p
            className={`mt-2 text-3xl font-extrabold ${toneClass.value}`}
          >
            {value}
          </p>

          {detail && (
            <p className="mt-1 text-xs text-slate-400">
              {detail}
            </p>
          )}
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${toneClass.bg}`}
        >
          <Icon
            size={21}
            className={toneClass.icon}
          />
        </div>
      </div>
    </div>
  );
}

export default function Statistik() {
  const [rangeBulan, setRangeBulan] =
    useState(12);

  const [data, setData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState(null);

  const [generatedAt, setGeneratedAt] =
    useState(null);

  const muat = useCallback(async () => {
    setLoading(true);
    setError(null);

    const {
      data: hasil,
      error: rpcError,
    } = await supabase.rpc(
      'get_admin_statistics',
      {
        p_jumlah_bulan:
          Number(rangeBulan),
      }
    );

    if (rpcError) {
      setError(
        rpcError.message
      );

      setLoading(false);

      return;
    }

    if (hasil?.error) {
      setError(
        hasil.message ??
          'Gagal mengambil statistik administrasi.'
      );

      setLoading(false);

      return;
    }

    setData(hasil);

    setGeneratedAt(
      hasil?.generated_at ??
        null
    );

    setLoading(false);
  }, [rangeBulan]);

  useEffect(() => {
    muat();
  }, [muat]);

  const ringkasan =
    data?.ringkasan ?? {};

  const divisi =
    data?.divisi ?? [];

  const bulanan =
    data?.bulanan ?? [];

  const tahunan =
    data?.tahunan ?? [];

  const instansi =
    data?.instansi ?? [];

  const penonaktifan =
    data?.penonaktifan ?? [];

  const maxPendaftarBulanan =
    useMemo(() => {
      return Math.max(
        ...bulanan.map(
          (item) =>
            angka(
              item.total_pendaftar
            )
        ),
        1
      );
    }, [bulanan]);

  const maxInstansi =
    useMemo(() => {
      return Math.max(
        ...instansi.map(
          (item) =>
            angka(
              item.total_pendaftar
            )
        ),
        1
      );
    }, [instansi]);

  const maxSuspensi =
    useMemo(() => {
      return Math.max(
        ...penonaktifan.map(
          (item) =>
            angka(item.jumlah)
        ),
        1
      );
    }, [penonaktifan]);

  const tingkatDiterima =
    angka(
      ringkasan.pendaftaran_total
    ) > 0
      ? (
          angka(
            ringkasan.pendaftaran_diterima
          ) /
          angka(
            ringkasan.pendaftaran_total
          )
        ) *
        100
      : 0;

  if (loading && !data) {
    return (
      <div>
        <div className="skeleton h-8 w-64 rounded-xl" />

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({
            length: 8,
          }).map((_, i) => (
            <div
              key={i}
              className="skeleton h-32 rounded-2xl"
            />
          ))}
        </div>

        <div className="mt-6 skeleton h-80 rounded-2xl" />
      </div>
    );
  }

  return (
    <div>
      {/* HEADER */}
      <div className="anim-up flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
            Statistik Administrasi
          </h1>

          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
            Rekap pendaftaran,
            peserta magang, divisi,
            instansi, serta alasan
            penonaktifan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <select
              value={rangeBulan}
              onChange={(e) =>
                setRangeBulan(
                  Number(
                    e.target.value
                  )
                )
              }
              className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-9 text-xs font-bold text-slate-600 shadow-sm outline-none focus:border-indigo-500"
            >
              <option value={6}>
                6 bulan
              </option>

              <option value={12}>
                12 bulan
              </option>

              <option value={24}>
                24 bulan
              </option>

              <option value={36}>
                36 bulan
              </option>
            </select>

            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          <button
            type="button"
            onClick={muat}
            disabled={loading}
            className="btn-press flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={
                loading
                  ? 'animate-spin'
                  : ''
              }
            />

            Refresh
          </button>
        </div>
      </div>

      {generatedAt && (
        <p className="mt-2 text-[10px] font-medium text-slate-400">
          Data diperbarui:{' '}
          {tanggalWaktu(
            generatedAt
          )}
        </p>
      )}

      {/* ERROR */}
      {error && (
        <div className="anim-down mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle
            size={20}
            className="mt-0.5 shrink-0 text-red-600"
          />

          <div>
            <p className="text-sm font-bold text-red-700">
              Statistik gagal
              dimuat
            </p>

            <p className="mt-1 text-xs text-red-600">
              {error}
            </p>
          </div>
        </div>
      )}

      {!error && data && (
        <>
          {/* RINGKASAN PENDAFTARAN */}
          <section className="mt-7">
            <div className="flex items-center gap-2">
              <BarChart3
                size={18}
                className="text-indigo-600"
              />

              <h2 className="text-base font-bold text-slate-800">
                Ringkasan
                Pendaftaran
              </h2>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KartuRingkasan
                label="Total Pendaftar"
                value={angka(
                  ringkasan.pendaftaran_total
                )}
                detail={`${angka(
                  ringkasan.pendaftaran_tahun_ini
                )} pendaftar tahun ini`}
                Icon={Users}
                tone="indigo"
              />

              <KartuRingkasan
                label="Pending"
                value={angka(
                  ringkasan.pendaftaran_pending
                )}
                detail="Menunggu keputusan admin"
                Icon={Clock3}
                tone="amber"
              />

              <KartuRingkasan
                label="Diterima"
                value={angka(
                  ringkasan.pendaftaran_diterima
                )}
                detail={`${persen(
                  tingkatDiterima
                )} dari seluruh pendaftar`}
                Icon={CheckCircle2}
                tone="green"
              />

              <KartuRingkasan
                label="Ditolak"
                value={angka(
                  ringkasan.pendaftaran_ditolak
                )}
                detail="Pengajuan tidak diterima"
                Icon={CircleX}
                tone="red"
              />
            </div>
          </section>

          {/* RINGKASAN PESERTA */}
          <section className="mt-7">
            <div className="flex items-center gap-2">
              <Activity
                size={18}
                className="text-indigo-600"
              />

              <h2 className="text-base font-bold text-slate-800">
                Peserta Magang
              </h2>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KartuRingkasan
                label="Total Peserta"
                value={angka(
                  ringkasan.peserta_total
                )}
                detail="Seluruh peserta yang pernah dibuat"
                Icon={Users}
                tone="indigo"
              />

              <KartuRingkasan
                label="Aktif"
                value={angka(
                  ringkasan.peserta_aktif
                )}
                detail="Sedang menjalani magang"
                Icon={Activity}
                tone="green"
              />

              <KartuRingkasan
                label="Selesai"
                value={angka(
                  ringkasan.peserta_selesai
                )}
                detail={`Rata-rata nilai ${nilai(
                  ringkasan.rata_nilai_final
                )}`}
                Icon={CheckCircle2}
                tone="slate"
              />

              <KartuRingkasan
                label="Nonaktif"
                value={angka(
                  ringkasan.peserta_nonaktif
                )}
                detail={`${angka(
                  ringkasan.penonaktifan_total
                )} riwayat penonaktifan`}
                Icon={UserMinus}
                tone="red"
              />
            </div>
          </section>

          {/* PER DIVISI */}
          <section className="mt-8">
            <div>
              <h2 className="text-base font-bold text-slate-800">
                🧩 Statistik per
                Divisi
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Pendaftar dan peserta
                berdasarkan pilihan
                divisi.
              </p>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
              {divisi.map(
                (item, index) => {
                  const meta =
                    DIVISI_META[
                      item.divisi
                    ] ?? {
                      ikon: '📁',
                      label:
                        item.divisi,
                      deskripsi:
                        '',
                    };

                  return (
                    <div
                      key={
                        item.divisi
                      }
                      className="anim-up rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
                      style={{
                        animationDelay: `${index * 70}ms`,
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-xl">
                            {
                              meta.ikon
                            }
                          </span>

                          <div>
                            <p className="font-bold text-slate-800">
                              {
                                meta.label
                              }
                            </p>

                            <p className="text-[11px] text-slate-400">
                              {
                                meta.deskripsi
                              }
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                            Nilai
                            rata-rata
                          </p>

                          <p className="text-lg font-extrabold text-indigo-600">
                            {nilai(
                              item.rata_nilai
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className="rounded-xl bg-indigo-50 p-3">
                          <p className="text-[9px] font-bold uppercase text-indigo-400">
                            Pendaftar
                          </p>

                          <p className="mt-1 text-xl font-extrabold text-indigo-700">
                            {angka(
                              item.pendaftar
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl bg-green-50 p-3">
                          <p className="text-[9px] font-bold uppercase text-green-500">
                            Aktif
                          </p>

                          <p className="mt-1 text-xl font-extrabold text-green-700">
                            {angka(
                              item.aktif
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl bg-blue-50 p-3">
                          <p className="text-[9px] font-bold uppercase text-blue-400">
                            Selesai
                          </p>

                          <p className="mt-1 text-xl font-extrabold text-blue-700">
                            {angka(
                              item.selesai
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl bg-red-50 p-3">
                          <p className="text-[9px] font-bold uppercase text-red-400">
                            Nonaktif
                          </p>

                          <p className="mt-1 text-xl font-extrabold text-red-700">
                            {angka(
                              item.nonaktif
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-semibold">
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-600">
                          Pending{' '}
                          {angka(
                            item.pending
                          )}
                        </span>

                        <span className="rounded-full bg-green-50 px-2.5 py-1 text-green-600">
                          Diterima{' '}
                          {angka(
                            item.diterima
                          )}
                        </span>

                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-600">
                          Ditolak{' '}
                          {angka(
                            item.ditolak
                          )}
                        </span>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </section>

          {/* GRAFIK BULANAN */}
          <section className="mt-8 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-slate-800">
                  📈 Pendaftaran
                  Bulanan
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  {rangeBulan} bulan
                  terakhir berdasarkan
                  waktu pendaftaran.
                </p>
              </div>

              <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                <TrendingUp
                  size={13}
                />
                Maksimum{' '}
                {
                  maxPendaftarBulanan
                }{' '}
                pendaftar/bulan
              </div>
            </div>

            {bulanan.length ===
            0 ? (
              <p className="py-10 text-center text-sm text-slate-400">
                Belum ada data
                pendaftaran.
              </p>
            ) : (
              <div className="mt-6 overflow-x-auto pb-2">
                <div
                  className="flex min-w-max items-end gap-3"
                  style={{
                    minHeight:
                      '230px',
                  }}
                >
                  {bulanan.map(
                    (item) => {
                      const total =
                        angka(
                          item.total_pendaftar
                        );

                      const diterima =
                        angka(
                          item.diterima
                        );

                      const ditolak =
                        angka(
                          item.ditolak
                        );

                      const pending =
                        angka(
                          item.pending
                        );

                      const tinggi =
                        Math.max(
                          (
                            total /
                            maxPendaftarBulanan
                          ) *
                            150,
                          total > 0
                            ? 8
                            : 2
                        );

                      return (
                        <div
                          key={
                            item.bulan
                          }
                          className="flex w-16 shrink-0 flex-col items-center"
                        >
                          <p className="mb-1 text-xs font-extrabold text-slate-700">
                            {
                              total
                            }
                          </p>

                          <div className="flex h-40 w-full items-end justify-center">
                            <div
                              className="w-8 rounded-t-lg bg-indigo-500 transition-all"
                              style={{
                                height: `${tinggi}px`,
                              }}
                              title={`${namaBulanPanjang(
                                item.bulan
                              )}: ${total} pendaftar`}
                            />
                          </div>

                          <p className="mt-2 whitespace-nowrap text-[10px] font-bold text-slate-500">
                            {namaBulan(
                              item.bulan
                            )}
                          </p>

                          <p className="mt-1 text-center text-[9px] leading-relaxed text-slate-400">
                            <span className="text-green-600">
                              {
                                diterima
                              }{' '}
                              diterima
                            </span>
                            <br />

                            <span className="text-amber-600">
                              {
                                pending
                              }{' '}
                              pending
                            </span>
                            <br />

                            <span className="text-red-500">
                              {
                                ditolak
                              }{' '}
                              ditolak
                            </span>
                          </p>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            )}
          </section>

          {/* DETAIL BULANAN */}
          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-4 sm:p-5">
              <h2 className="font-bold text-slate-800">
                Rekap Bulanan
                Lengkap
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Jumlah pendaftar,
                peserta mulai, dan
                penonaktifan.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3">
                      Bulan
                    </th>

                    <th className="px-4 py-3 text-center">
                      Pendaftar
                    </th>

                    <th className="px-4 py-3 text-center">
                      Diterima
                    </th>

                    <th className="px-4 py-3 text-center">
                      Pending
                    </th>

                    <th className="px-4 py-3 text-center">
                      Ditolak
                    </th>

                    <th className="px-4 py-3 text-center">
                      Mulai Magang
                    </th>

                    <th className="px-4 py-3 text-center">
                      Nonaktif
                    </th>

                    <th className="px-4 py-3">
                      Divisi
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {[...bulanan]
                    .reverse()
                    .map(
                      (item) => (
                        <tr
                          key={
                            item.bulan
                          }
                          className="hover:bg-slate-50/60"
                        >
                          <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-700">
                            {namaBulanPanjang(
                              item.bulan
                            )}
                          </td>

                          <td className="px-4 py-3 text-center font-bold text-indigo-600">
                            {angka(
                              item.total_pendaftar
                            )}
                          </td>

                          <td className="px-4 py-3 text-center text-green-600">
                            {angka(
                              item.diterima
                            )}
                          </td>

                          <td className="px-4 py-3 text-center text-amber-600">
                            {angka(
                              item.pending
                            )}
                          </td>

                          <td className="px-4 py-3 text-center text-red-500">
                            {angka(
                              item.ditolak
                            )}
                          </td>

                          <td className="px-4 py-3 text-center font-semibold text-slate-600">
                            {angka(
                              item.peserta_mulai
                            )}
                          </td>

                          <td className="px-4 py-3 text-center text-red-500">
                            {angka(
                              item.penonaktifan
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1 text-[9px]">
                              <span className="rounded bg-slate-100 px-1.5 py-0.5">
                                A{' '}
                                {angka(
                                  item.div_admin
                                )}
                              </span>

                              <span className="rounded bg-slate-100 px-1.5 py-0.5">
                                S{' '}
                                {angka(
                                  item.div_sosmed
                                )}
                              </span>

                              <span className="rounded bg-slate-100 px-1.5 py-0.5">
                                M{' '}
                                {angka(
                                  item.div_marketplace
                                )}
                              </span>

                              <span className="rounded bg-slate-100 px-1.5 py-0.5">
                                W{' '}
                                {angka(
                                  item.div_webdev
                                )}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                </tbody>
              </table>
            </div>
          </section>

          {/* TAHUNAN + INSTANSI */}
          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            {/* TAHUNAN */}
            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-4 sm:p-5">
                <h2 className="font-bold text-slate-800">
                  🗓️ Rekap Tahunan
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Akumulasi
                  pendaftaran setiap
                  tahun.
                </p>
              </div>

              {tahunan.length ===
              0 ? (
                <p className="py-10 text-center text-sm text-slate-400">
                  Belum ada data.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {tahunan.map(
                    (item) => (
                      <div
                        key={
                          item.tahun
                        }
                        className="flex items-center justify-between gap-4 p-4"
                      >
                        <div>
                          <p className="text-lg font-extrabold text-slate-800">
                            {
                              item.tahun
                            }
                          </p>

                          <p className="text-[10px] text-slate-400">
                            Total{' '}
                            {angka(
                              item.total_pendaftar
                            )}{' '}
                            pendaftar
                          </p>
                        </div>

                        <div className="flex flex-wrap justify-end gap-1.5 text-[10px] font-bold">
                          <span className="rounded-full bg-green-50 px-2.5 py-1 text-green-600">
                            ✓{' '}
                            {angka(
                              item.diterima
                            )}
                          </span>

                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-600">
                            ⏳{' '}
                            {angka(
                              item.pending
                            )}
                          </span>

                          <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-600">
                            ✕{' '}
                            {angka(
                              item.ditolak
                            )}
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </section>

            {/* INSTANSI */}
            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-4 sm:p-5">
                <div className="flex items-center gap-2">
                  <Building2
                    size={18}
                    className="text-indigo-600"
                  />

                  <h2 className="font-bold text-slate-800">
                    Asal Instansi
                  </h2>
                </div>

                <p className="mt-1 text-xs text-slate-400">
                  Maksimal 50
                  instansi berdasarkan
                  jumlah pendaftar.
                </p>
              </div>

              {instansi.length ===
              0 ? (
                <p className="py-10 text-center text-sm text-slate-400">
                  Belum ada data
                  instansi.
                </p>
              ) : (
                <div className="max-h-[480px] divide-y divide-slate-100 overflow-y-auto">
                  {instansi.map(
                    (item, i) => {
                      const total =
                        angka(
                          item.total_pendaftar
                        );

                      const width =
                        Math.max(
                          (
                            total /
                            maxInstansi
                          ) *
                            100,
                          2
                        );

                      return (
                        <div
                          key={`${item.instansi}-${i}`}
                          className="p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-700">
                                {
                                  item.instansi
                                }
                              </p>

                              <p className="mt-0.5 text-[10px] text-slate-400">
                                {
                                  angka(
                                    item.peserta
                                  )
                                }{' '}
                                menjadi
                                peserta
                              </p>
                            </div>

                            <span className="shrink-0 text-sm font-extrabold text-indigo-600">
                              {
                                total
                              }
                            </span>
                          </div>

                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-indigo-500"
                              style={{
                                width: `${width}%`,
                              }}
                            />
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2 text-[9px] font-semibold">
                            <span className="text-green-600">
                              Diterima{' '}
                              {angka(
                                item.diterima
                              )}
                            </span>

                            <span className="text-amber-600">
                              Pending{' '}
                              {angka(
                                item.pending
                              )}
                            </span>

                            <span className="text-red-500">
                              Ditolak{' '}
                              {angka(
                                item.ditolak
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </section>
          </div>

          {/* PENONAKTIFAN */}
          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <UserMinus
                  size={18}
                  className="text-red-500"
                />

                <h2 className="font-bold text-slate-800">
                  Alasan
                  Penonaktifan
                </h2>
              </div>

              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Statistik berasal
                dari riwayat
                penonaktifan akun
                peserta.
              </p>
            </div>

            {penonaktifan.length ===
            0 ? (
              <div className="py-10 text-center">
                <p className="text-3xl">
                  ✨
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Belum ada riwayat
                  penonaktifan
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 p-4 sm:p-5 lg:grid-cols-2">
                {penonaktifan.map(
                  (item, index) => {
                    const jumlah =
                      angka(
                        item.jumlah
                      );

                    const width =
                      Math.max(
                        (
                          jumlah /
                          maxSuspensi
                        ) *
                          100,
                        3
                      );

                    return (
                      <div
                        key={`${item.alasan}-${index}`}
                        className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-bold leading-snug text-slate-700">
                            {
                              item.alasan
                            }
                          </p>

                          <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-1 text-xs font-extrabold text-red-600">
                            {
                              jumlah
                            }
                          </span>
                        </div>

                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                          <div
                            className="h-full rounded-full bg-red-400"
                            style={{
                              width: `${width}%`,
                            }}
                          />
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-400">
                          <span>
                            {persen(
                              item.persentase
                            )}{' '}
                            dari seluruh
                            penonaktifan
                          </span>

                          <span>
                            terakhir{' '}
                            {item.terakhir
                              ? new Intl.DateTimeFormat(
                                  'id-ID',
                                  {
                                    day: 'numeric',
                                    month:
                                      'short',
                                    year: 'numeric',
                                    timeZone:
                                      'Asia/Jakarta',
                                  }
                                ).format(
                                  new Date(
                                    item.terakhir
                                  )
                                )
                              : '—'}
                          </span>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </section>

          {/* CATATAN */}
          <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
            <p className="text-xs leading-relaxed text-amber-700">
              💡 Statistik saat
              ini juga menghitung
              data dummy yang ada di
              database. Sebelum
              sistem resmi
              diluncurkan, data dummy
              tersebut sebaiknya
              dibersihkan agar rekap
              produksi dimulai dari
              data peserta asli.
            </p>
          </div>
        </>
      )}
    </div>
  );
}