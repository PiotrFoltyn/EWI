import type { UstawieniaFiltrow } from '../../components/panel-filtrow.component';

/** Dane stałe scenariusza TS_08 – ekran startowy (Dashboard) i nawigacja z menu głównego. */
export interface DaneTs08 {
  /** TC-34: etykiety ekranu startowego i menu głównego (dev, rola Administrator, 19.11.2026). */
  tc34: {
    /** Początek powitania – dalej jest login użytkownika. */
    powitanie: string;
    opis: string;
    przyciskNowegoZgloszenia: string;
    /** Pozycje menu głównego wymagane przez przypadek (odpowiedniki „Dashboard”, „Rejestr jednostek”, „Raporty”). */
    pozycjeMenu: string[];
    sekcje: string[];
    placeholderWyszukiwarki: string;
  };
  /** TC-36: zawartość ekranu Raporty – raporty standardowe (pliki dla odbiorców) i raport własny (ad hoc). */
  tc36: {
    raportyStandardowe: string[];
    raportWlasny: string;
  };
  /** TC-38: zgodność liczników dashboardu z katalogiem. */
  tc38: {
    komunikatBrakuZgloszen: string;
    /** Filtry Rejestru odpowiadające kafelkowi „Oddziały w likwidacji”. */
    filtryOddzialowWLikwidacji: UstawieniaFiltrow;
  };
}
