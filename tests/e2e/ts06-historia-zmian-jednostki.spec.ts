import { pobierzKonto } from '../../src/config/konta';
import { expect, test } from '../../src/fixtures';
import * as ts06Dane from '../../src/data/json/ts06-historia-zmian-jednostki.json';
import { Rola } from '../../src/data/rola';
import { TAGI } from '../../src/data/tagi';
import type { DaneTs06 } from '../../src/data/types/karta-jednostki.types';
import { KolumnaHistorii } from '../../src/pages/karta-jednostki.page';
import { escapujRegex, znacznikCzasuDatyZmiany } from '../../src/utils/wzorce';

const dane: DaneTs06 = ts06Dane;

// Rola jest opcją workera (logowanie raz na worker), dlatego ustawiana na poziomie pliku – jeden plik = jeden scenariusz.
// TC-27, TC-28 (realizacja zgłoszenia w fixture) i TC-30 wymagają Administratora; TC-27 – TC-29 są dla „Użytkownika podstawowego”.
// TODO [ZAŁOŻENIE]: odczyt historii w TC-27 – TC-29 przenieść na Rola.UzytkownikPodstawowy po założeniu konta
// (osobny kontekst z sesją tej roli; zmianę nadal przeprowadza Administrator).
test.use({ rola: Rola.Administrator });

// Jeden worker, testy po kolei: TC-27 i TC-28 odczytują tę samą zmianę z fixture workera
// `zrealizowanaZmianaJednostki` (jedna zmieniona jednostka na przebieg, bez wyścigu o wolną jednostkę).
test.describe.configure({ mode: 'default' });

test.describe(
  'TS_06 – Historia zmian jednostki',
  {
    tag: ['@TS_06', '@BR-KAT-02', '@KO-18.1'],
    annotation: {
      type: 'założenie',
      description:
        'TC-27 – TC-29 są dla roli „Użytkownik podstawowy” – uruchamiane jako Administrator do czasu udostępnienia konta.',
    },
  },
  () => {
    test(
      'TC-27 Historia zmian – lista z datą i autorem',
      {
        tag: ['@TC-27', TAGI.priorytet.wysoki, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e, TAGI.kwalifikacja.regresja],
        annotation: [
          { type: 'uwaga', description: 'P-07 (potwierdzone 18.11.2026): wpisy uporządkowane od najnowszego.' },
          {
            type: 'założenie',
            description:
              'Zmiany różnych osób: wpis „Utworzenie / Import” z migracji (P-08 – import tworzy wpis; autor importu, dev 13.11.2026) + zmiana zrealizowana w teście przez Administratora.',
          },
          {
            type: 'uwaga',
            description: 'K-08 / KO 18.2: wartości poprzedniej i nowej nie ma w makiecie – nie sprawdzane.',
          },
        ],
      },
      async ({ dashboardPage, zrealizowanaZmianaJednostki }) => {
        // Arrange
        const { minimalnaLiczbaZmian } = dane.tc27;
        const { mpk } = zrealizowanaZmianaJednostki;
        const rejestr = await dashboardPage.otworzRejestrJednostek();

        // Act
        const karta = await rejestr.otworzKarteJednostki(mpk);

        // Assert
        await expect(karta.naglowkiHistorii).toHaveText(dane.kolumnyHistorii);
        await expect.poll(() => karta.wierszeHistorii.count()).toBeGreaterThanOrEqual(minimalnaLiczbaZmian);
        await expect.soft(karta.pusteKomorkiHistorii, 'każdy wpis ma wszystkie kolumny').toHaveCount(0);
        const autorzy = await karta.kolumnaHistorii(KolumnaHistorii.Wprowadzil).allInnerTexts();
        expect.soft(new Set(autorzy).size, 'zmiany różnych osób').toBeGreaterThanOrEqual(2);
        // `znacznikCzasuDatyZmiany` rzuca błąd przy dacie w innym formacie niż „DD.MM.RRRR, GG:MM”.
        const czasy = (await karta.kolumnaHistorii(KolumnaHistorii.DataZmiany).allInnerTexts()).map(
          znacznikCzasuDatyZmiany,
        );
        expect(czasy, 'kolejność od najnowszej').toEqual([...czasy].sort((a, b) => b - a));
      },
    );

    test(
      'TC-28 Historia zmian – autor zgodny z kontem logowania',
      {
        tag: [
          '@TC-28',
          TAGI.priorytet.wysoki,
          TAGI.rodzaj.pozytywny,
          TAGI.warstwa.e2e,
          TAGI.kwalifikacja.regresja,
          '@KO-18.6',
        ],
        annotation: [
          {
            type: 'uwaga',
            description: 'P-07 (potwierdzone 18.11.2026): ostatnia zmiana jest pierwszym wpisem historii.',
          },
          {
            type: 'założenie',
            description:
              'Zmianę realizuje w teście testowy Administrator (konto z .env); „Wprowadził(a)” pokazuje login w tej samej postaci co przy logowaniu.',
          },
        ],
      },
      async ({ dashboardPage, zrealizowanaZmianaJednostki }) => {
        // Arrange
        const { mpk } = zrealizowanaZmianaJednostki;
        const loginAutora = pobierzKonto(Rola.Administrator).login;
        const rejestr = await dashboardPage.otworzRejestrJednostek();

        // Act
        const karta = await rejestr.otworzKarteJednostki(mpk);

        // Assert
        await expect(karta.kolumnaHistorii(KolumnaHistorii.RodzajZmiany).first()).toHaveText(dane.tc28.rodzajZmiany);
        await expect(karta.kolumnaHistorii(KolumnaHistorii.Wprowadzil).first()).toHaveText(loginAutora);
      },
    );

    test(
      'TC-29 Jednostka bez zmian po migracji – tylko wpis importu',
      {
        tag: ['@TC-29', TAGI.priorytet.niski, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e],
        annotation: [
          {
            type: 'uwaga',
            description:
              'P-08 (potwierdzone 19.11.2026): zasilenie migracją tworzy jeden wpis „Utworzenie / Import – partia N”; ponowny import tej samej jednostki nie dodaje kolejnego wpisu.',
          },
          {
            type: 'założenie',
            description:
              'Jednostka zasilona migracją (partia 72, dev 13.11.2026), bez zmian po zasileniu. Ponownego importu test nie wykonuje (TS_12) – sprawdza stan po importach przeprowadzonych na dev.',
          },
        ],
      },
      async ({ dashboardPage }) => {
        // Arrange
        const { mpk, rodzajZmiany, podstawa } = dane.tc29;
        const rejestr = await dashboardPage.otworzRejestrJednostek();

        // Act
        const karta = await rejestr.otworzKarteJednostki(mpk);

        // Assert
        await expect(karta.wierszeHistorii, 'jeden wpis mimo ponownego importu').toHaveCount(1);
        await expect(karta.kolumnaHistorii(KolumnaHistorii.RodzajZmiany)).toHaveText([rodzajZmiany]);
        await expect(karta.kolumnaHistorii(KolumnaHistorii.Podstawa)).toHaveText([
          new RegExp(`^${escapujRegex(podstawa)} \\d+$`),
        ]);
      },
    );

    test(
      'TC-30 Historia zmian nie jest edytowalna',
      {
        tag: [
          '@TC-30',
          TAGI.priorytet.wysoki,
          TAGI.rodzaj.negatywny,
          TAGI.warstwa.e2e,
          TAGI.kwalifikacja.regresja,
          '@KO-18.3',
        ],
        annotation: {
          type: 'założenie',
          description:
            'Jednostka z wpisem importu i wpisami „Zmiana danych” ze zrealizowanych zgłoszeń (dev 18–19.11.2026). Próba edycji = dwuklik w komórkę, wpisanie tekstu, Delete.',
        },
      },
      async ({ dashboardPage }) => {
        // Arrange
        const { mpk } = dane.tc30;
        const rejestr = await dashboardPage.otworzRejestrJednostek();
        const karta = await rejestr.otworzKarteJednostki(mpk);
        await expect(karta.wierszeHistorii.first()).toBeVisible();
        const wpisyPrzed = await karta.wierszeHistorii.allTextContents();

        // Act
        await karta.sprobujEdytowacWpisHistorii(0);

        // Assert
        await expect(karta.kontrolkiEdycjiHistorii).toHaveCount(0);
        await expect(karta.wierszeHistorii).toHaveText(wpisyPrzed);
      },
    );
  },
);
