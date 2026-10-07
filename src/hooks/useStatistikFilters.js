import {
  useMemo,
  useState,
} from 'react';


export const STATISTIK_DIVISI = [
  'Semua',
  'Admin',
  'Sosmed',
  'Marketplace',
  'Web Developer',
];


export const STATISTIK_STATUS_PENDAFTARAN = [
  'Semua',
  'Approved',
  'Pending',
  'Rejected',
];


export const STATISTIK_STATUS_MAGANG = [
  'Semua',
  'Active',
  'Completed',
  'Dropped',
];


export const STATISTIK_METRIC = [
  'pendaftar',
  'diterima',
  'pending',
  'ditolak',
  'mulai',
  'nonaktif',
];


export const DEFAULT_FILTERS = {
  rangeBulan:
    12,

  tahun:
    'Semua',

  bulan:
    'Semua',

  divisi:
    'Semua',

  jurusan:
    'Semua',

  // Tetap memakai nama "status"
  // untuk kompatibilitas komponen lama.
  status:
    'Semua',

  statusMagang:
    'Semua',

  metric:
    'pendaftar',

  sortKey:
    'bulan',

  sortDirection:
    'desc',
};


export function useStatistikFilters() {
  const [
    filters,
    setFilters,
  ] =
    useState(
      DEFAULT_FILTERS
    );


  function updateFilter(
    key,
    value
  ) {
    setFilters(
      (
        previous
      ) => ({
        ...previous,
        [key]:
          value,
      })
    );
  }


  /*
    Reset hanya filter statistik global.

    Metric chart + sorting tabel tetap
    dipertahankan agar UX tidak terasa
    "loncat" setelah reset.
  */
  function resetFilters() {
    setFilters(
      (
        previous
      ) => ({
        ...previous,

        rangeBulan:
          DEFAULT_FILTERS.rangeBulan,

        tahun:
          DEFAULT_FILTERS.tahun,

        bulan:
          DEFAULT_FILTERS.bulan,

        divisi:
          DEFAULT_FILTERS.divisi,

        jurusan:
          DEFAULT_FILTERS.jurusan,

        status:
          DEFAULT_FILTERS.status,

        statusMagang:
          DEFAULT_FILTERS.statusMagang,
      })
    );
  }


  function resetAll() {
    setFilters(
      DEFAULT_FILTERS
    );
  }


  function toggleSort(
    key
  ) {
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
  }


  const activeFilterCount =
    useMemo(
      () =>
        [
          filters.rangeBulan !==
            DEFAULT_FILTERS.rangeBulan,

          filters.tahun !==
            'Semua',

          filters.bulan !==
            'Semua',

          filters.divisi !==
            'Semua',

          filters.jurusan !==
            'Semua',

          filters.status !==
            'Semua',

          filters.statusMagang !==
            'Semua',
        ].filter(
          Boolean
        ).length,
      [
        filters,
      ]
    );


  const hasActiveFilter =
    activeFilterCount >
    0;


  return {
    filters,

    updateFilter,

    resetFilters,

    resetAll,

    toggleSort,

    hasActiveFilter,

    activeFilterCount,
  };
}