import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useIntern } from '../../hooks/useIntern';
import { fmtTanggal } from '../../lib/format';
import Modal from '../../components/Modal';
import { CountUp } from '../../components/Skeleton';


// =========================================================
// TIME POLICY
// =========================================================

const CHECKIN_BUKA = 6 * 60;       // 06:00
const TEPAT_WAKTU_SAMPAI = 8 * 60 + 5; // 08:05
const CHECKIN_TUTUP = 12 * 60;     // 12:00

const CHECKOUT_BUKA = 17 * 60;     // 17:00
const CHECKOUT_TUTUP = 18 * 60;    // 18:00;


// =========================================================
// WIB HELPERS
// =========================================================

const tanggalWib = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());


const HARI_INI = tanggalWib();


function waktuSekarangWib() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const get = (type) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  return {
    jam: get('hour'),
    menit: get('minute'),
    detik: get('second'),
  };
}


function menitSekarangWib() {
  const { jam, menit } = waktuSekarangWib();
  return jam * 60 + menit;
}


const jamWib = (iso) => {
  if (!iso) return '—';

  return new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  });
};


const durasi = (a, b) => {
  if (!a || !b) return null;

  const m = Math.floor(
    (new Date(b) - new Date(a)) / 60000
  );

  return `${Math.floor(m / 60)}j ${m % 60}m`;
};


// =========================================================
// UI CONFIG
// =========================================================

const BADGE = {
  Hadir: 'bg-emerald-500',
  Izin: 'bg-blue-500',
  Sakit: 'bg-amber-400',
  Alpha: 'bg-red-500',
};


const KOTAK = [
  {
    key: 'Hadir',
    ikon: '✅',
    warna:
      'bg-green-50 hover:bg-green-100 border-green-200',
  },
  {
    key: 'Izin',
    ikon: '📝',
    warna:
      'bg-blue-50 hover:bg-blue-100 border-blue-200',
  },
  {
    key: 'Sakit',
    ikon: '🤒',
    warna:
      'bg-amber-50 hover:bg-amber-100 border-amber-200',
  },
  {
    key: 'Alpha',
    ikon: '❌',
    warna:
      'bg-red-50 hover:bg-red-100 border-red-200',
  },
];


// =========================================================
// GPS
// =========================================================

function jarakMeter(lat1, lng1, lat2, lng2) {
  const R = 6371000;

  const dLat =
    ((lat2 - lat1) * Math.PI) / 180;

  const dLng =
    ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return (
    R *
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    )
  );
}


function ambilLokasi() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(
        new Error(
          'Browser kamu tidak mendukung GPS.'
        )
      );

      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),

      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? '📍 Izinkan akses lokasi di browser untuk melakukan presensi.'
              : 'Gagal mengambil lokasi GPS — coba lagi.'
          )
        ),

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      }
    );
  });
}


// =========================================================
// COMPONENT
// =========================================================

export default function Presensi() {
  const { intern, loading } = useIntern();

  const [hariIni, setHariIni] =
    useState(null);

  const [stats, setStats] =
    useState(null);

  const [riwayat, setRiwayat] =
    useState([]);

  const [izinList, setIzinList] =
    useState([]);

  const [kantor, setKantor] =
    useState(null);

  const [pulangAwal, setPulangAwal] =
    useState(null);

  const [modalAwal, setModalAwal] =
    useState(false);

  const [alasanAwal, setAlasanAwal] =
    useState('');

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState(null);

  const [info, setInfo] =
    useState(null);

  const [bukaKotak, setBukaKotak] =
    useState(null);

  // Supaya status tombol mengikuti jam tanpa refresh manual.
  const [, setClockTick] = useState(0);


  // =====================================================
  // CLOCK REFRESH
  // =====================================================

  useEffect(() => {
    const timer = setInterval(() => {
      setClockTick((x) => x + 1);
    }, 30000);

    return () => clearInterval(timer);
  }, []);


  // =====================================================
  // LOAD KANTOR
  // =====================================================

  useEffect(() => {
    supabase
      .from('kantor')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        setKantor(data ?? null);
      });
  }, []);


  // =====================================================
  // LOAD DATA INTERN
  // =====================================================

  useEffect(() => {
    if (intern) {
      muat();
    }
  }, [intern]);


  async function muat() {
    if (!intern) return;

    const [
      attendanceHariIni,
      statistik,
      history,
      early,
      leaves,
    ] = await Promise.all([
      supabase
        .from('attendance')
        .select('*')
        .eq('intern_id', intern.id)
        .eq(
          'tanggal_presensi',
          tanggalWib()
        )
        .maybeSingle(),

      supabase.rpc(
        'get_attendance_stats',
        {
          p_intern_id: intern.id,
        }
      ),

      supabase
        .from('attendance')
        .select('*')
        .eq('intern_id', intern.id)
        .order(
          'tanggal_presensi',
          { ascending: false }
        )
        .limit(180),

      supabase
        .from('early_checkouts')
        .select('*')
        .eq('intern_id', intern.id)
        .eq(
          'tanggal',
          tanggalWib()
        )
        .maybeSingle(),

      supabase
        .from('leave_requests')
        .select(
          'jenis_izin, tanggal_mulai, tanggal_selesai, alasan, status_izin'
        )
        .eq(
          'intern_id',
          intern.id
        )
        .eq(
          'status_izin',
          'Approved'
        ),
    ]);


    setHariIni(
      attendanceHariIni.data ?? null
    );

    setStats(
      statistik.data ?? null
    );

    setRiwayat(
      history.data ?? []
    );

    setPulangAwal(
      early.data ?? null
    );

    setIzinList(
      leaves.data ?? []
    );
  }


  // =====================================================
  // LEAVE HELPERS
  // =====================================================

  const izinTelatAktif = (tanggal) =>
    izinList.some(
      (l) =>
        l.jenis_izin ===
          'Terlambat' &&
        tanggal >= l.tanggal_mulai &&
        tanggal <= l.tanggal_selesai
    );


  const izinWFHAktif = (tanggal) =>
    izinList.some(
      (l) =>
        l.jenis_izin === 'WFH' &&
        tanggal >= l.tanggal_mulai &&
        tanggal <= l.tanggal_selesai
    );


  const alasanIzinDi = (tanggal) => {
    const z = izinList.find(
      (l) =>
        l.jenis_izin !==
          'Terlambat' &&
        l.jenis_izin !== 'WFH' &&
        tanggal >= l.tanggal_mulai &&
        tanggal <= l.tanggal_selesai
    );

    return z
      ? `${z.jenis_izin}: ${z.alasan}`
      : null;
  };


  // =====================================================
  // GPS VALIDATION
  // =====================================================

  async function validasiLokasi() {
    const pos =
      await ambilLokasi();

    let jarak = null;

    if (!kantor) {
      throw new Error(
        '📍 Konfigurasi lokasi kantor belum tersedia.'
      );
    }

    jarak = jarakMeter(
      pos.lat,
      pos.lng,
      Number(kantor.latitude),
      Number(kantor.longitude)
    );


    if (
      jarak >
      Number(kantor.radius_meter)
    ) {
      throw new Error(
        `📍 Presensi gagal: kamu ±${Math.round(
          jarak
        )} m dari kantor (maksimal ${
          kantor.radius_meter
        } m).`
      );
    }


    return {
      pos,
      jarak,
    };
  }


  // =====================================================
  // CHECK-IN
  // =====================================================

  async function checkIn() {
    setError(null);
    setInfo(null);

    const sekarang =
      menitSekarangWib();

    const wfh =
      izinWFHAktif(tanggalWib());

    const telatIzin =
      izinTelatAktif(tanggalWib());


    if (hariIni) {
      if (
        hariIni.status_kehadiran ===
        'Alpha'
      ) {
        return setError(
          '❌ Presensi hari ini sudah difinalisasi sebagai Alpha.'
        );
      }

      return setError(
        'Presensi hari ini sudah tercatat.'
      );
    }


    if (
      sekarang <
      CHECKIN_BUKA
    ) {
      return setError(
        '⏰ Check-in baru dibuka pukul 06:00 WIB.'
      );
    }


    if (
      sekarang >
      CHECKIN_TUTUP
    ) {
      return setError(
        '❌ Batas check-in pukul 12:00 WIB sudah lewat. Presensi hari ini dinyatakan Alpha.'
      );
    }


    setBusy(true);


    try {
      let pos = null;
      let jarak = null;


      // WFH approved tidak wajib GPS.
      if (!wfh) {
        const hasil =
          await validasiLokasi();

        pos = hasil.pos;
        jarak = hasil.jarak;
      }


      const {
        error: insertError,
      } = await supabase
        .from('attendance')
        .insert({
          intern_id: intern.id,

          tanggal_presensi:
            tanggalWib(),

          check_in:
            new Date().toISOString(),

          status_kehadiran:
            'Hadir',

          latitude:
            pos?.lat ?? null,

          longitude:
            pos?.lng ?? null,

          data_source:
            'modern',
        });


      if (insertError) {
        throw new Error(
          insertError.message
        );
      }


      // Reload agar menit_terlambat
      // yang dihitung database menjadi
      // sumber kebenaran.
      await muat();


      const terlambat =
        sekarang >
          TEPAT_WAKTU_SAMPAI &&
        !telatIzin &&
        !wfh;


      setInfo(
        `✅ Check-in tercatat${
          wfh
            ? ' · 🏠 WFH aktif'
            : jarak !== null
              ? ` — jarak ${Math.round(
                  jarak
                )} m`
              : ''
        }${
          telatIzin
            ? ' · ⏰ Izin Telat aktif — tanpa penalti'
            : terlambat
              ? ' · ⚠️ tercatat TERLAMBAT'
              : ' · tepat waktu'
        }.`
      );
    } catch (e) {
      console.error(
        'Presensi check-in gagal:',
        e
      );

      setError(
        e.message
      );
    } finally {
      setBusy(false);
    }
  }


  // =====================================================
  // CHECK-OUT
  // =====================================================

  async function checkOut() {
    setError(null);
    setInfo(null);


    if (!hariIni) {
      return setError(
        'Belum ada check-in hari ini.'
      );
    }


    if (
      hariIni.status_kehadiran ===
      'Alpha'
    ) {
      return setError(
        '❌ Presensi hari ini sudah berstatus Alpha dan tidak dapat di-check-out.'
      );
    }


    if (!hariIni.check_in) {
      return setError(
        'Check-out tidak tersedia karena tidak ada check-in.'
      );
    }


    if (hariIni.check_out) {
      return setError(
        'Check-out hari ini sudah tercatat.'
      );
    }


    const sekarang =
      menitSekarangWib();

    const bolehAwal =
      pulangAwal?.status ===
      'Approved';

    const wfh =
      izinWFHAktif(tanggalWib());


    // Hard cutoff checkout.
    if (
      sekarang >
      CHECKOUT_TUTUP
    ) {
      return setError(
        '❌ Batas check-out pukul 18:00 WIB sudah lewat. Presensi akan difinalisasi sebagai Alpha.'
      );
    }


    if (
      sekarang <
        CHECKOUT_BUKA &&
      !bolehAwal &&
      !wfh
    ) {
      return setError(
        '⏰ Check-out normal baru dibuka pukul 17:00 WIB — atau gunakan Pulang Awal yang sudah disetujui.'
      );
    }


    // Logbook wajib sebelum checkout.
    const {
      data: logbookHariIni,
      error: logbookError,
    } = await supabase
      .from('logbook')
      .select('id')
      .eq(
        'intern_id',
        intern.id
      )
      .eq(
        'tanggal',
        tanggalWib()
      )
      .maybeSingle();


    if (logbookError) {
      return setError(
        'Gagal memeriksa logbook: ' +
          logbookError.message
      );
    }


    if (!logbookHariIni) {
      return setError(
        '📖 Isi logbook hari ini dulu sebelum check-out! Klik menu Logbook untuk menulis catatan kerjamu.'
      );
    }


    setBusy(true);


    try {
      let pos = null;
      let jarak = null;


      // Normal dan Pulang Awal
      // tetap GPS kantor.
      //
      // WFH tidak membutuhkan GPS.
      if (!wfh) {
        const hasil =
          await validasiLokasi();

        pos = hasil.pos;
        jarak = hasil.jarak;
      }


      const {
        error: updateError,
      } = await supabase
        .from('attendance')
        .update({
          check_out:
            new Date().toISOString(),

          checkout_latitude:
            pos?.lat ?? null,

          checkout_longitude:
            pos?.lng ?? null,
        })
        .eq(
          'id',
          hariIni.id
        );


      if (updateError) {
        throw new Error(
          updateError.message
        );
      }


      await muat();


      setInfo(
        `🏁 Check-out tercatat${
          bolehAwal &&
          sekarang <
            CHECKOUT_BUKA
            ? ' (Pulang Awal)'
            : wfh
              ? ' (WFH)'
              : ''
        }${
          jarak !== null
            ? ` — jarak ${Math.round(
                jarak
              )} m`
            : ''
        }.`
      );
    } catch (e) {
      console.error(
        'Presensi check-out gagal:',
        e
      );

      setError(
        e.message
      );
    } finally {
      setBusy(false);
    }
  }


  // =====================================================
  // PULANG AWAL
  // =====================================================

  async function ajukanPulangAwal(e) {
    e.preventDefault();

    setError(null);
    setInfo(null);


    if (!alasanAwal.trim()) {
      return setError(
        'Tuliskan alasan pulang awal.'
      );
    }


    if (!hariIni?.check_in) {
      return setError(
        'Pulang Awal hanya dapat diajukan setelah melakukan check-in.'
      );
    }


    if (
      hariIni.status_kehadiran ===
      'Alpha'
    ) {
      return setError(
        'Presensi hari ini sudah berstatus Alpha.'
      );
    }


    if (
      menitSekarangWib() >=
      CHECKOUT_BUKA
    ) {
      return setError(
        'Check-out normal sudah dibuka pukul 17:00 WIB. Pengajuan Pulang Awal tidak diperlukan.'
      );
    }


    setBusy(true);


    const { error: insertError } =
      await supabase
        .from('early_checkouts')
        .insert({
          intern_id:
            intern.id,

          tanggal:
            tanggalWib(),

          alasan:
            alasanAwal.trim(),
        });


    if (insertError) {
      setError(
        insertError.message
      );
    } else {
      setModalAwal(false);

      setAlasanAwal('');

      setInfo(
        '📨 Pengajuan Pulang Awal terkirim — menunggu konfirmasi admin.'
      );
    }


    await muat();

    setBusy(false);
  }


  // =====================================================
  // LOADING
  // =====================================================

  if (loading || !intern) {
    return (
      <div>
        <div className="skeleton h-8 w-48 rounded-xl" />

        <div className="mt-6 skeleton h-48 rounded-2xl" />

        <div className="mt-4 skeleton h-64 rounded-2xl" />
      </div>
    );
  }


  // =====================================================
  // DERIVED STATE
  // =====================================================

  const hariSekarang =
    tanggalWib();

  const sekarang =
    menitSekarangWib();


  const belumMulai =
    intern.tanggal_mulai >
    hariSekarang;


  const masaSelesai =
    intern.tanggal_selesai <=
    hariSekarang;


  const persen =
    stats?.persen_kehadiran;


  const persenTampil =
    persen === null ||
    persen === undefined;


  const bolehAwal =
    pulangAwal?.status ===
    'Approved';


  const wfh =
    izinWFHAktif(
      hariSekarang
    );


  const telatIzin =
    izinTelatAktif(
      hariSekarang
    );


  const checkinBelumBuka =
    sekarang <
    CHECKIN_BUKA;


  const checkinSudahTutup =
    sekarang >
    CHECKIN_TUTUP;


  const checkoutSudahBuka =
    sekarang >=
    CHECKOUT_BUKA;


  const checkoutSudahTutup =
    sekarang >
    CHECKOUT_TUTUP;


  const presensiAlpha =
    hariIni?.status_kehadiran ===
    'Alpha';


  const presensiIzin =
    hariIni?.status_kehadiran ===
    'Izin';


  const presensiSakit =
    hariIni?.status_kehadiran ===
    'Sakit';


  // =====================================================
  // BEFORE INTERNSHIP
  // =====================================================

  if (belumMulai) {
    return (
      <div>

        <div className="anim-up">
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
            Presensi
          </h1>
        </div>


        <div className="anim-up mt-6 flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center shadow sm:p-12">

          <p className="anim-float text-5xl">
            🔒
          </p>

          <h2 className="mt-3 text-lg font-bold text-slate-700">
            Presensi Belum Tersedia
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Masa magangmu dimulai pada{' '}
            <b>
              {fmtTanggal(
                intern.tanggal_mulai
              )}
            </b>.
          </p>

        </div>

      </div>
    );
  }


  const riwayatKotak = (status) =>
    riwayat.filter(
      (r) =>
        r.status_kehadiran ===
        status
    );


  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div>

      {/* HEADER */}

      <div className="anim-up">

        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
          Presensi
        </h1>

        <p className="mt-1 text-xs text-slate-400">
          Check-in 06:00–12:00 WIB · tepat waktu sampai 08:05 · check-out maksimal 18:00 WIB
        </p>

      </div>


      {/* ALERT */}

      {error && (
        <p className="anim-down mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium leading-relaxed text-red-600">
          {error}
        </p>
      )}


      {info && (
        <p className="anim-down mt-4 rounded-xl bg-green-50 p-3 text-sm font-medium leading-relaxed text-green-700">
          {info}
        </p>
      )}


      {/* =================================================
          KARTU HARI INI
      ================================================= */}

      <div className="anim-up relative mt-5 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-700 p-5 text-white shadow-xl">

        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />


        <p className="relative text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-200">
          Hari ini — {fmtTanggal(hariSekarang)}
        </p>


        {/* MASA SELESAI */}

        {masaSelesai ? (

          <p className="relative mt-3 text-lg font-bold">
            Masa magangmu telah selesai. Terima kasih! 🎓
          </p>


        ) : presensiIzin ? (

          /* IZIN */

          <div className="relative mt-4">

            <p className="text-2xl font-extrabold">
              📝 Izin
            </p>

            <p className="mt-1 text-sm text-indigo-100">
              Pengajuan izin hari ini telah disetujui.
            </p>

          </div>


        ) : presensiSakit ? (

          /* SAKIT */

          <div className="relative mt-4">

            <p className="text-2xl font-extrabold">
              🤒 Sakit
            </p>

            <p className="mt-1 text-sm text-indigo-100">
              Pengajuan sakit hari ini telah disetujui.
            </p>

          </div>


        ) : presensiAlpha ? (

          /* ALPHA */

          <div className="relative mt-4">

            <p className="text-2xl font-extrabold text-red-100">
              ❌ Alpha
            </p>

            <p className="mt-1 text-sm font-medium text-indigo-100">
              {hariIni?.check_in
                ? 'Check-in tercatat, tetapi check-out tidak diselesaikan sampai batas pukul 18:00 WIB.'
                : 'Check-in tidak dilakukan sampai batas pukul 12:00 WIB.'}
            </p>

            {hariIni?.check_in && (
              <p className="mt-2 text-xs font-bold text-red-100">
                Check-in: {jamWib(hariIni.check_in)}
              </p>
            )}

          </div>


        ) : !hariIni ? (

          /* BELUM CHECK-IN */

          <>

            <p className="relative mt-2.5 text-xl font-extrabold sm:text-2xl">
              Belum check-in ⏰
            </p>


            <p className="relative mt-1 text-[11px] font-medium text-indigo-200">
              Buka 06:00 · tepat waktu ≤ 08:05 · batas terakhir 12:00
              {kantor
                ? ` · radius ${kantor.radius_meter} m`
                : ''}
            </p>


            {wfh && (
              <p className="relative mt-2 inline-block rounded-xl bg-green-400/30 px-3 py-1.5 text-xs font-bold text-green-100">
                🏠 WFH Aktif — GPS kantor tidak diperlukan
              </p>
            )}


            {telatIzin && (
              <p className="relative ml-1 mt-2 inline-block rounded-xl bg-orange-400/30 px-3 py-1.5 text-xs font-bold text-orange-100">
                ⏰ Izin Telat Aktif — tanpa penalti, maksimal check-in tetap 12:00
              </p>
            )}


            {checkinSudahTutup ? (

              <div className="relative mt-4 rounded-xl border border-red-300/30 bg-red-400/20 px-4 py-3">

                <p className="text-sm font-extrabold text-red-100">
                  ❌ Check-in sudah ditutup
                </p>

                <p className="mt-1 text-[11px] text-red-100/90">
                  Batas terakhir check-in adalah pukul 12:00 WIB. Presensi hari ini akan tercatat Alpha.
                </p>

              </div>

            ) : (

              <button
                onClick={checkIn}
                disabled={
                  busy ||
                  checkinBelumBuka
                }
                className="btn-press anim-pulse-ring relative mt-4 w-full rounded-xl bg-white py-4 text-base font-extrabold text-indigo-700 shadow-lg transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40 sm:w-64"
              >

                {checkinBelumBuka
                  ? '🔒 Dibuka pukul 06:00'
                  : busy
                    ? 'Memproses…'
                    : sekarang >
                        TEPAT_WAKTU_SAMPAI &&
                      !telatIzin &&
                      !wfh
                      ? '⚠️ CHECK-IN TERLAMBAT'
                      : '✅ CHECK-IN SEKARANG'}

              </button>

            )}

          </>


        ) : !hariIni.check_out ? (

          /* SUDAH CHECK-IN, BELUM CHECKOUT */

          <>

            <p className="relative mt-2.5 text-xl font-extrabold sm:text-2xl">
              Sedang bekerja sejak {jamWib(hariIni.check_in)} 💪
            </p>


            {wfh && (
              <p className="relative mt-2 inline-block rounded-xl bg-green-400/30 px-3 py-1.5 text-xs font-bold text-green-100">
                🏠 WFH Aktif — presensi dari mana saja
              </p>
            )}


            {telatIzin && (
              <p className="relative ml-1 mt-2 inline-block rounded-xl bg-orange-400/30 px-3 py-1.5 text-xs font-bold text-orange-100">
                ⏰ Izin Telat — tanpa penalti keterlambatan
              </p>
            )}


            {Number(
              hariIni.menit_terlambat ?? 0
            ) > 0 && (

              <p className="relative ml-1 mt-2 inline-block rounded-xl bg-orange-500/30 px-2.5 py-1 text-xs font-bold text-orange-100">
                ⚠ terlambat {hariIni.menit_terlambat} menit
              </p>

            )}


            {pulangAwal &&
              pulangAwal.status !==
                'Approved' && (

                <p
                  className={`relative mt-2 rounded-xl px-3 py-2 text-[11px] font-bold ${
                    pulangAwal.status ===
                    'Pending'
                      ? 'bg-amber-400/25 text-amber-100'
                      : 'bg-red-400/25 text-red-100'
                  }`}
                >

                  {pulangAwal.status ===
                    'Pending' &&
                    '⏳ Pengajuan pulang awal menunggu konfirmasi admin.'}

                  {pulangAwal.status ===
                    'Rejected' &&
                    '❌ Pulang awal ditolak — check-out normal tetap mulai 17:00.'}

                </p>

              )}


            {checkoutSudahTutup ? (

              <div className="relative mt-4 rounded-xl border border-red-300/30 bg-red-400/20 px-4 py-3">

                <p className="text-sm font-extrabold text-red-100">
                  ❌ Batas check-out sudah lewat
                </p>

                <p className="mt-1 text-[11px] text-red-100/90">
                  Check-out maksimal pukul 18:00 WIB. Presensi hari ini akan difinalisasi sebagai Alpha.
                </p>

              </div>

            ) : (

              <div className="relative mt-4 flex flex-col gap-2 sm:flex-row">

                <button
                  onClick={checkOut}
                  disabled={
                    busy ||
                    (
                      !checkoutSudahBuka &&
                      !bolehAwal &&
                      !wfh
                    )
                  }
                  className="btn-press w-full rounded-xl bg-white py-4 text-base font-extrabold text-orange-600 shadow-lg transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-8"
                >

                  {busy
                    ? 'Memproses…'
                    : bolehAwal &&
                        !checkoutSudahBuka
                      ? '🏁 CHECK-OUT (PULANG AWAL)'
                      : wfh &&
                          !checkoutSudahBuka
                        ? '🏁 CHECK-OUT (WFH)'
                        : checkoutSudahBuka
                          ? '🏁 CHECK-OUT'
                          : '🔒 Dibuka 17:00'}

                </button>


                {!pulangAwal &&
                  !checkoutSudahBuka &&
                  !wfh && (

                    <button
                      onClick={() =>
                        setModalAwal(true)
                      }
                      className="btn-press w-full rounded-xl border-2 border-white/40 py-4 text-sm font-bold text-white transition hover:bg-white/10 sm:w-auto sm:px-6"
                    >
                      🏃 Pulang Awal
                    </button>

                  )}

              </div>

            )}

          </>


        ) : (

          /* SUDAH CHECKOUT */

          <>

            <p className="relative mt-2.5 text-lg font-extrabold sm:text-xl">
              ✅ Hari ini selesai!
            </p>


            <div className="relative mt-3 flex flex-wrap items-center justify-center gap-3 rounded-xl bg-white/10 py-3 backdrop-blur">

              <div className="text-center">

                <p className="text-[9px] font-bold uppercase tracking-wide text-indigo-200">
                  Masuk
                </p>

                <p className="text-xl font-extrabold">
                  {jamWib(
                    hariIni.check_in
                  )}
                </p>

              </div>


              <span className="text-indigo-300">
                →
              </span>


              <div className="text-center">

                <p className="text-[9px] font-bold uppercase tracking-wide text-indigo-200">
                  Keluar
                </p>

                <p className="text-xl font-extrabold">
                  {jamWib(
                    hariIni.check_out
                  )}
                </p>

              </div>


              <span className="rounded-lg bg-white/15 px-2 py-1 text-[11px] font-bold">
                {durasi(
                  hariIni.check_in,
                  hariIni.check_out
                )}
              </span>

            </div>

          </>

        )}

      </div>


      {/* =================================================
          STATISTIK
      ================================================= */}

      {stats &&
        !stats.error &&
        (
          persenTampil ? (

            <div className="anim-up mt-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">

              <p className="text-sm leading-relaxed text-slate-500">
                📊 Statistik akan mulai dihitung ketika masa magang berjalan.
              </p>

            </div>

          ) : (

            <div className="anim-up mt-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">

              <div className="flex flex-wrap items-end justify-between gap-2">

                <div>

                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Persentase Kehadiran
                  </p>

                  <p
                    className={`text-4xl font-extrabold ${
                      persen >= 85
                        ? 'text-green-600'
                        : 'text-red-500'
                    }`}
                  >

                    <CountUp
                      value={persen}
                      suffix="%"
                    />

                  </p>

                </div>


                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    persen >= 85
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-600'
                  }`}
                >
                  {stats.status}
                </span>

              </div>


              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">

                <div
                  className={`anim-bar h-full rounded-full ${
                    persen >= 85
                      ? 'bg-green-500'
                      : 'bg-red-400'
                  }`}
                  style={{
                    width: `${Math.min(
                      persen,
                      100
                    )}%`,
                  }}
                />

              </div>


              <p className="mt-1.5 text-[11px] font-medium text-slate-400">
                Target {stats.target_persen}% — toleransi {stats.toleransi_hari ?? 0} hari
              </p>


              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">

                {KOTAK.map(
                  (k, i) => {

                    const aktif =
                      bukaKotak ===
                      k.key;

                    return (
                      <button
                        key={k.key}
                        onClick={() =>
                          setBukaKotak(
                            aktif
                              ? null
                              : k.key
                          )
                        }
                        className={`anim-pop rounded-xl border-2 p-3 text-center transition active:scale-[0.97] ${k.warna} ${
                          aktif
                            ? 'ring-2 ring-offset-1 ring-slate-800'
                            : ''
                        }`}
                        style={{
                          animationDelay: `${200 + i * 60}ms`,
                        }}
                      >

                        <p className="text-xl">
                          {k.ikon}
                        </p>

                        <b className="text-lg">

                          <CountUp
                            value={
                              stats[
                                k.key.toLowerCase()
                              ] ?? 0
                            }
                          />

                        </b>

                        <p className="text-[11px] font-semibold text-slate-500">
                          {k.key}
                        </p>

                        <p className="mt-0.5 text-[9px] text-slate-400">
                          {aktif
                            ? '▲ tutup'
                            : '▼ detail'}
                        </p>

                      </button>
                    );
                  }
                )}

              </div>


              {/* DETAIL KOTAK */}

              {bukaKotak && (

                <div className="anim-down mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 sm:p-4">

                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Riwayat {bukaKotak} — {riwayatKotak(bukaKotak).length} entri
                  </p>


                  {riwayatKotak(
                    bukaKotak
                  ).length === 0 ? (

                    <p className="py-4 text-center text-sm text-slate-400">
                      Belum ada riwayat {bukaKotak.toLowerCase()}.
                    </p>

                  ) : (

                    <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">

                      {riwayatKotak(
                        bukaKotak
                      ).map((r) => (

                        <div
                          key={r.id}
                          className="anim-in flex flex-col gap-1 rounded-lg bg-white px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-2"
                        >

                          <span className="font-bold text-slate-700">
                            📅 {fmtTanggal(r.tanggal_presensi)}
                          </span>


                          {bukaKotak ===
                            'Hadir' && (

                            <span className="text-[11px] leading-relaxed text-slate-500">

                              {r.data_source ===
                              'legacy_whitening' ? (

                                <span className="font-semibold text-indigo-500">
                                  🗂️ Pemutihan presensi masa transisi
                                </span>

                              ) : (

                                <>

                                  🕗 {jamWib(r.check_in)}
                                  {' → '}
                                  {jamWib(r.check_out)}

                                  {r.check_in &&
                                    r.check_out &&
                                    ` (${durasi(
                                      r.check_in,
                                      r.check_out
                                    )})`}

                                  {Number(
                                    r.menit_terlambat ??
                                      0
                                  ) > 0 && (

                                    <span className="ml-1 font-bold text-orange-500">
                                      ⚠ +{r.menit_terlambat}m
                                    </span>

                                  )}

                                </>

                              )}

                            </span>

                          )}


                          {(bukaKotak ===
                            'Izin' ||
                            bukaKotak ===
                              'Sakit') && (

                            <span className="text-[11px] leading-relaxed text-slate-500">
                              💬 {alasanIzinDi(r.tanggal_presensi) ?? 'disetujui admin'}
                            </span>

                          )}


                          {bukaKotak ===
                            'Alpha' && (

                            <span className="text-[11px] text-slate-400">

                              {r.check_in
                                ? `check-in ${jamWib(
                                    r.check_in
                                  )}, tidak menyelesaikan check-out`
                                : 'tidak melakukan check-in sampai batas waktu'}

                            </span>

                          )}

                        </div>

                      ))}

                    </div>

                  )}

                </div>

              )}


              {Number(
                stats.terlambat ?? 0
              ) > 0 && (

                <p className="mt-3 text-center text-xs font-bold text-orange-500">
                  ⚠️ Terlambat {stats.terlambat}× · rata-rata {stats.rata_menit_terlambat ?? 0} menit
                </p>

              )}

            </div>

          )
        )}


      {/* =================================================
          RIWAYAT
      ================================================= */}

      <h2 className="anim-up mt-8 text-base font-bold text-slate-800">
        🕘 Riwayat 15 Hari Terakhir
      </h2>


      <div className="anim-up mt-3 overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">

        <table className="w-full min-w-[520px] text-sm">

          <thead>

            <tr className="border-b border-slate-100 bg-slate-50 text-left text-[10px] uppercase tracking-wider text-slate-400">

              <th className="px-3 py-2.5 sm:px-4">
                Tanggal
              </th>

              <th className="px-3 py-2.5 sm:px-4">
                Masuk
              </th>

              <th className="px-3 py-2.5 sm:px-4">
                Keluar
              </th>

              <th className="px-3 py-2.5 sm:px-4">
                Status
              </th>

            </tr>

          </thead>


          <tbody>

            {riwayat.length === 0 ? (

              <tr>

                <td
                  colSpan={4}
                  className="p-8 text-center"
                >

                  <div className="flex flex-col items-center">

                    <p className="anim-float text-4xl">
                      📭
                    </p>

                    <p className="mt-2 text-sm text-slate-400">
                      Belum ada riwayat
                    </p>

                  </div>

                </td>

              </tr>

            ) : (

              riwayat
                .slice(0, 15)
                .map((r) => (

                  <tr
                    key={r.id}
                    className="anim-in border-b border-slate-50"
                  >

                    <td className="px-3 py-2.5 font-bold text-slate-600 sm:px-4">
                      {fmtTanggal(
                        r.tanggal_presensi
                      )}
                    </td>


                    <td className="whitespace-nowrap px-3 py-2.5 sm:px-4">

                      {r.data_source ===
                      'legacy_whitening' ? (

                        <span className="text-[10px] font-semibold text-indigo-500">
                          Pemutihan
                        </span>

                      ) : (

                        <>
                          {jamWib(
                            r.check_in
                          )}

                          {Number(
                            r.menit_terlambat ??
                              0
                          ) > 0 && (

                            <span className="ml-1 text-[10px] font-bold text-orange-500">
                              ⚠ +{r.menit_terlambat}m
                            </span>

                          )}
                        </>

                      )}

                    </td>


                    <td className="whitespace-nowrap px-3 py-2.5 sm:px-4">

                      {r.data_source ===
                      'legacy_whitening'
                        ? '—'
                        : jamWib(
                            r.check_out
                          )}

                    </td>


                    <td className="px-3 py-2.5 sm:px-4">

                      <span
                        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-extrabold text-white ${
                          BADGE[
                            r.status_kehadiran
                          ] ??
                          'bg-slate-400'
                        }`}
                      >
                        {r.status_kehadiran?.toUpperCase()}
                      </span>

                    </td>

                  </tr>

                ))

            )}

          </tbody>

        </table>

      </div>


      {/* =================================================
          MODAL PULANG AWAL
      ================================================= */}

      <Modal
        open={modalAwal}
        onClose={() =>
          setModalAwal(false)
        }
        title="🏃 Ajukan Pulang Awal"
      >

        <form
          onSubmit={
            ajukanPulangAwal
          }
        >

          <p className="text-sm leading-relaxed text-slate-600">

            Pengajuan ini akan{' '}
            <b>
              dikonfirmasi oleh admin
            </b>.

            Jika disetujui, kamu dapat
            check-out sebelum pukul
            17:00 WIB dan presensimu
            tetap dihitung{' '}
            <b>Hadir</b>.

          </p>


          <textarea
            value={
              alasanAwal
            }
            onChange={(e) =>
              setAlasanAwal(
                e.target.value
              )
            }
            rows={3}
            placeholder="Alasan pulang lebih awal… (wajib diisi)"
            className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-orange-500 focus:outline-none"
          />


          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">

            <button
              type="button"
              onClick={() =>
                setModalAwal(false)
              }
              className="btn-press rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>


            <button
              type="submit"
              disabled={busy}
              className="btn-press rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {busy
                ? 'Mengirim…'
                : 'Kirim Pengajuan'}
            </button>

          </div>

        </form>

      </Modal>

    </div>
  );
}