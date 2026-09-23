// ===== src/pages/setting/Tampilan.jsx =====
import { useState } from 'react';
import Greeting from '../../components/Greeting';


export default function Tampilan() {
  const [gelap, setGelap] = useState(
    () => localStorage.getItem('mode-gelap') === 'true'
  );

  function setMode(n) {
    setGelap(n);
    localStorage.setItem('mode-gelap', String(n));
    setPesan(true);
    setTimeout(() => setPesan(false), 2500);
  }
  const [pesan, setPesan] = useState(false);

  return (
    <div>
      <Greeting subjudul="Preferensi tampilan" />
      <div className="mt-6 max-w-lg rounded-2xl bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-800">🌙 Mode Gelap</p>
            <p className="text-xs text-slate-400">Nyaman untuk mata di ruangan redup</p>
          </div>
          <button onClick={() => setMode(!gelap)}
            className={`relative h-8 w-14 rounded-full transition ${gelap ? 'bg-indigo-600' : 'bg-slate-300'}`}>
            <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${
              gelap ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
        {pesan && (
          <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
            💡 Preferensi tersimpan. Mode gelap penuh akan diterapkan pada fase polish UI berikutnya.
          </p>
        )}
      </div>
    </div>
  );
}