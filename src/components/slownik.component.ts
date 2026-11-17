import { expect, type Locator, type Page } from '@playwright/test';
import type { PozycjaSlownika } from '../data/types/zarzadzanie.types';
import { escapujRegex } from '../utils/wzorce';

/** Słowniki SAP w panelu Zarządzanie → Słowniki (nazwa zakładki dokładnie jak w aplikacji). */
export enum Slownik {
  KodRegionu = 'Kod regionu',
  KodSpolki = 'Kod spółki',
  DepartamentyBiura = 'Departamenty / biora',
  RodzajMpk = 'Rodzaj MPK',
  TypJednostki = 'Typ jednostki',
  TypJednostkiMpk = 'Typ jednostki / MPK',
}

/** Kolejność kolumn tabeli słownika (komórki bez nazw dostępności). */
export enum KolumnaSlownika {
  Kod = 0,
  Nazwa = 1,
  Aktywna = 2,
  Zastosowanie = 3,
  OstatniaZmiana = 4,
  Akcja = 5,
}

/**
 * Jeden słownik (zakładka) w panelu „Słowniki SAP”: wyszukiwarka, tabela pozycji i – dla słowników edytowalnych –
 * formularze dodania i edycji w oknie dialogowym.
 * Formularz dodania: „Kod do typu: <słownik>*”, „Nazwa*”, „Zastosowanie*”; edycji: nazwa, zastosowanie, „Pozycja aktywna”.
 */
export class SlownikComponent {
  readonly panel: Locator;
  readonly wyszukiwarka: Locator;
  readonly przyciskDodaj: Locator;
  /** Wiersze pozycji bieżącej strony (bez nagłówka). */
  readonly wiersze: Locator;
  /** Linki „Edytuj” w kolumnie akcji – ich brak oznacza słownik tylko do odczytu. */
  readonly linkiEdytuj: Locator;
  /** Licznik paginacji, np. „1–10 z 22”. */
  readonly licznik: Locator;
  /** Komunikat pustej listy (wyszukiwanie bez wyników). */
  readonly komunikatBrakuDanych: Locator;
  /** Okno dialogowe dodania / edycji pozycji. */
  readonly okno: Locator;
  readonly poleKod: Locator;
  readonly poleNazwa: Locator;
  readonly poleZastosowanie: Locator;
  /** Pole „Pozycja aktywna” (tylko w edycji; checkbox bez nazwy dostępności – etykieta obok). */
  readonly polePozycjaAktywna: Locator;
  readonly przyciskZatwierdzDodanie: Locator;
  readonly przyciskZapisz: Locator;
  readonly przyciskAnuluj: Locator;
  /** Komunikat platformy po akcji (np. odrzucenie duplikatu kodu). */
  readonly komunikat: Locator;

  /**
   * @param page - strona panelu Zarządzanie
   * @param nazwa - słownik (zakładka)
   */
  constructor(
    private readonly page: Page,
    readonly nazwa: Slownik,
  ) {
    this.panel = page.getByRole('tabpanel', { name: nazwa, exact: true });
    this.wyszukiwarka = this.panel.getByRole('searchbox', { name: 'Wyszukaj według kodu lub nazwy' });
    this.przyciskDodaj = this.panel.getByRole('button', { name: 'Dodaj pozycję' });
    this.wiersze = this.panel.getByRole('row').filter({ has: page.getByRole('gridcell') });
    this.linkiEdytuj = this.panel.getByRole('link', { name: 'Edytuj' });
    this.licznik = this.panel.getByText(/^\d+–\d+ z \d+$/);
    this.komunikatBrakuDanych = this.panel.getByText('Brak danych.', { exact: true });
    this.okno = page.getByRole('dialog');
    this.poleKod = this.okno.getByRole('textbox', { name: `Kod do typu: ${nazwa}` });
    this.poleNazwa = this.okno.getByRole('textbox', { name: 'Nazwa' });
    this.poleZastosowanie = this.okno.getByRole('textbox', { name: 'Zastosowanie' });
    this.polePozycjaAktywna = this.okno.getByRole('checkbox');
    this.przyciskZatwierdzDodanie = this.okno.getByRole('button', { name: 'Dodaj pozycje' });
    this.przyciskZapisz = this.okno.getByRole('button', { name: 'Zapisz' });
    this.przyciskAnuluj = this.okno.getByRole('button', { name: 'Anuluj' });
    // `.feedback-message` – komunikat OutSystems UI (Feedback Message) bez stałej roli dostępności.
    this.komunikat = page.locator('.feedback-message');
  }

  /** Słownik jest gotowy, gdy zniknął wskaźnik ładowania i widać wyszukiwarkę. */
  async expectLoaded(): Promise<void> {
    await expect(this.wyszukiwarka).toBeVisible();
    // Duże słowniki (np. „Typ jednostki / MPK”) ładują się na dev kilkadziesiąt sekund.
    await expect(this.panel.getByText('Ładowanie…')).toHaveCount(0, { timeout: 90_000 });
    // Licznik pojawia się dopiero z danymi – sam brak wskaźnika ładowania jest spełniony też przed ładowaniem.
    await expect(this.licznik).toBeVisible({ timeout: 90_000 });
  }

  /**
   * Wyszukuje pozycje po kodzie lub nazwie. Nie czeka na wynik – test sprawdza go asercją na wierszach.
   * @param fraza - kod lub fragment nazwy
   */
  async wyszukaj(fraza: string): Promise<void> {
    await this.wyszukiwarka.fill(fraza);
    await this.wyszukiwarka.press('Enter');
  }

  /**
   * Wiersz pozycji o podanym kodzie (dokładne dopasowanie pierwszej kolumny).
   * @param kod - kod pozycji
   * @returns lokator wiersza
   */
  wiersz(kod: string): Locator {
    return this.wiersze.filter({
      has: this.page.getByRole('gridcell', { name: new RegExp(`^${escapujRegex(kod)}$`) }),
    });
  }

  /**
   * Wiersze, których kolumna „Nazwa” jest dokładnie równa podanej.
   * @param nazwa - nazwa pozycji
   * @returns lokator wierszy
   */
  wierszeONazwie(nazwa: string): Locator {
    return this.wiersze.filter({
      has: this.page
        .getByRole('gridcell')
        .nth(KolumnaSlownika.Nazwa)
        .filter({ hasText: new RegExp(`^${escapujRegex(nazwa)}$`) }),
    });
  }

  /**
   * Komórka wskazanej kolumny w wierszu pozycji o podanym kodzie.
   * @param kod - kod pozycji
   * @param kolumna - kolumna z `KolumnaSlownika`
   * @returns lokator komórki
   */
  komorkaPozycji(kod: string, kolumna: KolumnaSlownika): Locator {
    return this.komorka(this.wiersz(kod), kolumna);
  }

  /** Zamyka okno dialogowe bez zapisu. */
  async anuluj(): Promise<void> {
    await this.przyciskAnuluj.click();
    await expect(this.okno).toBeHidden();
  }

  /**
   * Komórka wskazanej kolumny w wierszu.
   * @param wiersz - wiersz z `wiersz()` lub `wiersze`
   * @param kolumna - kolumna z `KolumnaSlownika`
   * @returns lokator komórki
   */
  komorka(wiersz: Locator, kolumna: KolumnaSlownika): Locator {
    return wiersz.getByRole('gridcell').nth(kolumna);
  }

  /**
   * Wypełnia formularz nowej pozycji i zatwierdza go. Nie czeka na zamknięcie okna – przy błędzie walidacji
   * okno zostaje otwarte, co sprawdza test.
   * @param pozycja - kod, nazwa i zastosowanie (puste wartości zostawiają pole puste)
   */
  async sprobujDodac(pozycja: PozycjaSlownika): Promise<void> {
    await this.przyciskDodaj.click();
    await expect(this.przyciskZatwierdzDodanie).toBeVisible();
    await this.poleKod.fill(pozycja.kod);
    await this.poleNazwa.fill(pozycja.nazwa);
    await this.poleZastosowanie.fill(pozycja.zastosowanie);
    await this.przyciskZatwierdzDodanie.click();
  }

  /**
   * Dodaje pozycję i czeka na zamknięcie okna (zapis udany).
   * @param pozycja - kod, nazwa i zastosowanie nowej pozycji
   */
  async dodaj(pozycja: PozycjaSlownika): Promise<void> {
    await this.sprobujDodac(pozycja);
    await expect(this.okno).toBeHidden();
  }

  /**
   * Edytuje pozycję o podanym kodzie i zapisuje zmiany (pozycja musi być widoczna na liście – np. po `wyszukaj`).
   * @param kod - kod edytowanej pozycji
   * @param zmiany - nowa nazwa i/lub stan „Pozycja aktywna”; pominięte pola pozostają bez zmian
   */
  async edytuj(kod: string, zmiany: { nazwa?: string; aktywna?: boolean }): Promise<void> {
    await this.wiersz(kod).getByRole('link', { name: 'Edytuj' }).click();
    await expect(this.przyciskZapisz).toBeVisible();
    if (zmiany.nazwa !== undefined) {
      await this.poleNazwa.fill(zmiany.nazwa);
    }
    if (zmiany.aktywna !== undefined) {
      await this.polePozycjaAktywna.setChecked(zmiany.aktywna);
    }
    await this.przyciskZapisz.click();
    await expect(this.okno).toBeHidden();
  }
}
