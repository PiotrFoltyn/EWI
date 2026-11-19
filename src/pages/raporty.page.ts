import { expect, type Download, type Locator, type Page } from '@playwright/test';
import { KalendarzComponent } from '../components/kalendarz.component';
import { escapujRegex } from '../utils/wzorce';
import { BasePage } from './base.page';

/** Maksymalny czas oczekiwania na plik lub komunikat po „Generuj i pobierz raport”. */
const CZAS_ODPOWIEDZI_AD_HOC = 60_000;

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
 * Użytkownik podstawowy widzi te pliki jako „Raporty standardowe” – tylko „Pobierz”, bez „Generuj”.
 * Raport ad hoc to zestawienie zmian jednostek w okresie „Data obowiązywania od–do” zawężone filtrami.
 */
export class RaportyPage extends BasePage {
  readonly tabelaPlikow: Locator;
  readonly przyciskGenerujAdHoc: Locator;
  /** Tytuł sekcji „Raport ad hoc” (raport własny użytkownika). */
  readonly tytulRaportuAdHoc: Locator;
  /** Komunikat platformy OutSystems (Feedback Message) – `.feedback-message` bez stałej roli dostępności. */
  readonly komunikat: Locator;
  private readonly sekcjaAdHoc: Locator;

  /**
   * @param page - strona z zalogowanym użytkownikiem
   */
  constructor(page: Page) {
    super(page);
    const main = page.getByRole('main');
    // Nagłówki zależą od roli (Administrator: „Wygenerowano (data, osoba)”, Użytkownik: „Wygenerowano”), a siatka
    // „Pliki z poprzednich dni” ma te same kolumny – tabelę plików wyróżnia wiersz MPK_DICT (nie ma go w plikach nocnych).
    this.tabelaPlikow = main
      .getByRole('grid')
      .filter({ has: page.getByRole('gridcell', { name: RaportStandardowy.MpkDict, exact: true }) });
    this.przyciskGenerujAdHoc = main.getByRole('button', { name: 'Generuj i pobierz raport' });
    this.tytulRaportuAdHoc = main.getByText('Raport ad hoc', { exact: true });
    this.komunikat = page.locator('.feedback-message');
    // Karta raportu własnego (Użytkownik: „Własny raport”) to karta OutSystems UI bez roli – zawężamy przez kartę
    // z przyciskiem generowania. Administrator ma od 19.11.2026 kartę „Raport ad hoc” z „Generuj raport” i osobnym
    // „Pobierz” – metody ad hoc jej nie obsługują.
    this.sekcjaAdHoc = main
      .locator('.card')
      .filter({ has: page.getByRole('button', { name: 'Generuj i pobierz raport' }) });
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
   * Generuje raport standardowy „Teraz” przez okno „Generowanie pliku …” i czeka na zamknięcie okna.
   * Okno ma domyślnie zaznaczone „Po wygenerowaniu wyślij plik na skrzynkę Alnovy” – to wysyłka do systemu zewnętrznego,
   * więc metoda ZAWSZE ją odznacza (testy nie mogą wysyłać plików do Alnovy).
   * Nie czeka na koniec generowania – test sprawdza kolumnę „Wygenerowano”.
   * @param raport - raport z `RaportStandardowy`
   */
  async generuj(raport: RaportStandardowy): Promise<void> {
    await this.wierszRaportu(raport).getByRole('button', { name: 'Generuj' }).click();
    const okno = this.page.getByRole('dialog').filter({ hasText: 'Generowanie pliku' });
    await expect(okno).toBeVisible();
    await okno.getByRole('radio', { name: 'Teraz' }).check();
    // Jedyny checkbox w oknie (bez nazwy dostępności) – „wyślij plik na skrzynkę Alnovy”.
    const wysylkaDoAlnovy = okno.getByRole('checkbox');
    await wysylkaDoAlnovy.uncheck();
    await expect(wysylkaDoAlnovy).not.toBeChecked();
    await okno.getByRole('button', { name: 'Generuj', exact: true }).click();
    await expect(okno).toBeHidden();
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
   * Wybiera wartość filtra: rozwija listę, wpisuje wartość w „Szukaj” (min. 3 znaki) i klika opcję zaczynającą się
   * od tej wartości (opcje PS / O-ZSI mogą zawierać po wartości nazwę jednostki).
   * @param filtr - filtr z `FiltrAdHoc`
   * @param wartosc - wartość do wybrania
   */
  async wybierzFiltr(filtr: FiltrAdHoc, wartosc: string): Promise<void> {
    await this.poleFiltra(filtr).click();
    await this.page.getByRole('searchbox', { name: 'Szukaj' }).filter({ visible: true }).fill(wartosc);
    await this.page
      .getByRole('option')
      .filter({ visible: true, hasText: new RegExp(`^\\s*${escapujRegex(wartosc)}(\\s|$)`) })
      .first()
      .click();
    await expect(this.poleFiltra(filtr)).toContainText(wartosc);
  }

  /**
   * Kalendarz pola daty obowiązywania raportu ad hoc.
   * @param indeksPola - 0 = „Data obowiązywania od”, 1 = „Data obowiązywania do”
   * @returns komponent kalendarza
   */
  kalendarz(indeksPola: number): KalendarzComponent {
    return new KalendarzComponent(
      this.page,
      this.sekcjaAdHoc.getByRole('combobox', { name: 'YYYY-MM-DD' }).nth(indeksPola),
    );
  }

  /**
   * Ustawia filtry i daty raportu ad hoc i uruchamia „Generuj i pobierz raport”.
   * Zwraca plik albo – gdy aplikacja zamiast pliku pokaże komunikat (np. brak danych) – treść komunikatu.
   * Gdy w `CZAS_ODPOWIEDZI_AD_HOC` nie ma ani pliku, ani komunikatu, zwraca oba pola `null` (test rozstrzyga, czy to błąd).
   * @param ustawienia - daty obowiązywania i filtry
   * @returns pobrany plik, komunikat albo brak odpowiedzi aplikacji
   */
  async generujAdHoc(ustawienia: UstawieniaRaportuAdHoc): Promise<WynikRaportuAdHoc> {
    for (const [filtr, wartosc] of Object.entries(ustawienia.filtry ?? {}) as [FiltrAdHoc, string][]) {
      await this.wybierzFiltr(filtr, wartosc);
    }
    await this.kalendarz(0).ustaw(ustawienia.dataOd);
    await this.kalendarz(1).ustaw(ustawienia.dataDo);
    await expect(this.przyciskGenerujAdHoc).toBeEnabled();
    const pobranie = this.page.waitForEvent('download', { timeout: CZAS_ODPOWIEDZI_AD_HOC });
    await this.przyciskGenerujAdHoc.click();
    const brakOdpowiedzi: WynikRaportuAdHoc = { pobranie: null, komunikat: null };
    return Promise.race([
      pobranie.then((plik): WynikRaportuAdHoc => ({ pobranie: plik, komunikat: null })).catch(() => brakOdpowiedzi),
      this.komunikat
        .first()
        .waitFor({ timeout: CZAS_ODPOWIEDZI_AD_HOC })
        .then(
          async (): Promise<WynikRaportuAdHoc> => ({
            pobranie: null,
            komunikat: await this.komunikat.first().innerText(),
          }),
        )
        // Brak komunikatu nie rozstrzyga wyścigu – rozstrzyga go pobranie (plik albo jego limit czasu).
        .catch(() => new Promise<never>(() => undefined)),
    ]);
  }
}
