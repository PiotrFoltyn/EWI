import { type DaneZgloszenia, zbudujDaneZgloszenia } from '../../src/data/builders/zgloszenie.builder';
import * as ts15Dane from '../../src/data/json/ts15-zmiana-przeznaczenia-mpk.json';
import { Rola } from '../../src/data/rola';
import { TAGI } from '../../src/data/tagi';
import type { DaneTs15 } from '../../src/data/types/zgloszenia.types';
import { expect, test } from '../../src/fixtures';
import type { DashboardPage } from '../../src/pages/dashboard.page';
import { StatusZgloszenia } from '../../src/pages/podglad-zgloszenia.page';
import { PoleZmiany, type ZgloszeniePage } from '../../src/pages/zgloszenie.page';

const dane: DaneTs15 = ts15Dane;

// TODO [ZAŁOŻENIE]: zgłaszający → Rola.UzytkownikPodstawowy; TC-102 – TC-105 → rola „Akceptujący koszty” (brak kont).
test.use({ rola: Rola.Administrator });

test.describe.configure({ timeout: 180_000 });

const ZALOZENIE_ROLI = {
  type: 'założenie',
  description: 'Zgłoszenie JT składa Administrator do czasu konta „Użytkownik podstawowy”.',
};

const ZALOZENIE_DANYCH = {
  type: 'założenie',
  description:
    'JT = pierwsza aktywna JT bez otwartego zgłoszenia (Rejestr); nazwa krótka i uzasadnienia z datą i godziną (builder). Zgłoszenia w „Akceptacji kosztów” nie da się wycofać – zostają na dev i blokują swoją JT (dobór dynamiczny).',
};

const ZALOZENIE_PRZEZNACZENIA = {
  type: 'założenie',
  description:
    'Zmiana przeznaczenia = odpowiedź „Tak” na „Czy nr MPK ma służyć do ewidencji kosztów?” dla JT niekosztowej (na dev brak osobnego pola „Czy zmieniamy przeznaczenie MPK”).',
};

const BRAK_ROLI_AKCEPTUJACEGO = 'Brak konta „Akceptujący koszty” na dev – decyzji kosztowej nie da się podjąć.';

/**
 * Otwiera formularz zmiany pierwszej aktywnej JT bez otwartego zgłoszenia, zmienia nazwę krótką (unikalna wartość
 * do odnalezienia w kolejce) i odpowiada na „Czy nr MPK ma służyć do ewidencji kosztów?”.
 * @param dashboardPage - dashboard zalogowanego zgłaszającego
 * @param zgloszenie - unikalne dane zgłoszenia z buildera
 * @param kosztowe - odpowiedź na pytanie o ewidencję kosztów
 * @returns wypełniony formularz (uzasadnienie uzupełnia `wyslij`)
 */
async function przygotujZmianeJt(
  dashboardPage: DashboardPage,
  zgloszenie: DaneZgloszenia,
  kosztowe: boolean,
): Promise<ZgloszeniePage> {
  const rejestr = await dashboardPage.otworzRejestrJednostek();
  const karta = await rejestr.otworzKarteBezOtwartegoZgloszenia(dane.filtryAktywnejJt);
  const formularz = await karta.zglosZmiane();
  await formularz.zmien(PoleZmiany.NazwaKrotka, zgloszenie.nazwaKrotka);
  await formularz.ustawEwidencjeKosztow(kosztowe, zgloszenie.uzasadnienieKosztow);
  return formularz;
}

test.describe(
  'TS_15 – Zmiana przeznaczenia MPK jednostki technicznej – akceptacja kosztów',
  { tag: ['@TS_15', '@BR-ZGL-05', '@PO-06'] },
  () => {
    test(
      'TC-98 Zmiana przeznaczenia MPK na kosztowe kieruje do akceptacji kosztów',
      {
        tag: [
          '@TC-98',
          TAGI.priorytet.wysoki,
          TAGI.rodzaj.pozytywny,
          TAGI.warstwa.e2e,
          TAGI.kwalifikacja.smoke,
          TAGI.kwalifikacja.regresja,
        ],
        annotation: [ZALOZENIE_ROLI, ZALOZENIE_DANYCH, ZALOZENIE_PRZEZNACZENIA],
      },
      async ({ dashboardPage }) => {
        // Arrange
        const zgloszenie = zbudujDaneZgloszenia('TC-98');
        const formularz = await przygotujZmianeJt(dashboardPage, zgloszenie, true);

        // Act
        // Zgłoszenie w „Akceptacji kosztów” nie jest wycofywane – zgodnie z TC-106 ta akcja nie jest dostępna.
        const podglad = await formularz.wyslij(zgloszenie.uzasadnienie);

        // Assert
        await expect(podglad.komunikat).toHaveText(dane.komunikatWyslania);
        await expect(podglad.status(StatusZgloszenia.AkceptacjaKosztow)).toBeVisible();
      },
    );

    test(
      'TC-99 Zgłoszenie w akceptacji kosztów jest niewidoczne dla administratora',
      {
        tag: ['@TC-99', TAGI.priorytet.wysoki, TAGI.rodzaj.negatywny, TAGI.warstwa.e2e, TAGI.kwalifikacja.regresja],
        annotation: [
          ZALOZENIE_ROLI,
          ZALOZENIE_DANYCH,
          {
            type: 'założenie',
            description:
              'Kolejka „Zgłoszenia do obsługi” wyszukiwana po nowej nazwie krótkiej (unikalna, z datą i godziną).',
          },
        ],
      },
      async ({ dashboardPage }) => {
        // Arrange
        const zgloszenie = zbudujDaneZgloszenia('TC-99');
        const formularz = await przygotujZmianeJt(dashboardPage, zgloszenie, true);
        const podglad = await formularz.wyslij(zgloszenie.uzasadnienie);
        await expect(podglad.status(StatusZgloszenia.AkceptacjaKosztow)).toBeVisible();
        await dashboardPage.goto();

        // Act
        await dashboardPage.wyszukajWKolejce(zgloszenie.nazwaKrotka);

        // Assert
        await expect(dashboardPage.wierszeKolejki.filter({ hasText: zgloszenie.nazwaKrotka })).toHaveCount(0);
      },
    );

    test(
      'TC-100 Zmiana bez zmiany przeznaczenia MPK trafia od razu do administratora',
      {
        tag: ['@TC-100', TAGI.priorytet.wysoki, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e, TAGI.kwalifikacja.regresja],
        annotation: [
          ZALOZENIE_ROLI,
          ZALOZENIE_DANYCH,
          { type: 'założenie', description: 'Zmieniana nazwa krótka (zamiast długiej) – unikalna wartość z buildera.' },
        ],
      },
      async ({ dashboardPage, zgloszeniaDoWycofania }) => {
        // Arrange
        const zgloszenie = zbudujDaneZgloszenia('TC-100');
        const formularz = await przygotujZmianeJt(dashboardPage, zgloszenie, false);

        // Act
        const podglad = await formularz.wyslij(zgloszenie.uzasadnienie);
        zgloszeniaDoWycofania.push(podglad.adres());

        // Assert
        await expect(podglad.status(StatusZgloszenia.Zarejestrowane)).toBeVisible();
        await expect(
          podglad.wierszZmiany(dane.poleZmianyNazwy).filter({ hasText: zgloszenie.nazwaKrotka }),
        ).toHaveCount(1);
      },
    );

    test(
      'TC-101 Zmiana przeznaczenia MPK z kosztowego na niekosztowe',
      {
        tag: ['@TC-101', TAGI.priorytet.sredni, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e],
        annotation: { type: 'założenie', description: 'P-22: akceptacja tylko przy zmianie na „Tak”.' },
      },
      async ({ dashboardPage, zgloszeniaDoWycofania }) => {
        // TODO [ZAŁOŻENIE]: dobór JT kosztowej (formularz ma „Tak” zaznaczone) – na dev nie ustalono, które JT są kosztowe.
        test.fixme(true, 'Brak danych: nie ustalono na dev aktywnej JT kosztowej bez otwartego zgłoszenia.');

        // Arrange
        const zgloszenie = zbudujDaneZgloszenia('TC-101');
        const formularz = await przygotujZmianeJt(dashboardPage, zgloszenie, false);

        // Act
        const podglad = await formularz.wyslij(zgloszenie.uzasadnienie);
        zgloszeniaDoWycofania.push(podglad.adres());

        // Assert
        await expect(podglad.status(StatusZgloszenia.Zarejestrowane)).toBeVisible();
      },
    );

    for (const [tc, nazwa, rodzaj, priorytet] of [
      ['TC-102', 'Akceptacja kosztów przez Akceptującego koszty', TAGI.rodzaj.pozytywny, TAGI.priorytet.wysoki],
      ['TC-103', 'Akceptujący koszty widzi dane tylko do odczytu', TAGI.rodzaj.negatywny, TAGI.priorytet.sredni],
      ['TC-104', 'Odrzucenie kosztów bez komentarza', TAGI.rodzaj.negatywny, TAGI.priorytet.wysoki],
      ['TC-105', 'Odrzucenie kosztów z komentarzem', TAGI.rodzaj.pozytywny, TAGI.priorytet.wysoki],
    ] as const) {
      test(`${tc} ${nazwa}`, { tag: [`@${tc}`, priorytet, rodzaj, TAGI.warstwa.e2e] }, async ({ dashboardPage }) => {
        test.fixme(true, BRAK_ROLI_AKCEPTUJACEGO);

        // Arrange
        // TODO [ZAŁOŻENIE]: sesja roli „Akceptujący koszty” → „Pobierz do obsługi” → „Akceptuj koszty” / „Odrzuć”.
        const zgloszenie = zbudujDaneZgloszenia(tc);
        const formularz = await przygotujZmianeJt(dashboardPage, zgloszenie, true);

        // Act
        const podglad = await formularz.wyslij(zgloszenie.uzasadnienie);

        // Assert
        await expect(podglad.status(StatusZgloszenia.AkceptacjaKosztow)).toBeVisible();
      });
    }

    test(
      'TC-106 Brak wycofania zgłoszenia w statusie „Akceptacja kosztów”',
      {
        tag: ['@TC-106', TAGI.priorytet.wysoki, TAGI.rodzaj.negatywny, TAGI.warstwa.e2e, TAGI.kwalifikacja.regresja],
        annotation: [ZALOZENIE_ROLI, ZALOZENIE_DANYCH],
      },
      async ({ dashboardPage }) => {
        // Arrange
        const zgloszenie = zbudujDaneZgloszenia('TC-106');
        const formularz = await przygotujZmianeJt(dashboardPage, zgloszenie, true);
        const wyslane = await formularz.wyslij(zgloszenie.uzasadnienie);
        await expect(wyslane.status(StatusZgloszenia.AkceptacjaKosztow)).toBeVisible();

        // Act
        const podglad = await wyslane.otworzPonownie();

        // Assert
        await expect(podglad.status(StatusZgloszenia.AkceptacjaKosztow)).toBeVisible();
        await expect(podglad.przyciskWycofaj).toHaveCount(0);
      },
    );
  },
);
