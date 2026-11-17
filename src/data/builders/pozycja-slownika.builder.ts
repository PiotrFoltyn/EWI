import type { PozycjaSlownika } from '../types/zarzadzanie.types';

/**
 * Tworzy unikalną pozycję słownika na potrzeby testu (słownik dev jest współdzielony, a pozycji nie da się usunąć –
 * tylko dezaktywować, więc każdy przebieg potrzebuje nowego kodu i nazwy).
 * @param prefiksNazwy - początek nazwy, np. „Typ testowy”
 * @param zastosowanie - opis zastosowania (pole obowiązkowe)
 * @returns pozycja z kodem `T` + znacznik czasu w base36 i nazwą „<prefiks> <ten sam znacznik>”
 */
export function zbudujPozycjeSlownika(prefiksNazwy: string, zastosowanie: string): PozycjaSlownika {
  const znacznik = (Date.now().toString(36) + Math.floor(Math.random() * 36 ** 2).toString(36)).toUpperCase();
  return { kod: `T${znacznik}`, nazwa: `${prefiksNazwy} ${znacznik}`, zastosowanie };
}
