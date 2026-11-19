import { expect, type Locator, type Page } from '@playwright/test';

/** Nazwy miesięcy w mianowniku – tak, jak w nazwach dostępności dni kalendarza („Wtorek, 17 Listopad, 2026”). */
const MIESIACE = [
  'Styczeń',
  'Luty',
  'Marzec',
  'Kwiecień',
  'Maj',
  'Czerwiec',
  'Lipiec',
  'Sierpień',
  'Wrzesień',
  'Październik',
  'Listopad',
  'Grudzień',
];

/**
 * Data w formacie „RRRR-MM-DD” (format pól dat EWI) – liczona z daty lokalnej, bez przesunięcia strefy.
 * @param data - data
 * @returns tekst daty
 */
export function dataIso(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

/**
 * Pole daty z kalendarzem OutSystems UI. Pole tekstowe jest tylko do odczytu – datę wybiera się w oknie „Kalendarz”,
 * w którym dni są przyciskami z pełną nazwą (np. „Wtorek, 17 Listopad, 2026”), a miesiące zmieniają przyciski
 * „Poprzedni miesiąc” / „Następny miesiąc”.
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
    const przycisk = this.okno.getByRole('button', { name: roznica < 0 ? 'Poprzedni miesiąc' : 'Następny miesiąc' });
    for (let i = 0; i < Math.abs(roznica); i++) {
      await przycisk.click();
    }
    await expect(this.okno.getByRole('status')).toContainText(`${MIESIACE[data.getMonth()]} ${data.getFullYear()}`);
  }

  /**
   * Przycisk dnia w otwartym kalendarzu (nazwa „<dzień tygodnia>, <d> <Miesiąc>, <rok>”).
   * @param data - data dnia
   * @returns lokator przycisku dnia
   */
  dzien(data: Date): Locator {
    return this.okno.getByRole('button', {
      name: new RegExp(`, ${data.getDate()} ${MIESIACE[data.getMonth()]}, ${data.getFullYear()}$`),
    });
  }

  /**
   * Otwiera kalendarz na miesiącu daty i klika jej dzień (bez sprawdzania, czy pole ją przyjęło).
   * @param data - data do kliknięcia
   */
  async kliknijDzien(data: Date): Promise<void> {
    await this.otworzNaMiesiacu(data);
    await this.dzien(data).click();
  }

  /**
   * Ustawia datę i sprawdza, że pole ją przyjęło.
   * @param data - data do ustawienia
   */
  async ustaw(data: Date): Promise<void> {
    await this.kliknijDzien(data);
    await expect(this.pole).toHaveValue(dataIso(data));
  }
}
