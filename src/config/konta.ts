import { Rola } from '../data/rola';

/** Dane logowania jednej roli – pochodzą wyłącznie ze zmiennych środowiskowych (.env / CI). */
export interface Konto {
  login: string;
  haslo: string;
}

const PREFIKSY_ZMIENNYCH: Record<Rola, string> = {
  [Rola.Administrator]: 'EWI_ADMINISTRATOR',
  [Rola.UzytkownikPodstawowy]: 'EWI_UZYTKOWNIK_PODSTAWOWY',
};

/**
 * Zwraca konto dla roli lub `undefined`, gdy na środowisku nie skonfigurowano danych logowania.
 * @param rola - rola, dla której szukamy konta
 * @returns login i hasło roli albo `undefined`
 */
export function znajdzKonto(rola: Rola): Konto | undefined {
  const prefiks = PREFIKSY_ZMIENNYCH[rola];
  const login = process.env[`${prefiks}_LOGIN`];
  const haslo = process.env[`${prefiks}_HASLO`];
  return login && haslo ? { login, haslo } : undefined;
}

/**
 * Zwraca konto dla roli; gdy brak danych logowania – przerywa z czytelnym błędem.
 * @param rola - rola, dla której potrzebne jest konto
 * @returns login i hasło roli
 */
export function pobierzKonto(rola: Rola): Konto {
  const konto = znajdzKonto(rola);
  if (!konto) {
    throw new Error(
      `Brak danych logowania dla roli „${rola}”. Uzupełnij ${PREFIKSY_ZMIENNYCH[rola]}_LOGIN / _HASLO w .env.`,
    );
  }
  return konto;
}
