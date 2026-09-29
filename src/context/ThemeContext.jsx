import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { flushSync } from 'react-dom';

const ThemeContext = createContext(null);

const THEME_KEY = 'theme';
const THEME_SOURCE_KEY = 'theme-source';

function systemPrefersDark() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
  );
}

function bacaThemeLama() {
  try {
    const legacy = localStorage.getItem('mode-gelap');

    if (legacy === 'true') {
      return 'dark';
    }

    if (legacy === 'false') {
      return 'light';
    }
  } catch {
    // Abaikan jika storage tidak tersedia.
  }

  return null;
}

function getInitialTheme() {
  if (typeof document !== 'undefined') {
    const dariDom =
      document.documentElement.dataset.theme;

    if (
      dariDom === 'dark' ||
      dariDom === 'light'
    ) {
      return dariDom;
    }
  }

  try {
    const saved =
      localStorage.getItem(THEME_KEY);

    if (
      saved === 'dark' ||
      saved === 'light'
    ) {
      return saved;
    }

    const legacy =
      bacaThemeLama();

    if (legacy) {
      return legacy;
    }
  } catch {
    // Tetap gunakan system preference.
  }

  return systemPrefersDark()
    ? 'dark'
    : 'light';
}

function getInitialSource() {
  try {
    const saved =
      localStorage.getItem(
        THEME_SOURCE_KEY
      );

    if (saved === 'user') {
      return 'user';
    }

    /*
      Jika user pernah memakai toggle lama,
      anggap itu pilihan manual.
    */
    const legacy =
      localStorage.getItem(
        'mode-gelap'
      );

    if (
      legacy === 'true' ||
      legacy === 'false'
    ) {
      return 'user';
    }
  } catch {
    // Abaikan.
  }

  return 'system';
}

function applyThemeToDom(theme) {
  const root =
    document.documentElement;

  const dark =
    theme === 'dark';

  root.dataset.theme =
    theme;

  /*
    Tetap pasang class "dark".
    Berguna kalau ke depan kita ingin
    memakai dark: Tailwind secara langsung.
  */
  root.classList.toggle(
    'dark',
    dark
  );

  root.style.colorScheme =
    theme;

  const meta =
    document.querySelector(
      'meta[name="theme-color"]'
    );

  if (meta) {
    meta.setAttribute(
      'content',
      dark
        ? '#0f172a'
        : '#f8fafc'
    );
  }
}

function persistTheme(
  theme,
  source
) {
  try {
    localStorage.setItem(
      THEME_KEY,
      theme
    );

    localStorage.setItem(
      THEME_SOURCE_KEY,
      source
    );

    /*
      Hapus preference lama setelah
      sistem baru sukses menyimpan.
    */
    localStorage.removeItem(
      'mode-gelap'
    );
  } catch {
    /*
      Theme tetap bekerja di memory
      walau browser memblokir storage.
    */
  }
}

function maxRadiusFromPoint(
  x,
  y
) {
  const kanan =
    window.innerWidth - x;

  const bawah =
    window.innerHeight - y;

  return Math.hypot(
    Math.max(x, kanan),
    Math.max(y, bawah)
  );
}

export function ThemeProvider({
  children,
}) {
  const [
    theme,
    setThemeState,
  ] = useState(
    getInitialTheme
  );

  const [
    source,
    setSource,
  ] = useState(
    getInitialSource
  );

  const commitTheme =
    useCallback(
      (
        nextTheme,
        nextSource
      ) => {
        applyThemeToDom(
          nextTheme
        );

        persistTheme(
          nextTheme,
          nextSource
        );

        flushSync(() => {
          setThemeState(
            nextTheme
          );

          setSource(
            nextSource
          );
        });
      },
      []
    );

  const changeTheme =
    useCallback(
      async (
        nextTheme,
        event = null,
        nextSource = 'user'
      ) => {
        if (
          nextTheme !== 'dark' &&
          nextTheme !== 'light'
        ) {
          return;
        }

        if (
          nextTheme === theme &&
          nextSource === source
        ) {
          return;
        }

        const reduceMotion =
          window.matchMedia?.(
            '(prefers-reduced-motion: reduce)'
          ).matches;

        const canViewTransition =
          typeof document.startViewTransition ===
            'function' &&
          !reduceMotion;

        /*
          Fallback browser lama:
          transisi warna biasa.
        */
        if (!canViewTransition) {
          if (!reduceMotion) {
            document.documentElement
              .classList.add(
                'theme-transition'
              );
          }

          commitTheme(
            nextTheme,
            nextSource
          );

          window.setTimeout(
            () => {
              document.documentElement
                .classList.remove(
                  'theme-transition'
                );
            },
            450
          );

          return;
        }

        /*
          Posisi ripple berasal dari tombol
          yang diklik. Jika tidak tersedia,
          animasi dimulai dari kanan atas.
        */
        const x =
          event?.clientX ??
          window.innerWidth - 50;

        const y =
          event?.clientY ??
          50;

        const radius =
          maxRadiusFromPoint(
            x,
            y
          );

        try {
          const transition =
            document.startViewTransition(
              () => {
                commitTheme(
                  nextTheme,
                  nextSource
                );
              }
            );

          await transition.ready;

          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${radius}px at ${x}px ${y}px)`,
              ],
            },
            {
              duration: 460,

              easing:
                'cubic-bezier(.22, 1, .36, 1)',

              pseudoElement:
                '::view-transition-new(root)',
            }
          );
        } catch {
          commitTheme(
            nextTheme,
            nextSource
          );
        }
      },
      [
        commitTheme,
        source,
        theme,
      ]
    );

  const toggleTheme =
    useCallback(
      (event = null) => {
        const next =
          theme === 'dark'
            ? 'light'
            : 'dark';

        return changeTheme(
          next,
          event,
          'user'
        );
      },
      [
        changeTheme,
        theme,
      ]
    );

  const followSystemTheme =
    useCallback(
      (event = null) => {
        const systemTheme =
          systemPrefersDark()
            ? 'dark'
            : 'light';

        return changeTheme(
          systemTheme,
          event,
          'system'
        );
      },
      [changeTheme]
    );

  /*
    Pastikan DOM dan React selalu sinkron.
  */
  useEffect(() => {
    applyThemeToDom(
      theme
    );
  }, [theme]);

  /*
    Listener perubahan tema OS secara realtime.
    Hanya mengubah aplikasi kalau source =
    "system", jadi pilihan manual user tidak
    tiba-tiba ditimpa Windows/macOS.
  */
  useEffect(() => {
    const media =
      window.matchMedia?.(
        '(prefers-color-scheme: dark)'
      );

    if (!media) {
      return undefined;
    }

    const handleSystemChange =
      (event) => {
        if (
          source !==
          'system'
        ) {
          return;
        }

        const next =
          event.matches
            ? 'dark'
            : 'light';

        applyThemeToDom(
          next
        );

        persistTheme(
          next,
          'system'
        );

        setThemeState(
          next
        );
      };

    media.addEventListener?.(
      'change',
      handleSystemChange
    );

    return () => {
      media.removeEventListener?.(
        'change',
        handleSystemChange
      );
    };
  }, [source]);

  const value =
    useMemo(
      () => ({
        theme,

        source,

        isDark:
          theme === 'dark',

        toggleTheme,

        setTheme:
          changeTheme,

        followSystemTheme,
      }),
      [
        theme,
        source,
        toggleTheme,
        changeTheme,
        followSystemTheme,
      ]
    );

  return (
    <ThemeContext.Provider
      value={value}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context =
    useContext(
      ThemeContext
    );

  if (!context) {
    throw new Error(
      'useTheme harus digunakan di dalam ThemeProvider.'
    );
  }

  return context;
}