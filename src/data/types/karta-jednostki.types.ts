/** Pole karty jednostki: etykieta dokładnie jak na karcie i oczekiwana wartość. */
export interface PoleKarty {
  etykieta: string;
  wartosc: string;
}

/** Jednostka do sprawdzenia statusu i początku okresu obowiązywania (TC-20). */
export interface JednostkaZeStatusem {
  mpk: string;
  typWNaglowku: string;
  status: string;
  dataUtworzenia: string;
}

/** Dane stałe scenariusza TS_05 – Nawigacja w strukturze nadrzędna–podrzędna (jednostki dev po migracji). */
export interface DaneTs05 {
  tc23: { mpkNadrzednej: string; nazwaPodrzednej: string; mpkPodrzednej: string };
  /** `mpkWTabeli` – oczekiwana kolumna MPK tabeli struktury w kolejności z karty (własne komórki + podrzędne). */
  tc24: { mpkNadrzednej: string; mpkWTabeli: string[] };
  tc25: { mpkPodrzednej: string; nazwaNadrzednej: string; mpkNadrzednej: string };
  tc26: { mpk: string };
}

/** Dane stałe scenariusza TS_06 – Historia zmian jednostki. */
export interface DaneTs06 {
  /** Nagłówki kolumn tabeli historii wg makiety [FIG]. */
  kolumnyHistorii: string[];
  /** Jednostka – z fixture `zrealizowanaZmianaJednostki` (wpis importu + zmiana z testu). */
  tc27: { minimalnaLiczbaZmian: number };
  /** Rodzaj zmiany wpisu po realizacji zgłoszenia zmiany (login autora – z `.env`, nie z JSON). */
  tc28: { rodzajZmiany: string };
  /**
   * Jednostka zasilona migracją, bez zmian po zasileniu (tylko odczyt), i oczekiwany jedyny wpis historii:
   * rodzaj zmiany oraz początek podstawy (po nim numer partii importu).
   */
  tc29: { mpk: string; rodzajZmiany: string; podstawa: string };
  /** Jednostka z wpisami ze zrealizowanych zgłoszeń (tylko odczyt). */
  tc30: { mpk: string };
}

/** Dane stałe scenariusza TS_04 – Prezentacja danych na karcie jednostki (jednostki dev po migracji, tylko odczyt). */
export interface DaneTs04 {
  /** Sposób prezentacji pustego pola na karcie. */
  wartoscPustegoPola: string;
  /** Sposób prezentacji pustego pola na liście Rejestru (kolumna „PS / MPK / O-ZSI”). */
  wartoscPustegoPolaNaLiscie: string;
  tc17: { mpk: string; ps: string; ozsi: string };
  tc18: {
    mpk: string;
    nazwa: string;
    typWNaglowku: string;
    status: string;
    pola: PoleKarty[];
    /** Ścieżka struktury od obszaru do jednostki nadrzędnej. */
    struktura: string[];
  };
  tc19: { mpk: string; polaObowiazkowe: PoleKarty[]; polaPuste: string[] };
  tc20: { aktywna: JednostkaZeStatusem; zlikwidowana: JednostkaZeStatusem & { dataLikwidacji: string } };
  tc21: { mpkJednostek: string[] };
  tc22: { mpkKoc: string; mpkStatystycznej: string; jo2Statystycznej: string; statusStatystycznej: string };
}
