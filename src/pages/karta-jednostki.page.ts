import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';

/** Karta (podgląd) jednostki – otwierana z Rejestru jednostek akcją „Podgląd” (`UnitRegister?UnitId=...`). */
export class KartaJednostkiPage extends BasePage {
  readonly linkWrocDoWynikow: Locator;
  /** Nagłówek sekcji „Dane jednostki” – pojawia się po wczytaniu danych karty. */
  readonly sekcjaDaneJednostki: Locator;

  /**
   * @param page - strona z otwartą kartą jednostki
   */
  constructor(page: Page) {
    super(page);
    this.linkWrocDoWynikow = page.getByRole('link', { name: 'Wróć do wyników wyszukiwania' });
    this.sekcjaDaneJednostki = page.getByRole('main').getByText('Dane jednostki', { exact: true });
  }

  /**
   * Karta jest gotowa, gdy zakończyło się przejście z listy (osobny ekran OutSystems) i wczytały się dane jednostki.
   * Bez czekania na przejście lokatory karty trafiają też w elementy listy i panelu filtrów (np. „Region”).
   */
  override async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/UnitId=\d+/);
    await this.poPrzejsciuEkranu();
    await expect(this.linkWrocDoWynikow).toBeVisible();
    await expect(this.sekcjaDaneJednostki).toBeVisible();
  }

  /**
   * Wartość pola danych jednostki wskazanego etykietą (np. „Region”, „Typ jednostki”).
   * Pola karty nie mają powiązania etykieta–wartość w dostępności – wartość to element za etykietą.
   * TODO [ZAŁOŻENIE]: zastąpić `data-testid` po dodaniu w OutSystems.
   * @param etykieta - etykieta pola dokładnie jak na karcie
   * @returns lokator wartości pola
   */
  pole(etykieta: string): Locator {
    return this.page
      .getByRole('main')
      .getByText(etykieta, { exact: true })
      .locator('xpath=../following-sibling::div[1]');
  }

  /**
   * Element ścieżki „Umiejscowienie i struktura jednostki” (Obszar › Pion › jednostka nadrzędna › jednostka).
   * @param nazwa - nazwa obszaru, pionu lub jednostki nadrzędnej
   * @returns lokator linku w ścieżce struktury
   */
  elementStruktury(nazwa: string): Locator {
    return this.page.getByRole('main').getByRole('link', { name: nazwa, exact: true });
  }

  /** Wraca do listy wyników z zachowaniem wyszukiwania i filtrów. */
  async wrocDoWynikow(): Promise<void> {
    await this.linkWrocDoWynikow.click();
    await expect(this.linkWrocDoWynikow).toBeHidden();
    await this.poPrzejsciuEkranu();
  }
}
