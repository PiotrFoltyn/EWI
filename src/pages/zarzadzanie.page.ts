import { expect, type Locator, type Page } from '@playwright/test';
import { type Slownik, SlownikComponent } from '../components/slownik.component';
import { BasePage } from './base.page';

/** Adres panelu Zarządzanie (pisownia jak w aplikacji). */
export const ADRES_ZARZADZANIA = 'Managment';

/**
 * Panel administratora „Zarządzanie” (`/EWI/Managment`) – zakładki „Słowniki” (Słowniki SAP) i „Import jednostek”.
 * Dostępny tylko dla roli Administrator.
 */
export class ZarzadzaniePage extends BasePage {
  readonly zakladkaSlowniki: Locator;
  readonly zakladkaImport: Locator;

  /**
   * @param page - strona z zalogowanym Administratorem
   */
  constructor(page: Page) {
    super(page);
    this.zakladkaSlowniki = page.getByRole('tab', { name: 'Słowniki', exact: true });
    this.zakladkaImport = page.getByRole('tab', { name: 'Import jednostek', exact: true });
  }

  /** Panel jest gotowy, gdy zakończyło się przejście ekranu i widać zakładki administracji. */
  override async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveTitle('Zarządzanie');
    await this.poPrzejsciuEkranu();
    await expect(this.zakladkaSlowniki).toBeVisible();
  }

  /**
   * Otwiera zakładkę „Słowniki” i wskazany słownik SAP.
   * @param slownik - słownik do otwarcia
   * @returns załadowany słownik
   */
  async otworzSlownik(slownik: Slownik): Promise<SlownikComponent> {
    await this.zakladkaSlowniki.click();
    await this.page.getByRole('tab', { name: slownik, exact: true }).click();
    const komponent = new SlownikComponent(this.page, slownik);
    await komponent.expectLoaded();
    return komponent;
  }
}
