/** Dane pozycji słownika wprowadzane w formularzu „Dodaj pozycję słownika”. */
export interface PozycjaSlownika {
  kod: string;
  nazwa: string;
  zastosowanie: string;
}

/** Dane stałe scenariusza TS_09 – Zarządzanie słownikiem typów jednostek (Zarządzanie → Słowniki SAP). */
export interface DaneTs09 {
  /** Początek nazwy tworzonych typów – reszta (unikalny znacznik) z buildera. */
  prefiksNazwyTypu: string;
  zastosowanieTypu: string;
  /** Wartości kolumny „Aktywna”. */
  aktywnaTak: string;
  aktywnaNie: string;
  komunikatWymaganegoPola: string;
  /** Komunikat przy dodaniu pozycji z istniejącym kodem. */
  komunikatDuplikatu: string;
  /** Dopisywany do nazwy przy edycji (TC-40, TC-45). */
  przyrostekNowejNazwy: string;
}
