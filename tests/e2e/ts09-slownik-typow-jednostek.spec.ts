import { KolumnaSlownika, Slownik, type SlownikComponent } from '../../src/components/slownik.component';
import { pobierzKonto } from '../../src/config/konta';
import { zbudujPozycjeSlownika } from '../../src/data/builders/pozycja-slownika.builder';
import * as ts09Dane from '../../src/data/json/ts09-slownik-typow-jednostek.json';
import { Rola } from '../../src/data/rola';
import { TAGI } from '../../src/data/tagi';
import type { DaneTs09, PozycjaSlownika } from '../../src/data/types/zarzadzanie.types';
import { expect, test } from '../../src/fixtures';
import type { DashboardPage } from '../../src/pages/dashboard.page';
import { ADRES_ZARZADZANIA } from '../../src/pages/zarzadzanie.page';
import { dzisiejszaDataIso, escapujRegex, wzorzecLacznejLiczbyWynikow } from '../../src/utils/wzorce';

const dane: DaneTs09 = ts09Dane;

// TC-39 – TC-45 i TC-47 są dla Administratora; TC-46 – Użytkownik podstawowy w osobnym kontekście (`dashboardRoli`).
test.use({ rola: Rola.Administrator });

const ZALOZENIE_SLOWNIKA = {
  type: 'założenie',
  description:
    'K-09 / P-09: „słownik typów” = zakładka „Typ jednostki” w Zarządzanie → Słowniki SAP (jedyny edytowalny słownik na dev 16.11.2026). Tworzone pozycje mają unikalny kod i nazwę z buildera; nie da się ich usunąć – zostają w słowniku dev.',
};

const POZA_SLOWNIKIEM =
  'K-09: słownik „Typ jednostki” na dev zawiera typy regionalne (Centrala, Jednostka specjalistyczna…), a nie typy z Rejestru (KOC, SJO, Pion) – czeka na decyzję analityka.';

/** Nowa, unikalna pozycja słownika typów (dane stałe z JSON, unikalność z buildera). */
const nowyTyp = (): PozycjaSlownika => zbudujPozycjeSlownika(dane.prefiksNazwyTypu, dane.zastosowanieTypu);

/**
 * Otwiera słownik „Typ jednostki” w panelu Zarządzanie.
 * @param dashboardPage - dashboard zalogowanego Administratora
 * @returns załadowany słownik typów
 */
async function otworzSlownikTypow(dashboardPage: DashboardPage): Promise<SlownikComponent> {
  return (await dashboardPage.otworzZarzadzanie()).otworzSlownik(Slownik.TypJednostki);
}

test.describe(
  'TS_09 – Zarządzanie słownikiem typów jednostek',
  { tag: ['@TS_09', '@BR-ADM-02', '@BR-SAP-03', '@KO-22.1', '@KO-22.2', '@KO-22.3', '@KO-19.5'] },
  () => {
    test(
      'TC-39 Dodanie typu jednostki do słownika',
      {
        tag: ['@TC-39', TAGI.priorytet.wysoki, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e, TAGI.kwalifikacja.regresja],
        annotation: ZALOZENIE_SLOWNIKA,
      },
      async ({ dashboardPage }) => {
        // Arrange
        const typ = nowyTyp();
        const slownik = await otworzSlownikTypow(dashboardPage);

        // Act
        await slownik.dodaj(typ);

        // Assert
        await slownik.wyszukaj(typ.kod);
        await expect(slownik.licznik).toHaveText(wzorzecLacznejLiczbyWynikow(1));
        await expect(slownik.komorkaPozycji(typ.kod, KolumnaSlownika.Nazwa)).toHaveText(typ.nazwa);
        await expect(slownik.komorkaPozycji(typ.kod, KolumnaSlownika.Aktywna)).toHaveText(dane.aktywnaTak);
      },
    );

    test(
      'TC-39 Dodanie typu jednostki do słownika – dostępność w filtrze typu Rejestru',
      {
        tag: ['@TC-39', TAGI.priorytet.wysoki, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e, TAGI.kwalifikacja.regresja],
        annotation: ZALOZENIE_SLOWNIKA,
      },
      async ({ dashboardPage }) => {
        test.fixme(
          true,
          `Wykryty bug: Pozycja ze słownika nie pojawia się w filtrze typu Rejestru (P-09: słownik typów = zakładka „Typ jednostki” w Zarządzanie → Słowniki SAP).`,
        );
        // Arrange
        const typ = nowyTyp();
        const slownik = await otworzSlownikTypow(dashboardPage);
        await slownik.dodaj(typ);
        const rejestr = await dashboardPage.otworzRejestrJednostek();

        // Act
        const opcja = await rejestr.filtry.wyszukajOpcje('typJednostki', typ.nazwa);

        // Assert
        await expect(opcja).toBeVisible();
      },
    );

    test(
      'TC-40 Edycja nazwy typu jednostki',
      {
        tag: ['@TC-40', TAGI.priorytet.wysoki, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e, TAGI.kwalifikacja.regresja],
        annotation: ZALOZENIE_SLOWNIKA,
      },
      async ({ dashboardPage }) => {
        // Arrange
        const typ = nowyTyp();
        const nowaNazwa = typ.nazwa + dane.przyrostekNowejNazwy;
        const slownik = await otworzSlownikTypow(dashboardPage);
        await slownik.dodaj(typ);
        await slownik.wyszukaj(typ.kod);
        await expect(slownik.licznik).toHaveText(wzorzecLacznejLiczbyWynikow(1));

        // Act
        await slownik.edytuj(typ.kod, { nazwa: nowaNazwa });

        // Assert
        // Kod i nazwa są unikalne (builder), więc jedyny wiersz kodu potwierdza też brak starej nazwy w słowniku.
        await expect(slownik.komorkaPozycji(typ.kod, KolumnaSlownika.Nazwa)).toHaveText(nowaNazwa);
        await expect(slownik.wierszeONazwie(typ.nazwa)).toHaveCount(0);
      },
    );

    test(
      'TC-41 Dezaktywacja nieużywanego typu jednostki',
      {
        tag: ['@TC-41', TAGI.priorytet.sredni, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e],
        annotation: [
          ZALOZENIE_SLOWNIKA,
          { type: 'założenie', description: 'P-09: likwidacja = odznaczenie „Pozycja aktywna” w edycji pozycji.' },
          { type: 'uwaga', description: `Dostępność w filtrze typu nie jest sprawdzana – ${POZA_SLOWNIKIEM}` },
        ],
      },
      async ({ dashboardPage }) => {
        // Arrange
        const typ = nowyTyp();
        const slownik = await otworzSlownikTypow(dashboardPage);
        await slownik.dodaj(typ);
        await slownik.wyszukaj(typ.kod);
        await expect(slownik.komorkaPozycji(typ.kod, KolumnaSlownika.Aktywna)).toHaveText(dane.aktywnaTak);

        // Act
        await slownik.edytuj(typ.kod, { aktywna: false });

        // Assert
        await expect(slownik.komorkaPozycji(typ.kod, KolumnaSlownika.Aktywna)).toHaveText(dane.aktywnaNie);
        await expect(slownik.licznik).toHaveText(wzorzecLacznejLiczbyWynikow(1));
      },
    );

    test(
      'TC-42 Blokada likwidacji typu używanego przez jednostki',
      {
        tag: [
          '@TC-42',
          TAGI.priorytet.wysoki,
          TAGI.rodzaj.negatywny,
          TAGI.warstwa.e2e,
          TAGI.kwalifikacja.regresja,
          '@KO-22.3',
          '@KO-19.5',
        ],
        annotation: ZALOZENIE_SLOWNIKA,
      },
      async ({ dashboardPage }) => {
        // Nie próbujemy dezaktywować prawdziwej pozycji na współdzielonym dev – przy braku blokady zmieniłoby to dane.
        test.fixme(
          true,
          `${POZA_SLOWNIKIEM} Brak typu „KOC” w słowniku i informacji, które pozycje są używane przez jednostki; treść komunikatu – P-04.`,
        );

        // Arrange
        const slownik = await otworzSlownikTypow(dashboardPage);
        // TODO [ZAŁOŻENIE]: kod pozycji używanej przez jednostki – po decyzji K-09.
        const kodUzywanego = '';
        await slownik.wyszukaj(kodUzywanego);

        // Act
        await slownik.edytuj(kodUzywanego, { aktywna: false });

        // Assert
        // TODO [ZAŁOŻENIE]: asercja komunikatu o typie w użyciu (P-04).
        await expect(slownik.komorkaPozycji(kodUzywanego, KolumnaSlownika.Aktywna)).toHaveText(dane.aktywnaTak);
      },
    );

    test(
      'TC-43 Dodanie typu o istniejącej nazwie',
      {
        tag: ['@TC-43', TAGI.priorytet.sredni, TAGI.rodzaj.negatywny, TAGI.warstwa.e2e],
        annotation: [
          ZALOZENIE_SLOWNIKA,
          {
            type: 'założenie',
            description:
              'P-09: unikalność sprawdzana na pozycji utworzonej w Arrange (zamiast „SJO”, którego nie ma w słowniku) – ten sam kod i nazwa. EWI sprawdza unikalność KODU (komunikat z dev 16.11.2026); unikalność samej nazwy – do potwierdzenia.',
          },
        ],
      },
      async ({ dashboardPage }) => {
        // Arrange
        const typ = nowyTyp();
        const slownik = await otworzSlownikTypow(dashboardPage);
        await slownik.dodaj(typ);

        // Act
        await slownik.sprobujDodac(typ);

        // Assert
        await expect(slownik.komunikat.filter({ hasText: dane.komunikatDuplikatu })).toBeVisible();
        await expect(slownik.okno).toBeVisible();
        await slownik.anuluj();
        await slownik.wyszukaj(typ.kod);
        // Licznik „… z 1” nie jest spełniony przez listę sprzed wyszukania (pełny słownik).
        await expect(slownik.licznik).toHaveText(wzorzecLacznejLiczbyWynikow(1));
      },
    );

    test(
      'TC-44 Zapis typu bez nazwy',
      {
        tag: ['@TC-44', TAGI.priorytet.sredni, TAGI.rodzaj.negatywny, TAGI.warstwa.e2e, '@KO-19.1', '@KO-19.5'],
        annotation: { type: 'założenie', description: 'Nazwa jest polem obowiązkowym (formularz: „Nazwa*”).' },
      },
      async ({ dashboardPage }) => {
        // Arrange
        const typ = nowyTyp();
        const slownik = await otworzSlownikTypow(dashboardPage);

        // Act
        await slownik.sprobujDodac({ ...typ, nazwa: '' });

        // Assert
        await expect(slownik.okno.getByText(dane.komunikatWymaganegoPola)).toHaveCount(1);
        await expect(slownik.okno).toBeVisible();
        await slownik.anuluj();
        await slownik.wyszukaj(typ.kod);
        await expect(slownik.komunikatBrakuDanych).toBeVisible();
        await expect(slownik.wiersz(typ.kod)).toHaveCount(0);
      },
    );

    test(
      'TC-45 Rejestracja zmian słownika',
      {
        tag: [
          '@TC-45',
          TAGI.priorytet.sredni,
          TAGI.rodzaj.pozytywny,
          TAGI.warstwa.e2e,
          TAGI.kwalifikacja.regresja,
          '@KO-22.2',
        ],
        annotation: [
          ZALOZENIE_SLOWNIKA,
          {
            type: 'założenie',
            description:
              'P-10: rejestr zmian w UI = kolumna „Ostatnia zmiana (data, osoba)” pozycji; pełna historia operacji – logi OutSystems (poza zakresem testu). Dodania i edycji w tej samej minucie nie da się rozróżnić po dacie – zakres zmiany potwierdza nowa nazwa.',
          },
        ],
      },
      async ({ dashboardPage }) => {
        // Arrange
        const typ = nowyTyp();
        const nowaNazwa = typ.nazwa + dane.przyrostekNowejNazwy;
        const login = pobierzKonto(Rola.Administrator).login;
        const slownik = await otworzSlownikTypow(dashboardPage);
        await slownik.dodaj(typ);
        await slownik.wyszukaj(typ.kod);
        await expect(slownik.licznik).toHaveText(wzorzecLacznejLiczbyWynikow(1));

        // Act
        await slownik.edytuj(typ.kod, { nazwa: nowaNazwa });

        // Assert
        await expect(slownik.komorkaPozycji(typ.kod, KolumnaSlownika.Nazwa)).toHaveText(nowaNazwa);
        await expect(slownik.komorkaPozycji(typ.kod, KolumnaSlownika.OstatniaZmiana)).toHaveText(
          new RegExp(`^${dzisiejszaDataIso()} \\d{2}:\\d{2}, ${escapujRegex(login)}$`),
        );
      },
    );

    test(
      'TC-46 Brak dostępu do słownika dla Użytkownika podstawowego',
      {
        tag: [
          '@TC-46',
          TAGI.priorytet.wysoki,
          TAGI.rodzaj.negatywny,
          TAGI.warstwa.e2e,
          TAGI.kwalifikacja.regresja,
          '@KO-4.3',
          '@KO-4.6',
        ],
        annotation: {
          type: 'założenie',
          description:
            'P-04: „informacja o braku uprawnień” = standardowy ekran OutSystems InvalidPermissions (komunikat po angielsku, dev 19.11.2026).',
        },
      },
      async ({ dashboardRoli }) => {
        // Arrange
        const dashboard = await dashboardRoli(Rola.UzytkownikPodstawowy);
        const page = dashboard.page;
        // Menu wyrenderowane (pozycja dostępna dla roli) – dopiero wtedy brak „Zarządzanie” coś znaczy.
        await expect(dashboard.menu.rejestrJednostek).toBeVisible();
        await expect(dashboard.menu.zarzadzanie).toHaveCount(0);

        // Act
        await page.goto(ADRES_ZARZADZANIA);

        // Assert
        await expect(page).toHaveURL(new RegExp(`/${dane.adresBrakuUprawnien}$`));
        await expect(page.getByText(dane.komunikatBrakuUprawnien)).toBeVisible();
        await expect(page.getByRole('tab', { name: 'Słowniki', exact: true })).toHaveCount(0);
      },
    );

    test(
      'TC-47 Słowniki pobierane z SAP są tylko do odczytu',
      {
        tag: ['@TC-47', TAGI.priorytet.sredni, TAGI.rodzaj.negatywny, TAGI.warstwa.e2e],
        annotation: {
          type: 'założenie',
          description:
            'K-09: sprawdzany słownik regionów (zgodny z BR-SAP-03 i [FIG] 27.10). Likwidacja w tym panelu = edycja pozycji, więc brak „Edytuj” obejmuje też likwidację.',
        },
      },
      async ({ dashboardPage }) => {
        // Arrange
        const zarzadzanie = await dashboardPage.otworzZarzadzanie();

        // Act
        const slownik = await zarzadzanie.otworzSlownik(Slownik.KodRegionu);

        // Assert
        await expect(slownik.wiersze.first()).toBeVisible();
        await expect(slownik.przyciskDodaj).toHaveCount(0);
        await expect(slownik.linkiEdytuj).toHaveCount(0);
      },
    );
  },
);
