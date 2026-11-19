import { dataIso } from '../../src/components/kalendarz.component';
import { dataZaDni, zbudujDaneZgloszenia } from '../../src/data/builders/zgloszenie.builder';
import * as ts16Dane from '../../src/data/json/ts16-zgloszenie-likwidacji.json';
import { Rola } from '../../src/data/rola';
import { TAGI } from '../../src/data/tagi';
import type { DaneTs16 } from '../../src/data/types/zgloszenia.types';
import { expect, test } from '../../src/fixtures';
import { StatusZgloszenia } from '../../src/pages/podglad-zgloszenia.page';
import { RodzajZgloszenia } from '../../src/pages/zgloszenie.page';
import { KolumnaJednostki } from '../../src/components/tabela-jednostek.component';

const dane: DaneTs16 = ts16Dane;

// TODO [ZAŁOŻENIE]: TC-107, TC-111 – TC-115 → Rola.UzytkownikPodstawowy; TC-108 – TC-110, TC-116 → „Zgłaszający KOC/SJO/Pion”.
test.use({ rola: Rola.Administrator });

// Dobór jednostki przegląda karty na dev (wolne) – dłuższy limit testu.
test.describe.configure({ timeout: 180_000 });

const ZALOZENIE_ROLI = {
  type: 'założenie',
  description:
    'Zgłoszenia JT składa Administrator (kafelek „Nowe zgłoszenie – jednostka techniczna” / karta JT) do czasu kont „Użytkownik podstawowy”.',
};

const ZALOZENIE_DANYCH = {
  type: 'założenie',
  description:
    'Jednostka = pierwsza aktywna JT z Rejestru bez otwartego zgłoszenia (karta z „Zgłoś likwidację”). Uzasadnienie z datą i godziną (builder). Wysłane zgłoszenie fixture wycofuje po teście.',
};

const STATUS_ZLIKWIDOWANA = dane.filtryZlikwidowanejJt.status ?? '';

const BRAK_ROLI_KOC = 'Brak konta „Zgłaszający KOC/SJO/Pion” na dev – Administrator nie ma kafelków KOC, SJO i Pion.';

test.describe(
  'TS_16 – Zgłoszenie likwidacji istniejącej jednostki',
  { tag: ['@TS_16', '@BR-ZGL-01', '@BR-PAR-03', '@KO-15.1'] },
  () => {
    test(
      'TC-107 Zgłoszenie likwidacji jednostki technicznej',
      {
        tag: [
          '@TC-107',
          TAGI.priorytet.wysoki,
          TAGI.rodzaj.pozytywny,
          TAGI.warstwa.e2e,
          TAGI.kwalifikacja.smoke,
          TAGI.kwalifikacja.regresja,
        ],
        annotation: [ZALOZENIE_ROLI, ZALOZENIE_DANYCH],
      },
      async ({ dashboardPage, zgloszeniaDoWycofania }) => {
        // Arrange
        const zgloszenie = zbudujDaneZgloszenia('TC-107');
        const dataLikwidacji = dataZaDni(dane.dniDoLikwidacji);
        const rejestr = await dashboardPage.otworzRejestrJednostek();
        const karta = await rejestr.otworzKarteBezOtwartegoZgloszenia(dane.filtryAktywnejJt);
        const formularz = await karta.zglosLikwidacje();
        await formularz.kalendarz.ustaw(dataLikwidacji);

        // Act
        const podglad = await formularz.wyslij(zgloszenie.uzasadnienie);
        zgloszeniaDoWycofania.push(podglad.adres());

        // Assert
        await expect(podglad.komunikat).toHaveText(dane.komunikatWyslania);
        await expect(podglad.status(StatusZgloszenia.Zarejestrowane)).toBeVisible();
        await expect(podglad.daneZgloszenia).toContainText(RodzajZgloszenia.Likwidacja);
        await expect(podglad.daneZgloszenia).toContainText(dane.filtryAktywnejJt.typJednostki ?? '');
        await expect(podglad.daneZgloszenia).toContainText(dataIso(dataLikwidacji));
      },
    );

    for (const [tc, typ, priorytet, regresja] of [
      ['TC-108', 'KOC', TAGI.priorytet.wysoki, true],
      ['TC-109', 'SJO', TAGI.priorytet.sredni, false],
      ['TC-110', 'Pionu', TAGI.priorytet.sredni, false],
    ] as const) {
      test(
        `${tc} Zgłoszenie likwidacji ${typ}`,
        {
          tag: [
            `@${tc}`,
            priorytet,
            TAGI.rodzaj.pozytywny,
            TAGI.warstwa.e2e,
            ...(regresja ? [TAGI.kwalifikacja.regresja] : []),
            '@KO-15.4',
          ],
        },
        async ({ dashboardPage }) => {
          test.fixme(true, BRAK_ROLI_KOC);

          // Arrange
          // TODO [ZAŁOŻENIE]: kafelek „KOC” / „SJO” / „Pion” → Likwidacja, jednostka bez jednostek wewnętrznych.
          const formularz = await dashboardPage.otworzNoweZgloszenieJt();
          await formularz.rodzajZgloszenia.selectOption(RodzajZgloszenia.Likwidacja);

          // Act
          const podglad = await formularz.wyslij(zbudujDaneZgloszenia(tc).uzasadnienie);

          // Assert
          await expect(podglad.status(StatusZgloszenia.Zarejestrowane)).toBeVisible();
        },
      );
    }

    test(
      'TC-111 Data likwidacji w przeszłości',
      {
        tag: ['@TC-111', TAGI.priorytet.wysoki, TAGI.rodzaj.negatywny, TAGI.warstwa.e2e, TAGI.kwalifikacja.regresja],
        annotation: [
          ZALOZENIE_ROLI,
          ZALOZENIE_DANYCH,
          {
            type: 'defekt',
            description:
              'Dev 18.11.2026: kalendarz „Data likwidacji*” przyjmuje wczorajszą datę (pole = wczoraj), a [FIG] 22.10 – data tylko od dziś w przyszłość. Test celowo czerwony do czasu poprawki.',
          },
        ],
      },
      async ({ dashboardPage }) => {
        // Arrange
        const wczoraj = dataZaDni(-1);
        const rejestr = await dashboardPage.otworzRejestrJednostek();
        const karta = await rejestr.otworzKarteBezOtwartegoZgloszenia(dane.filtryAktywnejJt);
        const formularz = await karta.zglosLikwidacje();

        // Act
        await formularz.kalendarz.kliknijDzien(wczoraj);

        // Assert
        await expect(formularz.kalendarz.pole).not.toHaveValue(dataIso(wczoraj));
      },
    );

    test(
      'TC-112 Data likwidacji równa dzisiejszej',
      {
        tag: ['@TC-112', TAGI.priorytet.sredni, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e],
        annotation: [ZALOZENIE_ROLI, ZALOZENIE_DANYCH],
      },
      async ({ dashboardPage, zgloszeniaDoWycofania }) => {
        // Arrange
        const dzis = dataZaDni(0);
        const zgloszenie = zbudujDaneZgloszenia('TC-112');
        const rejestr = await dashboardPage.otworzRejestrJednostek();
        const karta = await rejestr.otworzKarteBezOtwartegoZgloszenia(dane.filtryAktywnejJt);
        const formularz = await karta.zglosLikwidacje();
        await formularz.kalendarz.ustaw(dzis);

        // Act
        const podglad = await formularz.wyslij(zgloszenie.uzasadnienie);
        zgloszeniaDoWycofania.push(podglad.adres());

        // Assert
        await expect(podglad.status(StatusZgloszenia.Zarejestrowane)).toBeVisible();
        await expect(podglad.daneZgloszenia).toContainText(dataIso(dzis));
      },
    );

    test(
      'TC-113 Brak uzasadnienia likwidacji',
      {
        tag: ['@TC-113', TAGI.priorytet.wysoki, TAGI.rodzaj.negatywny, TAGI.warstwa.e2e, TAGI.kwalifikacja.regresja],
        annotation: [
          ZALOZENIE_ROLI,
          ZALOZENIE_DANYCH,
          {
            type: 'uwaga',
            description:
              'P-61 („Do potwierdzenia”): wg Pola_JT_KOC_SJO_PION formularz nie ma uzasadnienia; na dev (18.11.2026) jest pole „Uzasadnienie zgłoszenia*”.',
          },
        ],
      },
      async ({ dashboardPage }) => {
        // Arrange
        const rejestr = await dashboardPage.otworzRejestrJednostek();
        const karta = await rejestr.otworzKarteBezOtwartegoZgloszenia(dane.filtryAktywnejJt);
        const formularz = await karta.zglosLikwidacje();
        await formularz.kalendarz.ustaw(dataZaDni(dane.dniDoLikwidacji));

        // Act
        await formularz.sprobujWyslac();

        // Assert
        await expect(formularz.komunikatWalidacji(dane.komunikatBrakuUzasadnienia)).toBeVisible();
        await expect(formularz.przyciskWyslij).toBeVisible();
        await expect(formularz.page).toHaveURL(/RequestId=0/);
      },
    );

    test(
      'TC-114 Likwidacja bez załącznika',
      {
        tag: ['@TC-114', TAGI.priorytet.sredni, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e],
        annotation: [
          ZALOZENIE_ROLI,
          ZALOZENIE_DANYCH,
          { type: 'założenie', description: 'K-14 / P-19: załącznik opcjonalny (rozstrzygnięte).' },
        ],
      },
      async ({ dashboardPage, zgloszeniaDoWycofania }) => {
        // Arrange
        const zgloszenie = zbudujDaneZgloszenia('TC-114');
        const rejestr = await dashboardPage.otworzRejestrJednostek();
        const karta = await rejestr.otworzKarteBezOtwartegoZgloszenia(dane.filtryAktywnejJt);
        const formularz = await karta.zglosLikwidacje();
        await formularz.kalendarz.ustaw(dataZaDni(dane.dniDoLikwidacji));

        // Act
        const podglad = await formularz.wyslij(zgloszenie.uzasadnienie);
        zgloszeniaDoWycofania.push(podglad.adres());

        // Assert
        await expect(podglad.status(StatusZgloszenia.Zarejestrowane)).toBeVisible();
      },
    );

    test(
      'TC-115 Brak możliwości zgłoszenia likwidacji jednostki zlikwidowanej – karta jednostki',
      {
        tag: ['@TC-115', TAGI.priorytet.wysoki, TAGI.rodzaj.negatywny, TAGI.warstwa.e2e, TAGI.kwalifikacja.regresja],
        annotation: [
          ZALOZENIE_ROLI,
          { type: 'założenie', description: 'P-24: zlikwidowane wykluczone z wyszukiwania.' },
        ],
      },
      async ({ dashboardPage }) => {
        // Arrange
        const rejestr = await dashboardPage.otworzRejestrJednostek();
        await rejestr.filtry.ustaw(dane.filtryZlikwidowanejJt);
        await expect(rejestr.tabela.wierszeBezWartosci(KolumnaJednostki.Status, STATUS_ZLIKWIDOWANA)).toHaveCount(0);

        // Act
        const karta = await rejestr.otworzKarte(0);

        // Assert
        await expect(karta.znacznikiNaglowka.last()).toHaveText(STATUS_ZLIKWIDOWANA);
        await expect(karta.przyciskZglosLikwidacje).toHaveCount(0);
        await expect(karta.przyciskZglosZmiane).toHaveCount(0);
      },
    );

    test(
      'TC-115 Brak możliwości zgłoszenia likwidacji jednostki zlikwidowanej – wyszukiwanie w formularzu',
      {
        tag: ['@TC-115', TAGI.priorytet.wysoki, TAGI.rodzaj.negatywny, TAGI.warstwa.e2e, TAGI.kwalifikacja.regresja],
        annotation: [
          ZALOZENIE_ROLI,
          { type: 'założenie', description: 'P-24: zlikwidowane wykluczone z wyszukiwania.' },
          {
            type: 'uwaga',
            description:
              'Pusta lista opcji jest też stanem przed wyszukaniem – test nie odróżnia wykluczenia od niewykonanego wyszukiwania. TODO: kontrola pozytywna (aktywna JT jest wyszukiwana).',
          },
        ],
      },
      async ({ dashboardPage }) => {
        // Arrange
        const rejestr = await dashboardPage.otworzRejestrJednostek();
        await rejestr.filtry.ustaw(dane.filtryZlikwidowanejJt);
        await expect(rejestr.tabela.wierszeBezWartosci(KolumnaJednostki.Status, STATUS_ZLIKWIDOWANA)).toHaveCount(0);
        const { mpk } = await rejestr.tabela.daneWiersza(rejestr.tabela.wiersze.first());
        const formularz = await dashboardPage.otworzNoweZgloszenieJt();
        await formularz.rodzajZgloszenia.selectOption(RodzajZgloszenia.Likwidacja);

        // Act
        const opcje = await formularz.wyszukajJednostke(mpk);

        // Assert
        await expect(opcje).toHaveCount(0);
      },
    );

    test(
      'TC-116 Likwidacja KOC z aktywną jednostką wewnętrzną',
      {
        tag: [
          '@TC-116',
          TAGI.priorytet.wysoki,
          TAGI.rodzaj.negatywny,
          TAGI.warstwa.e2e,
          TAGI.kwalifikacja.regresja,
          '@KO-15.6',
        ],
        annotation: { type: 'założenie', description: 'P-25: blokada przy wysyłce zgłoszenia.' },
      },
      async ({ dashboardPage }) => {
        test.fixme(true, BRAK_ROLI_KOC);

        // Arrange
        // TODO [ZAŁOŻENIE]: kafelek „KOC” → Likwidacja, KOC z literą Z i aktywną jednostką wewnętrzną; treść komunikatu (P-25).
        const formularz = await dashboardPage.otworzNoweZgloszenieJt();
        await formularz.rodzajZgloszenia.selectOption(RodzajZgloszenia.Likwidacja);

        // Act
        await formularz.sprobujWyslac();

        // Assert
        await expect(formularz.page).toHaveURL(/RequestId=0/);
      },
    );
  },
);
