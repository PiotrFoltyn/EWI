import * as path from 'path';
import { Rola } from '../data/rola';

const KATALOG_STANU_SESJI = path.join(__dirname, '..', '..', 'playwright', '.auth');

/**
 * Ścieżka pliku `storageState` z sesją roli zalogowanej w danym workerze.
 * Osobny plik na worker – równoległe workery nie nadpisują sobie sesji.
 * @param rola - rola zalogowanego użytkownika
 * @param indeksWorkera - `workerInfo.parallelIndex`
 * @returns bezwzględna ścieżka do pliku JSON ze stanem sesji
 */
export function sciezkaStanuSesji(rola: Rola, indeksWorkera: number): string {
  return path.join(KATALOG_STANU_SESJI, `${rola}-${indeksWorkera}.json`);
}
