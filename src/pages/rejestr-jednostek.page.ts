import { expect, type Locator, type Page } from '@playwright/test';
import { PanelFiltrow } from '../components/panel-filtrow.component';
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
