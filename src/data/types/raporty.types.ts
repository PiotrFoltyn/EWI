/** Wzorzec pliku od odbiorcy: wiersz nagłówków (od 1, jak w Excelu) i kolumny w kolejności. */
export interface WzorzecPliku {
  plik: string;
  arkusz?: string;
  wierszNaglowkow: number;
  kolumny: string[];
}

/** Dane stałe scenariusza TS_10 – pliki MPK_DICT, Temat 5013 i Zmiany OZSI (wzorce dostarczone 18.11.2026). */
export interface DaneTs10 {
  wzorzecMpkDict: WzorzecPliku;
  wzorzecTemat5013: WzorzecPliku;
  /** Nazwy kolumn używane w asercjach. */
  kolumny: {
    kodMpk: string;
    kodSp: string;
    dataLikwidacji: string;
    ps: string;
    nazwa: string;
    ozsi: string;
  };
  /** Wartość „Kod jednostki MPK” dla jednostek zlikwidowanych w MPK_DICT (P-66). */
  znacznikLikwidacji: string;
  /** Format numeru PS (4 cyfry z wiodącymi zerami, P-67). */
  formatPs: string;
  nazwaPlikuMpkDict: string;
  nazwaPlikuTemat5013: string;
  /**
   * TC-49: `probkiMpk` – jednostki dev porównywane z kartą; `zlikwidowaneBezDatyWeWzorcu` – wiersze „_likw” bez „data likwidacji” we wzorcu od odbiorcy (dane źródłowe). */
  tc49: { probkiMpk: string[]; zlikwidowaneBezDatyWeWzorcu: number };
}

/** Dane stałe scenariusza TS_11 – raport ad hoc (raport własny); daty „do” = dziś z buildera. */
export interface DaneTs11 {
  /** Raport ad hoc: tytuł w wierszu 1, nagłówki w wierszu 2. */
  wierszNaglowkow: number;
  wierszNaglowkowTemat5013: number;
  kolumny: { nazwa: string; ps: string; mpk: string; ozsi: string; dataObowiazywania: string };
  /** Początek okresu obejmującego zmiany jednostek na dev (import 13.11.2026). */
  okresZmian: { od: string };
  tc57: { nazwa: string };
  tc58: { ps: string };
  tc59: { mpk: string };
  tc60: { ozsi: string };
  tc61: { od: string };
  tc62: { nazwa: string; od: string };
  tc63: { od: string; do: string };
}
