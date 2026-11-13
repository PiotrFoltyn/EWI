import { expect, type Locator, type Page } from '@playwright/test';
import type { Konto } from '../config/konta';
import { DashboardPage } from './dashboard.page';

/** Ekran logowania EWI (`/EWI/login`). */
export class LoginPage {
  readonly poleLogin: Locator;
  readonly poleHaslo: Locator;
  readonly przyciskZaloguj: Locator;

  /**
   * @param page - strona bez aktywnej sesji
   */
  constructor(readonly page: Page) {
    this.poleLogin = page.getByRole('textbox', { name: 'Username' });
    this.poleHaslo = page.getByRole('textbox', { name: 'Password' });
    this.przyciskZaloguj = page.getByRole('button', { name: 'Login' });
  }

  /** Otwiera ekran logowania i czeka na formularz. */
  async goto(): Promise<void> {
    await this.page.goto('login');
    await expect(this.przyciskZaloguj).toBeVisible();
  }

  /**
   * Loguje użytkownika i czeka na załadowanie dashboardu.
   * @param konto - login i hasło roli
   * @returns dashboard zalogowanego użytkownika
   */
  async zaloguj(konto: Konto): Promise<DashboardPage> {
    await this.poleLogin.fill(konto.login);
    await this.poleHaslo.fill(konto.haslo);
    await this.przyciskZaloguj.click();
    const dashboard = new DashboardPage(this.page);
    await dashboard.expectLoaded();
    return dashboard;
  }
}
