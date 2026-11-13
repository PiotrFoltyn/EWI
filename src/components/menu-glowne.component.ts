import type { Locator, Page } from '@playwright/test';

/** Górne menu aplikacji widoczne po zalogowaniu (pozycje zależą od roli). */
export class MenuGlowne {
  readonly listaZadan: Locator;
  readonly rejestrJednostek: Locator;
  readonly raporty: Locator;
  readonly zarzadzanie: Locator;
  readonly wyloguj: Locator;

  /**
   * @param page - strona z zalogowanym użytkownikiem
   */
  constructor(page: Page) {
    const menu = page.getByRole('navigation', { name: 'Main navigation' });
    this.listaZadan = menu.getByRole('menuitem', { name: 'Lista zadań' });
    this.rejestrJednostek = menu.getByRole('menuitem', { name: 'Rejestr jednostek' });
    this.raporty = menu.getByRole('menuitem', { name: 'Raporty' });
    this.zarzadzanie = menu.getByRole('menuitem', { name: 'Zarządzanie' });
    this.wyloguj = menu.getByRole('link', { name: 'Wyloguj' });
  }
}
