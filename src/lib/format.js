const NAMA_BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

export function fmtTanggal(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

/** '2026-10' atau '2026-10-01' → 'Okt 2026' */
export function namaBulan(label) {
  const [y, m] = String(label).slice(0, 7).split('-');
  return `${NAMA_BULAN[Number(m) - 1]} ${y}`;
}

/** Tanggal panjang Indonesia: 'Senin, 21 September 2026' */
export function fmtTanggalPanjang(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}