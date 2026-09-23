export default function Placeholder({ peran, bagian }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
      <p className="text-4xl">🚧</p>
      <h2 className="mt-3 text-lg font-bold text-slate-800">Dashboard {peran}</h2>
      <p className="mt-1 text-sm text-slate-500">Halaman ini dibangun pada <b>Bagian {bagian}</b>.</p>
    </div>
  );
}