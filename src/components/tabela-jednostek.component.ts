import type { Locator, Page } from '@playwright/test';
import { escapujRegex } from '../utils/wzorce';

/** Kolejność kolumn tabeli „Lista wszystkich jednostek” (komórki nie mają własnych nazw dostępności). */
export enum KolumnaJednostki {
  Status = 0,
  NazwaPelna = 1,
  NazwaKrotka = 2,
  TypJednostki = 3,
  Identyfikatory = 4,
  Akcja = 5,
}

/**
 * Tabela jednostek w Rejestrze jednostek.
 * Kolumna identyfikatorów ma format „PS / MPK / O-ZSI”, brak PS oznaczany jest „—”.
 */
export class TabelaJednostek {
  readonly tabela: Locator;
  /** Wiersze z danymi (bez wiersza nagłówka). */
  readonly wiersze: Locator;

  /**
   * @param page - strona Rejestru jednostek
   */
  constructor(private readonly page: Page) {
    this.tabela = page.getByRole('grid');
    this.wiersze = this.tabela.getByRole('row').filter({ has: page.getByRole('gridcell') });
  }

  /**
   * Komórka wskazanej kolumny w wierszu.
   * @param wiersz - wiersz tabeli (element `wiersze`)
   * @param kolumna - kolumna z `KolumnaJednostki`
   * @returns lokator komórki
   */
  komorka(wiersz: Locator, kolumna: KolumnaJednostki): Locator {
    return wiersz.getByRole('gridcell').nth(kolumna);
  }

  /**
   * Wiersze, które NIE zawierają podanego tekstu – używane do sprawdzenia, że wynik zawiera wyłącznie pasujące jednostki.
   * @param wzorzec - tekst lub wyrażenie, którego brakuje w wierszu
   * @returns lokator wierszy niepasujących
   */
  wierszeBez(wzorzec: string | RegExp): Locator {
    return this.wiersze.filter({ hasNotText: wzorzec });
  }

  /**
   * Wiersze, w których komórka wskazanej kolumny NIE ma dokładnie podanej wartości.
   * Używane do sprawdzenia, że lista po filtrowaniu zawiera wyłącznie jednostki o wybranej wartości.
   * @param kolumna - kolumna z `KolumnaJednostki`
   * @param wartosc - oczekiwana wartość komórki
   * @returns lokator wierszy niepasujących
   */
  wierszeBezWartosci(kolumna: KolumnaJednostki, wartosc: string): Locator {
    return this.wiersze.filter({
      hasNot: this.page
        .getByRole('gridcell')
        .nth(kolumna)
        .filter({ hasText: new RegExp(`^${escapujRegex(wartosc)}$`) }),
    });
  }

  /**
   * Wiersze jednostek o podanym numerze PS (dopasowanie pierwszego członu „PS / MPK / O-ZSI”).
   * @param ps - numer punktu sprzedaży
   * @returns lokator pasujących wierszy
   */
  wierszeZPs(ps: string): Locator {
    return this.wierszeZIdentyfikatorem(new RegExp(`^${escapujRegex(ps)} /`));
  }

  /**
   * Wiersze jednostek o podanym MPK (środkowy człon „PS / MPK / O-ZSI”).
   * @param mpk - 8-znakowy kod MPK
   * @returns lokator pasujących wierszy
   */
  wierszeZMpk(mpk: string): Locator {
    return this.wierszeZIdentyfikatorem(new RegExp(`/ ${escapujRegex(mpk)} /`));
  }

  /**
   * Wiersze jednostek, których MPK zawiera podany ciąg znaków.
   * @param fragment - fragment kodu MPK
   * @returns lokator pasujących wierszy
   */
  wierszeZFragmentemMpk(fragment: string): Locator {
    return this.wierszeZIdentyfikatorem(this.wzorzecFragmentuMpk(fragment));
  }

  /**
   * Wiersze jednostek, których MPK NIE zawiera podanego ciągu – do sprawdzenia, że wynik zawiera wyłącznie pasujące jednostki.
   * @param fragment - fragment kodu MPK
   * @returns lokator wierszy niepasujących
   */
  wierszeBezFragmentuMpk(fragment: string): Locator {
    return this.wiersze.filter({
      hasNot: this.page.getByRole('gridcell').filter({ hasText: this.wzorzecFragmentuMpk(fragment) }),
    });
  }

  /**
   * Wiersze jednostek o podanym O-ZSI (ostatni człon „PS / MPK / O-ZSI”).
   * @param ozsi - identyfikator O-ZSI
   * @returns lokator pasujących wierszy
   */
  wierszeZOzsi(ozsi: string): Locator {
    return this.wierszeZIdentyfikatorem(new RegExp(`/ ${escapujRegex(ozsi)}$`));
  }

  private wzorzecFragmentuMpk(fragment: string): RegExp {
    return new RegExp(`/ \\S*${escapujRegex(fragment)}\\S* /`);
  }

  private wierszeZIdentyfikatorem(wzorzec: RegExp): Locator {
    return this.wiersze.filter({ has: this.page.getByRole('gridcell').filter({ hasText: wzorzec }) });
  }
}
