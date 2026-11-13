/**
 * Słownik dozwolonych tagów testów.
 * Priorytet mapowany z zakładki „Kwalifikacja”: Wysoki → @P1, Średni → @P2, Niski → @P3.
 */
export const TAGI = {
  priorytet: { wysoki: '@P1', sredni: '@P2', niski: '@P3' },
  rodzaj: { pozytywny: '@pozytywny', negatywny: '@negatywny' },
  warstwa: { e2e: '@e2e', api: '@api' },
  kwalifikacja: { smoke: '@smoke', regresja: '@regresja' },
} as const;
