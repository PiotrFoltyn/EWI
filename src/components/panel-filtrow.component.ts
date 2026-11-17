import { expect, type Locator, type Page } from '@playwright/test';

/** Wartości filtrów Rejestru jednostek – tekst opcji dokładnie jak na liście rozwijanej. */
export interface UstawieniaFiltrow {
  status?: string;
  typJednostki?: string;
  region?: string;
  rodzajMpk?: string;
  pion?: string;
}

/** Nazwa filtra w panelu (klucz `UstawieniaFiltrow`). */
export type FiltrRejestru = keyof UstawieniaFiltrow;

const ETYKIETY_FILTROW: Record<FiltrRejestru, string> = {
  status: 'Status',
  typJednostki: 'Typ jednostki',
  region: 'Region',
  rodzajMpk: 'Rodzaj MPK',
  pion: 'Pion',
};

/**
 * Boczny panel „Filtry” Rejestru jednostek.
 * Filtry zatwierdza „Zapisz zmiany”, „Wyczyść filtry” zeruje je od razu; obie akcje zamykają panel.
 * Ustawione filtry i fraza wyszukiwania są pamiętane w localStorage (ClientVars `UnitRegister_*`) w obrębie kontekstu
 * przeglądarki – każdy test dostaje nowy kontekst, więc startuje bez filtrów.
 * Listy rozwijane to komponent OutSystems DropdownSearch (pojedynczy wybór, pole „Search”).
 */
export class PanelFiltrow {
  readonly panel: Locator;
  readonly przyciskOtworz: Locator;
  readonly przyciskZapisz: Locator;
  readonly linkWyczysc: Locator;

  /**
   * @param page - strona Rejestru jednostek
   */
  constructor(private readonly page: Page) {
    this.panel = page.getByRole('complementary');
    this.przyciskOtworz = page.getByRole('link', { name: 'Filtry', exact: true });
    this.przyciskZapisz = this.panel.getByRole('button', { name: 'Zapisz zmiany' });
    this.linkWyczysc = this.panel.getByRole('link', { name: 'Wyczyść filtry' });
  }

  /**
   * Lista rozwijana filtra.
   * Wszystkie listy mają tę samą nazwę dostępności („Select an option”), dlatego szukamy najbliższego kontenera etykiety.
   * TODO [ZAŁOŻENIE]: zastąpić `data-testid` / `aria-label` z nazwą filtra, gdy zespół OutSystems je doda.
   * @param filtr - nazwa filtra
   * @returns lokator listy rozwijanej (combobox)
   */
  pole(filtr: FiltrRejestru): Locator {
    return this.panel
      .getByText(ETYKIETY_FILTROW[filtr], { exact: true })
      .locator('xpath=ancestor::div[.//*[@role="combobox"]][1]')
      .getByRole('combobox');
  }

  /** Otwiera panel filtrów (jeśli jest zamknięty) i czeka, aż będzie gotowy do edycji. */
  async otworz(): Promise<void> {
    if (!(await this.przyciskZapisz.isVisible())) {
      await this.przyciskOtworz.click();
    }
    await expect(this.przyciskZapisz).toBeVisible();
  }

  /**
   * Wybiera opcję filtra w otwartym panelu (bez zatwierdzania).
   * @param filtr - nazwa filtra
   * @param opcja - tekst opcji dokładnie jak na liście
   */
  async wybierz(filtr: FiltrRejestru, opcja: string): Promise<void> {
    await this.pole(filtr).click();
    await this.page.getByRole('textbox', { name: 'Search' }).filter({ visible: true }).fill(opcja);
    await this.page.getByRole('option', { name: opcja, exact: true }).filter({ visible: true }).click();
    await expect(this.pole(filtr)).toHaveText(opcja);
  }

  /**
   * Rozwija listę filtra, wpisuje tekst w pole „Search” i zwraca pasującą opcję (bez wybierania).
   * Służy do sprawdzenia, czy wartość jest dostępna na liście wyboru.
   * @param filtr - nazwa filtra
   * @param tekst - tekst opcji dokładnie jak na liście
   * @returns lokator widocznej opcji (pusty, gdy wartości nie ma na liście)
   */
  async wyszukajOpcje(filtr: FiltrRejestru, tekst: string): Promise<Locator> {
    await this.otworz();
    await this.pole(filtr).click();
    await this.page.getByRole('textbox', { name: 'Search' }).filter({ visible: true }).fill(tekst);
    return this.page.getByRole('option', { name: tekst, exact: true }).filter({ visible: true });
  }

  /**
   * Ustawia podane filtry i zatwierdza je „Zapisz zmiany”.
   * Nie czeka na wynik listy – test potwierdza wynik asercją na liczniku lub tabeli.
   * @param ustawienia - filtry do ustawienia; pominięte pozostają bez zmian
   */
  async ustaw(ustawienia: UstawieniaFiltrow): Promise<void> {
    await this.otworz();
    for (const filtr of Object.keys(ustawienia) as FiltrRejestru[]) {
      const opcja = ustawienia[filtr];
      if (opcja) {
        await this.wybierz(filtr, opcja);
      }
    }
    await this.przyciskZapisz.click();
    await expect(this.przyciskZapisz).toBeHidden();
  }

  /** Czyści wszystkie filtry („Wyczyść filtry” – działa od razu i zamyka panel). */
  async wyczysc(): Promise<void> {
    await this.otworz();
    await this.linkWyczysc.click();
    await expect(this.przyciskZapisz).toBeHidden();
  }
}
