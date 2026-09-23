// ===== Diagram jaring 6 aspek (radar) — responsif penuh =====
const ASPEK = [
  { key: 'inisiatif', label: 'Inisiatif' },
  { key: 'pemecahan', label: 'Pemecahan' },
  { key: 'teknis', label: 'Teknis' },
  { key: 'komunikasi', label: 'Komunikasi' },
  { key: 'kualitas', label: 'Kualitas' },
  { key: 'disiplin', label: 'Disiplin' },
];

export default function RadarNilai({ nilai = {}, size = 300, warna = '#6366f1' }) {
  const W = size;            // lebar viewBox
  const H = size * 0.86;     // tinggi viewBox — label atas & bawah cukup ruang
  const c = { x: W / 2, y: H / 2 };
  const R = size * 0.27;     // radius maksimum (nilai 5)
  const R0 = size * 0.135;   // radius minimum (nilai 3)

  const titik = (i, v) => {
    const a = ((-90 + i * 60) * Math.PI) / 180;
    const r = R0 + (R - R0) * ((Math.max(3, Math.min(5, v)) - 3) / 2);
    return [c.x + r * Math.cos(a), c.y + r * Math.sin(a)];
  };

  const cincin = (v) => ASPEK.map((_, i) => titik(i, v).join(',')).join(' ');
  const nilaiPts = ASPEK.map((a, i) => {
    const v = Number(nilai[a.key]);
    return titik(i, isNaN(v) ? 3 : v).join(',');
  }).join(' ');

  // posisi label mengikuti sudut, dengan jarak dari tepi
  const labelPos = ASPEK.map((a, i) => {
    const ang = ((-90 + i * 60) * Math.PI) / 180;
    const cos = Math.cos(ang), sin = Math.sin(ang);
    const r = R + size * 0.075;
    return {
      x: c.x + r * cos,
      y: c.y + r * sin,
      label: a.label,
      anchor: Math.abs(cos) < 0.3 ? 'middle' : (cos > 0 ? 'start' : 'end'),
      dy: sin > 0.5 ? 12 : sin < -0.5 ? -6 : 4,
    };
  });

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="anim-pop mx-auto block h-auto w-full"
        style={{ maxWidth: `${size}px` }} role="img">
        {/* cincin grid 3 / 4 / 5 */}
        {[3, 4, 5].map((v) => (
          <polygon key={v} points={cincin(v)} fill="none" stroke="#e2e8f0" strokeWidth="1" />
        ))}
        {/* garis sumbu */}
        {ASPEK.map((_, i) => {
          const [x, y] = titik(i, 5);
          return <line key={i} x1={c.x} y1={c.y} x2={x} y2={y} stroke="#e2e8f0" strokeWidth="1" />;
        })}
        {/* poligon nilai */}
        <polygon points={nilaiPts} fill={warna} fillOpacity="0.22" stroke={warna} strokeWidth="2.5"
          strokeLinejoin="round" />
        {/* titik nilai */}
        {ASPEK.map((a, i) => {
          const v = Number(nilai[a.key]);
          const [x, y] = titik(i, isNaN(v) ? 3 : v);
          return <circle key={a.key} cx={x} cy={y} r="4" fill={warna} stroke="white" strokeWidth="1.5" />;
        })}
        {/* label aspek */}
        {labelPos.map((l) => (
          <text key={l.label} x={l.x} y={l.y + l.dy} textAnchor={l.anchor}
            fill="#64748b" fontSize={Math.max(9, size * 0.037)} fontWeight="700">
            {l.label}
          </text>
        ))}
      </svg>
    </div>
  );
}