import { expect, type Locator, type Page } from '@playwright/test';
import { escapujRegex } from '../utils/wzorce';
import { BasePage } from './base.page';

/** Kolejność kolumn tabeli komórek MPK w sekcji „Umiejscowienie i struktura jednostki” (komórki bez nazw dostępności). */
export enum KolumnaKomorkiMpk {
  Mpk = 0,
  /** Status komórki (np. „Aktywna”, „Zlikwidowana”) – od 16.11.2026 zamiast kolumny JO2. */
  Status = 1,
  NazwaPelna = 2,
  NazwaKrotka = 3,
  RodzajMpk = 4,
  Ozsi = 5,
  Ps = 6,
}

/** Kolejność kolumn tabeli „Historia zmian” (komórki bez nazw dostępności). */
export enum KolumnaHistorii {
  DataZmiany = 0,
  DataObowiazywania = 1,
  RodzajZmiany = 2,
  Podstawa = 3,
  Wprowadzil = 4,
}

/** Etykiety pól karty jednostki używane w testach (dokładnie jak na karcie). */
export enum EtykietaPola {
  NazwaPelna = 'Nazwa pełna',
  NazwaKrotka = 'Nazwa krótka (skrót)',
  DataUtworzenia = 'Data utworzenia',
  DataLikwidacji = 'Data likwidacji',
  MpkGlowny = 'MPK główny',
  Ps = 'PS',
  Ozsi = 'O-ZSI',
  Statystyczna = 'Statystyczna',
}

/**
 * Karta (podgląd) jednostki – otwierana z Rejestru jednostek akcją „Podgląd” (`UnitRegister?UnitId=...`).
 * Sekcje: nagłówek (nazwa, znaczniki typu i statusu), „Dane jednostki”, „Numery identyfikacyjne”,
 * „Umiejscowienie i struktura jednostki” (ścieżka + tabela komórek MPK) i „Historia zmian”.
 * Puste pole karta prezentuje jako „Nie występuje” (lista Rejestru – „—”), pole nieadekwatne dla typu – „Nie dotyczy”.
 */
export class KartaJednostkiPage extends BasePage {
  readonly linkWrocDoWynikow: Locator;
  /** Nagłówek sekcji „Dane jednostki” – pojawia się po wczytaniu danych karty. */
  readonly sekcjaDaneJednostki: Locator;
  /** Nazwa jednostki w nagłówku karty. */
  readonly nazwaWNaglowku: Locator;
  /** Znaczniki pod nazwą jednostki – kolejno typ (np. „KOC”) i status (np. „Aktywna”). */
  readonly znacznikiNaglowka: Locator;
  /** Komunikat błędu platformy OutSystems (feedback message) – nie powinien pojawić się przy otwarciu karty. */
  readonly komunikatBledu: Locator;
  /**
   * Tabela komórek MPK w sekcji struktury (MPK, status, nazwy, rodzaj MPK, O-ZSI, PS); nazwy innych jednostek są linkami do ich kart.
   * Na karcie pionu: jego jednostki podrzędne i własna komórka. Na kartach innych typów (dev 13.11.2026): grupa MPK
   * o wspólnym prefiksie, niekoniecznie podrzędnych – P-06.
   */
  readonly tabelaKomorekMpk: Locator;
  /** Komórki kolumny „MPK” wszystkich wierszy bieżącej strony tabeli komórek MPK – do porównania całej listy. */
  readonly kolumnaMpkKomorek: Locator;
  /** Tabela „Historia zmian” (Data zmiany, Data obowiązywania, Rodzaj zmiany, Podstawa / zgłoszenie, Wprowadził(a)). */
  readonly tabelaHistorii: Locator;
  /** Nagłówki kolumn tabeli historii. */
  readonly naglowkiHistorii: Locator;
  /** Wiersze z wpisami historii (bez wiersza nagłówka). */
  readonly wierszeHistorii: Locator;
  /** Puste komórki wpisów historii – każdy wpis powinien mieć wypełnione wszystkie kolumny. */
  readonly pusteKomorkiHistorii: Locator;
  /** Kontrolki, które pozwalałyby zmienić lub usunąć wpis historii (przyciski, linki, pola edycji, pola wyboru). */
  readonly kontrolkiEdycjiHistorii: Locator;
  /** Karty sekcji z polami danych („Dane jednostki”, „Numery identyfikacyjne”) – bez sekcji z tabelami. */
  private readonly sekcjePol: Locator;

  /**
   * @param page - strona z otwartą kartą jednostki
   */
  constructor(page: Page) {
    super(page);
    const main = page.getByRole('main');
    this.linkWrocDoWynikow = page.getByRole('link', { name: 'Wróć do wyników wyszukiwania' });
    this.sekcjaDaneJednostki = main.getByText('Dane jednostki', { exact: true });
    // Nazwa i znaczniki nie mają ról dostępności (span z klasą typografii / tag OutSystems UI).
    // TODO [ZAŁOŻENIE]: zastąpić `data-testid` (lub nagłówkiem `h1`) po dodaniu w OutSystems.
    this.nazwaWNaglowku = main.locator('span.heading1');
    // Znaczniki są w tym samym kontenerze co nazwa – zawężenie chroni przed `.tag` w innych sekcjach karty.
    this.znacznikiNaglowka = this.nazwaWNaglowku.locator('xpath=..').locator('.tag');
    // `.feedback-message-error` – klasa komunikatu błędu OutSystems UI (komunikat nie ma stałej roli dostępności).
    this.komunikatBledu = page.locator('.feedback-message-error');
    this.tabelaKomorekMpk = main
      .getByRole('grid')
      .filter({ has: page.getByRole('columnheader', { name: 'Rodzaj MPK', exact: false }) });
    // Pierwsza kolumna wierszy danych – semantyka HTML tabeli (nie klasy ani ID OutSystems).
    this.kolumnaMpkKomorek = this.kolumnaTabeli(this.tabelaKomorekMpk, KolumnaKomorkiMpk.Mpk);
    this.tabelaHistorii = main
      .getByRole('grid')
      .filter({ has: page.getByRole('columnheader', { name: 'Data zmiany', exact: true }) });
    this.naglowkiHistorii = this.tabelaHistorii.getByRole('columnheader');
    this.wierszeHistorii = this.tabelaHistorii.getByRole('row').filter({ has: page.getByRole('gridcell') });
    // Puste pole: brak tekstu, „—” lub „Nie występuje” (sposób prezentacji zmieniał się na dev).
    this.pusteKomorkiHistorii = this.wierszeHistorii
      .getByRole('gridcell')
      .filter({ hasText: /^\s*(—|Nie występuje)?\s*$/ });
    this.kontrolkiEdycjiHistorii = this.tabelaHistorii
      .getByRole('button')
      .or(this.tabelaHistorii.getByRole('link'))
      .or(this.tabelaHistorii.getByRole('textbox'))
      .or(this.tabelaHistorii.getByRole('checkbox'))
      .or(this.tabelaHistorii.getByRole('combobox'))
      .or(this.tabelaHistorii.getByRole('spinbutton'))
      .or(this.tabelaHistorii.getByRole('menuitem'))
      // Komórki edytowalne w miejscu nie mają roli „textbox” w drzewie dostępności.
      .or(this.tabelaHistorii.locator('[contenteditable="true"]'));
    // `.card` – klasa OutSystems UI; tylko w ten sposób da się oddzielić pola od nagłówków kolumn tabel (np. „PS”).
    this.sekcjePol = main.locator('.card').filter({ hasNot: page.getByRole('grid') });
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
    // Nagłówki sekcji są statyczne – dopiero nazwa jednostki potwierdza wczytanie danych.
    await expect(this.nazwaWNaglowku).not.toBeEmpty();
  }

  /**
   * Wartość pola karty wskazanego etykietą (np. „Region”, „MPK główny”, „PS”).
   * Pola nie mają powiązania etykieta–wartość w dostępności: wartość to element za kontenerem etykiety
   * (`font-size-s` – klasa OutSystems UI). Część etykiet ma obok przycisk „Objaśnienie”, więc wspinamy się do kontenera,
   * a nie do bezpośredniego rodzica etykiety.
   * TODO [ZAŁOŻENIE]: zastąpić `data-testid` po dodaniu w OutSystems.
   * @param etykieta - etykieta pola dokładnie jak na karcie
   * @returns lokator wartości pola
   */
  pole(etykieta: string): Locator {
    return this.sekcjePol
      .getByText(etykieta, { exact: true })
      .locator(
        'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " font-size-s ")][1]/following-sibling::div[1]',
      );
  }

  /**
   * Etykieta pola karty – do sprawdzenia, czy pole jest w ogóle prezentowane (np. „Data likwidacji” tylko dla zlikwidowanych).
   * @param etykieta - etykieta pola dokładnie jak na karcie
   * @returns lokator etykiety
   */
  etykietaPola(etykieta: string): Locator {
    return this.sekcjePol.getByText(etykieta, { exact: true });
  }

  /**
   * Element ścieżki „Umiejscowienie i struktura jednostki” (Obszar › Pion › jednostka nadrzędna › jednostka).
   * @param nazwa - nazwa obszaru, pionu lub jednostki nadrzędnej
   * @returns lokator linku w ścieżce struktury
   */
  elementStruktury(nazwa: string): Locator {
    // Bez linków z tabel – nazwy jednostek w tabeli komórek MPK też są linkami (np. ta sama nazwa co KOC nadrzędna).
    return this.page
      .getByRole('main')
      .getByRole('link', { name: nazwa, exact: true })
      .and(this.page.locator('a:not(table *)'));
  }

  /**
   * Przechodzi do jednostki nadrzędnej (obszaru, pionu, jednostki) przez link w ścieżce struktury.
   * @param nazwa - nazwa jednostki w ścieżce (dokładnie jak w linku, np. „Oddział: PKO BP SA Oddział 1 w Głogowie”)
   * @returns załadowana karta jednostki nadrzędnej
   */
  przejdzWGoreStruktury(nazwa: string): Promise<KartaJednostkiPage> {
    return this.przejdzPrzezLink(this.elementStruktury(nazwa));
  }

  /**
   * Przechodzi do jednostki z tabeli komórek MPK (np. jednostki podrzędnej) przez link z nazwą w jej wierszu.
   * Wiersz wskazujemy po MPK – nazwa może się powtarzać w kilku komórkach tej samej jednostki.
   * @param mpk - MPK jednostki w tabeli
   * @returns załadowana karta wybranej jednostki
   */
  przejdzDoJednostkiZTabeli(mpk: string): Promise<KartaJednostkiPage> {
    return this.przejdzPrzezLink(this.wierszKomorkiMpk(mpk).getByRole('link'));
  }

  /**
   * Próbuje zmienić i usunąć wpis historii zwykłymi gestami użytkownika (dwuklik w komórkę, wpisanie tekstu, Delete).
   * Nie sprawdza wyniku – test potwierdza, że wpisy pozostały bez zmian.
   * @param indeksWpisu - indeks wiersza historii (od 0)
   */
  async sprobujEdytowacWpisHistorii(indeksWpisu: number): Promise<void> {
    const komorka = this.wierszeHistorii.nth(indeksWpisu).getByRole('gridcell').nth(KolumnaHistorii.RodzajZmiany);
    await komorka.dblclick();
    await this.page.keyboard.type('zmiana');
    await this.page.keyboard.press('Delete');
  }

  /**
   * Wiersz tabeli komórek MPK o podanym kodzie MPK.
   * @param mpk - 8-znakowy kod MPK komórki
   * @returns lokator wiersza
   */
  wierszKomorkiMpk(mpk: string): Locator {
    return this.tabelaKomorekMpk.getByRole('row').filter({
      has: this.page.getByRole('gridcell', { name: new RegExp(`^${escapujRegex(mpk)}$`) }),
    });
  }

  /**
   * Komórka wskazanej kolumny w wierszu tabeli komórek MPK.
   * @param wiersz - wiersz z `wierszKomorkiMpk`
   * @param kolumna - kolumna z `KolumnaKomorkiMpk`
   * @returns lokator komórki
   */
  komorkaMpk(wiersz: Locator, kolumna: KolumnaKomorkiMpk): Locator {
    return wiersz.getByRole('gridcell').nth(kolumna);
  }

  /**
   * Komórki wskazanej kolumny we wszystkich wpisach historii.
   * @param kolumna - kolumna z `KolumnaHistorii`
   * @returns lokator komórek (po jednej na wpis)
   */
  kolumnaHistorii(kolumna: KolumnaHistorii): Locator {
    return this.kolumnaTabeli(this.tabelaHistorii, kolumna);
  }

  /**
   * Komórki danych wskazanej kolumny tabeli (semantyka HTML tabeli, nie klasy OutSystems).
   * @param tabela - lokator tabeli (`grid`)
   * @param indeks - indeks kolumny od 0
   * @returns lokator komórek kolumny we wszystkich wierszach danych
   */
  private kolumnaTabeli(tabela: Locator, indeks: number): Locator {
    // `nth-child` liczy od 1.
    return tabela.locator(`tbody tr > td:nth-child(${indeks + 1})`);
  }

  /**
   * Klika link prowadzący do innej karty i czeka na jej wczytanie.
   * Karta → karta to przejście ekranu OutSystems w obrębie tego samego adresu (zmienia się `UnitId`),
   * więc najpierw czekamy na nowy adres, potem `expectLoaded()` czeka na koniec przejścia i dane,
   * a na końcu na nazwę inną niż poprzednia – stan, którego nie spełnia stara karta.
   */
  private async przejdzPrzezLink(link: Locator): Promise<KartaJednostkiPage> {
    const poprzedniAdres = this.page.url();
    const poprzedniaNazwa = await this.nazwaWNaglowku.innerText();
    await link.click();
    await expect(this.page).not.toHaveURL(poprzedniAdres);
    const karta = new KartaJednostkiPage(this.page);
    await karta.expectLoaded();
    await expect(karta.nazwaWNaglowku).not.toHaveText(poprzedniaNazwa);
    return karta;
  }

  /** Wraca do listy wyników z zachowaniem wyszukiwania i filtrów. */
  async wrocDoWynikow(): Promise<void> {
    await this.linkWrocDoWynikow.click();
    await expect(this.linkWrocDoWynikow).toBeHidden();
    await this.poPrzejsciuEkranu();
  }
}
