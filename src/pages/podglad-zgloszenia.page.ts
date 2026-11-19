import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';
import { ZmianaDanychZgloszeniaPage } from './zmiana-danych-zgloszenia.page';

/** Status zgłoszenia (tekst jak w aplikacji). */
export enum StatusZgloszenia {
  Zarejestrowane = 'Zarejestrowane',
  AkceptacjaKosztow = 'Akceptacja kosztów',
  WRealizacji = 'W realizacji',
  Zaakceptowane = 'Zaakceptowane',
  Zakonczone = 'Zakończone',
  Wycofane = 'Wycofane',
  Odrzucone = 'Odrzucone',
}

/**
 * Podgląd zgłoszenia (`/EWI/Request?RequestId=<n>`): dane zgłoszenia ze statusem, „Zmiany do wprowadzenia”
 * (Pole / Było / Będzie), historia zgłoszenia i akcje (np. „Wycofaj zgłoszenie”).
 * Obsługa przez administratora: „Przejmij” (Zarejestrowane → W realizacji), „Zaakceptuj” (→ Zaakceptowane),
 * „Przejdź do zmiany danych” (ekran realizacji zmiany).
 */
export class PodgladZgloszeniaPage extends BasePage {
  /** Treść podglądu (dane zgłoszenia, jednostki, zmiany) – sekcje nie mają ról ani osobnych kart. */
  readonly daneZgloszenia: Locator;
  /** Nagłówek sekcji „Dane zgłoszenia” – pojawia się po wczytaniu zgłoszenia. */
  readonly naglowekDanych: Locator;
  readonly przyciskWycofaj: Locator;
  readonly przyciskPrzejmij: Locator;
  readonly przyciskZaakceptuj: Locator;
  readonly przyciskPrzejdzDoZmianyDanych: Locator;
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
    this.daneZgloszenia = main;
    this.naglowekDanych = main.getByText('Dane zgłoszenia', { exact: true });
    this.przyciskWycofaj = main.getByRole('button', { name: 'Wycofaj zgłoszenie' });
    this.przyciskPrzejmij = main.getByRole('button', { name: 'Przejmij', exact: true });
    this.przyciskZaakceptuj = main.getByRole('button', { name: 'Zaakceptuj', exact: true });
    this.przyciskPrzejdzDoZmianyDanych = main.getByRole('button', { name: 'Przejdź do zmiany danych' });
    this.komunikat = page.locator('.feedback-message');
    this.historia = main.getByRole('grid').filter({ has: page.getByRole('columnheader', { name: 'Zdarzenie' }) });
  }

  /** Podgląd jest gotowy, gdy adres zawiera numer zapisanego zgłoszenia i wczytały się dane zgłoszenia. */
  override async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/RequestId=[1-9]\d*/);
    await this.poPrzejsciuEkranu();
    await expect(this.naglowekDanych).toBeVisible();
  }

  /**
   * Status zgłoszenia w sekcji „Dane zgłoszenia” (dokładny tekst). Ten sam tekst bywa w „Historii zgłoszenia”, ale
   * sekcja danych jest w dokumencie wcześniej – dlatego pierwszy element.
   * @param status - oczekiwany status
   * @returns lokator tekstu statusu
   */
  status(status: StatusZgloszenia): Locator {
    return this.daneZgloszenia.getByText(status, { exact: true }).first();
  }

  /**
   * Wiersz sekcji „Zmiany do wprowadzenia” (Pole / Było / Będzie / Pole w SAP / Od kiedy) z podanym polem i nową
   * wartością. Sekcja to zwykłe kontenery bez ról tabeli – wiersz = najgłębszy div zawierający obie wartości.
   * @param pole - nazwa pola w kolumnie „Pole” (np. „Nazwa skrócona”)
   * @param nowaWartosc - wartość w kolumnie „Będzie”
   * @returns lokator wiersza (pusty, gdy takiej zmiany nie ma)
   */
  wierszZmiany(pole: string, nowaWartosc: string): Locator {
    return this.page
      .getByRole('main')
      .locator('div')
      .filter({ has: this.page.getByText(pole, { exact: true }) })
      .filter({ has: this.page.getByText(nowaWartosc, { exact: true }) })
      .last();
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

  /** Przejmuje zgłoszenie do obsługi (akcja administratora) i czeka na status „W realizacji”. */
  async przejmij(): Promise<void> {
    await this.przyciskPrzejmij.click();
    await expect(this.status(StatusZgloszenia.WRealizacji)).toBeVisible();
  }

  /**
   * Akceptuje przejęte zgłoszenie (okno „Zaakceptować zgłoszenie?” → „Zaakceptuj i przejdź do zmiany danych”).
   * Aplikacja od razu otwiera ekran realizacji. Po akceptacji nie można już zwrócić ani odrzucić zgłoszenia,
   * a zgłaszający dostaje mail z informacją.
   * @returns załadowany ekran zmiany danych zaakceptowanego zgłoszenia
   */
  async zaakceptuj(): Promise<ZmianaDanychZgloszeniaPage> {
    await this.przyciskZaakceptuj.click();
    const okno = this.page.getByRole('dialog').filter({ hasText: 'Zaakceptować zgłoszenie?' });
    await expect(okno).toBeVisible();
    await okno.getByRole('button', { name: 'Zaakceptuj i przejdź do zmiany danych' }).click();
    const zmianaDanych = new ZmianaDanychZgloszeniaPage(this.page);
    await zmianaDanych.expectLoaded();
    return zmianaDanych;
  }

  /**
   * Otwiera ekran realizacji zgłoszenia już zaakceptowanego (powrót do zgłoszenia, np. z kolejki „Czeka na SAP”).
   * @returns załadowany ekran zmiany danych
   */
  async przejdzDoZmianyDanych(): Promise<ZmianaDanychZgloszeniaPage> {
    await this.przyciskPrzejdzDoZmianyDanych.click();
    const zmianaDanych = new ZmianaDanychZgloszeniaPage(this.page);
    await zmianaDanych.expectLoaded();
    return zmianaDanych;
  }
}
