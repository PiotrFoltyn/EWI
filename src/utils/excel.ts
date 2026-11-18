import type { Download, TestInfo } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import czytajXlsx, { type CellValue, type Row } from 'read-excel-file/universal';

/** Pierwszy arkusz pliku xlsx: nazwa i wiersze (komórki puste = `null`). */
export interface ArkuszXlsx {
  nazwa: string;
  wiersze: Row[];
}

/**
 * Wczytuje pierwszy arkusz pliku xlsx.
 * Pliki EWI są zapisywane strumieniowo (ZIP z „data descriptor”), których nie rozpakuje wariant `read-excel-file/node`
 * – dlatego czytamy bufor wariantem `universal` (fflate).
 * @param sciezka - ścieżka pobranego pliku
 * @returns nazwa i wiersze pierwszego arkusza
 */
export async function czytajArkusz(sciezka: string): Promise<ArkuszXlsx> {
  const arkusze = await czytajXlsx(new Blob([await readFile(sciezka)]));
  const [pierwszy] = arkusze;
  if (!pierwszy) {
    throw new Error(`Plik ${sciezka} nie zawiera arkuszy`);
  }
  return { nazwa: pierwszy.sheet, wiersze: pierwszy.data };
}

/**
 * Nazwy kolumn z wiersza nagłówków – bez pustych komórek (pliki EWI mają puste kolumny techniczne na początku).
 * @param wiersz - wiersz nagłówków
 * @returns nazwy kolumn w kolejności z pliku
 */
export function nazwyKolumn(wiersz: Row | undefined): string[] {
  return (wiersz ?? []).filter((komorka) => komorka !== null).map(String);
}

/**
 * Tekst komórki (`''` dla pustej) – do porównań z wartościami z ekranu.
 * @param komorka - wartość komórki
 * @returns komórka jako tekst
 */
export function tekstKomorki(komorka: CellValue | null | undefined): string {
  return komorka === null || komorka === undefined ? '' : String(komorka).trim();
}

/**
 * Wiersze danych arkusza jako obiekty `nazwa kolumny → tekst`.
 * @param arkusz - wczytany arkusz
 * @param numerWierszaNaglowkow - numer wiersza nagłówków (od 1, jak w Excelu)
 * @returns wiersze danych (od wiersza po nagłówkach), puste wiersze pominięte
 */
export function wierszeDanych(arkusz: ArkuszXlsx, numerWierszaNaglowkow: number): Record<string, string>[] {
  const naglowki = arkusz.wiersze[numerWierszaNaglowkow - 1] ?? [];
  return arkusz.wiersze
    .slice(numerWierszaNaglowkow)
    .filter((wiersz) => wiersz.some((komorka) => komorka !== null))
    .map((wiersz) =>
      Object.fromEntries(
        naglowki.flatMap((naglowek, i) => (naglowek === null ? [] : [[String(naglowek), tekstKomorki(wiersz[i])]])),
      ),
    );
}

/**
 * Zapisuje pobrany plik w katalogu wyników testu (`test-results/…`) pod nazwą zaproponowaną przez aplikację.
 * @param pobranie - pobranie z Playwright
 * @param testInfo - informacje o bieżącym teście
 * @returns ścieżka zapisanego pliku
 */
export async function zapiszPobranie(pobranie: Download, testInfo: TestInfo): Promise<string> {
  const sciezka = testInfo.outputPath(pobranie.suggestedFilename());
  await pobranie.saveAs(sciezka);
  return sciezka;
}
