/** Unikalne wartości jednego zgłoszenia – parametryzowane datą i godziną, bo w EWI nie może być duplikatów. */
export interface DaneZgloszenia {
  /** Znacznik „RRMMDD-GGMMSS” (Europe/Warsaw) z losowym przyrostkiem – wspólny dla wszystkich pól zgłoszenia. */
  znacznik: string;
  /** Nowa nazwa długa (max 40 znaków). */
  nazwaDluga: string;
  /** Nowa nazwa krótka (max 20 znaków). */
  nazwaKrotka: string;
  /** Uzasadnienie zgłoszenia z identyfikatorem przypadku i znacznikiem – pozwala odnaleźć zgłoszenie. */
  uzasadnienie: string;
  /** Uzasadnienie kosztów (zmiana przeznaczenia MPK). */
  uzasadnienieKosztow: string;
}

/**
 * Znacznik czasu w strefie Europe/Warsaw w formacie „RRMMDD-GGMMSS” z dwuznakowym losowym przyrostkiem
 * (dwa testy uruchomione w tej samej sekundzie na różnych workerach dostaną różne wartości).
 * @returns znacznik, np. „261118-131005K7”
 */
export function znacznikCzasu(): string {
  const czesci = new Intl.DateTimeFormat('pl-PL', {
    timeZone: 'Europe/Warsaw',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const czesc = (typ: Intl.DateTimeFormatPartTypes): string => czesci.find((c) => c.type === typ)?.value ?? '00';
  const losowy = Math.floor(Math.random() * 36 ** 2)
    .toString(36)
    .toUpperCase()
    .padStart(2, '0');
  return `${czesc('year')}${czesc('month')}${czesc('day')}-${czesc('hour')}${czesc('minute')}${czesc('second')}${losowy}`;
}

/**
 * Buduje unikalne dane zgłoszenia dla przypadku testowego.
 * @param idPrzypadku - identyfikator przypadku, np. „TC-107”
 * @returns nazwy i uzasadnienia z tym samym znacznikiem
 */
export function zbudujDaneZgloszenia(idPrzypadku: string): DaneZgloszenia {
  const znacznik = znacznikCzasu();
  return {
    znacznik,
    nazwaDluga: `TEST AUTO ${idPrzypadku} ${znacznik}`.slice(0, 40),
    nazwaKrotka: `TA ${znacznik}`.slice(0, 20),
    uzasadnienie: `Test automatyczny ${idPrzypadku} – ${znacznik}`,
    uzasadnienieKosztow: `Test automatyczny ${idPrzypadku} – koszty ${znacznik}`,
  };
}

/**
 * Data przesunięta o podaną liczbę dni od dziś (Europe/Warsaw – czas lokalny maszyny testowej).
 * @param dni - liczba dni (ujemna = przeszłość)
 * @returns data w południe (bez przesunięć strefy przy wyborze w kalendarzu)
 */
export function dataZaDni(dni: number): Date {
  const data = new Date();
  data.setHours(12, 0, 0, 0);
  data.setDate(data.getDate() + dni);
  return data;
}
