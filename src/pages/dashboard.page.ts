import { expect } from '@playwright/test';
import { BasePage } from './base.page';
import { RaportyPage } from './raporty.page';
import { RejestrJednostekPage } from './rejestr-jednostek.page';
import { ZarzadzaniePage } from './zarzadzanie.page';

/** Dashboard – ekran startowy po zalogowaniu (zawartość zależy od roli). */
export class DashboardPage extends BasePage {
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
