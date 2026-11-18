import { zbudujDaneZgloszenia } from '../../src/data/builders/zgloszenie.builder';
import * as ts14Dane from '../../src/data/json/ts14-zgloszenie-zmiany-koc-sjo-pion.json';
import { Rola } from '../../src/data/rola';
import { TAGI } from '../../src/data/tagi';
import type { DaneTs14 } from '../../src/data/types/zgloszenia.types';
import { expect, test } from '../../src/fixtures';
import { StatusZgloszenia } from '../../src/pages/podglad-zgloszenia.page';
import { PoleZmiany } from '../../src/pages/zgloszenie.page';

const dane: DaneTs14 = ts14Dane;

// TODO [ZAŁOŻENIE]: zmienić na rolę „Zgłaszający KOC/SJO/Pion” po dodaniu jej do Rola i założeniu konta na dev.
test.use({ rola: Rola.Administrator });

test.describe.configure({ timeout: 180_000 });

const BRAK_ROLI =
  'Brak konta „Zgłaszający KOC/SJO/Pion” na dev – Administrator ma tylko kafelek jednostki technicznej, a karty KOC/SJO/Pion nie mają akcji „Zgłoś zmianę”.';

/** Przypadki TS_14 – wszystkie wymagają roli „Zgłaszający KOC/SJO/Pion”. */
const PRZYPADKI = [
  {
    tc: 'TC-90',
    nazwa: 'Zgłoszenie zmiany nazw KOC',
    priorytet: TAGI.priorytet.wysoki,
    rodzaj: TAGI.rodzaj.pozytywny,
    smoke: true,
    regresja: true,
  },
  {
    tc: 'TC-91',
    nazwa: 'Zgłoszenie zmiany typu KOC z departamentu na biuro',
    priorytet: TAGI.priorytet.sredni,
    rodzaj: TAGI.rodzaj.pozytywny,
    smoke: false,
    regresja: false,
  },
  {
    tc: 'TC-92',
    nazwa: 'Zgłoszenie zmiany danych SJO',
    priorytet: TAGI.priorytet.wysoki,
    rodzaj: TAGI.rodzaj.pozytywny,
    smoke: false,
    regresja: true,
  },
  {
    tc: 'TC-93',
    nazwa: 'Zgłoszenie zmiany danych Pionu',
    priorytet: TAGI.priorytet.wysoki,
    rodzaj: TAGI.rodzaj.pozytywny,
    smoke: false,
    regresja: true,
  },
  {
    tc: 'TC-94',
    nazwa: 'Dodanie jednostki wewnętrznej do SJO zgłoszeniem zmiany',
    priorytet: TAGI.priorytet.wysoki,
    rodzaj: TAGI.rodzaj.pozytywny,
    smoke: false,
    regresja: true,
  },
  {
    tc: 'TC-95',
    nazwa: 'Zgłoszenie jednostek wewnętrznych z karty KOC „do dodania później”',
    priorytet: TAGI.priorytet.sredni,
    rodzaj: TAGI.rodzaj.pozytywny,
    smoke: false,
    regresja: false,
  },
  {
    tc: 'TC-96',
    nazwa: 'Brak dodawania jednostek wewnętrznych dla KOC z literą Y',
    priorytet: TAGI.priorytet.sredni,
    rodzaj: TAGI.rodzaj.negatywny,
    smoke: false,
    regresja: false,
  },
  {
    tc: 'TC-97',
    nazwa: 'Zgłaszający KOC/SJO/Pion zgłasza zmianę jednostki technicznej',
    priorytet: TAGI.priorytet.sredni,
    rodzaj: TAGI.rodzaj.pozytywny,
    smoke: false,
    regresja: false,
  },
];

test.describe(
  'TS_14 – Zgłoszenie zmiany danych KOC, SJO i Pionu',
  { tag: ['@TS_14', '@BR-ZGL-01', '@BR-ZGL-02', '@BR-ZGL-09', '@BR-PAR-02', '@KO-14'] },
  () => {
    for (const przypadek of PRZYPADKI) {
      test(
        `${przypadek.tc} ${przypadek.nazwa}`,
        {
          tag: [
            `@${przypadek.tc}`,
            przypadek.priorytet,
            przypadek.rodzaj,
            TAGI.warstwa.e2e,
            ...(przypadek.smoke ? [TAGI.kwalifikacja.smoke] : []),
            ...(przypadek.regresja ? [TAGI.kwalifikacja.regresja] : []),
          ],
          annotation: [
            {
              type: 'założenie',
              description: 'P-20: treść podpowiedzi „i” przy „Typ jednostki” – do sprawdzenia w mailu.',
            },
            { type: 'założenie', description: 'P-21: jednostki wewnętrzne tylko dla jednostek z literą Z.' },
          ],
        },
        async ({ dashboardPage, zgloszeniaDoWycofania }) => {
          test.fixme(true, BRAK_ROLI);

          // Arrange
          // TODO [ZAŁOŻENIE]: kafelek „KOC” / „SJO” / „Pion” → „Zmiana” → wyszukanie jednostki (filtry zależne od przypadku);
          // dla TC-94 / TC-96 sekcja „Dodaj nową jednostkę wewnętrzną (biuro / zespół)”, dla TC-95 akcja na karcie KOC.
          const zgloszenie = zbudujDaneZgloszenia(przypadek.tc);
          const rejestr = await dashboardPage.otworzRejestrJednostek();
          const karta = await rejestr.otworzKarteBezOtwartegoZgloszenia(dane.filtryAktywnejJt);
          const formularz = await karta.zglosZmiane();
          await formularz.zmien(PoleZmiany.NazwaDluga, zgloszenie.nazwaDluga);

          // Act
          const podglad = await formularz.wyslij(zgloszenie.uzasadnienie);
          zgloszeniaDoWycofania.push(podglad.adres());

          // Assert
          await expect(podglad.status(StatusZgloszenia.Zarejestrowane)).toBeVisible();
          await expect(podglad.daneZgloszenia).toContainText(dane.typJednostkiJt);
        },
      );
    }
  },
);
