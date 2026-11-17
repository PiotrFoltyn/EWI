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

/** Format daty z godziną w EWI, np. „Data zmiany” w historii: „13.11.2026, 12:05”. */
export const WZORZEC_DATY_ZMIANY = /^(\d{2})\.(\d{2})\.(\d{4}), (\d{2}):(\d{2})$/;

/**
 * Zamienia datę w formacie `WZORZEC_DATY_ZMIANY` na znacznik czasu do porównań kolejności.
 * @param tekst - data w formacie „13.11.2026, 12:05”
 * @returns liczba milisekund (Date.UTC – strefa nie ma znaczenia przy porównaniu)
 * @throws gdy tekst nie pasuje do formatu – zamiast po cichu zwrócić błędny znacznik
 */
export function znacznikCzasuDatyZmiany(tekst: string): number {
  const dopasowanie = WZORZEC_DATY_ZMIANY.exec(tekst.trim());
  if (!dopasowanie) {
    throw new Error(`Nieoczekiwany format daty zmiany: „${tekst}”`);
  }
  const [dzien, miesiac, rok, godzina, minuta] = dopasowanie.slice(1).map(Number);
  return Date.UTC(rok ?? 0, (miesiac ?? 1) - 1, dzien ?? 0, godzina ?? 0, minuta ?? 0);
}

/**
 * Dzisiejsza data w strefie Europe/Warsaw w formacie ISO „RRRR-MM-DD” (np. kolumna „Ostatnia zmiana” słowników).
 * @returns data, np. „2026-11-16”
 */
export function dzisiejszaDataIso(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw' }).format(new Date());
}
