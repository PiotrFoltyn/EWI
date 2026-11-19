import * as ts11Dane from '../../src/data/json/ts11-raport-wlasny.json';
import { Rola } from '../../src/data/rola';
import { TAGI } from '../../src/data/tagi';
import type { DaneTs11 } from '../../src/data/types/raporty.types';
import { expect, test } from '../../src/fixtures';
import { FiltrAdHoc, RaportStandardowy, type WynikRaportuAdHoc } from '../../src/pages/raporty.page';
import { czytajArkusz, wierszeDanych, zapiszPobranie } from '../../src/utils/excel';
import { dzisiejszaDataIso } from '../../src/utils/wzorce';
import type { TestInfo } from '@playwright/test';

const dane: DaneTs11 = ts11Dane;
const { kolumny } = dane;

// Raport własny to karta „Własny raport” Użytkownika podstawowego („Generuj i pobierz raport” – plik od razu).
// Administrator ma inną kartę „Raport ad hoc” (dev 19.11.2026: „Generuj raport” + osobne „Pobierz”) – poza TS_11.
test.use({ rola: Rola.UzytkownikPodstawowy });

test.describe.configure({ timeout: 240_000 });

const DEFEKT_FILTROW =
  'DEFEKT (dev 18.11.2026): filtry nazwa / PS / MPK / O-ZSI raportu ad hoc nie zawężają wyniku – z filtrem MPK i O-ZSI plik zawiera zmiany wszystkich jednostek z okresu, z filtrem nazwy plik jest pusty mimo zmiany „Utworzenie” jednostki; listy wyboru MPK i nazwy potrafią nie zwrócić opcji przez kilka minut. Do zgłoszenia zespołowi EWI.';

const ZALOZENIE_AD_HOC = {
  type: 'założenie',
  description:
    'BR-RAP-09: „raport własny” = Raport ad hoc na ekranie Raporty – zestawienie zmian jednostek w okresie „Data obowiązywania od–do” (obie daty wymagane przez aplikację, dev 18.11.2026) zawężone filtrem. Filtry nazwa/PS/MPK/O-ZSI wybierane z listy (wyszukiwanie min. 3 znaki).',
};

/**
 * Data z JSON („RRRR-MM-DD”) jako `Date` w południe – bez przesunięć strefy przy wyborze dnia w kalendarzu.
 * @param iso - data w formacie ISO
 * @returns data
 */
const data = (iso: string): Date => new Date(`${iso}T12:00:00`);

/**
 * Wiersze danych pobranego raportu ad hoc (pusta lista, gdy zamiast pliku był komunikat).
 * @param wynik - wynik generowania
 * @param testInfo - informacje o teście (katalog zapisu)
 * @returns wiersze danych jako obiekty kolumna → tekst
 */
async function wierszeRaportu(wynik: WynikRaportuAdHoc, testInfo: TestInfo): Promise<Record<string, string>[]> {
  return wynik.pobranie
    ? wierszeDanych(await czytajArkusz(await zapiszPobranie(wynik.pobranie, testInfo)), dane.wierszNaglowkow)
    : [];
}

/** Przypadki z jednym filtrem z listy – wynik ma zawierać wyłącznie jednostki o wybranej wartości. */
const PRZYPADKI_FILTRA = [
  {
    tc: 'TC-57',
    nazwa: 'fragmentem nazwy',
    filtr: FiltrAdHoc.NazwaPelna,
    wartosc: dane.tc57.nazwa,
    kolumna: kolumny.nazwa,
    priorytet: TAGI.priorytet.wysoki,
    regresja: false,
  },
  {
    tc: 'TC-58',
    nazwa: 'PS',
    filtr: FiltrAdHoc.Ps,
    wartosc: dane.tc58.ps,
    kolumna: kolumny.ps,
    priorytet: TAGI.priorytet.sredni,
    regresja: false,
  },
  {
    tc: 'TC-59',
    nazwa: 'MPK',
    filtr: FiltrAdHoc.Mpk,
    wartosc: dane.tc59.mpk,
    kolumna: kolumny.mpk,
    priorytet: TAGI.priorytet.wysoki,
    regresja: true,
  },
  {
    tc: 'TC-60',
    nazwa: 'O-ZSI',
    filtr: FiltrAdHoc.Ozsi,
    wartosc: dane.tc60.ozsi,
    kolumna: kolumny.ozsi,
    priorytet: TAGI.priorytet.sredni,
    regresja: false,
  },
];

test.describe('TS_11 – Raport własny użytkownika', { tag: ['@TS_11', '@BR-RAP-09'] }, () => {
  for (const przypadek of PRZYPADKI_FILTRA) {
    test(
      `${przypadek.tc} Raport własny z filtrem ${przypadek.nazwa}`,
      {
        tag: [
          `@${przypadek.tc}`,
          przypadek.priorytet,
          TAGI.rodzaj.pozytywny,
          TAGI.warstwa.e2e,
          ...(przypadek.regresja ? [TAGI.kwalifikacja.regresja] : []),
        ],
        annotation: [
          ZALOZENIE_AD_HOC,
          ...(przypadek.filtr === FiltrAdHoc.NazwaPelna
            ? [
                {
                  type: 'założenie',
                  description: 'Filtr nazwy to wybór jednostki z listy wyszukiwanej fragmentem nazwy.',
                },
              ]
            : []),
        ],
      },
      async ({ dashboardPage }, testInfo) => {
        test.fixme(true, DEFEKT_FILTROW);

        // Arrange
        const raporty = await dashboardPage.otworzRaporty();

        // Act
        const wynik = await raporty.generujAdHoc({
          dataOd: data(dane.okresZmian.od),
          dataDo: data(dzisiejszaDataIso()),
          filtry: { [przypadek.filtr]: przypadek.wartosc },
        });

        // Assert
        const wiersze = await wierszeRaportu(wynik, testInfo);
        expect(wiersze.length, 'raport zawiera zmiany jednostki').toBeGreaterThan(0);
        expect(
          wiersze.filter((w) => w[przypadek.kolumna] !== przypadek.wartosc).slice(0, 5),
          `wiersze z innym „${przypadek.kolumna}”`,
        ).toEqual([]);
      },
    );
  }

  test(
    'TC-61 Raport własny z filtrem datą obowiązywania',
    {
      tag: ['@TC-61', TAGI.priorytet.sredni, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e],
      annotation: [
        ZALOZENIE_AD_HOC,
        { type: 'założenie', description: 'Okres od 14.11.2026 do dziś – zmiany po imporcie (dev).' },
      ],
    },
    async ({ dashboardPage }, testInfo) => {
      // Arrange
      const od = dane.tc61.od;
      const doDnia = dzisiejszaDataIso();
      const raporty = await dashboardPage.otworzRaporty();

      // Act
      const wynik = await raporty.generujAdHoc({ dataOd: data(od), dataDo: data(doDnia) });

      // Assert
      const wiersze = await wierszeRaportu(wynik, testInfo);
      expect(wiersze.length, 'raport zawiera zmiany z okresu').toBeGreaterThan(0);
      const poza = wiersze.map((w) => w[kolumny.dataObowiazywania] ?? '').filter((d) => d < od || d > doDnia);
      expect(poza.slice(0, 5), 'daty obowiązywania poza okresem').toEqual([]);
    },
  );

  test(
    'TC-62 Raport własny z kombinacją filtrów',
    {
      tag: ['@TC-62', TAGI.priorytet.sredni, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e],
      annotation: ZALOZENIE_AD_HOC,
    },
    async ({ dashboardPage }, testInfo) => {
      // Arrange
      test.fixme(true, DEFEKT_FILTROW);

      const { nazwa, od } = dane.tc62;
      const doDnia = dzisiejszaDataIso();
      const raporty = await dashboardPage.otworzRaporty();

      // Act
      const wynik = await raporty.generujAdHoc({
        dataOd: data(od),
        dataDo: data(doDnia),
        filtry: { [FiltrAdHoc.NazwaPelna]: nazwa },
      });

      // Assert
      const wiersze = await wierszeRaportu(wynik, testInfo);
      expect(wiersze.length).toBeGreaterThan(0);
      expect(wiersze.filter((w) => w[kolumny.nazwa] !== nazwa).slice(0, 5), 'inna nazwa').toEqual([]);
      const poza = wiersze.map((w) => w[kolumny.dataObowiazywania] ?? '').filter((d) => d < od || d > doDnia);
      expect(poza.slice(0, 5), 'data poza okresem').toEqual([]);
    },
  );

  test(
    'TC-63 Raport własny bez wyników',
    {
      tag: ['@TC-63', TAGI.priorytet.niski, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e],
      annotation: [
        ZALOZENIE_AD_HOC,
        {
          type: 'założenie',
          description:
            'P-04: wartości „ZZZZZZZZ” nie da się wybrać z listy MPK – brak wyników uzyskany okresem bez zmian (styczeń 2020). Akceptowany komunikat o braku danych albo plik z samymi nagłówkami.',
        },
        {
          type: 'defekt',
          description:
            'Dev 18.11.2026: dla okresu bez zmian EWI nie pokazuje komunikatu i nie zwraca pliku (brak reakcji po „Generuj i pobierz raport”). Test celowo czerwony do czasu poprawki.',
        },
      ],
    },
    async ({ dashboardPage }, testInfo) => {
      // Arrange
      const raporty = await dashboardPage.otworzRaporty();

      // Act
      const wynik = await raporty.generujAdHoc({ dataOd: data(dane.tc63.od), dataDo: data(dane.tc63.do) });

      // Assert
      expect(
        { plik: wynik.pobranie !== null, komunikat: wynik.komunikat !== null },
        'EWI informuje o braku danych albo zwraca plik z samymi nagłówkami (P-04)',
      ).not.toEqual({ plik: false, komunikat: false });
      expect(await wierszeRaportu(wynik, testInfo)).toHaveLength(0);
    },
  );

  test(
    'TC-64 Pobranie raportu przygotowanego przez Administratora',
    {
      tag: [
        '@TC-64',
        TAGI.priorytet.wysoki,
        TAGI.rodzaj.pozytywny,
        TAGI.warstwa.e2e,
        TAGI.kwalifikacja.smoke,
        TAGI.kwalifikacja.regresja,
      ],
      annotation: {
        type: 'założenie',
        description:
          'Raport udostępniony przez Administratora = ostatnio wygenerowany plik Temat 5013 w „Raporty standardowe” Użytkownika – akcja „Pobierz”.',
      },
    },
    async ({ dashboardPage }, testInfo) => {
      // Arrange
      const raporty = await dashboardPage.otworzRaporty();

      // Act
      const plik = await zapiszPobranie(await raporty.pobierz(RaportStandardowy.Temat5013), testInfo);

      // Assert
      const arkusz = await czytajArkusz(plik);
      expect(wierszeDanych(arkusz, dane.wierszNaglowkowTemat5013).length, 'plik zawiera jednostki').toBeGreaterThan(0);
    },
  );
});
