import { expect, test } from '../../../src/fixtures';
import type { FiltrRejestru } from '../../../src/components/panel-filtrow.component';
import { KolumnaJednostki } from '../../../src/components/tabela-jednostek.component';
import * as ts03Dane from '../../../src/data/json/ts03-filtrowanie-listy-jednostek.json';
import { Rola } from '../../../src/data/rola';
import { TAGI } from '../../../src/data/tagi';
import type { DaneTs03 } from '../../../src/data/types/rejestr-jednostek.types';
import { wzorzecLacznejLiczbyWynikow, zawieraBezWielkosciLiter } from '../../../src/utils/wzorce';

const dane: DaneTs03 = ts03Dane;

// Rola jest opcją workera (logowanie raz na worker), dlatego ustawiana na poziomie pliku – jeden plik = jeden scenariusz.
// TODO [ZAŁOŻENIE]: zmienić na Rola.UzytkownikPodstawowy po założeniu konta na środowisku.
test.use({ rola: Rola.Administrator });

const ZALOZENIE_LICZBY_WYNIKOW = {
  type: 'założenie',
  description:
    'Oczekiwana liczba wyników = stan danych na dev po migracji (12.11.2026) – aktualizować po zmianie danych.',
};

test.describe(
  'TS_03 – Filtrowanie listy jednostek',
  {
    tag: ['@TS_03', '@KO-17.2', '@KO-17.4'],
    annotation: {
      type: 'założenie',
      description:
        'Scenariusz dla roli „Użytkownik podstawowy” – uruchamiany jako Administrator do czasu udostępnienia konta (Rejestr jednostek jest wspólny dla ról).',
    },
  },
  () => {
    test(
      'TC-10 Filtr typu jednostki',
      {
        tag: ['@TC-10', TAGI.priorytet.wysoki, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e, TAGI.kwalifikacja.regresja],
        annotation: ZALOZENIE_LICZBY_WYNIKOW,
      },
      async ({ dashboardPage }) => {
        // Arrange
        const { filtry, typWKolumnie, oczekiwanaLiczbaWynikow } = dane.tc10;

        const rejestr = await dashboardPage.otworzRejestrJednostek();

        // Act
        await rejestr.filtry.ustaw(filtry);

        // Assert
        await expect(rejestr.licznikWynikow).toHaveText(wzorzecLacznejLiczbyWynikow(oczekiwanaLiczbaWynikow));
        await expect(rejestr.tabela.wierszeBezWartosci(KolumnaJednostki.TypJednostki, typWKolumnie)).toHaveCount(0);
      },
    );

    test(
      'TC-11 Filtr pionu',
      {
        tag: ['@TC-11', TAGI.priorytet.wysoki, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e, TAGI.kwalifikacja.regresja],
        annotation: [
          ZALOZENIE_LICZBY_WYNIKOW,
          {
            type: 'założenie',
            description:
              'Pion nie jest kolumną listy – przynależność sprawdzana na kartach pierwszych jednostek z wyniku.',
          },
        ],
      },
      async ({ dashboardPage }) => {
        // Arrange
        const { filtry, pionNaKarcie, oczekiwanaLiczbaWynikow, liczbaSprawdzanychKart } = dane.tc11;

        const rejestr = await dashboardPage.otworzRejestrJednostek();

        // Act
        await rejestr.filtry.ustaw(filtry);

        // Assert
        await expect(rejestr.licznikWynikow).toHaveText(wzorzecLacznejLiczbyWynikow(oczekiwanaLiczbaWynikow));

        for (let indeks = 0; indeks < liczbaSprawdzanychKart; indeks++) {
          const karta = await rejestr.otworzKarte(indeks);
          await expect.soft(karta.elementStruktury(pionNaKarcie), `pion jednostki nr ${indeks + 1}`).toBeVisible();
          await karta.wrocDoWynikow();
        }
      },
    );

    test(
      'TC-12 Filtr regionu',
      {
        tag: ['@TC-12', TAGI.priorytet.wysoki, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e, TAGI.kwalifikacja.regresja],
        annotation: [
          ZALOZENIE_LICZBY_WYNIKOW,
          {
            type: 'założenie',
            description:
              'Region nie jest kolumną listy – przynależność sprawdzana na kartach pierwszych jednostek z wyniku.',
          },
        ],
      },
      async ({ dashboardPage }) => {
        // Arrange
        const { filtry, regionNaKarcie, oczekiwanaLiczbaWynikow, liczbaSprawdzanychKart } = dane.tc12;

        const rejestr = await dashboardPage.otworzRejestrJednostek();

        // Act
        await rejestr.filtry.ustaw(filtry);

        // Assert
        await expect(rejestr.licznikWynikow).toHaveText(wzorzecLacznejLiczbyWynikow(oczekiwanaLiczbaWynikow));

        for (let indeks = 0; indeks < liczbaSprawdzanychKart; indeks++) {
          const karta = await rejestr.otworzKarte(indeks);
          await expect.soft(karta.pole('Region'), `region jednostki nr ${indeks + 1}`).toHaveText(regionNaKarcie);
          await karta.wrocDoWynikow();
        }
      },
    );

    test(
      'TC-13 Filtr „tylko zlikwidowane”',
      {
        tag: [
          '@TC-13',
          TAGI.priorytet.wysoki,
          TAGI.rodzaj.pozytywny,
          TAGI.warstwa.e2e,
          TAGI.kwalifikacja.regresja,
          '@KO-16.3',
        ],
        annotation: {
          type: 'założenie',
          description:
            'K-05 / P-05: aplikacja nie ma przełącznika „tylko zlikwidowane” – realizuje go filtr Status = „Zlikwidowana”.',
        },
      },
      async ({ dashboardPage }) => {
        // Arrange
        const { filtry, statusWKolumnie } = dane.tc13;

        const rejestr = await dashboardPage.otworzRejestrJednostek();

        const lacznieBezFiltrow = await rejestr.lacznaLiczbaWynikow();

        // Act
        await rejestr.filtry.ustaw(filtry);

        // Assert
        await expect(rejestr.licznikWynikow).not.toHaveText(wzorzecLacznejLiczbyWynikow(lacznieBezFiltrow));
        await expect(rejestr.tabela.wierszeBezWartosci(KolumnaJednostki.Status, statusWKolumnie)).toHaveCount(0);
      },
    );

    test(
      'TC-14 Kombinacja filtrów i frazy wyszukiwania',
      {
        tag: ['@TC-14', TAGI.priorytet.sredni, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e],
        annotation: [
          ZALOZENIE_LICZBY_WYNIKOW,
          {
            type: 'uwaga',
            description:
              'Na dev wszystkie jednostki SJO mają region „Z – jednostka specjalistyczna” – region nie zawęża wyniku dla SJO.',
          },
        ],
      },
      async ({ dashboardPage }) => {
        // Arrange
        const { filtry, fragmentNazwy, typWKolumnie, oczekiwanaLiczbaWynikow } = dane.tc14;

        const rejestr = await dashboardPage.otworzRejestrJednostek();

        // Act
        await rejestr.filtry.ustaw(filtry);
        await rejestr.wyszukaj(fragmentNazwy);

        // Assert
        await expect(rejestr.licznikWynikow).toHaveText(wzorzecLacznejLiczbyWynikow(oczekiwanaLiczbaWynikow));
        await expect(rejestr.tabela.wierszeBezWartosci(KolumnaJednostki.TypJednostki, typWKolumnie)).toHaveCount(0);
        await expect(rejestr.tabela.wierszeBez(zawieraBezWielkosciLiter(fragmentNazwy))).toHaveCount(0);
      },
    );

    test(
      'TC-15 Kombinacja filtrów bez wyników',
      {
        tag: ['@TC-15', TAGI.priorytet.niski, TAGI.rodzaj.negatywny, TAGI.warstwa.e2e],
        annotation: {
          type: 'założenie',
          description: 'P-04: treść komunikatu przyjęta z aplikacji (dev, 12.11.2026).',
        },
      },
      async ({ dashboardPage }) => {
        // Arrange
        const { filtry, komunikatBrakuWynikow } = dane.tc15;

        const rejestr = await dashboardPage.otworzRejestrJednostek();

        // Act
        await rejestr.filtry.ustaw(filtry);

        // Assert
        await expect(rejestr.komunikatBrakuWynikow).toHaveText(komunikatBrakuWynikow);
        await expect(rejestr.tabela.wiersze).toHaveCount(0);
      },
    );

    test(
      'TC-16 Wyczyszczenie filtrów',
      {
        tag: ['@TC-16', TAGI.priorytet.niski, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e],
        annotation: { type: 'założenie', description: 'P-02: akcja „Wyczyść filtry” w panelu filtrów.' },
      },
      async ({ dashboardPage }) => {
        // Arrange
        const { filtry, wartoscPustegoFiltra } = dane.tc16;
        const ustawioneFiltry = Object.keys(filtry) as FiltrRejestru[];

        const rejestr = await dashboardPage.otworzRejestrJednostek();
        const lacznieBezFiltrow = await rejestr.lacznaLiczbaWynikow();
        await rejestr.filtry.ustaw(filtry);
        await expect(rejestr.licznikWynikow).not.toHaveText(wzorzecLacznejLiczbyWynikow(lacznieBezFiltrow));

        // Act
        await rejestr.filtry.wyczysc();
        await rejestr.filtry.otworz();

        // Assert
        await expect(rejestr.licznikWynikow).toHaveText(wzorzecLacznejLiczbyWynikow(lacznieBezFiltrow));
        for (const filtr of ustawioneFiltry) {
          await expect.soft(rejestr.filtry.pole(filtr), `filtr „${filtr}”`).toHaveText(wartoscPustegoFiltra);
        }
      },
    );
  },
);
