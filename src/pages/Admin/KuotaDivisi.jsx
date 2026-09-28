import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Save,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const HARD_LIMIT = 20;

const DIVISI = [
  {
    nama: 'Admin',
    ikon: '📋',
    deskripsi: 'Administrasi & Operasional',
  },
  {
    nama: 'Sosmed',
    ikon: '📱',
    deskripsi: 'Social Media & Content',
  },
  {
    nama: 'Marketplace',
    ikon: '🛒',
    deskripsi: 'E-commerce & Digital Marketing',
  },
  {
    nama: 'Web Developer',
    ikon: '💻',
    deskripsi: 'Website & Programming',
  },
];

function bulanWibSekarang() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());

  const tahun = parts.find((p) => p.type === 'year')?.value;
  const bulan = parts.find((p) => p.type === 'month')?.value;

  return `${tahun}-${bulan}`;
}

function namaBulan(label) {
  if (!label) return '';

  const [tahun, bulan] = label.split('-').map(Number);

  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(Date.UTC(tahun, bulan - 1, 1)));
}

function geserBulan(label, offset) {
  const [tahun, bulan] = label.split('-').map(Number);

  const d = new Date(Date.UTC(tahun, bulan - 1 + offset, 1));

  return `${d.getUTCFullYear()}-${String(
    d.getUTCMonth() + 1
  ).padStart(2, '0')}`;
}

export default function KuotaDivisi() {
  const [bulan, setBulan] = useState(bulanWibSekarang());

  const [data, setData] = useState(null);

  const [form, setForm] = useState({
    Admin: 5,
    Sosmed: 5,
    Marketplace: 5,
    'Web Developer': 5,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const muat = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const { data: hasil, error: rpcError } =
      await supabase.rpc('get_division_quota_admin', {
        p_bulan: bulan,
      });

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    if (hasil?.error) {
      setError(
        hasil.message ?? 'Gagal mengambil data kuota.'
      );
      setLoading(false);
      return;
    }

    setData(hasil);

    const next = {
      Admin: 5,
      Sosmed: 5,
      Marketplace: 5,
      'Web Developer': 5,
    };

    for (const d of hasil?.divisi ?? []) {
      next[d.nama] = Number(d.kuota ?? 0);
    }

    setForm(next);

    setLoading(false);
  }, [bulan]);

  useEffect(() => {
    muat();
  }, [muat]);

  const totalAlokasi = useMemo(
    () =>
      DIVISI.reduce(
        (total, item) =>
          total + Number(form[item.nama] ?? 0),
        0
      ),
    [form]
  );

  const belumDialokasikan = Math.max(
    HARD_LIMIT - totalAlokasi,
    0
  );

  const invalid = DIVISI.some((item) => {
    const value = Number(form[item.nama]);

    return (
      !Number.isInteger(value) ||
      value < 0
    );
  });

  const melebihiGlobal =
    totalAlokasi > HARD_LIMIT;

  const simpan = async () => {
    setError(null);
    setSuccess(null);

    if (invalid) {
      setError(
        'Semua kuota harus berupa angka bulat 0 atau lebih.'
      );
      return;
    }

    if (melebihiGlobal) {
      setError(
        `Total alokasi tidak boleh melebihi ${HARD_LIMIT} slot.`
      );
      return;
    }

    setSaving(true);

    const { data: hasil, error: rpcError } =
      await supabase.rpc('save_division_quotas', {
        p_bulan: bulan,
        p_quotas: {
          Admin: Number(form.Admin),
          Sosmed: Number(form.Sosmed),
          Marketplace: Number(form.Marketplace),
          'Web Developer':
            Number(form['Web Developer']),
        },
      });

    if (rpcError) {
      setError(rpcError.message);
      setSaving(false);
      return;
    }

    if (hasil?.error) {
      setError(
        hasil.message ??
          'Pengaturan kuota gagal disimpan.'
      );
      setSaving(false);
      return;
    }

    setSuccess(
      `Kuota ${namaBulan(
        bulan
      )} berhasil disimpan.`
    );

    setData(hasil);

    const next = {
      Admin: 5,
      Sosmed: 5,
      Marketplace: 5,
      'Web Developer': 5,
    };

    for (const d of hasil?.divisi ?? []) {
      next[d.nama] = Number(d.kuota ?? 0);
    }

    setForm(next);

    setSaving(false);
  };

  const dataMap = useMemo(
    () =>
      new Map(
        (data?.divisi ?? []).map((item) => [
          item.nama,
          item,
        ])
      ),
    [data]
  );

  return (
    <div>
      {/* HEADER */}
      <div className="anim-up">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
          Kuota Divisi
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Atur pembagian maksimal 20 peserta magang
          untuk setiap bulan.
        </p>
      </div>

      {/* INFO */}
      <div className="anim-up mt-5 flex gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
        <ShieldCheck
          size={22}
          className="mt-0.5 shrink-0 text-indigo-600"
        />

        <div>
          <p className="text-sm font-bold text-indigo-800">
            Hard limit global: {HARD_LIMIT} peserta
          </p>

          <p className="mt-1 text-xs leading-relaxed text-indigo-600">
            Total alokasi seluruh divisi tidak dapat
            melebihi {HARD_LIMIT}. Slot yang belum
            dialokasikan tidak dapat digunakan sampai
            admin membagikannya ke salah satu divisi.
          </p>
        </div>
      </div>

      {/* BULAN */}
      <div className="anim-up mt-6 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays
              size={19}
              className="text-indigo-600"
            />

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Periode Kuota
              </p>

              <p className="font-bold text-slate-800">
                {namaBulan(bulan)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setBulan((b) => geserBulan(b, -1))
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft size={18} />
            </button>

            <input
              type="month"
              value={bulan}
              onChange={(e) =>
                e.target.value &&
                setBulan(e.target.value)
              }
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500"
            />

            <button
              type="button"
              onClick={() =>
                setBulan((b) => geserBulan(b, 1))
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
              aria-label="Bulan berikutnya"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ERROR / SUCCESS */}
      {error && (
        <div className="anim-down mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          <AlertTriangle
            size={18}
            className="mt-0.5 shrink-0"
          />

          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="anim-down mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-700">
          ✅ {success}
        </div>
      )}

      {/* SUMMARY */}
      {loading ? (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="skeleton h-28 rounded-2xl"
            />
          ))}
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="anim-up rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Peserta Menempati Bulan Ini
            </p>

            <div className="mt-2 flex items-center gap-2">
              <Users
                size={23}
                className="text-indigo-500"
              />

              <p
                className={`text-3xl font-extrabold ${
                  Number(data?.total_terisi ?? 0) >
                  HARD_LIMIT
                    ? 'text-red-600'
                    : 'text-slate-800'
                }`}
              >
                {data?.total_terisi ?? 0}

                <span className="text-base font-normal text-slate-400">
                  /{HARD_LIMIT}
                </span>
              </p>
            </div>
          </div>

          <div className="anim-up rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Slot Dialokasikan
            </p>

            <p
              className={`mt-2 text-3xl font-extrabold ${
                melebihiGlobal
                  ? 'text-red-600'
                  : 'text-indigo-600'
              }`}
            >
              {totalAlokasi}

              <span className="text-base font-normal text-slate-400">
                /{HARD_LIMIT}
              </span>
            </p>
          </div>

          <div className="anim-up rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Belum Dialokasikan
            </p>

            <p className="mt-2 text-3xl font-extrabold text-amber-500">
              {belumDialokasikan}
            </p>
          </div>
        </div>
      )}

      {/* LEGACY OVER CAPACITY */}
      {!loading && data?.over_global && (
        <div className="anim-down mt-4 flex gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <AlertTriangle
            size={20}
            className="mt-0.5 shrink-0 text-orange-600"
          />

          <div>
            <p className="text-sm font-bold text-orange-700">
              Data existing melebihi hard limit
            </p>

            <p className="mt-1 text-xs leading-relaxed text-orange-600">
              Bulan ini sudah ditempati{' '}
              <b>{data.total_terisi}</b> peserta.
              Sistem tidak menghapus data lama, tetapi
              approval peserta baru akan tetap diblokir
              selama total masih memenuhi atau
              melampaui batas.
            </p>
          </div>
        </div>
      )}

      {/* DIVISI */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {DIVISI.map((item, index) => {
          const d = dataMap.get(item.nama);

          const terisi = Number(d?.terisi ?? 0);
          const kuota = Number(
            form[item.nama] ?? 0
          );

          const over = terisi > kuota;

          const persen =
            kuota > 0
              ? Math.min(
                  (terisi / kuota) * 100,
                  100
                )
              : terisi > 0
                ? 100
                : 0;

          return (
            <div
              key={item.nama}
              className="anim-up rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
              style={{
                animationDelay: `${index * 70}ms`,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl">
                    {item.ikon}
                  </span>

                  <div className="min-w-0">
                    <p className="font-bold text-slate-800">
                      {item.nama}
                    </p>

                    <p className="truncate text-xs text-slate-400">
                      {item.deskripsi}
                    </p>
                  </div>
                </div>

                {over && (
                  <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-bold text-red-600">
                    OVER
                  </span>
                )}
              </div>

              <div className="mt-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Terisi
                  </p>

                  <p
                    className={`text-2xl font-extrabold ${
                      over
                        ? 'text-red-600'
                        : 'text-slate-800'
                    }`}
                  >
                    {terisi}

                    <span className="text-sm font-normal text-slate-400">
                      /{kuota}
                    </span>
                  </p>
                </div>

                <div className="w-28">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Kuota
                  </label>

                  <input
                    type="number"
                    min="0"
                    max={HARD_LIMIT}
                    step="1"
                    value={form[item.nama]}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        [item.nama]:
                          e.target.value === ''
                            ? ''
                            : Number(
                                e.target.value
                              ),
                      }))
                    }
                    className={`mt-1 w-full rounded-xl border px-3 py-2 text-center text-lg font-bold outline-none ${
                      over
                        ? 'border-red-300 bg-red-50 text-red-600 focus:border-red-500'
                        : 'border-slate-200 text-slate-700 focus:border-indigo-500'
                    }`}
                  />
                </div>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all ${
                    over
                      ? 'bg-red-500'
                      : persen >= 100
                        ? 'bg-orange-500'
                        : 'bg-indigo-500'
                  }`}
                  style={{
                    width: `${persen}%`,
                  }}
                />
              </div>

              <p className="mt-2 text-xs text-slate-400">
                {over
                  ? `Kuota tidak boleh di bawah ${terisi} peserta existing.`
                  : kuota === 0
                    ? 'Pendaftaran untuk divisi ini ditutup pada bulan tersebut.'
                    : `Sisa ${Math.max(
                        kuota - terisi,
                        0
                      )} slot.`}
              </p>
            </div>
          );
        })}
      </div>

      {/* TOTAL */}
      <div
        className={`mt-6 rounded-2xl border p-5 ${
          melebihiGlobal
            ? 'border-red-200 bg-red-50'
            : totalAlokasi === HARD_LIMIT
              ? 'border-green-200 bg-green-50'
              : 'border-amber-200 bg-amber-50'
        }`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-800">
              Total alokasi: {totalAlokasi}/
              {HARD_LIMIT}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {melebihiGlobal
                ? `Kurangi ${
                    totalAlokasi - HARD_LIMIT
                  } slot sebelum menyimpan.`
                : belumDialokasikan > 0
                  ? `${belumDialokasikan} slot masih belum dialokasikan.`
                  : 'Seluruh slot bulan ini sudah dialokasikan.'}
            </p>
          </div>

          <button
            type="button"
            onClick={simpan}
            disabled={
              loading ||
              saving ||
              invalid ||
              melebihiGlobal
            }
            className="btn-press flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save size={17} />

            {saving
              ? 'Menyimpan...'
              : 'Simpan Kuota'}
          </button>
        </div>
      </div>
    </div>
  );
}