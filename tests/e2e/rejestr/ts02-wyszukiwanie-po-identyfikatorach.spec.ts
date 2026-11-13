import { expect, test } from '../../../src/fixtures';
import * as ts02Dane from '../../../src/data/json/ts02-wyszukiwanie-po-identyfikatorach.json';
import { Rola } from '../../../src/data/rola';
import { TAGI } from '../../../src/data/tagi';
import type { DaneTs02 } from '../../../src/data/types/rejestr-jednostek.types';

const dane: DaneTs02 = ts02Dane;

// Rola jest opcją workera (logowanie raz na worker), dlatego ustawiana na poziomie pliku – jeden plik = jeden scenariusz.
// TODO [ZAŁOŻENIE]: zmienić na Rola.UzytkownikPodstawowy po założeniu konta na środowisku.
test.use({ rola: Rola.Administrator });

test.describe(
  'TS_02 – Wyszukiwanie jednostek po identyfikatorach MPK, PS i O-ZSI',
  {
    tag: ['@TS_02', '@KO-17.1'],
    annotation: {
      type: 'założenie',
      description:
        'Scenariusz dla roli „Użytkownik podstawowy” – uruchamiany jako Administrator do czasu udostępnienia konta (Rejestr jednostek jest wspólny dla ról).',
    },
  },
  () => {
    test(
      'TC-05 Wyszukiwanie po MPK',
      {
        tag: [
          '@TC-05',
          TAGI.priorytet.wysoki,
          TAGI.rodzaj.pozytywny,
          TAGI.warstwa.e2e,
          TAGI.kwalifikacja.regresja,
          '@BR-KAT-01',
        ],
      },
      async ({ dashboardPage }) => {
        // Arrange
        const { mpk } = dane.tc05;

        const rejestr = await dashboardPage.otworzRejestrJednostek();

        // Act
        await rejestr.wyszukaj(mpk);

        // Assert
        await expect(rejestr.tabela.wiersze).toHaveCount(1);
        await expect(rejestr.tabela.wierszeZMpk(mpk)).toHaveCount(1);
      },
    );

    test(
      'TC-06 Wyszukiwanie po numerze PS',
      {
        tag: ['@TC-06', TAGI.priorytet.wysoki, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e, TAGI.kwalifikacja.regresja],
      },
      async ({ dashboardPage }) => {
        // Arrange
        const { ps } = dane.tc06;

        const rejestr = await dashboardPage.otworzRejestrJednostek();

        // Act
        await rejestr.wyszukaj(ps);

        // Assert
        await expect(rejestr.tabela.wiersze).toHaveCount(1);
        await expect(rejestr.tabela.wierszeZPs(ps)).toHaveCount(1);
      },
    );

    test(
      'TC-07 Wyszukiwanie po PS współdzielonym przez kilka jednostek',
      {
        tag: ['@TC-07', TAGI.priorytet.sredni, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e, '@KO-8.3', '@KO-13.3'],
        annotation: { type: 'typ', description: 'Brzegowy (zakładka „Kwalifikacja”).' },
      },
      async ({ dashboardPage }) => {
        // Arrange
        const { psWspoldzielony, mpkJednostek } = dane.tc07;

        const rejestr = await dashboardPage.otworzRejestrJednostek();

        // Act
        await rejestr.wyszukaj(psWspoldzielony);

        // Assert
        await expect(rejestr.tabela.wiersze).toHaveCount(mpkJednostek.length);
        await expect(rejestr.tabela.wierszeZPs(psWspoldzielony)).toHaveCount(mpkJednostek.length);
        for (const mpk of mpkJednostek) {
          await expect.soft(rejestr.tabela.wierszeZMpk(mpk), `jednostka o MPK ${mpk}`).toHaveCount(1);
        }
      },
    );

    test(
      'TC-08 Wyszukiwanie po O-ZSI',
      {
        tag: ['@TC-08', TAGI.priorytet.wysoki, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e, TAGI.kwalifikacja.regresja],
        annotation: { type: 'wymaganie', description: 'PO-23: O-ZSI przechowywany w EWI.' },
      },
      async ({ dashboardPage }) => {
        // Arrange
        const { ozsi } = dane.tc08;

        const rejestr = await dashboardPage.otworzRejestrJednostek();

        // Act
        await rejestr.wyszukaj(ozsi);

        // Assert
        await expect(rejestr.tabela.wiersze).toHaveCount(1);
        await expect(rejestr.tabela.wierszeZOzsi(ozsi)).toHaveCount(1);
      },
    );

    test(
      'TC-09 Wyszukiwanie po fragmencie MPK',
      {
        tag: ['@TC-09', TAGI.priorytet.sredni, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e, '@KO-16.6'],
        annotation: {
          type: 'założenie',
          description: 'P-03 / K-07: wyszukiwanie fragmentem obejmuje identyfikatory – nierozstrzygnięte.',
        },
      },
      async ({ dashboardPage }) => {
        // Na dev (12.11.2026) identyfikatory wyszukiwane są tylko dokładnie – „ZA00” nie zwraca wyników.
        test.fixme(true, 'K-07 / P-03: czy fragment identyfikatora ma być wyszukiwany – czeka na decyzję analityka.');

        // Arrange
        const { fragmentMpk, minimalnaLiczbaWynikow } = dane.tc09;

        const rejestr = await dashboardPage.otworzRejestrJednostek();

        // Act
        await rejestr.wyszukaj(fragmentMpk);

        // Assert
        await expect(rejestr.tabela.wierszeBezFragmentuMpk(fragmentMpk)).toHaveCount(0);
        await expect
          .poll(() => rejestr.tabela.wiersze.count(), { message: 'liczba jednostek z fragmentem MPK' })
          .toBeGreaterThanOrEqual(minimalnaLiczbaWynikow);
      },
    );
  },
);
