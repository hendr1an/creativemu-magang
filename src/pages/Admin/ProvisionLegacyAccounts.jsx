import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function ProvisionLegacyAccounts() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorText, setErrorText] = useState('');

  async function handleProvision() {
    const ok = window.confirm(
      'Provision 12 akun peserta aktif sekarang? Password temporary hanya akan tampil pada hasil ini dan tidak disimpan ke database.',
    );

    if (!ok) return;

    setLoading(true);
    setResult(null);
    setErrorText('');

    try {
      const { data, error } = await supabase.functions.invoke(
        'provision-legacy-active-accounts',
        {
          body: {
            confirm: true,
          },
        },
      );

      if (error) {
        throw error;
      }

      setResult(data);
    } catch (error) {
      setErrorText(
        error?.message ||
          'Provisioning gagal.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyCredentials() {
    if (!result?.credentials?.length) return;

    const text = result.credentials
      .map(
        (item, index) =>
          `${index + 1}. ${item.nama_lengkap}\n` +
          `Email: ${item.email}\n` +
          `Password: ${item.temporary_password}`,
      )
      .join('\n\n');

    await navigator.clipboard.writeText(text);

    alert('Credential berhasil disalin.');
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          Provision Akun Peserta Aktif
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Membuat akun login untuk 12 peserta legacy yang masih aktif.
          Password temporary tidak disimpan ke database.
        </p>

        <button
          onClick={handleProvision}
          disabled={loading}
          className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? 'Memproses...'
            : 'Provision 12 Akun'}
        </button>

        {errorText && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorText}
          </div>
        )}

        {result && (
          <div className="mt-6 space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-400">
                  Expected
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {result.expected ?? 0}
                </p>
              </div>

              <div className="rounded-xl bg-emerald-50 p-4">
                <p className="text-xs font-bold uppercase text-emerald-500">
                  Linked
                </p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">
                  {result.linked_accounts ?? 0}
                </p>
              </div>

              <div className="rounded-xl bg-amber-50 p-4">
                <p className="text-xs font-bold uppercase text-amber-500">
                  Failures
                </p>
                <p className="mt-1 text-2xl font-bold text-amber-700">
                  {result.failures?.length ?? 0}
                </p>
              </div>
            </div>

            {result.credentials?.length > 0 && (
              <>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-slate-900">
                    Temporary Credentials
                  </h2>

                  <button
                    onClick={copyCredentials}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Copy Semua
                  </button>
                </div>

                <div className="space-y-3">
                  {result.credentials.map((item) => (
                    <div
                      key={item.intern_id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <p className="font-bold text-slate-900">
                        {item.nama_lengkap}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {item.email}
                      </p>

                      <p className="mt-3 font-mono text-sm font-bold text-indigo-700">
                        {item.temporary_password}
                      </p>

                      <p className="mt-2 text-xs text-slate-400">
                        {item.action}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {result.failures?.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="font-bold text-red-700">
                  Gagal diproses
                </p>

                <div className="mt-3 space-y-2 text-sm text-red-600">
                  {result.failures.map((item) => (
                    <div key={item.email}>
                      <strong>{item.email}</strong>
                      {' — '}
                      {item.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}