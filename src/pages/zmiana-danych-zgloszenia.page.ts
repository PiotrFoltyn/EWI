import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';
import { PodgladZgloszeniaPage, StatusZgloszenia } from './podglad-zgloszenia.page';

/**
 * Ekran realizacji zaakceptowanego zgłoszenia zmiany („Zmiana danych”, `/EWI/Request?RequestId=<n>`) – otwiera się
 * po akceptacji albo z podglądu zaakceptowanego zgłoszenia akcją „Przejdź do zmiany danych”. Pokazuje tylko zmieniane pola (obecna i nowa wartość).
 * Tryb ręczny SAP (K-12): administrator wprowadza zmianę w SAP sam, a EWI tylko ją zapisuje – ekran niczego nie
 * wysyła do SAP. „Zapisz zmiany w jednostce” od razu kończy zgłoszenie (dev 18.11.2026 – bez osobnego „Zakończ”).
 */
export class ZmianaDanychZgloszeniaPage extends BasePage {
  /** Informacja „Tylko zmieniane pola” z instrukcją wprowadzenia zmian w SAP. */
  readonly informacja: Locator;
  readonly przyciskZapiszZmiany: Locator;
  readonly przyciskAnuluj: Locator;

  /**
   * @param page - strona z otwartym ekranem zmiany danych zgłoszenia
   */
  constructor(page: Page) {
    super(page);
    const main = page.getByRole('main');
    this.informacja = main.getByRole('status').filter({ hasText: 'Tylko zmieniane pola' });
    this.przyciskZapiszZmiany = main.getByRole('button', { name: 'Zapisz zmiany w jednostce' });
    this.przyciskAnuluj = main.getByRole('button', { name: 'Anuluj', exact: true });
  }

  /** Ekran jest gotowy po przejściu i wyświetleniu informacji o zmienianych polach oraz przycisku zapisu. */
  override async expectLoaded(): Promise<void> {
    await this.poPrzejsciuEkranu();
    await expect(this.informacja).toBeVisible();
    await expect(this.przyciskZapiszZmiany).toBeEnabled();
  }

  /**
   * Zapisuje zmiany w jednostce i czeka, aż zgłoszenie dostanie status „Zakończone” (aplikacja wraca do podglądu).
   * Jednostka dostaje wtedy wpis „Zmiana danych” w historii zmian.
   * @returns podgląd zakończonego zgłoszenia
   */
  async zapiszZmianyWJednostce(): Promise<PodgladZgloszeniaPage> {
    await this.przyciskZapiszZmiany.click();
    const podglad = new PodgladZgloszeniaPage(this.page);
    // Zapis trwa kilka sekund (przycisk zablokowany), potem podgląd wczytuje dane od nowa.
    await expect(podglad.status(StatusZgloszenia.Zakonczone)).toBeVisible({ timeout: 30_000 });
    return podglad;
  }
}
