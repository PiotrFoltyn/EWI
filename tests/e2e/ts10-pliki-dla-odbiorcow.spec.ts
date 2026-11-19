import * as ts10Dane from '../../src/data/json/ts10-pliki-dla-odbiorcow.json';
import { Rola } from '../../src/data/rola';
import { TAGI } from '../../src/data/tagi';
import type { DaneTs10 } from '../../src/data/types/raporty.types';
import { expect, test } from '../../src/fixtures';
import { EtykietaPola } from '../../src/pages/karta-jednostki.page';
import { RaportStandardowy } from '../../src/pages/raporty.page';
import { czytajArkusz, nazwyKolumn, wierszeDanych, zapiszPobranie } from '../../src/utils/excel';
import { dzisiejszaDataIso } from '../../src/utils/wzorce';

const dane: DaneTs10 = ts10Dane;
const { kolumny } = dane;

test.use({ rola: Rola.Administrator });

// Pliki z dev są duże (MPK_DICT ~8 MB, 42 tys. wierszy), a generowanie trwa – dłuższy limit całego testu.
test.describe.configure({ timeout: 240_000 });

const ZALOZENIE_WZORCOW = {
  type: 'założenie',
  description:
    'P-11: wzorce od odbiorców – MPK_DICT_2026-10-28.xlsx i „Temat 5013 - 27 10 2026_MPK_ALNOVA.xlsx” (dostarczone 18.11.2026); nagłówki przepisane do ts10-pliki-dla-odbiorcow.json.',
};

test.describe(
  'TS_10 – Generowanie plików MPK_DICT, Temat 5013 i Zmiany OZSI',
  { tag: ['@TS_10', '@BR-RAP-01', '@BR-RAP-02', '@KO-21.2'] },
  () => {
    test(
      'TC-48 MPK_DICT – układ kolumn zgodny ze wzorcem',
      {
        tag: ['@TC-48', TAGI.priorytet.wysoki, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e, TAGI.kwalifikacja.regresja],
        annotation: ZALOZENIE_WZORCOW,
      },
      async ({ dashboardPage }, testInfo) => {
        // Arrange
        const { wierszNaglowkow, kolumny: kolumnyWzorca } = dane.wzorzecMpkDict;
        const raporty = await dashboardPage.otworzRaporty();

        // Act
        const plik = await zapiszPobranie(await raporty.pobierz(RaportStandardowy.MpkDict), testInfo);

        // Assert
        const arkusz = await czytajArkusz(plik);
        expect(nazwyKolumn(arkusz.wiersze[wierszNaglowkow - 1]), 'nagłówki w wierszu 3').toEqual(kolumnyWzorca);
        expect(nazwyKolumn(arkusz.wiersze[wierszNaglowkow]).length, 'dane od wiersza 4').toBeGreaterThan(0);
      },
    );

    test(
      'TC-49 MPK_DICT – dane zgodne z katalogiem',
      {
        tag: [
          '@TC-49',
          TAGI.priorytet.wysoki,
          TAGI.rodzaj.pozytywny,
          TAGI.warstwa.e2e,
          TAGI.kwalifikacja.regresja,
          '@KO-21.3',
        ],
        annotation: [
          ZALOZENIE_WZORCOW,
          {
            type: 'założenie',
            description: 'P-66: jednostka zlikwidowana – „Kod jednostki MPK” = „_likw”, MPK w „Kod jednostki sp”.',
          },
          {
            type: 'założenie',
            description:
              'Zgodność z kartą sprawdzana dla 3 stałych jednostek z ts10-pliki-dla-odbiorcow.json (zamiast 10 losowych – czas wykonania na dev).',
          },
        ],
      },
      async ({ dashboardPage }, testInfo) => {
        // Arrange
        const raporty = await dashboardPage.otworzRaporty();
        const przedGenerowaniem = await raporty.wygenerowano(RaportStandardowy.MpkDict).innerText();

        // Act
        await raporty.generuj(RaportStandardowy.MpkDict);
        // Generowanie jest asynchroniczne – plik jest gotowy, gdy „Wygenerowano” pokazuje dzisiejszą datę i nową godzinę.
        await expect(raporty.wygenerowano(RaportStandardowy.MpkDict)).toContainText(dzisiejszaDataIso(), {
          timeout: 180_000,
        });
        await expect(raporty.wygenerowano(RaportStandardowy.MpkDict)).not.toHaveText(przedGenerowaniem);
        const plik = await zapiszPobranie(await raporty.pobierz(RaportStandardowy.MpkDict), testInfo);

        // Assert
        const wiersze = wierszeDanych(await czytajArkusz(plik), dane.wzorzecMpkDict.wierszNaglowkow);
        const zlikwidowane = wiersze.filter((w) => w[kolumny.kodMpk] === dane.znacznikLikwidacji);
        expect(wiersze.length - zlikwidowane.length, 'jednostki aktywne').toBeGreaterThan(0);
        expect(zlikwidowane.length, 'jednostki zlikwidowane (historia)').toBeGreaterThan(0);
        expect(
          zlikwidowane.filter((w) => !w[kolumny.kodSp]),
          'zlikwidowane bez „Kod jednostki sp”',
        ).toEqual([]);
        // Źródło (wzorzec od odbiorcy) też ma wiersze „_likw” bez daty likwidacji – EWI nie może ich mieć więcej.
        expect(
          zlikwidowane.filter((w) => !w[kolumny.dataLikwidacji]).length,
          'zlikwidowane bez „data likwidacji” (nie więcej niż we wzorcu)',
        ).toBeLessThanOrEqual(dane.tc49.zlikwidowaneBezDatyWeWzorcu);

        for (const mpk of dane.tc49.probkiMpk) {
          const wiersz = wiersze.find((w) => w[kolumny.kodMpk] === mpk);
          expect(wiersz, `jednostka ${mpk} w pliku`).toBeDefined();
          const rejestr = await dashboardPage.otworzRejestrJednostek();
          const karta = await rejestr.otworzKarteJednostki(mpk);
          await expect
            .soft(karta.pole(EtykietaPola.NazwaPelna), `${mpk}: NAZWA`)
            .toHaveText(wiersz?.[kolumny.nazwa] ?? '');
          await expect.soft(karta.pole(EtykietaPola.Ozsi), `${mpk}: O-ZSI`).toHaveText(wiersz?.[kolumny.ozsi] ?? '');
        }
      },
    );

    test(
      'TC-50 MPK_DICT – plik otwiera się w docelowym narzędziu',
      {
        tag: ['@TC-50', TAGI.priorytet.sredni, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e, '@KO-21.6'],
        annotation: {
          type: 'założenie',
          description:
            'P-11 / P-67: otwarcie w narzędziu odbiorcy weryfikowane manualnie; automat sprawdza, że plik jest poprawnym xlsx, PS ma 4 znaki z wiodącymi zerami (tekst), a polskie znaki są zachowane.',
        },
      },
      async ({ dashboardPage }, testInfo) => {
        // Arrange
        const raporty = await dashboardPage.otworzRaporty();

        // Act
        const plik = await zapiszPobranie(await raporty.pobierz(RaportStandardowy.MpkDict), testInfo);

        // Assert
        const wiersze = wierszeDanych(await czytajArkusz(plik), dane.wzorzecMpkDict.wierszNaglowkow);
        const zlePs = wiersze.map((w) => w[kolumny.ps] ?? '').filter((ps) => ps && !new RegExp(dane.formatPs).test(ps));
        expect(zlePs.slice(0, 10), 'PS z utraconymi wiodącymi zerami').toEqual([]);
        expect(
          wiersze.some((w) => /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(w[kolumny.nazwa] ?? '')),
          'polskie znaki w NAZWA',
        ).toBe(true);
      },
    );

    test(
      'TC-51 Temat 5013 – układ zgodny z obecnym plikiem',
      {
        tag: ['@TC-51', TAGI.priorytet.wysoki, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e, TAGI.kwalifikacja.regresja],
        annotation: ZALOZENIE_WZORCOW,
      },
      async ({ dashboardPage }, testInfo) => {
        // Arrange
        const { wierszNaglowkow, kolumny: kolumnyWzorca, arkusz: nazwaArkusza } = dane.wzorzecTemat5013;
        const raporty = await dashboardPage.otworzRaporty();
        const przedGenerowaniem = await raporty.wygenerowano(RaportStandardowy.Temat5013).innerText();

        // Act
        await raporty.generuj(RaportStandardowy.Temat5013);
        await expect(raporty.wygenerowano(RaportStandardowy.Temat5013)).toContainText(dzisiejszaDataIso(), {
          timeout: 180_000,
        });
        await expect(raporty.wygenerowano(RaportStandardowy.Temat5013)).not.toHaveText(przedGenerowaniem);
        const plik = await zapiszPobranie(await raporty.pobierz(RaportStandardowy.Temat5013), testInfo);

        // Assert
        const arkusz = await czytajArkusz(plik);
        expect(arkusz.nazwa).toBe(nazwaArkusza);
        expect(nazwyKolumn(arkusz.wiersze[wierszNaglowkow - 1]), 'nagłówki w wierszu 4').toEqual(kolumnyWzorca);
        const wiersze = wierszeDanych(arkusz, wierszNaglowkow);
        expect(wiersze.length, 'dane od wiersza 5').toBeGreaterThan(0);
        expect(
          wiersze.filter((w) => w[kolumny.kodMpk] === dane.znacznikLikwidacji),
          'wiersze „_likw”',
        ).toHaveLength(0);
        await expect(raporty.wygenerowano(RaportStandardowy.Temat5013)).toContainText(dzisiejszaDataIso());
      },
    );

    // eslint-disable-next-line playwright/expect-expect -- przypadek zablokowany (fixme), bez kroków do automatyzacji
    test(
      'TC-52 Temat 5013 – generowanie na wskazany dzień',
      {
        tag: ['@TC-52', TAGI.priorytet.sredni, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e, '@KO-21.4'],
        annotation: { type: 'założenie', description: 'PO-25: „Stan na dzień” dopuszcza datę wsteczną.' },
      },
      () => {
        // TODO [ZAŁOŻENIE]: po zmianie nazwy (TS_13 / TS_22) – ustawić „Stan na dzień” = D-1 i D, porównać NAZWA w obu plikach.
        test.fixme(
          true,
          'Brak danych: na dev nie ma zakończonej zmiany nazwy jednostki z datą obowiązywania D (wymaga obsługi zgłoszenia – TS_13 / TS_22).',
        );
      },
    );

    // eslint-disable-next-line playwright/expect-expect -- przypadek zablokowany (fixme), bez kroków do automatyzacji
    test(
      'TC-53 Zmiany OZSI – format zgodny z obecnym',
      { tag: ['@TC-53', TAGI.priorytet.sredni, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e] },
      () => {
        // TODO [ZAŁOŻENIE]: po dostarczeniu wzorca – nagłówki do JSON i asercja jak w TC-48.
        test.fixme(
          true,
          'P-11: brak wzorca pliku Zmiany OZSI zatwierdzonego przez grupę Parametryzacja produkcyjna ZSI.',
        );
      },
    );

    // eslint-disable-next-line playwright/expect-expect -- przypadek zablokowany (fixme), bez kroków do automatyzacji
    test(
      'TC-54 Rejestracja wykonania eksportu',
      { tag: ['@TC-54', TAGI.priorytet.niski, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e, '@KO-21.5'] },
      () => {
        test.fixme(
          true,
          'P-10 (18.11): rejestr eksportów jest w logach OutSystems na żądanie – weryfikacja manualna (wyciąg od administratora systemu).',
        );
      },
    );

    test(
      'TC-55 Informacja o pobraniu pliku',
      {
        tag: ['@TC-55', TAGI.priorytet.niski, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e],
        annotation: {
          type: 'założenie',
          description: 'P-11: konwencja nazwy „MPK_DICT_RRRRMMDD.xlsx” przyjęta z aplikacji (dev 18.11.2026).',
        },
      },
      async ({ dashboardPage }) => {
        // Arrange
        const raporty = await dashboardPage.otworzRaporty();

        // Act
        const pobranie = await raporty.pobierz(RaportStandardowy.MpkDict);

        // Assert
        expect(pobranie.suggestedFilename()).toMatch(new RegExp(dane.nazwaPlikuMpkDict));
      },
    );

    test(
      'TC-55 Informacja o pobraniu pliku – potwierdzenie w EWI',
      { tag: ['@TC-55', TAGI.priorytet.niski, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e] },
      async ({ dashboardPage }) => {
        test.fixme(
          true,
          'P-11: na dev (18.11.2026) EWI nie pokazuje potwierdzenia pobrania – treść i forma do ustalenia.',
        );

        // Arrange
        const raporty = await dashboardPage.otworzRaporty();

        // Act
        await raporty.pobierz(RaportStandardowy.MpkDict);

        // Assert
        // TODO [ZAŁOŻENIE]: treść potwierdzenia (P-11).
        await expect(raporty.komunikat).toBeVisible();
      },
    );

    test(
      'TC-56 Użytkownik podstawowy pobiera raport standardowy bez generowania dla odbiorców',
      {
        tag: ['@TC-56', TAGI.priorytet.wysoki, TAGI.rodzaj.negatywny, TAGI.warstwa.e2e, TAGI.kwalifikacja.regresja],
        annotation: {
          type: 'założenie',
          description:
            'Planowanie i „wyślij plik na skrzynkę Alnovy” są tylko w oknie „Generuj” – brak przycisku „Generuj” obejmuje też te akcje.',
        },
      },
      async ({ dashboardRoli }) => {
        // Arrange
        const dashboard = await dashboardRoli(Rola.UzytkownikPodstawowy);
        const raporty = await dashboard.otworzRaporty();

        // Act
        const wiersz = raporty.wierszRaportu(RaportStandardowy.MpkDict);

        // Assert
        // „Pobierz” widoczne = wiersz wyrenderowany, więc brak „Generuj” nie wynika z niezaładowanej tabeli.
        await expect(wiersz.getByRole('link', { name: 'Pobierz' })).toBeVisible();
        await expect(wiersz.getByRole('button', { name: 'Generuj' })).toHaveCount(0);
      },
    );
  },
);
