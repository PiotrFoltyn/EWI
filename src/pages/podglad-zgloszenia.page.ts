import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';

/** Status zgłoszenia (tekst jak w aplikacji). */
export enum StatusZgloszenia {
  Zarejestrowane = 'Zarejestrowane',
  AkceptacjaKosztow = 'Akceptacja kosztów',
  Wycofane = 'Wycofane',
  Odrzucone = 'Odrzucone',
}

/**
 * Podgląd zgłoszenia (`/EWI/Request?RequestId=<n>`): dane zgłoszenia ze statusem, „Zmiany do wprowadzenia”
 * (Pole / Było / Będzie), historia zgłoszenia i akcje (np. „Wycofaj zgłoszenie”).
 */
export class PodgladZgloszeniaPage extends BasePage {
  /** Karta „Dane zgłoszenia” – status, rodzaj, zgłaszający, daty. */
  readonly daneZgloszenia: Locator;
  readonly przyciskWycofaj: Locator;
  /** Komunikat po akcji, np. „Zgłoszenie zostało wysłane.”, „Zgłoszenie wycofane.”. */
  readonly komunikat: Locator;
  /** Tabela „Historia zgłoszenia” (Data, Status, Zdarzenie, Komentarz, Osoba). */
  readonly historia: Locator;

  /**
   * @param page - strona z podglądem zgłoszenia
   */
  constructor(page: Page) {
    super(page);
    const main = page.getByRole('main');
    // Karta OutSystems UI bez roli – zawężona przez nagłówek „Dane zgłoszenia”.
    this.daneZgloszenia = main.locator('.card').filter({ has: page.getByText('Dane zgłoszenia', { exact: true }) });
    this.przyciskWycofaj = main.getByRole('button', { name: 'Wycofaj zgłoszenie' });
    this.komunikat = page.locator('.feedback-message');
    this.historia = main.getByRole('grid').filter({ has: page.getByRole('columnheader', { name: 'Zdarzenie' }) });
  }

  /** Podgląd jest gotowy, gdy adres zawiera numer zapisanego zgłoszenia i wczytały się dane zgłoszenia. */
  override async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/RequestId=[1-9]\d*/);
    await this.poPrzejsciuEkranu();
    await expect(this.daneZgloszenia).toBeVisible();
  }

  /**
   * Status zgłoszenia w karcie „Dane zgłoszenia” (dokładny tekst – odporny na podobne słowa w innych polach).
   * @param status - oczekiwany status
   * @returns lokator tekstu statusu
   */
  status(status: StatusZgloszenia): Locator {
    return this.daneZgloszenia.getByText(status, { exact: true });
  }

  /**
   * Wiersz tabeli „Zmiany do wprowadzenia” dla pola (np. „Nazwa”), z wartościami „Było” i „Będzie”.
   * @param pole - nazwa pola w tabeli zmian
   * @returns lokator wiersza
   */
  wierszZmiany(pole: string): Locator {
    return this.page
      .getByRole('main')
      .getByRole('row')
      .filter({ has: this.page.getByRole('gridcell', { name: pole, exact: true }) });
  }

  /**
   * Otwiera to zgłoszenie ponownie (jak zgłaszający wracający do swojego zgłoszenia) – odświeża dane i akcje.
   * @returns załadowany podgląd zgłoszenia
   */
  async otworzPonownie(): Promise<PodgladZgloszeniaPage> {
    await this.page.goto(this.adres());
    const podglad = new PodgladZgloszeniaPage(this.page);
    await podglad.expectLoaded();
    return podglad;
  }

  /** Adres podglądu – do późniejszego otwarcia zgłoszenia (np. wycofania po teście). */
  adres(): string {
    return this.page.url();
  }

  /**
   * Wycofuje zgłoszenie (okno „Wycofanie zgłoszenia”, komentarz opcjonalny) i czeka na status „Wycofane”.
   * @param komentarz - komentarz do wycofania
   */
  async wycofaj(komentarz: string): Promise<void> {
    await this.przyciskWycofaj.click();
    const okno = this.page.getByRole('dialog').filter({ hasText: 'Wycofanie zgłoszenia' });
    await expect(okno).toBeVisible();
    await okno.getByRole('textbox').fill(komentarz);
    await okno.getByRole('button', { name: 'Wycofaj', exact: true }).click();
    await expect(this.status(StatusZgloszenia.Wycofane)).toBeVisible();
  }
}
