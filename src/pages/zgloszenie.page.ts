import { expect, type Locator, type Page } from '@playwright/test';
import { KalendarzComponent } from '../components/kalendarz.component';
import { BasePage } from './base.page';
import { PodgladZgloszeniaPage } from './podglad-zgloszenia.page';

/** Rodzaj zgłoszenia – opcja listy „Rodzaj zgłoszenia*”. */
export enum RodzajZgloszenia {
  Utworzenie = 'Utworzenie',
  Zmiana = 'Zmiana',
  Likwidacja = 'Likwidacja',
}

/** Pole zgłoszenia zmiany zaznaczane w sekcji „Wybierz co zmieniasz” (etykieta dokładnie jak w formularzu). */
export enum PoleZmiany {
  NazwaPelna = 'Nazwa pełna',
  NazwaDluga = 'Nazwa długa (do 40 znaków)',
  NazwaKrotka = 'Nazwa krótka (skrót, do 20 znaków)',
  Ulica = 'Ulica',
  NrBudynku = 'Nr budynku',
  Miasto = 'Miasto',
}

/**
 * Formularz zgłoszenia jednostki (`/EWI/Request?RequestId=0…`) – utworzenie, zmiana lub likwidacja.
 * Otwierany z dashboardu („Nowe zgłoszenie – …”) albo z karty jednostki („Zgłoś zmianę” / „Zgłoś likwidację”) –
 * wtedy jednostka i rodzaj są ustawione. Po wysłaniu aplikacja przechodzi do podglądu zgłoszenia.
 */
export class ZgloszeniePage extends BasePage {
  readonly rodzajZgloszenia: Locator;
  /** Informacja „Wybrana jednostka: <nazwa> · MPK <mpk>”. */
  readonly wybranaJednostka: Locator;
  /** Lista wyboru jednostki („Jednostka (nazwa, MPK lub O-ZSI)”). */
  readonly poleJednostki: Locator;
  /** Data zmiany („Zmiana obowiązuje od*”) albo likwidacji („Data likwidacji*”) – zależnie od rodzaju. */
  readonly kalendarz: KalendarzComponent;
  readonly uzasadnienie: Locator;
  readonly ewidencjaKosztowTak: Locator;
  readonly ewidencjaKosztowNie: Locator;
  readonly przyciskWyslij: Locator;

  /**
   * @param page - strona z otwartym formularzem zgłoszenia
   */
  constructor(page: Page) {
    super(page);
    const main = page.getByRole('main');
    this.rodzajZgloszenia = main.getByRole('combobox', { name: 'Rodzaj zgłoszenia*' });
    this.wybranaJednostka = main.getByText(/^Wybrana jednostka:/);
    this.poleJednostki = main.getByRole('button', { name: 'Select an option' }).first();
    this.kalendarz = new KalendarzComponent(
      page,
      main.getByRole('combobox', { name: /^(Zmiana obowiązuje od|Data likwidacji)\*$/ }),
    );
    this.uzasadnienie = main.getByRole('textbox', { name: 'Uzasadnienie zgłoszenia*' });
    this.ewidencjaKosztowTak = main.getByRole('radio', { name: 'Tak' });
    this.ewidencjaKosztowNie = main.getByRole('radio', { name: 'Nie' });
    this.przyciskWyslij = main.getByRole('button', { name: 'Wyślij zgłoszenie' });
  }

  /**
   * Komunikat walidacji pola (np. „Podaj uzasadnienie zgłoszenia.”) – treść z danych testu.
   * @param tresc - treść komunikatu
   * @returns lokator komunikatu
   */
  komunikatWalidacji(tresc: string): Locator {
    return this.page.getByRole('main').getByText(tresc, { exact: true });
  }

  /** Formularz jest gotowy po przejściu ekranu i wczytaniu listy rodzajów zgłoszenia. */
  override async expectLoaded(): Promise<void> {
    // Nowe zgłoszenie z dashboardu: `/Request`; z karty jednostki: `/Request?RequestId=0&…`.
    await expect(this.page).toHaveURL(/\/Request(\?|$)/);
    await this.poPrzejsciuEkranu();
    await expect(this.rodzajZgloszenia).toBeVisible();
    await expect(this.przyciskWyslij).toBeVisible();
  }

  /**
   * Najgłębszy kontener z etykietą pola zmiany i podanym elementem (ostatni pasujący div w kolejności dokumentu).
   * Pole wyboru i „Nowa wartość*” są w różnych kontenerach, więc każdy szukany jest osobno.
   * @param pole - pole z `PoleZmiany`
   * @param element - element, który ma być w kontenerze
   * @returns lokator kontenera
   */
  private kontenerPola(pole: PoleZmiany, element: Locator): Locator {
    return this.page
      .getByRole('main')
      .locator('div')
      .filter({ has: this.page.getByText(pole, { exact: true }) })
      .filter({ has: element })
      .last();
  }

  /**
   * Zaznacza pole w „Wybierz co zmieniasz” i wpisuje nową wartość.
   * @param pole - pole z `PoleZmiany`
   * @param nowaWartosc - nowa wartość pola
   */
  async zmien(pole: PoleZmiany, nowaWartosc: string): Promise<void> {
    await this.kontenerPola(pole, this.page.getByRole('checkbox')).getByRole('checkbox').check();
    const poleNowejWartosci = this.page.getByRole('textbox', { name: 'Nowa wartość*' });
    const nowa = this.kontenerPola(pole, poleNowejWartosci).getByRole('textbox', { name: 'Nowa wartość*' });
    await expect(nowa).toBeEditable();
    await nowa.fill(nowaWartosc);
  }

  /**
   * Odpowiada na pytanie „Czy nr MPK ma służyć do ewidencji kosztów?”. Gdy pojawi się pole uzasadnienia kosztów,
   * wypełnia je podanym tekstem.
   * @param kosztowe - true = „Tak”, false = „Nie”
   * @param uzasadnienieKosztow - uzasadnienie kosztów (gdy formularz go wymaga)
   */
  async ustawEwidencjeKosztow(kosztowe: boolean, uzasadnienieKosztow?: string): Promise<void> {
    await (kosztowe ? this.ewidencjaKosztowTak : this.ewidencjaKosztowNie).check();
    const poleKosztow = this.page.getByRole('main').getByRole('textbox', { name: /koszt/i }).filter({ visible: true });
    if (uzasadnienieKosztow && (await poleKosztow.count()) > 0) {
      await poleKosztow.first().fill(uzasadnienieKosztow);
    }
  }

  /**
   * Wpisuje uzasadnienie i wysyła zgłoszenie; czeka, aż aplikacja zapisze zgłoszenie (numer w adresie).
   * @param uzasadnienie - uzasadnienie zgłoszenia (pole obowiązkowe)
   * @returns podgląd wysłanego zgłoszenia (dane wczytują się asynchronicznie – asercje web-first na nie czekają)
   */
  async wyslij(uzasadnienie: string): Promise<PodgladZgloszeniaPage> {
    await this.uzasadnienie.fill(uzasadnienie);
    await this.przyciskWyslij.click();
    // Numer w adresie = zgłoszenie zapisane. Bez pełnego `expectLoaded` – test ma od razu zarejestrować adres do
    // sprzątania (`zgloszeniaDoWycofania`), zanim jakakolwiek asercja podglądu mogłaby przerwać test.
    await expect(this.page).toHaveURL(/RequestId=[1-9]d*/);
    return new PodgladZgloszeniaPage(this.page);
  }

  /** Próbuje wysłać formularz w obecnym stanie (bez czekania na podgląd) – do testów walidacji. */
  async sprobujWyslac(): Promise<void> {
    await this.przyciskWyslij.click();
  }

  /**
   * Opcje listy wyboru jednostki po wpisaniu frazy (min. 3 znaki) – do sprawdzenia, czy jednostkę można wybrać.
   * @param fraza - nazwa, MPK lub O-ZSI
   * @returns lokator widocznych opcji
   */
  async wyszukajJednostke(fraza: string): Promise<Locator> {
    await this.poleJednostki.click();
    await this.page.getByRole('searchbox', { name: 'Szukaj' }).filter({ visible: true }).fill(fraza);
    return this.page.getByRole('option').filter({ visible: true, hasText: fraza });
  }
}
