import { expect, type Download, type Locator, type Page } from '@playwright/test';
import { escapujRegex } from '../utils/wzorce';
import { BasePage } from './base.page';

/** Pliki dla odbiorców (raporty standardowe) – tekst kolumny „Raport” dokładnie jak w aplikacji. */
export enum RaportStandardowy {
  Temat5013 = 'Temat 5013 – pełny wykaz jednostek',
  MpkDict = 'MPK_DICT – pełna historia jednostek',
  ZmianyOzsi = 'Plik zmian dla O-ZSI',
}

/** Filtr raportu ad hoc wybierany z listy z wyszukiwarką (etykieta pola dokładnie jak na ekranie). */
export enum FiltrAdHoc {
  NazwaPelna = 'Nazwa pełna',
  Ps = 'PS',
  Mpk = 'MPK',
  Ozsi = 'O-ZSI',
}

/** Ustawienia raportu ad hoc – daty obowiązywania są wymagane przez aplikację do aktywacji „Generuj i pobierz raport”. */
export interface UstawieniaRaportuAdHoc {
  dataOd: Date;
  dataDo: Date;
  /** Wartości filtrów: tekst wpisywany w wyszukiwarkę listy; wybierana jest opcja dokładnie równa wartości. */
  filtry?: Partial<Record<FiltrAdHoc, string>>;
}

/** Wynik generowania raportu ad hoc – plik albo komunikat (np. brak danych). */
export interface WynikRaportuAdHoc {
  pobranie: Download | null;
  komunikat: string | null;
}

/**
 * Ekran „Raporty” (`/EWI/Reports`): pliki dla odbiorców (Generuj / Pobierz), statystyki zdarzeń i raport ad hoc.
 * Raport ad hoc to zestawienie zmian jednostek w okresie „Data obowiązywania od–do” zawężone filtrami.
 */
export class RaportyPage extends BasePage {
  readonly tabelaPlikow: Locator;
  readonly przyciskGenerujAdHoc: Locator;
  /** Komunikat platformy OutSystems (Feedback Message) – `.feedback-message` bez stałej roli dostępności. */
  readonly komunikat: Locator;
  private readonly sekcjaAdHoc: Locator;

  /**
   * @param page - strona z zalogowanym użytkownikiem
   */
  constructor(page: Page) {
    super(page);
    const main = page.getByRole('main');
    this.tabelaPlikow = main
      .getByRole('grid')
      .filter({ has: page.getByRole('columnheader', { name: 'Wygenerowano (data, osoba)' }) });
    this.przyciskGenerujAdHoc = main.getByRole('button', { name: 'Generuj i pobierz raport' });
    this.komunikat = page.locator('.feedback-message');
    // Sekcja „Raport ad hoc” to karta OutSystems UI bez roli – zawężamy przez kartę z przyciskiem generowania.
    this.sekcjaAdHoc = main.locator('.card').filter({ has: this.przyciskGenerujAdHoc });
  }

  /** Ekran jest gotowy po zakończeniu przejścia i wczytaniu listy plików dla odbiorców. */
  override async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveTitle('Raporty');
    await this.poPrzejsciuEkranu();
    await expect(this.tabelaPlikow.getByRole('row').nth(1)).toBeVisible();
  }

  /**
   * Wiersz raportu standardowego na liście plików dla odbiorców.
   * @param raport - raport z `RaportStandardowy`
   * @returns lokator wiersza
   */
  wierszRaportu(raport: RaportStandardowy): Locator {
    return this.tabelaPlikow.getByRole('row').filter({ hasText: raport });
  }

  /**
   * Komórka „Wygenerowano (data, osoba)” raportu, np. „2026-11-18 10:46 · login”.
   * @param raport - raport z `RaportStandardowy`
   * @returns lokator komórki
   */
  wygenerowano(raport: RaportStandardowy): Locator {
    return this.wierszRaportu(raport).getByRole('gridcell').nth(2);
  }

  /**
   * Akcja „Generuj” raportu standardowego. Nie czeka na koniec – test sprawdza kolumnę „Wygenerowano”.
   * @param raport - raport z `RaportStandardowy`
   */
  async generuj(raport: RaportStandardowy): Promise<void> {
    await this.wierszRaportu(raport).getByRole('button', { name: 'Generuj' }).click();
  }

  /**
   * Pobiera ostatnio wygenerowany plik raportu standardowego (akcja „Pobierz”).
   * @param raport - raport z `RaportStandardowy`
   * @returns pobranie (plik zapisuje test – `saveAs` do katalogu wyników testu)
   */
  async pobierz(raport: RaportStandardowy): Promise<Download> {
    const [pobranie] = await Promise.all([
      this.page.waitForEvent('download', { timeout: 120_000 }),
      this.wierszRaportu(raport).getByRole('link', { name: 'Pobierz' }).click(),
    ]);
    return pobranie;
  }

  /**
   * Lista wyboru filtra raportu ad hoc (przycisk „Select an option” w kontenerze etykiety – wszystkie listy mają tę samą
   * nazwę dostępności). TODO [ZAŁOŻENIE]: zastąpić `data-testid` po dodaniu w OutSystems.
   * @param filtr - filtr z `FiltrAdHoc`
   * @returns lokator przycisku listy
   */
  poleFiltra(filtr: FiltrAdHoc): Locator {
    // Najgłębszy kontener z etykietą i listą = ostatni pasujący div w kolejności dokumentu.
    return this.sekcjaAdHoc
      .locator('div')
      .filter({ has: this.page.getByText(filtr, { exact: true }) })
      .filter({ has: this.page.getByRole('button', { name: 'Select an option' }) })
      .last()
      .getByRole('button', { name: 'Select an option' });
  }

  /**
   * Wybiera wartość filtra: rozwija listę, wpisuje wartość w „Szukaj” (min. 3 znaki) i klika opcję o dokładnie tym tekście.
   * @param filtr - filtr z `FiltrAdHoc`
   * @param wartosc - wartość do wybrania
   */
  async wybierzFiltr(filtr: FiltrAdHoc, wartosc: string): Promise<void> {
    await this.poleFiltra(filtr).click();
    await this.page.getByRole('searchbox', { name: 'Szukaj' }).filter({ visible: true }).fill(wartosc);
    await this.page
      .getByRole('option')
      .filter({ visible: true, hasText: new RegExp(`^\\s*${escapujRegex(wartosc)}\\s*$`) })
      .first()
      .click();
    await expect(this.poleFiltra(filtr)).toContainText(wartosc);
  }

  /**
   * Ustawia datę w polu kalendarza (flatpickr): otwiera kalendarz, przechodzi do miesiąca i klika dzień.
   * Pole tekstowe jest tylko do odczytu – wpisanie daty z klawiatury nie działa.
   * @param indeksPola - 0 = „Data obowiązywania od”, 1 = „Data obowiązywania do”
   * @param data - data do ustawienia (dzień kalendarzowy)
   */
  async ustawDate(indeksPola: number, data: Date): Promise<void> {
    const pole = this.sekcjaAdHoc.getByRole('combobox', { name: 'YYYY-MM-DD' }).nth(indeksPola);
    await pole.click();
    const kalendarz = this.page.getByRole('dialog', { name: 'Kalendarz' }).filter({ visible: true });
    await expect(kalendarz).toBeVisible();
    const dzis = new Date();
    const roznicaMiesiecy = (data.getFullYear() - dzis.getFullYear()) * 12 + (data.getMonth() - dzis.getMonth());
    // `.flatpickr-*` – klasy komponentu kalendarza OutSystems UI (strzałki i dni nie mają nazw dostępności).
    const strzalka = kalendarz.locator(roznicaMiesiecy < 0 ? '.flatpickr-prev-month' : '.flatpickr-next-month');
    for (let i = 0; i < Math.abs(roznicaMiesiecy); i++) {
      await strzalka.click();
    }
    await kalendarz
      .locator('.flatpickr-day:not(.prevMonthDay):not(.nextMonthDay)')
      .getByText(String(data.getDate()), { exact: true })
      .click();
    const iso = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
    await expect(pole).toHaveValue(iso);
  }

  /**
   * Ustawia filtry i daty raportu ad hoc i uruchamia „Generuj i pobierz raport”.
   * Zwraca plik albo – gdy aplikacja zamiast pliku pokaże komunikat (np. brak danych) – treść komunikatu.
   * @param ustawienia - daty obowiązywania i filtry
   * @returns pobrany plik lub komunikat
   */
  async generujAdHoc(ustawienia: UstawieniaRaportuAdHoc): Promise<WynikRaportuAdHoc> {
    for (const [filtr, wartosc] of Object.entries(ustawienia.filtry ?? {}) as [FiltrAdHoc, string][]) {
      await this.wybierzFiltr(filtr, wartosc);
    }
    await this.ustawDate(0, ustawienia.dataOd);
    await this.ustawDate(1, ustawienia.dataDo);
    await expect(this.przyciskGenerujAdHoc).toBeEnabled();
    const pobranie = this.page.waitForEvent('download', { timeout: 120_000 });
    await this.przyciskGenerujAdHoc.click();
    // Przegrany z wyścigu nie może później odrzucić testu – jego błąd zamieniamy na obietnicę, która się nie rozstrzyga.
    const nigdy = new Promise<never>(() => undefined);
    return Promise.race([
      pobranie.then((plik): WynikRaportuAdHoc => ({ pobranie: plik, komunikat: null })).catch(() => nigdy),
      this.komunikat
        .first()
        .waitFor({ timeout: 120_000 })
        .then(
          async (): Promise<WynikRaportuAdHoc> => ({
            pobranie: null,
            komunikat: await this.komunikat.first().innerText(),
          }),
        )
        .catch(() => nigdy),
    ]);
  }
}
