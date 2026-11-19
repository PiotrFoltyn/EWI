import * as ts08Dane from '../../src/data/json/ts08-ekran-startowy-i-nawigacja.json';
import { Rola } from '../../src/data/rola';
import { TAGI } from '../../src/data/tagi';
import type { DaneTs08 } from '../../src/data/types/dashboard.types';
import { expect, test } from '../../src/fixtures';
import { KafelekJednostek, KafelekZgloszen } from '../../src/pages/dashboard.page';
import { wzorzecLacznejLiczbyWynikow } from '../../src/utils/wzorce';

const dane: DaneTs08 = ts08Dane;

test.use({ rola: Rola.Administrator });

const ZALOZENIE_ROLI = {
  type: 'założenie',
  description:
    'Przypadki dla roli „Użytkownik podstawowy” wykonywane jako Administrator – brak konta tej roli na dev (dashboard Administratora ma dodatkowo „Zarządzanie” i kolejkę zgłoszeń).',
};

const ZALOZENIE_MENU = {
  type: 'założenie',
  description:
    'P-02 / [FIG]: pozycja menu „Dashboard” z przypadku to w aplikacji „Lista zadań” (prowadzi do /EWI/Dashboard, tytuł strony „Dashboard”). Makieta [FIG] 27.10 niedostępna w narzędziach – układ porównany z ustaleniami z dev (19.11.2026).',
};

test.describe('TS_08 – Ekran startowy i nawigacja', { tag: ['@TS_08'] }, () => {
  test(
    'TC-34 Ekran startowy zgodny z makietą',
    {
      tag: ['@TC-34', TAGI.priorytet.sredni, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e, TAGI.kwalifikacja.smoke],
      annotation: [ZALOZENIE_ROLI, ZALOZENIE_MENU],
    },
    async ({ dashboardPage }) => {
      // Arrange
      const oczekiwane = dane.tc34;
      // Start z innej zakładki – asercje nie mogą przejść na dashboardzie otwartym przez fixture.
      await dashboardPage.otworzRejestrJednostek();

      // Act
      const dashboard = await dashboardPage.otworzListeZadan();

      // Assert
      await expect(dashboard.page).toHaveURL(/\/EWI\/Dashboard$/);
      await expect(dashboard.powitanie).toContainText(oczekiwane.powitanie);
      await expect(dashboard.page.getByRole('main')).toContainText(oczekiwane.opis);
      await expect(dashboard.page.getByRole('button', { name: oczekiwane.przyciskNowegoZgloszenia })).toBeVisible();
      for (const kafelek of Object.values(KafelekZgloszen)) {
        await expect(dashboard.kafelekZgloszen(kafelek), kafelek).toBeVisible();
      }
      for (const kafelek of Object.values(KafelekJednostek)) {
        await expect(dashboard.kafelek(kafelek), kafelek).toBeVisible();
      }
      for (const sekcja of oczekiwane.sekcje) {
        await expect(dashboard.tytulSekcji(sekcja), sekcja).toBeVisible();
      }
      await expect(dashboard.page.getByRole('searchbox', { name: oczekiwane.placeholderWyszukiwarki })).toBeVisible();
      for (const pozycja of oczekiwane.pozycjeMenu) {
        await expect(dashboard.menu.pozycja(pozycja), pozycja).toBeVisible();
      }
    },
  );

  test(
    'TC-35 Nawigacja z ekranu startowego do katalogu',
    {
      tag: [
        '@TC-35',
        TAGI.priorytet.wysoki,
        TAGI.rodzaj.pozytywny,
        TAGI.warstwa.e2e,
        TAGI.kwalifikacja.smoke,
        TAGI.kwalifikacja.regresja,
      ],
      annotation: ZALOZENIE_ROLI,
    },
    async ({ dashboardPage }) => {
      // Arrange
      await expect(dashboardPage.page).toHaveTitle('Dashboard');

      // Act
      const rejestr = await dashboardPage.otworzRejestrJednostek();

      // Assert
      await expect(rejestr.page).toHaveURL(/\/EWI\/UnitRegister$/);
      await expect(rejestr.licznikWynikow).toHaveText(/^1–10 z \d+$/);
      await expect(rejestr.tabela.wiersze).toHaveCount(10);
    },
  );

  test(
    'TC-36 Nawigacja z ekranu startowego do raportów',
    {
      tag: ['@TC-36', TAGI.priorytet.sredni, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e],
      annotation: [
        ZALOZENIE_ROLI,
        {
          type: 'założenie',
          description:
            'Raporty standardowe = „Pliki dla odbiorców” (Temat 5013, MPK_DICT, Plik zmian dla O-ZSI), raport własny = „Raport ad hoc” (jak w TS_10 / TS_11).',
        },
      ],
    },
    async ({ dashboardPage }) => {
      // Arrange
      const { raportyStandardowe, raportWlasny } = dane.tc36;
      await expect(dashboardPage.page).toHaveTitle('Dashboard');

      // Act
      const raporty = await dashboardPage.otworzRaporty();

      // Assert
      await expect(raporty.page).toHaveURL(/\/EWI\/Reports$/);
      await expect(
        raporty.tabelaPlikow.getByRole('row').filter({ has: raporty.page.getByRole('gridcell') }),
      ).toHaveCount(raportyStandardowe.length);
      for (const raport of raportyStandardowe) {
        await expect(raporty.tabelaPlikow.getByRole('gridcell', { name: raport, exact: true }), raport).toBeVisible();
      }
      await expect(raporty.tytulRaportuAdHoc).toHaveText(raportWlasny);
    },
  );

  test(
    'TC-37 Ekran startowy przy pustym katalogu',
    { tag: ['@TC-37', TAGI.priorytet.niski, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e], annotation: ZALOZENIE_ROLI },
    async ({ dashboardPage }) => {
      test.fixme(
        true,
        'Wymaga środowiska bez zasilonych jednostek – dev ma ok. 42 tys. jednostek i zgłoszenia; brak środowiska z pustym katalogiem.',
      );

      // Arrange
      await dashboardPage.poWczytaniuKolejek();

      // Act
      await dashboardPage.goto();

      // Assert
      for (const kafelek of [...Object.values(KafelekZgloszen), ...Object.values(KafelekJednostek)]) {
        expect(await dashboardPage.licznikKafelka(kafelek), kafelek).toBe(0);
      }
      await expect(dashboardPage.komunikatBrakuZgloszen).toHaveText(dane.tc38.komunikatBrakuZgloszen);
    },
  );

  for (const kafelek of Object.values(KafelekZgloszen)) {
    test(
      `TC-38 Dane na ekranie startowym zgodne z katalogiem – kafelek „${kafelek}”`,
      {
        tag: ['@TC-38', TAGI.priorytet.sredni, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e],
        annotation: [
          ZALOZENIE_ROLI,
          {
            type: 'założenie',
            description:
              'P-02: dashboard nie pokazuje liczby jednostek – zgodność sprawdzana jako licznik kafelka = liczba zgłoszeń w kolejce „Zgłoszenia do obsługi” po kliknięciu kafelka (kolejka bez stronicowania, dev 19.11.2026: do 10 zgłoszeń).',
          },
        ],
      },
      async ({ dashboardPage }) => {
        // Arrange
        await dashboardPage.poWczytaniuKolejek();
        const licznik = await dashboardPage.licznikKafelka(kafelek);

        // Act
        await dashboardPage.pokazZgloszenia(kafelek);

        // Assert
        await expect(dashboardPage.wierszeZgloszenDoObslugi).toHaveCount(licznik);
      },
    );
  }

  test(
    'TC-38 Dane na ekranie startowym zgodne z katalogiem – kafelek „Oddziały w likwidacji”',
    {
      tag: ['@TC-38', TAGI.priorytet.sredni, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e],
      annotation: [
        ZALOZENIE_ROLI,
        {
          type: 'założenie',
          description:
            'Kafelek „Oddziały w likwidacji” = jednostki w Rejestrze z filtrami Status „W likwidacji” i Typ jednostki „Oddział”.',
        },
      ],
    },
    async ({ dashboardPage }) => {
      // Arrange
      const licznik = await dashboardPage.licznikKafelka(KafelekJednostek.OddzialyWLikwidacji);
      const rejestr = await dashboardPage.otworzRejestrJednostek();

      // Act
      await rejestr.filtry.ustaw(dane.tc38.filtryOddzialowWLikwidacji);

      // Assert
      await expect(rejestr.licznikWynikow).toHaveText(wzorzecLacznejLiczbyWynikow(licznik));
    },
  );
});
