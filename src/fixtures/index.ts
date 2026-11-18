import { test as base } from '@playwright/test';
import { pobierzKonto } from '../config/konta';
import { sciezkaStanuSesji } from '../config/stan-sesji';
import { Rola } from '../data/rola';
import { DashboardPage } from '../pages/dashboard.page';
import { LoginPage } from '../pages/login.page';
import { PodgladZgloszeniaPage } from '../pages/podglad-zgloszenia.page';

/** Opcje ustawiane per scenariusz przez `test.use(...)`. */
export interface OpcjeEwi {
  /** Rola, w której kontekście działa test. Domyślnie „Użytkownik podstawowy”. */
  rola: Rola;
}

/** Fixtures współdzielone w obrębie workera. */
export interface FixturesWorkeraEwi {
  /** Ścieżka do `storageState` z sesją roli – logowanie odbywa się raz na worker. */
  sesjaRoli: string;
}

/** Page Objecty dostępne w testach. */
export interface FixturesEwi {
  /** Dashboard zalogowanego użytkownika (otwarty i załadowany). */
  dashboardPage: DashboardPage;
  /**
   * Adresy podglądów zgłoszeń złożonych w teście. Po teście fixture wycofuje te, które wciąż można wycofać
   * (np. „Zarejestrowane”), żeby nie blokować jednostek na współdzielonym dev (jednostka z otwartym zgłoszeniem
   * nie przyjmuje kolejnego). Zgłoszeń w „Akceptacji kosztów” nie da się wycofać – zostają.
   */
  zgloszeniaDoWycofania: string[];
}

const KOMENTARZ_WYCOFANIA = 'Wycofanie po teście automatycznym (sprzątanie danych dev)';

/**
 * Test EWI z automatycznym logowaniem.
 * Przed pierwszym testem workera fixture `sesjaRoli` loguje się przez ekran logowania kontem roli z `.env`
 * i zapisuje sesję; każdy test startuje z tą sesją (`storageState`), więc nie loguje się ponownie.
 */
export const test = base.extend<FixturesEwi, OpcjeEwi & FixturesWorkeraEwi>({
  rola: [Rola.UzytkownikPodstawowy, { option: true, scope: 'worker' }],

  sesjaRoli: [
    async ({ rola, browser }, use, workerInfo) => {
      const konto = pobierzKonto(rola);
      const sciezka = sciezkaStanuSesji(rola, workerInfo.parallelIndex);
      const kontekst = await browser.newContext({ baseURL: workerInfo.project.use.baseURL });
      const loginPage = new LoginPage(await kontekst.newPage());
      await loginPage.goto();
      await loginPage.zaloguj(konto);
      await kontekst.storageState({ path: sciezka });
      await kontekst.close();
      await use(sciezka);
    },
    { scope: 'worker', title: 'logowanie do EWI' },
  ],

  storageState: async ({ sesjaRoli }, use) => {
    await use(sesjaRoli);
  },

  dashboardPage: async ({ page }, use) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await use(dashboard);
  },

  zgloszeniaDoWycofania: [
    async ({ page }, use) => {
      const adresy: string[] = [];
      await use(adresy);
      for (const adres of adresy) {
        await page.goto(adres);
        const podglad = new PodgladZgloszeniaPage(page);
        await podglad.expectLoaded();
        if (await podglad.przyciskWycofaj.isVisible()) {
          await podglad.wycofaj(KOMENTARZ_WYCOFANIA);
        }
      }
    },
    { title: 'wycofanie zgłoszeń z testu' },
  ],
});

export { expect } from '@playwright/test';
