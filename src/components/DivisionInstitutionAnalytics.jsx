import {
  useMemo,
  useState,
} from 'react';

import {
  Building2,
  ChevronDown,
  ChevronRight,
  Search,
  Users,
} from 'lucide-react';


const DIVISION_META = {
  Admin: {
    icon: '📋',
    description: 'Administrasi & Operasional',
  },
  Sosmed: {
    icon: '📱',
    description: 'Social Media & Content',
  },
  Marketplace: {
    icon: '🛒',
    description: 'E-commerce & Digital Marketing',
  },
  'Web Developer': {
    icon: '💻',
    description: 'Website & Programming',
  },
};


function angka(value) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}


function nilai(value) {
  if (value === null || value === undefined) {
    return '—';
  }

  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : '—';
}


function MetricButton({
  label,
  value,
  tone = 'slate',
  onClick,
}) {
  const tones = {
    indigo: 'border-indigo-100 bg-indigo-50 text-indigo-700 hover:border-indigo-200 hover:bg-indigo-100/70',
    amber: 'border-amber-100 bg-amber-50 text-amber-700 hover:border-amber-200 hover:bg-amber-100/70',
    green: 'border-green-100 bg-green-50 text-green-700 hover:border-green-200 hover:bg-green-100/70',
    blue: 'border-blue-100 bg-blue-50 text-blue-700 hover:border-blue-200 hover:bg-blue-100/70',
    red: 'border-red-100 bg-red-50 text-red-600 hover:border-red-200 hover:bg-red-100/70',
    slate: 'border-slate-100 bg-slate-50 text-slate-700 hover:border-slate-200 hover:bg-slate-100',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-xl border p-3 text-left transition active:scale-[0.98] ${tones[tone] ?? tones.slate}`}
    >
      <p className="text-[9px] font-bold uppercase tracking-wide opacity-70">
        {label}
      </p>

      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="text-xl font-extrabold">
          {angka(value)}
        </p>

        <ChevronRight
          size={13}
          className="mb-1 opacity-40 transition-transform group-hover:translate-x-0.5 group-hover:opacity-80"
        />
      </div>
    </button>
  );
}


function DivisionCard({
  item,
  index,
  onOpenDivision,
  onOpenDivisionMetric,
}) {
  const meta = DIVISION_META[item.divisi] ?? {
    icon: '📁',
    description: '',
  };

  return (
    <article
      className="anim-up overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      style={{
        animationDelay: `${index * 70}ms`,
      }}
    >
      <button
        type="button"
        onClick={() => onOpenDivision?.(item)}
        className="group flex w-full items-start justify-between gap-3 p-5 text-left transition hover:bg-indigo-50/30"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl">
            {meta.icon}
          </span>

          <div className="min-w-0">
            <p className="truncate font-bold text-slate-800 transition group-hover:text-indigo-700">
              {item.divisi}
            </p>

            <p className="mt-0.5 truncate text-[11px] text-slate-400">
              {meta.description}
            </p>

            <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-indigo-500">
              Lihat peserta divisi
              <ChevronRight
                size={12}
                className="transition-transform group-hover:translate-x-1"
              />
            </p>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
            Nilai rata-rata
          </p>

          <p className="text-lg font-extrabold text-indigo-600">
            {nilai(item.rata_nilai)}
          </p>
        </div>
      </button>

      <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-4 sm:grid-cols-3">
        <MetricButton
          label="Pendaftar"
          value={item.pendaftar}
          tone="indigo"
          onClick={() => onOpenDivisionMetric?.(item, 'pendaftar')}
        />

        <MetricButton
          label="Pending"
          value={item.pending}
          tone="amber"
          onClick={() => onOpenDivisionMetric?.(item, 'pending')}
        />

        <MetricButton
          label="Diterima"
          value={item.diterima}
          tone="green"
          onClick={() => onOpenDivisionMetric?.(item, 'diterima')}
        />

        <MetricButton
          label="Aktif"
          value={item.aktif}
          tone="green"
          onClick={() => onOpenDivisionMetric?.(item, 'aktif')}
        />

        <MetricButton
          label="Selesai"
          value={item.selesai}
          tone="blue"
          onClick={() => onOpenDivisionMetric?.(item, 'selesai')}
        />

        <MetricButton
          label="Nonaktif"
          value={item.nonaktif}
          tone="red"
          onClick={() => onOpenDivisionMetric?.(item, 'nonaktif')}
        />
      </div>
    </article>
  );
}


export default function DivisionInstitutionAnalytics({
  divisions = [],
  institutions = [],
  onOpenDivision,
  onOpenDivisionMetric,
  onOpenInstitution,
  onOpenInstitutionMetric,
}) {
  const [institutionSearch, setInstitutionSearch] = useState('');
  const [institutionSort, setInstitutionSort] = useState('total_pendaftar');

  const maxInstitution = useMemo(
    () => Math.max(
      ...institutions.map((item) => angka(item.total_pendaftar)),
      1
    ),
    [institutions]
  );

  const institutionRows = useMemo(() => {
    const keyword = institutionSearch.trim().toLowerCase();

    return [...institutions]
      .filter((item) => {
        if (!keyword) {
          return true;
        }

        return String(item.instansi ?? '')
          .toLowerCase()
          .includes(keyword);
      })
      .sort((a, b) => {
        const av = institutionSort === 'instansi'
          ? String(a.instansi ?? '')
          : angka(a[institutionSort]);

        const bv = institutionSort === 'instansi'
          ? String(b.instansi ?? '')
          : angka(b[institutionSort]);

        if (institutionSort === 'instansi') {
          return av.localeCompare(bv, 'id-ID');
        }

        return bv - av;
      });
  }, [institutions, institutionSearch, institutionSort]);

  return (
    <div className="mt-8 space-y-6">
      {/* =================================================
          DIVISION ANALYTICS
      ================================================= */}

      <section>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              🧩 Statistik per Divisi
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Klik divisi atau metrik untuk membuka data pendaftar dan peserta yang membentuk angka tersebut.
            </p>
          </div>

          <p className="text-[10px] font-semibold text-indigo-500">
            Semua kartu dapat diklik
          </p>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          {divisions.map((item, index) => (
            <DivisionCard
              key={item.divisi}
              item={item}
              index={index}
              onOpenDivision={onOpenDivision}
              onOpenDivisionMetric={onOpenDivisionMetric}
            />
          ))}
        </div>
      </section>


      {/* =================================================
          INSTITUTION ANALYTICS
      ================================================= */}

      <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
                  <Building2
                    size={18}
                    className="text-indigo-600"
                  />
                </span>

                <div>
                  <h2 className="font-extrabold text-slate-800">
                    Asal Instansi
                  </h2>

                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Cari instansi, urutkan metrik, lalu klik baris atau status untuk melihat pendaftarnya.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 sm:w-64">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={institutionSearch}
                  onChange={(event) => setInstitutionSearch(event.target.value)}
                  placeholder="Cari sekolah / kampus..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs font-medium text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="relative">
                <select
                  value={institutionSort}
                  onChange={(event) => setInstitutionSort(event.target.value)}
                  className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-9 text-xs font-bold text-slate-600 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="total_pendaftar">Terbanyak Pendaftar</option>
                  <option value="peserta">Terbanyak Peserta</option>
                  <option value="diterima">Terbanyak Diterima</option>
                  <option value="pending">Terbanyak Pending</option>
                  <option value="ditolak">Terbanyak Ditolak</option>
                  <option value="instansi">Nama A–Z</option>
                </select>

                <ChevronDown
                  size={13}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] font-medium text-slate-400">
            <span>
              Menampilkan <b className="text-slate-600">{institutionRows.length}</b> dari{' '}
              <b className="text-slate-600">{institutions.length}</b> instansi
            </span>

            <span className="flex items-center gap-1 text-indigo-500">
              <Users size={11} />
              Klik angka status untuk drill-down
            </span>
          </div>
        </div>

        {institutionRows.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-3xl">🔎</p>
            <p className="mt-2 text-sm font-bold text-slate-600">
              Instansi Tidak Ditemukan
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Coba kata pencarian lain.
            </p>
          </div>
        ) : (
          <div className="max-h-[560px] divide-y divide-slate-100 overflow-y-auto">
            {institutionRows.map((item, index) => {
              const total = angka(item.total_pendaftar);
              const width = Math.max((total / maxInstitution) * 100, total > 0 ? 3 : 0);

              return (
                <div
                  key={`${item.instansi}-${index}`}
                  className="group p-4 transition hover:bg-indigo-50/20 sm:p-5"
                >
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <button
                      type="button"
                      onClick={() => onOpenInstitution?.(item)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg transition group-hover:bg-indigo-100">
                          🏫
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-bold text-slate-700 transition group-hover:text-indigo-700">
                              {item.instansi}
                            </p>

                            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-extrabold text-indigo-600">
                              {total} pendaftar
                            </span>
                          </div>

                          <p className="mt-0.5 text-[10px] text-slate-400">
                            {angka(item.peserta)} menjadi peserta · klik nama untuk seluruh pendaftar
                          </p>

                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                              style={{
                                width: `${width}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </button>

                    <div className="grid shrink-0 grid-cols-2 gap-1.5 sm:grid-cols-4">
                      <button
                        type="button"
                        onClick={() => onOpenInstitutionMetric?.(item, 'peserta')}
                        className="rounded-lg bg-blue-50 px-2.5 py-2 text-center transition hover:bg-blue-100 active:scale-95"
                      >
                        <p className="text-[8px] font-bold uppercase text-blue-400">Peserta</p>
                        <p className="mt-0.5 text-sm font-extrabold text-blue-700">{angka(item.peserta)}</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenInstitutionMetric?.(item, 'diterima')}
                        className="rounded-lg bg-green-50 px-2.5 py-2 text-center transition hover:bg-green-100 active:scale-95"
                      >
                        <p className="text-[8px] font-bold uppercase text-green-400">Diterima</p>
                        <p className="mt-0.5 text-sm font-extrabold text-green-700">{angka(item.diterima)}</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenInstitutionMetric?.(item, 'pending')}
                        className="rounded-lg bg-amber-50 px-2.5 py-2 text-center transition hover:bg-amber-100 active:scale-95"
                      >
                        <p className="text-[8px] font-bold uppercase text-amber-400">Pending</p>
                        <p className="mt-0.5 text-sm font-extrabold text-amber-700">{angka(item.pending)}</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenInstitutionMetric?.(item, 'ditolak')}
                        className="rounded-lg bg-red-50 px-2.5 py-2 text-center transition hover:bg-red-100 active:scale-95"
                      >
                        <p className="text-[8px] font-bold uppercase text-red-400">Ditolak</p>
                        <p className="mt-0.5 text-sm font-extrabold text-red-600">{angka(item.ditolak)}</p>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
