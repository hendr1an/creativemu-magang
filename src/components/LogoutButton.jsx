import {
  useEffect,
  useState,
} from 'react';

import {
  createPortal,
} from 'react-dom';

import {
  LogOut,
  ShieldCheck,
  X,
} from 'lucide-react';

import {
  useAuth,
} from '../context/AuthContext';


const DURASI_TUTUP =
  240;


export default function LogoutButton() {
  const {
    logout,
  } =
    useAuth();


  const [
    open,
    setOpen,
  ] =
    useState(false);


  const [
    closing,
    setClosing,
  ] =
    useState(false);


  const [
    busy,
    setBusy,
  ] =
    useState(false);


  const [
    error,
    setError,
  ] =
    useState(null);


  /* =======================================================
     OPEN
  ======================================================= */

  function bukaKonfirmasi() {
    if (
      busy ||
      open
    ) {
      return;
    }


    setError(
      null
    );

    setClosing(
      false
    );

    setOpen(
      true
    );
  }


  /* =======================================================
     CLOSE DENGAN ANIMASI
  ======================================================= */

  function tutupKonfirmasi() {
    if (
      busy ||
      closing
    ) {
      return;
    }


    setClosing(
      true
    );


    window.setTimeout(
      () => {
        setOpen(
          false
        );

        setClosing(
          false
        );

        setError(
          null
        );
      },
      DURASI_TUTUP
    );
  }


  /* =======================================================
     ESCAPE + BODY SCROLL LOCK
  ======================================================= */

  useEffect(() => {
    if (!open) {
      return undefined;
    }


    const overflowLama =
      document.body.style.overflow;


    document.body.style.overflow =
      'hidden';


    function handleKeyDown(
      event
    ) {
      if (
        event.key ===
          'Escape' &&
        !busy &&
        !closing
      ) {
        tutupKonfirmasi();
      }
    }


    document.addEventListener(
      'keydown',
      handleKeyDown
    );


    return () => {
      document.body.style.overflow =
        overflowLama;


      document.removeEventListener(
        'keydown',
        handleKeyDown
      );
    };
  }, [
    open,
    busy,
    closing,
  ]);


  /* =======================================================
     LOGOUT
  ======================================================= */

  async function konfirmasiLogout() {
    if (
      busy ||
      closing
    ) {
      return;
    }


    setBusy(
      true
    );

    setError(
      null
    );


    try {
      const result =
        await logout();


      if (
        result?.error
      ) {
        throw result.error;
      }


      /*
        Setelah SIGNED_OUT,
        AuthContext / ProtectedRoute
        akan menangani perpindahan halaman.
      */
    } catch (
      err
    ) {
      console.error(
        'Logout gagal:',
        err
      );


      setError(
        err?.message ??
          'Logout gagal. Silakan coba lagi.'
      );


      setBusy(
        false
      );
    }
  }


  /* =======================================================
     MODAL CONTENT
  ======================================================= */

  const modal =
    open ? (
      <div
        className={`fixed inset-0 z-[9999] flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-[6px] sm:p-6 ${
          closing
            ? 'logout-backdrop-out'
            : 'logout-backdrop-in'
        }`}
        onMouseDown={(
          event
        ) => {
          if (
            event.target ===
              event.currentTarget &&
            !busy
          ) {
            tutupKonfirmasi();
          }
        }}
      >
        {/* =================================================
            MODAL CARD

            max-height memakai dynamic viewport height
            supaya aman pada laptop / mobile viewport pendek.
        ================================================= */}

        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-title"
          onMouseDown={(
            event
          ) =>
            event.stopPropagation()
          }
          className={`relative my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl shadow-slate-950/30 sm:max-h-[calc(100dvh-3rem)] ${
            closing
              ? 'logout-modal-out'
              : 'logout-modal-in'
          }`}
        >
          {/* DECORATIVE GLOW */}

          <div className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full bg-red-100/70 blur-2xl" />

          <div className="pointer-events-none absolute -bottom-14 -left-10 h-32 w-32 rounded-full bg-indigo-100/50 blur-2xl" />


          {/* CLOSE BUTTON */}

          <button
            type="button"
            onClick={
              tutupKonfirmasi
            }
            disabled={
              busy ||
              closing
            }
            className="group absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-all duration-200 hover:rotate-90 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Tutup konfirmasi"
          >
            <X
              size={
                17
              }
            />
          </button>


          {/* =================================================
              SCROLLABLE CONTENT
          ================================================= */}

          <div className="relative overflow-y-auto px-6 pb-6 pt-7 sm:px-7">

            {/* ICON */}

            <div
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/25 ${
                closing
                  ? 'logout-icon-out'
                  : 'logout-icon-in'
              }`}
            >
              {busy ? (
                <span className="inline-block h-7 w-7 animate-spin rounded-full border-[3px] border-white/40 border-t-white" />
              ) : (
                <LogOut
                  size={
                    28
                  }
                  strokeWidth={
                    2.2
                  }
                  className="logout-icon-idle"
                />
              )}
            </div>


            {/* TITLE */}

            <div className="mt-5 text-center">
              <h2
                id="logout-title"
                className="text-lg font-extrabold tracking-tight text-slate-900"
              >
                Keluar dari akun?
              </h2>


              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
                Kamu akan keluar
                dari sesi
                Creativemu Academy
                di perangkat ini.
              </p>
            </div>


            {/* INFO */}

            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50 p-3">
              <ShieldCheck
                size={
                  17
                }
                className="mt-0.5 shrink-0 text-emerald-500"
              />

              <p className="text-[11px] leading-relaxed text-slate-500">
                Data akunmu tetap
                tersimpan. Kamu hanya
                perlu login kembali
                untuk mengakses sistem.
              </p>
            </div>


            {/* ERROR */}

            {error && (
              <div className="anim-down mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                <p className="text-xs font-semibold leading-relaxed text-red-600">
                  {
                    error
                  }
                </p>
              </div>
            )}


            {/* ACTIONS */}

            <div className="mt-5 grid grid-cols-2 gap-2.5">

              {/* CANCEL */}

              <button
                type="button"
                onClick={
                  tutupKonfirmasi
                }
                disabled={
                  busy ||
                  closing
                }
                className="btn-press group rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 hover:shadow-sm active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="inline-block transition-transform duration-200 group-hover:-translate-x-0.5">
                  Tetap di sini
                </span>
              </button>


              {/* LOGOUT */}

              <button
                type="button"
                onClick={
                  konfirmasiLogout
                }
                disabled={
                  busy ||
                  closing
                }
                className="btn-press group flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:from-red-600 hover:to-rose-700 hover:shadow-xl hover:shadow-red-500/25 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />

                    Keluar...
                  </>
                ) : (
                  <>
                    <LogOut
                      size={
                        16
                      }
                      className="transition-transform duration-200 group-hover:translate-x-1"
                    />

                    Keluar
                  </>
                )}
              </button>
            </div>


            {/* FOOTNOTE */}

            <p className="mt-3 text-center text-[10px] font-medium text-slate-300">
              Tekan ESC atau klik
              area luar untuk
              membatalkan
            </p>
          </div>
        </div>


        {/* =================================================
            ANIMATION
        ================================================= */}

        <style>
          {`
            @keyframes logoutBackdropIn {
              from {
                opacity: 0;
              }

              to {
                opacity: 1;
              }
            }


            @keyframes logoutBackdropOut {
              from {
                opacity: 1;
              }

              to {
                opacity: 0;
              }
            }


            @keyframes logoutModalIn {
              0% {
                opacity: 0;
                transform:
                  translateY(20px)
                  scale(0.91);
              }

              65% {
                opacity: 1;
                transform:
                  translateY(-4px)
                  scale(1.015);
              }

              100% {
                opacity: 1;
                transform:
                  translateY(0)
                  scale(1);
              }
            }


            @keyframes logoutModalOut {
              0% {
                opacity: 1;
                transform:
                  translateY(0)
                  scale(1);
              }

              100% {
                opacity: 0;
                transform:
                  translateY(16px)
                  scale(0.93);
              }
            }


            @keyframes logoutIconIn {
              0% {
                opacity: 0;
                transform:
                  scale(0.65)
                  rotate(-12deg);
              }

              70% {
                opacity: 1;
                transform:
                  scale(1.08)
                  rotate(3deg);
              }

              100% {
                opacity: 1;
                transform:
                  scale(1)
                  rotate(0);
              }
            }


            @keyframes logoutIconOut {
              from {
                opacity: 1;
                transform:
                  translateX(0)
                  scale(1);
              }

              to {
                opacity: 0;
                transform:
                  translateX(12px)
                  scale(0.75);
              }
            }


            @keyframes logoutIconIdle {
              0%,
              100% {
                transform:
                  translateX(0);
              }

              45% {
                transform:
                  translateX(2px);
              }

              60% {
                transform:
                  translateX(-1px);
              }
            }


            .logout-backdrop-in {
              animation:
                logoutBackdropIn
                220ms
                ease-out
                both;
            }


            .logout-backdrop-out {
              animation:
                logoutBackdropOut
                ${DURASI_TUTUP}ms
                ease-in
                both;
            }


            .logout-modal-in {
              animation:
                logoutModalIn
                340ms
                cubic-bezier(
                  0.22,
                  1,
                  0.36,
                  1
                )
                both;
            }


            .logout-modal-out {
              animation:
                logoutModalOut
                ${DURASI_TUTUP}ms
                cubic-bezier(
                  0.4,
                  0,
                  1,
                  1
                )
                both;
            }


            .logout-icon-in {
              animation:
                logoutIconIn
                420ms
                cubic-bezier(
                  0.22,
                  1,
                  0.36,
                  1
                )
                70ms
                both;
            }


            .logout-icon-out {
              animation:
                logoutIconOut
                180ms
                ease-in
                both;
            }


            .logout-icon-idle {
              animation:
                logoutIconIdle
                1.8s
                ease-in-out
                infinite;
            }


            @media (
              prefers-reduced-motion:
              reduce
            ) {
              .logout-backdrop-in,
              .logout-backdrop-out,
              .logout-modal-in,
              .logout-modal-out,
              .logout-icon-in,
              .logout-icon-out,
              .logout-icon-idle {
                animation:
                  none !important;
              }
            }
          `}
        </style>
      </div>
    ) : null;


  return (
    <>
      {/* ===================================================
          TOPBAR LOGOUT BUTTON
      =================================================== */}

      <button
        type="button"
        onClick={
          bukaKonfirmasi
        }
        className="group relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-500 transition-all duration-300 hover:scale-105 hover:bg-red-50 hover:text-red-600 hover:shadow-md hover:shadow-red-500/10 active:scale-90"
        title="Logout"
        aria-label="Logout"
      >
        <span className="pointer-events-none absolute inset-0 scale-0 rounded-full bg-red-100/70 transition-transform duration-300 group-hover:scale-100" />


        <LogOut
          size={
            19
          }
          strokeWidth={
            2.2
          }
          className="relative z-10 transition-all duration-300 ease-out group-hover:translate-x-0.5 group-hover:rotate-[4deg]"
        />


        <span className="absolute bottom-1.5 right-1.5 h-1.5 w-1.5 scale-0 rounded-full bg-red-500 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100" />
      </button>


      {/* ===================================================
          PORTAL

          Sangat penting:
          modal dirender di BODY, bukan di dalam HEADER.
      =================================================== */}

      {modal &&
        createPortal(
          modal,
          document.body
        )}
    </>
  );
}