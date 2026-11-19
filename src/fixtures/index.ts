import { test as base } from '@playwright/test';
import type { UstawieniaFiltrow } from '../components/panel-filtrow.component';
import { pobierzKonto } from '../config/konta';
import { sciezkaStanuSesji } from '../config/stan-sesji';
import { zbudujDaneZgloszenia } from '../data/builders/zgloszenie.builder';
import { Rola } from '../data/rola';
import { DashboardPage } from '../pages/dashboard.page';
import { EtykietaPola } from '../pages/karta-jednostki.page';
import { LoginPage } from '../pages/login.page';
import { PodgladZgloszeniaPage } from '../pages/podglad-zgloszenia.page';
import { PoleZmiany } from '../pages/zgloszenie.page';

/** Opcje ustawiane per scenariusz przez `test.use(...)`. */
export interface OpcjeEwi {
  /** Rola, w której kontekście działa test. Domyślnie „Użytkownik podstawowy”. */
  rola: Rola;
}

/** Fixtures współdzielone w obrębie workera. */
export interface FixturesWorkeraEwi {
  /** Ścieżka do `storageState` z sesją roli – logowanie odbywa się raz na worker. */
  sesjaRoli: string;
  /**
   * Jednostka techniczna zmieniona (nazwa długa) przez zalogowaną rolę pełnym obiegiem zgłoszenia – ostatni wpis
   * jej historii zmian to „Zmiana danych” tej roli. Wymaga roli Administratora (przejęcie, akceptacja, realizacja).
   * Jedna zmiana na worker – wspólna dla testów, które tylko ją odczytują; scenariusz uruchamiaj w jednym workerze
   * (`test.describe.configure({ mode: 'default' })`), bo równoległe testy wybrałyby tę samą wolną jednostkę.
   * Zmiany nie da się cofnąć – jednostka zostaje zmieniona na dev.
   */
  zrealizowanaZmianaJednostki: ZrealizowanaZmiana;
}

/** Jednostka zmieniona pełnym obiegiem zgłoszenia (złożenie → przejęcie → akceptacja → realizacja). */
export interface ZrealizowanaZmiana {
  /** MPK główny zmienionej jednostki technicznej. */
  mpk: string;
  /** Nowa nazwa długa jednostki (unikalna – z datą i godziną). */
  nazwaDluga: string;
  /** Adres podglądu zakończonego zgłoszenia. */
  adresZgloszenia: string;
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

/** Filtry Rejestru dla jednostek, które Administrator może zgłosić do zmiany (kafelek jednostki technicznej). */
const FILTRY_AKTYWNEJ_JT: UstawieniaFiltrow = { typJednostki: 'Jednostka techniczna', status: 'Aktywna' };

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

  zrealizowanaZmianaJednostki: [
    async ({ browser, sesjaRoli }, use, workerInfo) => {
      const { baseURL, locale, timezoneId } = workerInfo.project.use;
      const kontekst = await browser.newContext({ baseURL, locale, timezoneId, storageState: sesjaRoli });
      const page = await kontekst.newPage();
      const zgloszenie = zbudujDaneZgloszenia('ZMIANA');
      let podglad: PodgladZgloszeniaPage | undefined;
      let zmiana: ZrealizowanaZmiana;
      try {
        const dashboard = new DashboardPage(page);
        await dashboard.goto();
        const rejestr = await dashboard.otworzRejestrJednostek();
        const karta = await rejestr.otworzKarteBezOtwartegoZgloszenia(FILTRY_AKTYWNEJ_JT);
        const mpk = (await karta.pole(EtykietaPola.MpkGlowny).innerText()).trim();
        const formularz = await karta.zglosZmiane();
        await formularz.zmien(PoleZmiany.NazwaDluga, zgloszenie.nazwaDluga);
        podglad = await formularz.wyslij(zgloszenie.uzasadnienie);
        await podglad.expectLoaded();
        await podglad.przejmij();
        const zmianaDanych = await podglad.zaakceptuj();
        const zakonczone = await zmianaDanych.zapiszZmianyWJednostce();
        zmiana = { mpk, nazwaDluga: zgloszenie.nazwaDluga, adresZgloszenia: zakonczone.adres() };
      } catch (blad) {
        // Przerwany obieg przed przejęciem – wycofanie odblokowuje jednostkę (po przejęciu nie da się wycofać).
        if (podglad && (await podglad.przyciskWycofaj.isVisible())) {
          await podglad.wycofaj(KOMENTARZ_WYCOFANIA);
        }
        throw blad;
      } finally {
        await kontekst.close();
      }
      await use(zmiana);
    },
    { scope: 'worker', timeout: 180_000, title: 'zmiana jednostki pełnym obiegiem zgłoszenia' },
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
