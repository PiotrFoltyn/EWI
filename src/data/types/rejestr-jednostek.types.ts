import type { UstawieniaFiltrow } from '../../components/panel-filtrow.component';

/** Dane stałe scenariusza TS_01 – Wyszukiwanie jednostek po nazwie. */
export interface DaneTs01 {
  tc01: { pelnaNazwa: string };
  tc02: { fragmentNazwy: string; minimalnaLiczbaWynikow: number };
  tc03: { fraza: string; komunikatBrakuWynikow: string };
  tc04: { mpkZlikwidowanej: string; statusZlikwidowana: string };
}

/** Dane stałe scenariusza TS_02 – Wyszukiwanie jednostek po identyfikatorach MPK, PS i O-ZSI. */
export interface DaneTs02 {
  tc05: { mpk: string };
  tc06: { ps: string };
  tc07: { psWspoldzielony: string; mpkJednostek: string[] };
  tc08: { ozsi: string };
  tc09: { fragmentMpk: string; minimalnaLiczbaWynikow: number };
}

/** Dane stałe scenariusza TS_03 – Filtrowanie listy jednostek (liczby wyników: stan dev po migracji). */
export interface DaneTs03 {
  tc10: { filtry: UstawieniaFiltrow; typWKolumnie: string; oczekiwanaLiczbaWynikow: number };
  tc11: {
    filtry: UstawieniaFiltrow;
    pionNaKarcie: string;
    oczekiwanaLiczbaWynikow: number;
    liczbaSprawdzanychKart: number;
  };
  tc12: {
    filtry: UstawieniaFiltrow;
    regionNaKarcie: string;
    oczekiwanaLiczbaWynikow: number;
    liczbaSprawdzanychKart: number;
  };
  tc13: { filtry: UstawieniaFiltrow; statusWKolumnie: string };
  tc14: { filtry: UstawieniaFiltrow; fragmentNazwy: string; typWKolumnie: string; oczekiwanaLiczbaWynikow: number };
  tc15: { filtry: UstawieniaFiltrow; komunikatBrakuWynikow: string };
  tc16: { filtry: UstawieniaFiltrow; wartoscPustegoFiltra: string };
}
