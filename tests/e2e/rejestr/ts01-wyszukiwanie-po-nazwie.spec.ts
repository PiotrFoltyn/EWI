import { expect, test } from '../../../src/fixtures';
import { KolumnaJednostki } from '../../../src/components/tabela-jednostek.component';
import * as ts01Dane from '../../../src/data/json/ts01-wyszukiwanie-po-nazwie.json';
import { Rola } from '../../../src/data/rola';
import { TAGI } from '../../../src/data/tagi';
import type { DaneTs01 } from '../../../src/data/types/rejestr-jednostek.types';
import { zawieraBezWielkosciLiter } from '../../../src/utils/wzorce';

const dane: DaneTs01 = ts01Dane;

// Rola jest opcją workera (logowanie raz na worker), dlatego ustawiana na poziomie pliku – jeden plik = jeden scenariusz.
// TODO [ZAŁOŻENIE]: zmienić na Rola.UzytkownikPodstawowy po założeniu konta na środowisku.
test.use({ rola: Rola.Administrator });

test.describe(
  'TS_01 – Wyszukiwanie jednostek po nazwie',
  {
    tag: ['@TS_01', '@BR-KAT-01'],
    annotation: {
      type: 'założenie',
      description:
        'Scenariusz dla roli „Użytkownik podstawowy” – uruchamiany jako Administrator do czasu udostępnienia konta (Rejestr jednostek jest wspólny dla ról).',
    },
  },
  () => {
    test(
      'TC-01 Wyszukiwanie po pełnej nazwie jednostki',
      {
        tag: [
          '@TC-01',
          TAGI.priorytet.wysoki,
          TAGI.rodzaj.pozytywny,
          TAGI.warstwa.e2e,
          TAGI.kwalifikacja.smoke,
          TAGI.kwalifikacja.regresja,
          '@KO-17.1',
        ],
      },
      async ({ dashboardPage }) => {
        // Arrange
        const { pelnaNazwa } = dane.tc01;

        const rejestr = await dashboardPage.otworzRejestrJednostek();

        // Act
        await rejestr.wyszukaj(pelnaNazwa);

        // Assert
        await expect(rejestr.tabela.wiersze).toHaveCount(1);
        await expect(rejestr.tabela.komorka(rejestr.tabela.wiersze.first(), KolumnaJednostki.NazwaPelna)).toHaveText(
          pelnaNazwa,
        );
      },
    );

    test(
      'TC-02 Wyszukiwanie po fragmencie nazwy',
      {
        tag: [
          '@TC-02',
          TAGI.priorytet.wysoki,
          TAGI.rodzaj.pozytywny,
          TAGI.warstwa.e2e,
          TAGI.kwalifikacja.regresja,
          '@KO-16.6',
        ],
        annotation: {
          type: 'założenie',
          description: 'P-03: wyszukiwanie nie rozróżnia wielkości liter – fragment podany małymi literami.',
        },
      },
      async ({ dashboardPage }) => {
        // Arrange
        const { fragmentNazwy, minimalnaLiczbaWynikow } = dane.tc02;

        const rejestr = await dashboardPage.otworzRejestrJednostek();

        // Act
        await rejestr.wyszukaj(fragmentNazwy);

        // Assert
        await expect(rejestr.tabela.wierszeBez(zawieraBezWielkosciLiter(fragmentNazwy))).toHaveCount(0);
        await expect
          .poll(() => rejestr.tabela.wiersze.count(), { message: 'liczba jednostek z fragmentem nazwy' })
          .toBeGreaterThanOrEqual(minimalnaLiczbaWynikow);
      },
    );

    test(
      'TC-03 Wyszukiwanie frazy bez wyników',
      {
        tag: ['@TC-03', TAGI.priorytet.sredni, TAGI.rodzaj.negatywny, TAGI.warstwa.e2e],
        annotation: {
          type: 'założenie',
          description: 'P-04: treść komunikatu przyjęta z aplikacji (środowisko dev, 12.11.2026).',
        },
      },
      async ({ dashboardPage }) => {
        // Arrange
        const { fraza, komunikatBrakuWynikow } = dane.tc03;

        const rejestr = await dashboardPage.otworzRejestrJednostek();

        // Act
        await rejestr.wyszukaj(fraza);

        // Assert
        await expect(rejestr.komunikatBrakuWynikow).toHaveText(komunikatBrakuWynikow);
        await expect(rejestr.tabela.wiersze).toHaveCount(0);
      },
    );

    test(
      'TC-04 Wyszukiwanie obejmuje jednostki zlikwidowane',
      {
        tag: [
          '@TC-04',
          TAGI.priorytet.wysoki,
          TAGI.rodzaj.pozytywny,
          TAGI.warstwa.e2e,
          TAGI.kwalifikacja.regresja,
          '@KO-16.3',
        ],
        annotation: { type: 'założenie', description: 'K-05: status jednostki zlikwidowanej = „Zlikwidowana”.' },
      },
      async ({ dashboardPage }) => {
        // Arrange
        const { mpkZlikwidowanej, statusZlikwidowana } = dane.tc04;

        const rejestr = await dashboardPage.otworzRejestrJednostek();

        // Act
        await rejestr.wyszukaj(mpkZlikwidowanej);

        // Assert
        const wiersz = rejestr.tabela.wierszeZMpk(mpkZlikwidowanej);
        await expect(rejestr.tabela.wiersze).toHaveCount(1);
        await expect(wiersz).toHaveCount(1);
        await expect(rejestr.tabela.komorka(wiersz, KolumnaJednostki.Status)).toHaveText(statusZlikwidowana);
      },
    );
  },
);
