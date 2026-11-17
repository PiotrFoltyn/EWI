import { pobierzKonto } from '../../src/config/konta';
import { expect, test } from '../../src/fixtures';
import * as ts06Dane from '../../src/data/json/ts06-historia-zmian-jednostki.json';
import { Rola } from '../../src/data/rola';
import { TAGI } from '../../src/data/tagi';
import type { DaneTs06 } from '../../src/data/types/karta-jednostki.types';
import { KolumnaHistorii } from '../../src/pages/karta-jednostki.page';
import { znacznikCzasuDatyZmiany } from '../../src/utils/wzorce';

const dane: DaneTs06 = ts06Dane;

// Rola jest opcją workera (logowanie raz na worker), dlatego ustawiana na poziomie pliku – jeden plik = jeden scenariusz.
// TC-30 wymaga Administratora; TC-27 – TC-29 są dla „Użytkownika podstawowego”.
// TODO [ZAŁOŻENIE]: TC-27 – TC-29 przenieść na Rola.UzytkownikPodstawowy po założeniu konta (osobny kontekst lub plik).
test.use({ rola: Rola.Administrator });

const BRAK_DANYCH_ZMIAN =
  'Brak danych: po imporcie 13.11.2026 (partia 72) każda jednostka ma tylko wpis „Utworzenie / Import” – potrzebna jednostka zmieniona zgłoszeniami (TS_13 / TS_22); uzupełnij MPK w ts06-historia-zmian-jednostki.json.';

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
          { type: 'założenie', description: 'P-07: wpisy uporządkowane od najnowszego.' },
          {
            type: 'uwaga',
            description: 'K-08 / KO 18.2: wartości poprzedniej i nowej nie ma w makiecie – nie sprawdzane.',
          },
        ],
      },
      async ({ dashboardPage }) => {
        // Arrange
        const { mpk, minimalnaLiczbaZmian } = dane.tc27;
        test.fixme(!mpk, BRAK_DANYCH_ZMIAN);
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
          { type: 'założenie', description: 'P-07: ostatnia zmiana jest pierwszym wpisem historii.' },
          {
            type: 'założenie',
            description:
              'Zmianę wykonał testowy Administrator (konto z .env); „Wprowadził(a)” pokazuje login w tej samej postaci co przy logowaniu.',
          },
        ],
      },
      async ({ dashboardPage }) => {
        // Arrange
        const { mpk } = dane.tc28;
        test.fixme(!mpk, BRAK_DANYCH_ZMIAN);
        const loginAutora = pobierzKonto(Rola.Administrator).login;
        const rejestr = await dashboardPage.otworzRejestrJednostek();

        // Act
        const karta = await rejestr.otworzKarteJednostki(mpk);

        // Assert
        await expect(karta.kolumnaHistorii(KolumnaHistorii.Wprowadzil).first()).toHaveText(loginAutora);
      },
    );

    test(
      'TC-29 Jednostka bez historii zmian',
      {
        tag: ['@TC-29', TAGI.priorytet.niski, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e],
        annotation: {
          type: 'założenie',
          description:
            'P-08: zasilenie migracją nie tworzy wpisu w historii; treść komunikatu o braku historii nieznana.',
        },
      },
      async ({ dashboardPage }) => {
        // Na dev (13.11.2026) migracja tworzy wpis „Utworzenie / Import – partia 72 / oskarherczyk”.
        test.fixme(
          true,
          'P-08: migracja tworzy wpis „Utworzenie / Import” w historii – sprzeczne z przyjętą odpowiedzią „Nie”; czeka na decyzję analityka i treść komunikatu.',
        );

        // Arrange
        const { mpk } = dane.tc29;
        const rejestr = await dashboardPage.otworzRejestrJednostek();

        // Act
        const karta = await rejestr.otworzKarteJednostki(mpk);

        // Assert
        // TODO [ZAŁOŻENIE]: dodać asercję komunikatu o braku historii po ustaleniu treści (P-08) i sprawdzić,
        // czy komunikat nie jest wierszem tabeli (wtedy `wierszeHistorii` trzeba zawęzić).
        await expect(karta.wierszeHistorii).toHaveCount(0);
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
            'Jednostka z wpisem „Utworzenie / Import” (stan dev 13.11.2026). Próba edycji = dwuklik w komórkę, wpisanie tekstu, Delete.',
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
