import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  LoaderCircle,
} from 'lucide-react';

import {
  exportDataAnakMagang,
} from '../lib/statisticsExcelExport';


export default function StatisticsExportMenu({
  filters,
}) {
  const containerRef =
    useRef(
      null
    );


  const [
    open,
    setOpen,
  ] =
    useState(
      false
    );


  const [
    exporting,
    setExporting,
  ] =
    useState(
      false
    );


  const [
    message,
    setMessage,
  ] =
    useState(
      null
    );


  /* =======================================================
     CLOSE WHEN CLICK OUTSIDE
  ======================================================= */

  useEffect(
    () => {
      if (
        !open
      ) {
        return undefined;
      }


      function handleMouseDown(
        event
      ) {
        if (
          containerRef.current &&
          !containerRef.current.contains(
            event.target
          )
        ) {
          setOpen(
            false
          );
        }
      }


      function handleKeyDown(
        event
      ) {
        if (
          event.key ===
          'Escape'
        ) {
          setOpen(
            false
          );
        }
      }


      document.addEventListener(
        'mousedown',
        handleMouseDown
      );


      window.addEventListener(
        'keydown',
        handleKeyDown
      );


      return () => {
        document.removeEventListener(
          'mousedown',
          handleMouseDown
        );


        window.removeEventListener(
          'keydown',
          handleKeyDown
        );
      };
    },
    [
      open,
    ]
  );


  /* =======================================================
     AUTO HIDE MESSAGE
  ======================================================= */

  useEffect(
    () => {
      if (
        !message
      ) {
        return undefined;
      }


      const timer =
        window.setTimeout(
          () => {
            setMessage(
              null
            );
          },
          3500
        );


      return () => {
        window.clearTimeout(
          timer
        );
      };
    },
    [
      message,
    ]
  );


  /* =======================================================
     EXPORT DATA MAGANG
  ======================================================= */

  async function handleExportDataMagang() {
    if (
      exporting
    ) {
      return;
    }


    setExporting(
      true
    );


    setMessage(
      null
    );


    try {
      const result =
        await exportDataAnakMagang({
          filters,
        });


      setOpen(
        false
      );


      setMessage({
        type:
          'success',

        text:
          `${result.total} data peserta berhasil diexport.`,
      });
    } catch (
      error
    ) {
      console.error(
        'Export data anak magang gagal:',
        error
      );


      setMessage({
        type:
          'error',

        text:
          error?.message ??
          'Export Excel gagal dilakukan.',
      });
    } finally {
      setExporting(
        false
      );
    }
  }


  return (
    <div
      ref={
        containerRef
      }
      className="relative"
    >
      <button
        type="button"
        onClick={() =>
          setOpen(
            (
              previous
            ) =>
              !previous
          )
        }
        disabled={
          exporting
        }
        className="
          group
          inline-flex
          h-10
          items-center
          gap-2
          rounded-xl
          bg-emerald-600
          px-3.5
          text-xs
          font-bold
          text-white
          shadow-sm
          transition-all
          duration-200
          hover:-translate-y-0.5
          hover:bg-emerald-700
          hover:shadow-md
          active:translate-y-0
          active:scale-[0.98]
          disabled:cursor-wait
          disabled:opacity-60
        "
      >
        {exporting ? (
          <LoaderCircle
            size={
              15
            }
            className="animate-spin"
          />
        ) : (
          <FileSpreadsheet
            size={
              15
            }
            className="transition-transform duration-200 group-hover:scale-110"
          />
        )}


        {exporting
          ? 'Menyiapkan Excel...'
          : 'Export Excel'}


        {!exporting && (
          <ChevronDown
            size={
              13
            }
            className={`transition-transform duration-200 ${
              open
                ? 'rotate-180'
                : ''
            }`}
          />
        )}
      </button>


      {/* =================================================
          DROPDOWN
      ================================================= */}

      {open &&
        !exporting && (
        <div
          className="
            absolute
            right-0
            top-[calc(100%+8px)]
            z-[100]
            w-[290px]
            origin-top-right
            overflow-hidden
            rounded-2xl
            border
            border-slate-100
            bg-white
            p-2
            shadow-[0_18px_55px_rgba(15,23,42,0.15)]
            animate-[statisticsExportMenuIn_150ms_ease-out]
          "
        >
          <div className="px-3 pb-2 pt-2">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-slate-400">
              Export Excel
            </p>

            <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
              Export mengikuti Filter Statistik yang sedang aktif.
            </p>
          </div>


          <button
            type="button"
            onClick={
              handleExportDataMagang
            }
            className="
              group
              flex
              w-full
              items-center
              gap-3
              rounded-xl
              px-3
              py-3
              text-left
              transition
              duration-150
              hover:bg-emerald-50
              active:scale-[0.99]
            "
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-transform duration-150 group-hover:scale-105">
              <Download
                size={
                  17
                }
              />
            </span>


            <span className="min-w-0">
              <span className="block text-xs font-extrabold text-slate-700">
                Export Data Anak Magang
              </span>

              <span className="mt-0.5 block text-[9px] leading-relaxed text-slate-400">
                Nama, instansi, jurusan, divisi, status, periode dan nilai.
              </span>
            </span>
          </button>


          <div className="mx-3 my-1 border-t border-slate-100" />


          <div className="px-3 py-2">
            <p className="text-[8px] leading-relaxed text-slate-400">
              🔒 Kredensial, password, token, UUID autentikasi dan metadata internal tidak disertakan.
            </p>
          </div>
        </div>
      )}


      {/* =================================================
          RESULT MESSAGE
      ================================================= */}

      {message && (
        <div
          className={`absolute right-0 top-[calc(100%+8px)] z-[110] w-[290px] rounded-xl border px-3.5 py-3 text-[10px] font-semibold shadow-lg ${
            message.type ===
            'success'
              ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
              : 'border-red-100 bg-red-50 text-red-600'
          }`}
        >
          {
            message.text
          }
        </div>
      )}


      <style>
        {`
          @keyframes statisticsExportMenuIn {
            from {
              opacity: 0;
              transform: translateY(-4px) scale(0.98);
            }

            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            [class*="animate-[statisticsExportMenuIn"] {
              animation: none !important;
            }
          }
        `}
      </style>
    </div>
  );
}