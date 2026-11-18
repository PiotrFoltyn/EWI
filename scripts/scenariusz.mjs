// Wypisuje scenariusz testowy i jego przypadki z arkusza zbiorczego (Markdown) – wejście dla /nowy-scenariusz.
// Użycie: npm run scenariusz -- TS_04
import readXlsxFile from 'read-excel-file/node';
import * as dotenv from 'dotenv';

dotenv.config({ quiet: true });

const PLIK = process.env.EWI_SCENARIUSZE_PLIK;
const idScenariusza = (process.argv[2] ?? '').toUpperCase().replace('-', '_');

if (!/^TS_\d+$/.test(idScenariusza)) {
  console.error('Podaj identyfikator scenariusza, np.: npm run scenariusz -- TS_04');
  process.exit(1);
}
if (!PLIK) {
  console.error('Brak EWI_SCENARIUSZE_PLIK w .env – ustaw ścieżkę do Scenariusze_Zbiorczy_EWI_*.xlsx.');
  process.exit(1);
}

const arkusze = Object.fromEntries((await readXlsxFile(PLIK)).map(({ sheet, data }) => [sheet, data]));

/** Zamienia arkusz na listę obiektów według nagłówków z pierwszego wiersza. */
function wiersze(nazwaArkusza) {
  const [naglowki, ...dane] = arkusze[nazwaArkusza] ?? [];
  if (!naglowki) return [];
  return dane.map((wiersz) => Object.fromEntries(naglowki.map((n, i) => [String(n ?? `kol${i}`), wiersz[i] ?? ''])));
}

const tekst = (wartosc) => String(wartosc ?? '').trim();
const scenariusz = wiersze('Scenariusze').find((w) => tekst(w['ID scenariusza']) === idScenariusza);
if (!scenariusz) {
  console.error(`Nie znaleziono ${idScenariusza} w arkuszu „Scenariusze” (${PLIK}).`);
  process.exit(1);
}

/** Rozwija zakres „TC-71 – TC-89” (myślnik lub półpauza) na listę identyfikatorów; pojedynczy identyfikator bez zmian. */
function rozwinZakres(fragment) {
  const zakres = fragment.match(/^TC-(\d+)\s*[–-]\s*TC-(\d+)$/);
  if (!zakres) return [fragment];
  const [od, doNumeru] = [Number(zakres[1]), Number(zakres[2])];
  const szerokosc = zakres[1].length;
  return Array.from({ length: doNumeru - od + 1 }, (_, i) => `TC-${String(od + i).padStart(szerokosc, '0')}`);
}

const idPrzypadkow = tekst(scenariusz['Przypadki testowe'])
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)
  .flatMap(rozwinZakres);
const wedlugId = (nazwaArkusza) => new Map(wiersze(nazwaArkusza).map((w) => [tekst(w['Test Case Identifier']), w]));
const przypadki = wedlugId('Przypadki');
const kwalifikacja = wedlugId('Kwalifikacja');
const walidacja = wedlugId('Walidacja');

const wynik = [];
wynik.push(`# ${idScenariusza} – ${tekst(scenariusz['Nazwa scenariusza'])}`, '');
for (const pole of [
  'Obszar',
  'Cel scenariusza',
  'Warunki wstępne / dane testowe',
  'Zakres i techniki',
  'Powiązane wymagania',
  'Priorytet',
  'Role',
  'Otwarte pytania / uwagi',
  'Status walidacji',
]) {
  wynik.push(`- **${pole}:** ${tekst(scenariusz[pole])}`);
}

for (const id of idPrzypadkow) {
  const tc = przypadki.get(id) ?? {};
  const kw = kwalifikacja.get(id) ?? {};
  const wa = walidacja.get(id) ?? {};
  wynik.push('', `## ${id} ${tekst(tc['Nazwa'])}`, '');
  wynik.push(
    `- **Kwalifikacja:** priorytet ${tekst(kw['Priorytet'])}, typ ${tekst(kw['Typ'])}, smoke ${tekst(kw['Smoke'])}, regresja ${tekst(kw['Regresja'])}`,
  );
  wynik.push(`- **Warunek wejściowy:** ${tekst(tc['Warunek wejściowy'])}`);
  wynik.push(`- **Uwagi:** ${tekst(tc['Uwagi'])}`);
  wynik.push(`- **Walidacja:** ${tekst(wa['Status walidacji'])} – ${tekst(wa['Opis rozbieżności / wyniku'])}`);
  wynik.push('', '```gherkin', tekst(tc['Opis kroku testowego (Step)']), '```');
}

const pytania = tekst(scenariusz['Otwarte pytania / uwagi']).match(/P-\d+/g) ?? [];
if (pytania.length) {
  wynik.push('', '## Otwarte pytania', '');
  for (const p of wiersze('Pytania do analityka').filter((w) => pytania.includes(tekst(Object.values(w)[0])))) {
    wynik.push(
      `- **${tekst(Object.values(p)[0])}** ${Object.values(p).slice(1).map(tekst).filter(Boolean).join(' | ')}`,
    );
  }
}

console.log(wynik.join('\n'));
