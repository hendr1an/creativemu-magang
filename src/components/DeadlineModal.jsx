
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, CalendarClock } from 'lucide-react';

export default function DeadlineModal({
  open,
  onClose,
  title = 'Edit Tenggat',
  children,
  busy = false,
}) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const previousActive = document.activeElement;

    document.body.style.overflow = 'hidden';

    const frame = requestAnimationFrame(() => {
      const input = dialogRef.current?.querySelector(
        'input[type="date"]'
      );

      (input || closeRef.current)?.focus({
        preventScroll: true,
      });
    });

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !busy) {
        event.preventDefault();
        onClose();
      }

      if (event.key === 'Tab') {
        const elements = dialogRef.current?.querySelectorAll(
          'button:not(:disabled), input:not(:disabled), ' +
          'textarea:not(:disabled), select:not(:disabled)'
        );

        if (!elements?.length) return;

        const first = elements[0];
        const last = elements[elements.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === last
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;

      if (previousActive instanceof HTMLElement) {
        previousActive.focus({ preventScroll: true });
      }
    };
  }, [open, onClose, busy]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-slate-950/30 px-4 py-6 sm:px-6"
      style={{
        isolation: 'isolate',
        WebkitBackdropFilter: 'none',
        backdropFilter: 'none',
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <style>{`
        @keyframes deadlineDialogEnter {
          from {
            opacity: 0;
            transform: translateY(12px) scale(.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .deadline-dialog-enter {
          animation: deadlineDialogEnter .25s
            cubic-bezier(.2,.8,.2,1) both;
        }

        @media (prefers-reduced-motion: reduce) {
          .deadline-dialog-enter {
            animation: none !important;
          }
        }
      `}</style>

      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="deadline-modal-title"
        className="deadline-dialog-enter my-auto flex max-h-[min(85dvh,720px)] w-full max-w-[520px] flex-col overflow-hidden rounded-[24px] border border-white/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <CalendarClock size={20} />
            </span>

            <div className="min-w-0">
              <h2
                id="deadline-modal-title"
                className="truncate text-base font-semibold tracking-tight text-slate-900"
              >
                {title}
              </h2>

              <p className="mt-0.5 text-xs text-slate-400">
                Atur batas waktu pengerjaan
              </p>
            </div>
          </div>

          <button
            ref={closeRef}
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="Tutup pengaturan tenggat"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={19} />
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-6">
          {children}
        </div>
      </section>
    </div>,
    document.body
  );
}
