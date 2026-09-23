// ===== src/pages/setting/Tentang.jsx =====
import Greeting from '../../components/Greeting';

export default function Tentang() {
  return (
    <div>
      <Greeting subjudul="Tentang sistem ini" />
      <div className="mt-6 max-w-lg rounded-2xl bg-white p-6 shadow">
        <div className="text-center">
          <p className="text-3xl">🎓</p>
          <h2 className="mt-2 text-xl font-black text-slate-800">Sistem Manajemen Magang</h2>
          <p className="text-sm text-slate-500">Creativemu Academy — Sedayu, Bantul, Yogyakarta</p>
        </div>
        <div className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between border-b border-slate-100 py-2">
            <span className="text-slate-500">Versi</span>
            <span className="font-semibold text-slate-800">1.0.0</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 py-2">
            <span className="text-slate-500">Teknologi</span>
            <span className="font-semibold text-slate-800">React · Supabase · Tailwind</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-slate-500">Kontak</span>
            <span className="font-semibold text-slate-800">+62 896 1847 2759</span>
          </div>
        </div>
        <p className="mt-4 text-center text-[10px] text-slate-300">
          Jl. Gn. Bulu No.89, Argorejo, Sedayu, Bantul, DIY 55752
        </p>
      </div>
    </div>
  );
}