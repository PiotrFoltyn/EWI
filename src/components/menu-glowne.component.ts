import type { Locator, Page } from '@playwright/test';

/** Górne menu aplikacji widoczne po zalogowaniu (pozycje zależą od roli). */
export class MenuGlowne {
  readonly listaZadan: Locator;
  readonly rejestrJednostek: Locator;
  readonly raporty: Locator;
  readonly zarzadzanie: Locator;
  readonly wyloguj: Locator;
  private readonly menu: Locator;

  /**
   * @param page - strona z zalogowanym użytkownikiem
   */
  constructor(page: Page) {
    const menu = page.getByRole('navigation', { name: 'Main navigation' });
    this.menu = menu;
    this.listaZadan = menu.getByRole('menuitem', { name: 'Lista zadań' });
    this.rejestrJednostek = menu.getByRole('menuitem', { name: 'Rejestr jednostek' });
    this.raporty = menu.getByRole('menuitem', { name: 'Raporty' });
    this.zarzadzanie = menu.getByRole('menuitem', { name: 'Zarządzanie' });
    this.wyloguj = menu.getByRole('link', { name: 'Wyloguj' });
  }

  /**
   * Pozycja menu po nazwie – do sprawdzania układu menu danymi z .json.
   * @param nazwa - nazwa pozycji dokładnie jak w menu (np. „Rejestr jednostek”)
   * @returns lokator pozycji menu
   */
  pozycja(nazwa: string): Locator {
    return this.menu.getByRole('menuitem', { name: nazwa, exact: true });
  }
}
