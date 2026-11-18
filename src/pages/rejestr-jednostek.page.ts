import { expect, type Locator, type Page } from '@playwright/test';
import { PanelFiltrow, type UstawieniaFiltrow } from '../components/panel-filtrow.component';
import { TabelaJednostek } from '../components/tabela-jednostek.component';
import { BasePage } from './base.page';
import { KartaJednostkiPage } from './karta-jednostki.page';

/**
 * Rejestr jednostek (`/EWI/UnitRegister`) – wspólna zakładka wszystkich ról.
 * Wyszukiwarka przyjmuje nazwę (fragment, bez rozróżniania wielkości liter) oraz identyfikatory PS / MPK / O-ZSI.
 */
export class RejestrJednostekPage extends BasePage {
  readonly poleWyszukiwania: Locator;
  readonly przyciskWyszukaj: Locator;
  readonly tabela: TabelaJednostek;
  readonly filtry: PanelFiltrow;
  /** Licznik paginacji w formacie „1–10 z 42119”. */
  readonly licznikWynikow: Locator;
  /** Komunikat wyświetlany zamiast tabeli, gdy wyszukiwanie nic nie zwróciło. */
  readonly komunikatBrakuWynikow: Locator;

  /**
   * @param page - strona z zalogowanym użytkownikiem
   */
  constructor(page: Page) {
    super(page);
    this.poleWyszukiwania = page.getByRole('searchbox', { name: 'Wyszukaj jednostkę' });
    this.przyciskWyszukaj = page.getByRole('button', { name: 'Wyszukaj jednostkę' });
    this.tabela = new TabelaJednostek(page);
    this.filtry = new PanelFiltrow(page);
    this.licznikWynikow = page.getByText(/^\d+–\d+ z \d+$/);
    this.komunikatBrakuWynikow = page.getByText(/^Brak jednostek/);
  }

  /** Rejestr jest gotowy, gdy widać wyszukiwarkę i pierwszą stronę listy jednostek. */
  override async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveTitle('Rejestr jednostek');
    await this.poPrzejsciuEkranu();
    await expect(this.poleWyszukiwania).toBeVisible();
    await expect(this.tabela.wiersze.first()).toBeVisible();
  }

  /**
   * Wpisuje frazę w wyszukiwarkę i uruchamia wyszukiwanie.
   * Nie czeka na wynik – test potwierdza wynik asercją na tabeli lub komunikacie.
   * @param fraza - nazwa, fragment nazwy albo identyfikator (PS, MPK, O-ZSI)
   */
  async wyszukaj(fraza: string): Promise<void> {
    await this.poleWyszukiwania.fill(fraza);
    await this.przyciskWyszukaj.click();
  }

  /**
   * Odczytuje łączną liczbę wyników z licznika paginacji (np. 42119 z „1–10 z 42119”).
   * Służy do zapamiętania stanu wyjściowego w Arrange – do asercji używaj `licznikWynikow`.
   * @returns łączna liczba jednostek na liście
   */
  async lacznaLiczbaWynikow(): Promise<number> {
    await expect(this.licznikWynikow).toBeVisible();
    const tekst = await this.licznikWynikow.innerText();
    return Number(tekst.split(' z ')[1]);
  }

  /**
   * Wyszukuje jednostkę po MPK i czeka, aż lista pokaże dokładnie jej wiersz.
   * @param mpk - 8-znakowy kod MPK istniejącej jednostki
   * @returns wiersz jednostki na liście
   */
  async wyszukajJednostke(mpk: string): Promise<Locator> {
    await this.wyszukaj(mpk);
    const wiersz = this.tabela.wierszeZMpk(mpk);
    await expect(this.tabela.wiersze).toHaveCount(1);
    await expect(wiersz).toHaveCount(1);
    return wiersz;
  }

  /**
   * Otwiera kartę jednostki o podanym MPK (wyszukanie + akcja „Podgląd”).
   * @param mpk - 8-znakowy kod MPK istniejącej jednostki
   * @returns załadowana karta jednostki
   */
  async otworzKarteJednostki(mpk: string): Promise<KartaJednostkiPage> {
    return this.otworzKarte(await this.wyszukajJednostke(mpk));
  }

  /**
   * Szuka na liście (po ustawieniu filtrów) jednostki, której karta pozwala złożyć zgłoszenie – czyli bez otwartego
   * zgłoszenia (karta jednostki z otwartym zgłoszeniem nie ma przycisków „Zgłoś zmianę” / „Zgłoś likwidację”).
   * Przegląda kolejne wiersze i strony listy; testy na współdzielonym dev „zużywają” jednostki, więc stałe MPK
   * szybko by się wyczerpały.
   * @param filtry - filtry listy (np. typ jednostki i status „Aktywna”)
   * @param maksymalnieKart - limit otwieranych kart
   * @returns karta pierwszej jednostki bez otwartego zgłoszenia
   */
  async otworzKarteBezOtwartegoZgloszenia(
    filtry: UstawieniaFiltrow,
    maksymalnieKart = 30,
  ): Promise<KartaJednostkiPage> {
    await this.filtry.ustaw(filtry);
    await expect(this.licznikWynikow).toBeVisible();
    const naStronie = await this.tabela.wiersze.count();
    for (let proba = 0; proba < maksymalnieKart; proba++) {
      const indeks = proba % naStronie;
      if (proba > 0 && indeks === 0) {
        await this.przejdzNaNastepnaStrone();
      }
      const karta = await this.otworzKarte(indeks);
      if (await karta.przyciskZglosZmiane.isVisible()) {
        return karta;
      }
      await karta.wrocDoWynikow();
    }
    throw new Error(
      `Brak jednostki bez otwartego zgłoszenia wśród ${maksymalnieKart} kart (filtry: ${JSON.stringify(filtry)})`,
    );
  }

  /** Przechodzi na następną stronę listy i czeka na zmianę licznika paginacji. */
  async przejdzNaNastepnaStrone(): Promise<void> {
    const przed = await this.licznikWynikow.innerText();
    await this.page.getByRole('button', { name: 'go to next page' }).click();
    await expect(this.licznikWynikow).not.toHaveText(przed);
  }

  /**
   * Otwiera kartę jednostki z wiersza listy (akcja „Podgląd”).
   * @param wiersz - indeks wiersza na bieżącej stronie (od 0) albo lokator wiersza
   * @returns załadowana karta jednostki
   */
  async otworzKarte(wiersz: number | Locator): Promise<KartaJednostkiPage> {
    const lokatorWiersza = typeof wiersz === 'number' ? this.tabela.wiersze.nth(wiersz) : wiersz;
    await lokatorWiersza.getByRole('link', { name: 'Podgląd' }).click();
    const karta = new KartaJednostkiPage(this.page);
    await karta.expectLoaded();
    return karta;
  }
}
