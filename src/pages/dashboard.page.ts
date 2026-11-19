import { expect, type Locator } from '@playwright/test';
import { escapujRegex } from '../utils/wzorce';
import { BasePage } from './base.page';
import { RaportyPage } from './raporty.page';
import { RejestrJednostekPage } from './rejestr-jednostek.page';
import { ZarzadzaniePage } from './zarzadzanie.page';
import { ZgloszeniePage } from './zgloszenie.page';

/** Kafelki-linki zgłoszeń na dashboardzie – kliknięcie filtruje kolejkę „Zgłoszenia do obsługi”. */
export enum KafelekZgloszen {
  DoPrzejecia = 'Do przejęcia',
  WRealizacji = 'W realizacji',
  CzekaNaSap = 'Czeka na SAP',
}

/** Kafelki informacyjne o jednostkach (bez akcji) – licznik i opis pomocniczy. */
export enum KafelekJednostek {
  ZmianyZDataPrzyszla = 'Zmiany z datą przyszłą',
  JednostkiTestowe = 'Jednostki testowe',
  OddzialyWLikwidacji = 'Oddziały w likwidacji',
}

/**
 * Dashboard – ekran startowy po zalogowaniu (`/EWI/` i `/EWI/Dashboard`, w menu „Lista zadań”; zawartość zależy od roli).
 * Administrator widzi powitanie, kafelki zgłoszeń i jednostek, kolejkę „Zgłoszenia do obsługi” i „Moje zgłoszenia”.
 */
export class DashboardPage extends BasePage {
  /** Powitanie „Dzień dobry, <login>” z opisem ekranu. */
  get powitanie(): Locator {
    return this.page.getByRole('main').getByText(/^Dzień dobry,/);
  }

  /**
   * Sekcja ekranu po tytule („Zgłoszenia do obsługi”, „Moje zgłoszenia”).
   * Sekcje nie mają roli ani nagłówka w dostępności – kontener `.margin-bottom-l` (klasa motywu OutSystems UI,
   * nie generowane ID) zawężony tytułem; obie sekcje mają siatki o tych samych kolumnach.
   * @param tytul - tytuł sekcji dokładnie jak na ekranie
   * @returns lokator kontenera sekcji
   */
  sekcja(tytul: string): Locator {
    return this.page.getByRole('main').locator('.margin-bottom-l').filter({ hasText: tytul });
  }

  /**
   * Tytuł sekcji – tekst na ekranie (do sprawdzenia układu).
   * @param tytul - tytuł sekcji dokładnie jak na ekranie
   * @returns lokator tytułu
   */
  tytulSekcji(tytul: string): Locator {
    return this.page.getByRole('main').getByText(tytul, { exact: true });
  }

  /** Wiersze siatki sekcji „Zgłoszenia do obsługi” (bez nagłówka i bez „Moje zgłoszenia”). */
  get wierszeZgloszenDoObslugi(): Locator {
    return this.sekcja('Zgłoszenia do obsługi')
      .getByRole('row')
      .filter({ has: this.page.getByRole('gridcell') });
  }

  /** Komunikat pustej kolejki „Zgłoszenia do obsługi” (np. po filtrze kafelka z licznikiem 0). */
  get komunikatBrakuZgloszen(): Locator {
    return this.sekcja('Zgłoszenia do obsługi').getByText(/^Brak zgłoszeń/);
  }

  /** Wskaźnik ładowania siatek („Ładowanie…”) – znika po wczytaniu kolejek. */
  get ladowanie(): Locator {
    return this.page.getByRole('main').getByText('Ładowanie…');
  }

  /**
   * Kafelek-link zgłoszeń (np. „Do przejęcia 3 Najdłużej: 0 dni · średnio: 0 dni”).
   * @param kafelek - kafelek z `KafelekZgloszen`
   * @returns lokator linku kafelka
   */
  kafelekZgloszen(kafelek: KafelekZgloszen): Locator {
    return this.page.getByRole('main').getByRole('link', { name: new RegExp(`^${escapujRegex(kafelek)} \\d+`) });
  }

  /**
   * Kafelek dashboardu (zgłoszeń lub jednostek) z tytułem, licznikiem i opisem pomocniczym.
   * Kafelki jednostek nie mają roli – kontener `.columns-item` (kolumna siatki OutSystems UI, nie generowane ID).
   * @param kafelek - kafelek z `KafelekZgloszen` lub `KafelekJednostek`
   * @returns lokator kafelka
   */
  kafelek(kafelek: KafelekZgloszen | KafelekJednostek): Locator {
    return this.page
      .getByRole('main')
      .locator('.columns-item')
      .filter({ hasText: new RegExp(`^\\s*${escapujRegex(kafelek)}\\s*\\d+`) });
  }

  /**
   * Odczytuje licznik kafelka (liczbę po tytule). Do zapamiętania stanu w Arrange – asercje na lokatorach.
   * @param kafelek - kafelek zgłoszeń lub jednostek
   * @returns wartość licznika
   */
  async licznikKafelka(kafelek: KafelekZgloszen | KafelekJednostek): Promise<number> {
    const tekst = await this.kafelek(kafelek).innerText();
    const dopasowanie = new RegExp(`${escapujRegex(kafelek)}\\s*(\\d+)`).exec(tekst);
    if (!dopasowanie) {
      throw new Error(`Brak licznika kafelka „${kafelek}” w tekście: ${tekst}`);
    }
    return Number(dopasowanie[1]);
  }

  /**
   * Czeka na wczytanie obu kolejek dashboardu (znika „Ładowanie…”).
   */
  async poWczytaniuKolejek(): Promise<void> {
    await expect(this.ladowanie).toHaveCount(0, { timeout: 30_000 });
  }

  /**
   * Klika kafelek zgłoszeń – kolejka „Zgłoszenia do obsługi” pokazuje zgłoszenia o danym stanie.
   * Nie czeka na wynik – test sprawdza wiersze lub komunikat pustej listy.
   * @param kafelek - kafelek z `KafelekZgloszen`
   */
  async pokazZgloszenia(kafelek: KafelekZgloszen): Promise<void> {
    await this.kafelekZgloszen(kafelek).click();
  }

  /**
   * Przechodzi na dashboard z menu głównego („Lista zadań”).
   * @returns załadowany dashboard
   */
  async otworzListeZadan(): Promise<DashboardPage> {
    await this.menu.listaZadan.click();
    await this.expectLoaded();
    return this;
  }

  /** Kafelek „Nowe zgłoszenie – jednostka techniczna +”. */
  get przyciskNoweZgloszenieJt(): Locator {
    return this.page.getByRole('main').getByRole('button', { name: /^Nowe zgłoszenie – jednostka techniczna/ });
  }

  /** Wyszukiwarka kolejki „Zgłoszenia do obsługi” (fragment nazwy pełnej lub krótkiej). */
  get wyszukiwarkaZgloszen(): Locator {
    return this.page.getByRole('searchbox', { name: 'Wyszukaj po fragmencie nazwy pełnej lub krótkiej' });
  }

  /** Wiersze kolejki „Zgłoszenia do obsługi” (bez nagłówka). */
  get wierszeKolejki(): Locator {
    return this.page
      .getByRole('main')
      .getByRole('grid')
      .filter({ has: this.page.getByRole('columnheader', { name: 'Zgłaszający' }) })
      .getByRole('row')
      .filter({ has: this.page.getByRole('gridcell') });
  }

  /** Otwiera dashboard z adresu bazowego aplikacji. */
  async goto(): Promise<void> {
    await this.page.goto('./');
    await this.expectLoaded();
  }

  /** Dashboard jest gotowy, gdy widoczne jest menu główne zalogowanego użytkownika. */
  override async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveTitle('Dashboard');
    await this.poPrzejsciuEkranu();
    await expect(this.menu.rejestrJednostek).toBeVisible();
  }

  /**
   * Otwiera formularz nowego zgłoszenia jednostki technicznej (kafelek na dashboardzie).
   * @returns załadowany formularz zgłoszenia
   */
  async otworzNoweZgloszenieJt(): Promise<ZgloszeniePage> {
    // Kafelek jest tylko na dashboardzie – test mógł wcześniej przejść na inny ekran.
    await this.goto();
    await this.przyciskNoweZgloszenieJt.click();
    const formularz = new ZgloszeniePage(this.page);
    await formularz.expectLoaded();
    return formularz;
  }

  /**
   * Wyszukuje w kolejce „Zgłoszenia do obsługi”. Nie czeka na wynik – test sprawdza go asercją na wierszach.
   * @param fraza - fragment nazwy pełnej lub krótkiej
   */
  async wyszukajWKolejce(fraza: string): Promise<void> {
    await this.wyszukiwarkaZgloszen.fill(fraza);
    await this.wyszukiwarkaZgloszen.press('Enter');
  }

  /**
   * Przechodzi do zakładki „Raporty” z menu głównego.
   * @returns załadowany ekran Raporty
   */
  async otworzRaporty(): Promise<RaportyPage> {
    await this.menu.raporty.click();
    const raporty = new RaportyPage(this.page);
    await raporty.expectLoaded();
    return raporty;
  }

  /**
   * Przechodzi do panelu „Zarządzanie” z menu głównego (tylko Administrator).
   * @returns załadowany panel Zarządzanie
   */
  async otworzZarzadzanie(): Promise<ZarzadzaniePage> {
    await this.menu.zarzadzanie.click();
    const zarzadzanie = new ZarzadzaniePage(this.page);
    await zarzadzanie.expectLoaded();
    return zarzadzanie;
  }

  /**
   * Przechodzi do zakładki „Rejestr jednostek” z menu głównego.
   * @returns załadowany ekran Rejestru jednostek
   */
  async otworzRejestrJednostek(): Promise<RejestrJednostekPage> {
    await this.menu.rejestrJednostek.click();
    const rejestr = new RejestrJednostekPage(this.page);
    await rejestr.expectLoaded();
    return rejestr;
  }
}
