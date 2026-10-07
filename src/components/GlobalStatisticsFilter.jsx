import {
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';


const MONTHS = [
  {
    value:
      '01',

    label:
      'Januari',
  },

  {
    value:
      '02',

    label:
      'Februari',
  },

  {
    value:
      '03',

    label:
      'Maret',
  },

  {
    value:
      '04',

    label:
      'April',
  },

  {
    value:
      '05',

    label:
      'Mei',
  },

  {
    value:
      '06',

    label:
      'Juni',
  },

  {
    value:
      '07',

    label:
      'Juli',
  },

  {
    value:
      '08',

    label:
      'Agustus',
  },

  {
    value:
      '09',

    label:
      'September',
  },

  {
    value:
      '10',

    label:
      'Oktober',
  },

  {
    value:
      '11',

    label:
      'November',
  },

  {
    value:
      '12',

    label:
      'Desember',
  },
];


const DIVISIONS = [
  'Admin',
  'Sosmed',
  'Marketplace',
  'Web Developer',
];


function FilterSelect({
  label,
  value,
  onChange,
  children,
  disabled =
    false,
  helper =
    null,
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-wider text-slate-400">
        {
          label
        }
      </span>

      <select
        value={
          value
        }
        onChange={(
          e
        ) =>
          onChange(
            e.target.value
          )
        }
        disabled={
          disabled
        }
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      >
        {
          children
        }
      </select>

      {helper && (
        <p className="mt-1 text-[8px] font-medium leading-relaxed text-slate-400">
          {
            helper
          }
        </p>
      )}
    </label>
  );
}


export default function GlobalStatisticsFilter({
  filters,

  updateFilter,

  resetFilters,

  activeFilterCount =
    0,

  years =
    [],

  jurusanOptions =
    [],

  loading =
    false,
}) {
  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <SlidersHorizontal
              size={
                18
              }
            />
          </span>


          <div>
            <h2 className="text-sm font-extrabold text-slate-800">
              Filter Statistik
            </h2>

            <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">
              Filter ini berlaku
              untuk statistik di
              halaman ini.
            </p>
          </div>
        </div>


        <div className="flex items-center gap-2">
          {activeFilterCount >
            0 && (
            <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-[9px] font-bold text-indigo-600">
              {
                activeFilterCount
              }{' '}
              filter aktif
            </span>
          )}


          <button
            type="button"
            onClick={
              resetFilters
            }
            disabled={
              activeFilterCount ===
                0 ||
              loading
            }
            className="btn-press inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-bold text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw
              size={
                12
              }
            />

            Reset
          </button>
        </div>
      </div>


      {/* =================================================
          FILTERS
      ================================================= */}

      <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">

        {/* RANGE */}

        <FilterSelect
          label="Rentang Grafik"
          value={
            String(
              filters.rangeBulan
            )
          }
          disabled={
            filters.tahun !==
              'Semua' ||
            loading
          }
          helper={
            filters.tahun !==
            'Semua'
              ? 'Tidak digunakan saat tahun tertentu dipilih.'
              : 'Menentukan rentang grafik dan rekap bulanan.'
          }
          onChange={(
            value
          ) =>
            updateFilter(
              'rangeBulan',
              Number(
                value
              )
            )
          }
        >
          <option value="6">
            6 Bulan
          </option>

          <option value="12">
            12 Bulan
          </option>

          <option value="24">
            24 Bulan
          </option>

          <option value="36">
            36 Bulan
          </option>
        </FilterSelect>


        {/* YEAR */}

        <FilterSelect
          label="Tahun"
          value={
            filters.tahun
          }
          disabled={
            loading
          }
          onChange={(
            value
          ) =>
            updateFilter(
              'tahun',
              value
            )
          }
        >
          <option value="Semua">
            Semua Tahun
          </option>

          {years.map(
            (
              year
            ) => (
              <option
                key={
                  year
                }
                value={
                  String(
                    year
                  )
                }
              >
                {
                  year
                }
              </option>
            )
          )}
        </FilterSelect>


        {/* MONTH */}

        <FilterSelect
          label="Bulan"
          value={
            filters.bulan
          }
          disabled={
            loading
          }
          helper={
            filters.tahun ===
            'Semua'
              ? 'Tanpa Tahun, bulan berlaku pada seluruh tahun.'
              : null
          }
          onChange={(
            value
          ) =>
            updateFilter(
              'bulan',
              value
            )
          }
        >
          <option value="Semua">
            Semua Bulan
          </option>

          {MONTHS.map(
            (
              month
            ) => (
              <option
                key={
                  month.value
                }
                value={
                  month.value
                }
              >
                {
                  month.label
                }
              </option>
            )
          )}
        </FilterSelect>


        {/* DIVISION */}

        <FilterSelect
          label="Divisi"
          value={
            filters.divisi
          }
          disabled={
            loading
          }
          onChange={(
            value
          ) =>
            updateFilter(
              'divisi',
              value
            )
          }
        >
          <option value="Semua">
            Semua Divisi
          </option>

          {DIVISIONS.map(
            (
              division
            ) => (
              <option
                key={
                  division
                }
                value={
                  division
                }
              >
                {
                  division
                }
              </option>
            )
          )}
        </FilterSelect>


        {/* JURUSAN */}

        <FilterSelect
          label="Jurusan / Program Studi"
          value={
            filters.jurusan
          }
          disabled={
            loading
          }
          onChange={(
            value
          ) =>
            updateFilter(
              'jurusan',
              value
            )
          }
        >
          <option value="Semua">
            Semua Jurusan
          </option>

          {jurusanOptions.map(
            (
              jurusan
            ) => (
              <option
                key={
                  jurusan
                }
                value={
                  jurusan
                }
              >
                {
                  jurusan
                }
              </option>
            )
          )}
        </FilterSelect>


        {/* APPLICATION STATUS */}

        <FilterSelect
          label="Status Pendaftaran"
          value={
            filters.status
          }
          disabled={
            loading
          }
          onChange={(
            value
          ) =>
            updateFilter(
              'status',
              value
            )
          }
        >
          <option value="Semua">
            Semua Status
          </option>

          <option value="Approved">
            Diterima
          </option>

          <option value="Pending">
            Pending
          </option>

          <option value="Rejected">
            Ditolak
          </option>
        </FilterSelect>


        {/* INTERNSHIP STATUS */}

        <FilterSelect
          label="Status Magang"
          value={
            filters.statusMagang
          }
          disabled={
            loading
          }
          onChange={(
            value
          ) =>
            updateFilter(
              'statusMagang',
              value
            )
          }
        >
          <option value="Semua">
            Semua Status
          </option>

          <option value="Active">
            Aktif
          </option>

          <option value="Completed">
            Selesai
          </option>

          <option value="Dropped">
            Nonaktif
          </option>
        </FilterSelect>


        {/* INFORMATION */}

        <div className="flex min-h-11 items-center rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
          <p className="text-[9px] font-medium leading-relaxed text-indigo-700">
            💡 Angka statistik
            dihitung ulang dari
            database berdasarkan
            kombinasi filter ini.
          </p>
        </div>
      </div>
    </section>
  );
}