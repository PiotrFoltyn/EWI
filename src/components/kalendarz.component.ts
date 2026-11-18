import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Data w formacie „RRRR-MM-DD” (format pól dat EWI) – liczona z daty lokalnej, bez przesunięcia strefy.
 * @param data - data
 * @returns tekst daty
 */
export function dataIso(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

/**
 * Pole daty z kalendarzem OutSystems UI (flatpickr). Pole tekstowe jest tylko do odczytu – datę wybiera się
 * w kalendarzu (`role=dialog`, „Kalendarz”). Strzałki miesięcy i dni nie mają nazw dostępności, dlatego używamy klas
 * `.flatpickr-*` komponentu (nie są to generowane ID OutSystems).
 */
export class KalendarzComponent {
  readonly okno: Locator;

  /**
   * @param page - strona z polem daty
   * @param pole - lokator pola daty (combobox)
   */
  constructor(
    page: Page,
    readonly pole: Locator,
  ) {
    this.okno = page.getByRole('dialog', { name: 'Kalendarz' }).filter({ visible: true });
  }

  /**
   * Otwiera kalendarz i przechodzi do miesiąca podanej daty.
   * @param data - data, której miesiąc ma być widoczny
   */
  async otworzNaMiesiacu(data: Date): Promise<void> {
    await this.pole.click();
    await expect(this.okno).toBeVisible();
    const dzis = new Date();
    const roznica = (data.getFullYear() - dzis.getFullYear()) * 12 + (data.getMonth() - dzis.getMonth());
    const strzalka = this.okno.locator(roznica < 0 ? '.flatpickr-prev-month' : '.flatpickr-next-month');
    for (let i = 0; i < Math.abs(roznica); i++) {
      await strzalka.click();
    }
  }

  /**
   * Dzień bieżącego miesiąca w otwartym kalendarzu (bez dni sąsiednich miesięcy).
   * @param data - data dnia
   * @returns lokator dnia
   */
  dzien(data: Date): Locator {
    return this.okno
      .locator('.flatpickr-day:not(.prevMonthDay):not(.nextMonthDay)')
      .getByText(String(data.getDate()), { exact: true });
  }

  /**
   * Ustawia datę i sprawdza, że pole ją przyjęło.
   * @param data - data do ustawienia
   */
  async ustaw(data: Date): Promise<void> {
    await this.otworzNaMiesiacu(data);
    await this.dzien(data).click();
    await expect(this.pole).toHaveValue(dataIso(data));
  }

  /**
   * Sprawdza, czy dzień jest zablokowany w kalendarzu (np. data z przeszłości) – flatpickr oznacza go klasą
   * `flatpickr-disabled`. Kalendarz musi być otwarty na właściwym miesiącu (`otworzNaMiesiacu`).
   * @param data - data dnia
   * @returns lokator dnia zawężony do dni zablokowanych (pusty, gdy dzień jest dostępny)
   */
  dzienZablokowany(data: Date): Locator {
    return this.okno
      .locator('.flatpickr-day.flatpickr-disabled:not(.prevMonthDay):not(.nextMonthDay)')
      .getByText(String(data.getDate()), { exact: true });
  }
}
