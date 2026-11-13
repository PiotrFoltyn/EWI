import { expect, type Page } from '@playwright/test';
import { MenuGlowne } from '../components/menu-glowne.component';

/** Wspólna baza ekranów dostępnych po zalogowaniu. */
export abstract class BasePage {
  readonly menu: MenuGlowne;

  /**
   * @param page - strona Playwright z aktywną sesją użytkownika
   */
  constructor(readonly page: Page) {
    this.menu = new MenuGlowne(page);
  }

  /** Sprawdza, że ekran został w pełni załadowany. */
  abstract expectLoaded(): Promise<void>;

  /**
   * Czeka na koniec animacji przejścia między ekranami OutSystems.
   * W trakcie przejścia w DOM są dwa kontenery ekranu (stary i nowy), więc te same lokatory
   * (np. link „Filtry”, pole wyszukiwania) mogą wskazywać kilka elementów naraz.
   * `.screen-container` to klasa platformy OutSystems (nie generowany identyfikator).
   */
  protected async poPrzejsciuEkranu(): Promise<void> {
    await expect(this.page.locator('.screen-container')).toHaveCount(1);
  }
}
