import {
  useCallback,
  useMemo,
  useState,
} from 'react';


const DEFAULT_FILTERS = {
  rangeBulan:
    12,

  tahun:
    'Semua',

  bulan:
    'Semua',

  divisi:
    'Semua',

  status:
    'Semua',

  metric:
    'pendaftar',

  sortKey:
    'bulan',

  sortDirection:
    'desc',
};


export const STATISTIK_DIVISI = [
  'Semua',
  'Admin',
  'Sosmed',
  'Marketplace',
  'Web Developer',
];


export const STATISTIK_STATUS = [
  'Semua',
  'Approved',
  'Pending',
  'Rejected',
];


export const STATISTIK_METRIC = [
  {
    value:
      'pendaftar',

    label:
      'Total Pendaftar',
  },

  {
    value:
      'diterima',

    label:
      'Diterima',
  },

  {
    value:
      'pending',

    label:
      'Pending',
  },

  {
    value:
      'ditolak',

    label:
      'Ditolak',
  },

  {
    value:
      'mulai',

    label:
      'Mulai Magang',
  },

  {
    value:
      'nonaktif',

    label:
      'Nonaktif',
  },
];


export function useStatistikFilters() {
  const [
    filters,
    setFilters,
  ] =
    useState(
      DEFAULT_FILTERS
    );


  const updateFilter =
    useCallback(
      (
        key,
        value
      ) => {
        setFilters(
          (
            previous
          ) => ({
            ...previous,

            [key]:
              value,
          })
        );
      },
      []
    );


  /*
    Reset hanya filter tabel.

    rangeBulan dan metric grafik
    sengaja dipertahankan.
  */
  const resetFilters =
    useCallback(
      () => {
        setFilters(
          (
            previous
          ) => ({
            ...previous,

            tahun:
              'Semua',

            bulan:
              'Semua',

            divisi:
              'Semua',

            status:
              'Semua',

            sortKey:
              'bulan',

            sortDirection:
              'desc',
          })
        );
      },
      []
    );


  const resetAll =
    useCallback(
      () => {
        setFilters(
          DEFAULT_FILTERS
        );
      },
      []
    );


  const toggleSort =
    useCallback(
      (
        key
      ) => {
        setFilters(
          (
            previous
          ) => {
            if (
              previous.sortKey ===
              key
            ) {
              return {
                ...previous,

                sortDirection:
                  previous.sortDirection ===
                  'asc'
                    ? 'desc'
                    : 'asc',
              };
            }


            return {
              ...previous,

              sortKey:
                key,

              sortDirection:
                key ===
                'bulan'
                  ? 'desc'
                  : 'desc',
            };
          }
        );
      },
      []
    );


  const hasActiveFilter =
    useMemo(
      () =>
        filters.tahun !==
          'Semua' ||
        filters.bulan !==
          'Semua' ||
        filters.divisi !==
          'Semua' ||
        filters.status !==
          'Semua',
      [
        filters.tahun,
        filters.bulan,
        filters.divisi,
        filters.status,
      ]
    );


  return {
    filters,

    updateFilter,

    resetFilters,

    resetAll,

    toggleSort,

    hasActiveFilter,
  };
}