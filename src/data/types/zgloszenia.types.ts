import type { UstawieniaFiltrow } from '../../components/panel-filtrow.component';

/** Dane stałe wspólne dla scenariuszy zgłoszeń (TS_14 – TS_16). */
export interface DaneZgloszen {
  /** Filtry Rejestru do wyboru aktywnej jednostki technicznej bez otwartego zgłoszenia. */
  filtryAktywnejJt: UstawieniaFiltrow;
  /** Filtry Rejestru dla zlikwidowanej jednostki technicznej. */
  filtryZlikwidowanejJt: UstawieniaFiltrow;
  komunikatWyslania: string;
  komunikatWymaganegoPola: string;
  /** Pole w tabeli „Zmiany do wprowadzenia” dla zmiany nazwy. */
  poleZmianyNazwy: string;
}

/** Dane stałe TS_14 – zgłoszenie zmiany KOC, SJO i Pionu (role „Zgłaszający KOC/SJO/Pion”). */
export interface DaneTs14 extends DaneZgloszen {
  typJednostkiJt: string;
}

/** Dane stałe TS_15 – zmiana przeznaczenia MPK jednostki technicznej (akceptacja kosztów). */
export type DaneTs15 = DaneZgloszen;

/** Dane stałe TS_16 – zgłoszenie likwidacji. */
export interface DaneTs16 extends DaneZgloszen {
  /** Liczba dni w przyszłość dla daty likwidacji (TC-107, TC-114). */
  dniDoLikwidacji: number;
}
