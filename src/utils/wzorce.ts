/**
 * Zamienia dowolny tekst na bezpieczny fragment wyrażenia regularnego.
 * @param tekst - tekst do dopasowania dosłownie
 * @returns tekst z poprzedzonymi znakami specjalnymi regex
 */
export function escapujRegex(tekst: string): string {
  return tekst.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Wzorzec „zawiera tekst” bez rozróżniania wielkości liter.
 * @param tekst - szukany fragment
 * @returns wyrażenie regularne z flagą `i`
 */
export function zawieraBezWielkosciLiter(tekst: string): RegExp {
  return new RegExp(escapujRegex(tekst), 'i');
}

/**
 * Wzorzec licznika paginacji z podaną łączną liczbą wyników (np. „1–10 z 443”).
 * @param liczba - oczekiwana łączna liczba wyników
 * @returns wyrażenie regularne dopasowujące koniec licznika
 */
export function wzorzecLacznejLiczbyWynikow(liczba: number): RegExp {
  return new RegExp(` z ${liczba}$`);
}
