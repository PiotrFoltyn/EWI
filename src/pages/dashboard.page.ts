import { expect, type Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { RaportyPage } from './raporty.page';
import { RejestrJednostekPage } from './rejestr-jednostek.page';
import { ZarzadzaniePage } from './zarzadzanie.page';
import { ZgloszeniePage } from './zgloszenie.page';

/** Dashboard – ekran startowy po zalogowaniu (zawartość zależy od roli). */
export class DashboardPage extends BasePage {
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
