import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { namaBulan, fmtTanggal } from '../../lib/format';

const HARI_INI = new Date().toISOString().slice(0, 10);

function isoTerakhir(selesai) {
  const d = new Date(selesai + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export default function Tracer() {
  const [bulan, setBulan] = useState(HARI_INI.slice(0, 7));
  const [peserta, setPeserta] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { muat(); }, [bulan]);

  async function muat() {
    setLoading(true);
    const [y, m] = bulan.split('-').map(Number);
    const jumlahHari = new Date(y, m, 0).getDate();
    const awal = `${bulan}-01`;
    const akhir = `${bulan}-${String(jumlahHari).padStart(2, '0')}`;
    const { data } = await supabase.from('interns')
      .select('id, nama_lengkap, tanggal_mulai, tanggal_selesai, durasi_magang, satuan_durasi, status_magang')
      .lte('tanggal_mulai', akhir)
      .gt('tanggal_selesai', awal)
      .order('tanggal_mulai');
    setPeserta((data ?? []).map((p) => ({ ...p, terakhir: isoTerakhir(p.tanggal_selesai) })));
    setLoading(false);
  }

  const [y, m] = bulan.split('-').map(Number);
  const jumlahHari = new Date(y, m, 0).getDate();
  const awalBulan = `${bulan}-01`;
  const akhirBulan = `${bulan}-${String(jumlahHari).padStart(2, '0')}`;
  const weekend = (d) => [0, 6].includes(new Date(Date.UTC(y, m - 1, d)).getUTCDay());
  const isoDari = (d) => `${bulan}-${String(d).padStart(2, '0')}`;

  const infoPeserta = (p) => {
    const mulaiEfektif = p.tanggal_mulai < awalBulan ? awalBulan : p.tanggal_mulai;
    const selesaiEfektif = p.terakhir > akhirBulan ? akhirBulan : p.terakhir;
    const mulaiD = Math.max(1, Number(mulaiEfektif.slice(8)));
    const selesaiD = Math.min(jumlahHari, Number(selesaiEfektif.slice(8)));
    const totalHariEfektif = Math.max(0, selesaiD - mulaiD + 1);
    const persen = Math.round((totalHariEfektif / jumlahHari) * 100);
    const hariIniDiDalam = HARI_INI >= awalBulan && HARI_INI <= akhirBulan;
    const sedangMagangHariIni = HARI_INI >= p.tanggal_mulai && HARI_INI <= p.terakhir;
    return { mulaiD, selesaiD, persen, totalHariEfektif, hariIniDiDalam, sedangMagangHariIni };
  };

  const bulanSebelumnya = () => {
    const [yy, mm] = bulan.split('-').map(Number);
    const d = new Date(yy, mm - 2, 1);
    setBulan(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const bulanBerikutnya = () => {
    const [yy, mm] = bulan.split('-').map(Number);
    const d = new Date(yy, mm, 1);
    setBulan(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  return (
    <div>
      <div className="anim-up">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Tracer Magang</h1>
      </div>

      {/* navigasi bulan */}
      <div className="anim-up mt-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm [animation-delay:80ms]">
        <div className="flex items-center gap-2">
          <button onClick={bulanSebelumnya}
            className="btn-press flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-lg font-bold text-slate-500 hover:bg-slate-50 active:scale-95">‹</button>
          <span className="min-w-[7.5rem] text-center text-sm font-extrabold text-slate-700">
            {namaBulan(bulan)}
          </span>
          <button onClick={bulanBerikutnya}
            className="btn-press flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-lg font-bold text-slate-500 hover:bg-slate-50 active:scale-95">›</button>
        </div>
        <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-[11px] font-bold text-indigo-600">
          {peserta.length} peserta menyentuh bulan ini
        </span>
      </div>

      {loading ? (
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
      ) : peserta.length === 0 ? (
        <div className="anim-up mt-4 flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="anim-float text-5xl">📅</p>
          <p className="mt-4 font-bold text-slate-600">Tidak Ada Peserta</p>
          <p className="mt-1 text-sm text-slate-400">Tidak ada peserta yang periodenya menyentuh bulan ini</p>
        </div>
      ) : (
        <>
          {/* ===== view mobile: kartu timeline ===== */}
          <div className="mt-4 space-y-3 lg:hidden">
            {peserta.map((p, i) => {
              const info = infoPeserta(p);
              return (
                <div key={p.id}
                  className="anim-up card-hover rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                  style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-800">{p.nama_lengkap}</p>
                      <p className="text-[11px] font-medium text-slate-500">
                        {fmtTanggal(p.tanggal_mulai)} – {fmtTanggal(p.terakhir)}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {p.durasi_magang} {p.satuan_durasi ?? 'bulan'}
                        {p.status_magang !== 'Active' && ` (${p.status_magang})`}
                      </p>
                    </div>
                    {info.sedangMagangHariIni && (
                      <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-[9px] font-bold text-green-700">● aktif</span>
                    )}
                  </div>

                  <div className="mt-3">
                    <div className="relative h-6 overflow-hidden rounded-lg bg-slate-100">
                      <div className={`absolute inset-y-0 rounded transition-all ${info.persen >= 100 ? 'bg-orange-500' : 'bg-indigo-500'}`}
                        style={{
                          left: `${((info.mulaiD - 1) / jumlahHari) * 100}%`,
                          width: `${(info.totalHariEfektif / jumlahHari) * 100}%`,
                        }} />
                      {info.hariIniDiDalam && (
                        <div className="absolute inset-y-0 w-0.5 bg-slate-900/70"
                          style={{ left: `${(Number(HARI_INI.slice(8)) / jumlahHari) * 100}%` }} />
                      )}
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] font-medium text-slate-400">
                      <span>1 {namaBulan(bulan).split(' ')[0]}</span>
                      <span>{info.persen}% dari bulan</span>
                      <span>{jumlahHari} {namaBulan(bulan).split(' ')[0]}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ===== view desktop: grid ===== */}
          <div className="anim-up mt-4 hidden overflow-x-auto rounded-2xl border border-slate-100 bg-white p-4 shadow-sm [-webkit-overflow-scrolling:touch] lg:block">
            <table className="border-separate border-spacing-0.5">
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 bg-white pr-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Peserta
                  </th>
                  {Array.from({ length: jumlahHari }, (_, i) => i + 1).map((d) => (
                    <th key={d}
                      className={`w-6 text-center text-[10px] font-bold ${
                        isoDari(d) === HARI_INI
                          ? 'rounded bg-slate-800 text-white'
                          : weekend(d) ? 'text-slate-300' : 'text-slate-500'}`}>
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {peserta.map((p) => (
                  <tr key={p.id}>
                    <td className="sticky left-0 z-10 bg-white pr-3">
                      <p className="whitespace-nowrap text-sm font-bold text-slate-700">{p.nama_lengkap}</p>
                      <p className="whitespace-nowrap text-[11px] text-slate-400">
                        {fmtTanggal(p.tanggal_mulai)} – {fmtTanggal(p.terakhir)}
                      </p>
                    </td>
                    {Array.from({ length: jumlahHari }, (_, i) => i + 1).map((d) => {
                      const iso = isoDari(d);
                      const aktif = iso >= p.tanggal_mulai && iso < p.tanggal_selesai;
                      const last = iso === p.terakhir;
                      const cls = last
                        ? 'bg-orange-500'
                        : aktif
                          ? (weekend(d) ? 'bg-indigo-200' : 'bg-indigo-500')
                          : (weekend(d) ? 'bg-slate-100' : '');
                      return (
                        <td key={d}
                          title={`${p.nama_lengkap} — ${fmtTanggal(iso)}${last ? ' (HARI TERAKHIR)' : aktif ? ' (sedang magang)' : ''}`}
                          className={`h-5 w-6 rounded ${cls}`} />
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-indigo-500" /> Sedang Magang</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-indigo-200" /> Akhir pekan</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-orange-500" /> Hari Terakhir</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}