---
name: ewi-playwright
description: Zasady pisania, refaktoryzacji i review testów Playwright (TypeScript) dla aplikacji EWI (OutSystems) – POM, AAA, logowanie w fixture, dane stałe w .json, tagi, specyfika OutSystems. Używaj przy każdej pracy z testami w tym repozytorium.
---

# EWI – zasady testów Playwright

Działasz jak **senior Playwright developer / SDET**: najpierw rozumiesz, co testujesz (TS, TC, BR/KO), piszesz kod, który przejdzie code review, kwestionujesz złe praktyki i nie zgadujesz po cichu – brak informacji oznaczasz `// TODO [ZAŁOŻENIE]: ...` i wymieniasz w podsumowaniu.

Kontekst domenowy (role, statusy, walidacje, konflikty K-xx): dokument `EWI_Baza_wiedzy_do_testow.md` w projekcie EWI w claude.ai. Hierarchia źródeł przy konflikcie: [BR] v0.8 > decyzje z [FIG] (najpóźniejsza data) > [KO] > makiety; konflikt → `[ZAŁOŻENIE]` w kodzie.

## 1. Lokatory

OutSystems generuje dynamiczne ID (`b3-b1-Input_Nazwa`) – **nigdy** nie opieraj na nich selektorów. Kolejność:

1. `getByRole(role, { name })`
2. `getByLabel()`; przy niejednoznacznej etykiecie (np. „Password”) – `getByRole('textbox', { name })`
3. `getByText()` / `getByPlaceholder()`
4. `getByTestId()` – i zgłoś zespołowi potrzebę `data-testid` (TODO)
5. CSS/XPath – ostateczność, z komentarzem dlaczego (np. kontener etykiety bez powiązania w dostępności)

Zawężaj przez kontener zamiast `nth()`. Komórki tabel bez nazw – przez enum kolumn (`KolumnaJednostki`). Etykiety sprawdzaj na żywej aplikacji (Playwright MCP).

## 2. Stabilność

- Zakaz `waitForTimeout`, `setTimeout`, `force: true`, `page.$`, `elementHandle`.
- Tylko web-first assertions (`toHaveText`, `toHaveCount`, `toBeVisible`…), wartości liczone – `expect.poll`.
- Asercja ma być niespełniona dla stanu sprzed akcji (np. `toHaveCount(1)` / licznik wyników, a nie „wiersz istnieje”, bo przejdzie na starej liście).
- Po akcjach AJAX czekaj na wynik biznesowy, nie na `networkidle`.

## 3. Specyfika OutSystems (EWI)

- **Przejścia ekranów**: przez ok. 300 ms w DOM są dwa `.screen-container` (stary i nowy) – lokatory łapią elementy z obu ekranów (strict mode). Każde `expectLoaded()` woła `BasePage.poPrzejsciuEkranu()`. Karta jednostki to też osobny ekran.
- **Listy rozwijane** (`DropdownSearch`): wszystkie mają nazwę „Select an option”. Lokator przez najbliższy kontener etykiety (`PanelFiltrow.pole`), wybór: kliknięcie → pole „Search” → `option` (`exact: true`, `filter({ visible: true })`).
- **Panel boczny** (`complementary`): po zamknięciu jest w DOM z `aria-hidden` – stan sprawdzaj lokatorem po roli (np. przycisk „Zapisz zmiany”), nie `isVisible()` samego panelu.
- **Pamięć filtrów**: filtry i fraza Rejestru są w localStorage (`ClientVars UnitRegister_*`). Testy są izolowane nowym kontekstem; nie polegaj na stanie z poprzedniego testu.
- Komunikat pustej listy: „Brak jednostek dla podanych kryteriów.”

## 4. Page Object Model

- Lokatory jako pola `readonly` w konstruktorze + metody **intencji biznesowej** (`wyszukaj`, `ustaw(filtry)`), nie per kliknięcie.
- Asercje w testach; w Page Objectach tylko `expectLoaded()` (oraz czekanie na zakończenie własnej akcji, np. zamknięcie panelu).
- Nawigacja zwraca kolejny Page Object; powtarzalne elementy = komponenty; dziedziczenie tylko `BasePage` → strona.
- **JSDoc** dla każdej publicznej klasy, metody i fixture (`@param`, `@returns`), opis intencji – bez oczywistości.

## 5. Nazewnictwo (standard TypeScript)

PascalCase: klasy, interfejsy, typy, enumy (i ich wartości). camelCase: zmienne, metody, właściwości, fixtures, klucze .json. UPPER_SNAKE_CASE: niezmienne stałe modułowe. kebab-case: pliki (`rejestr-jednostek.page.ts`, `ts03-filtrowanie-listy-jednostek.spec.ts`). Nazwy domenowe po polsku bez diakrytyków.

## 6. Logowanie i role – tylko fixture

- Logowanie wykonuje fixture workera `sesjaRoli` (`src/fixtures/index.ts`): raz na worker, sesja w `playwright/.auth/<rola>-<worker>.json`, każdy test w nowym kontekście z tą sesją. Nigdy w teście, `beforeAll`/`beforeEach` ani projekcie `setup`.
- Nieudane logowanie lub brak danych w `.env` = błąd (nie skip).
- Rola na poziomie pliku spec, przed `describe`: `test.use({ rola: Rola.Administrator });` (opcja workera nie może być w `describe`).
- Ekran logowania testujemy osobnym scenariuszem bez sesji (`test.use({ storageState: { cookies: [], origins: [] } })`).
- Testy wieloosobowe: dodatkowy `BrowserContext` z sesją drugiej roli, nie wylogowanie.

## 7. Dane testowe

- `src/data/json/tsXX-<nazwa>.json` – **tylko dane stałe**: wartości pól, identyfikatory istniejących jednostek (tylko odczyt), oczekiwane komunikaty/statusy, opcje filtrów, limity, parametry generowania. Klucze camelCase.
- Nie w .json: daty (od dziś, Europe/Warsaw), unikalne nazwy/identyfikatory tworzonych danych, numery zgłoszeń, loginy, hasła.
- Import: `import * as tsXXDane from '…json';` + `const dane: DaneTsXX = tsXXDane;` (interfejs w `src/data/types`).
- Liczby wyników zależne od danych dev oznacz adnotacją `założenie` (stan po migracji z datą).

## 8. Struktura testu

- Jeden plik = jeden scenariusz; `test.describe('TS_XX – <nazwa>')` = scenariusz, `test('TC-XX <nazwa>')` = przypadek.
- **AAA tylko komentarzami** `// Arrange`, `// Act`, `// Assert` – **bez `test.step`** (AAA to wewnętrzna struktura testu, nie element raportu).
- Arrange = ZAKŁADAJĄC (dane, przejście na ekran; zalogowanie zapewnia fixture), Act = KIEDY (jedna akcja biznesowa), Assert = WTEDY (asercje).
- `[ZAŁOŻENIE]` → `annotation: { type: 'założenie', description }`; zablokowane przez K-xx → `test.fixme(true, 'K-07: …')`.
- Walidacje parametryzuj danymi z .json (`for (const przypadek of dane.przypadki) test(…)`).

```ts
const dane: DaneTs01 = ts01Dane;

test.use({ rola: Rola.Administrator });

test.describe('TS_01 – Wyszukiwanie jednostek po nazwie', { tag: ['@TS_01', '@BR-KAT-01'] }, () => {
  test(
    'TC-01 Wyszukiwanie po pełnej nazwie jednostki',
    { tag: ['@TC-01', TAGI.priorytet.wysoki, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e, TAGI.kwalifikacja.smoke] },
    async ({ dashboardPage }) => {
      // Arrange
      const { pelnaNazwa } = dane.tc01;
      const rejestr = await dashboardPage.otworzRejestrJednostek();

      // Act
      await rejestr.wyszukaj(pelnaNazwa);

      // Assert
      await expect(rejestr.tabela.wiersze).toHaveCount(1);
    },
  );
});
```

## 9. Tagi (z `TAGI` w `src/data/tagi.ts`)

Obowiązkowe: `@TS_XX` (na describe), `@TC-XX`, priorytet `@P1`/`@P2`/`@P3` (Wysoki/Średni/Niski z „Kwalifikacji”), `@pozytywny`/`@negatywny` (Brzegowy → wg oczekiwanego wyniku), `@e2e`/`@api`. Opcjonalne: `@BR-…`, `@KO-…`, `@smoke`, `@regresja`.

## 10. Checklista przed oddaniem

- [ ] Brak `waitForTimeout`, `force`, selektorów po ID OutSystems; asercje web-first i odporne na stary stan.
- [ ] `expectLoaded()` nowych ekranów czeka na koniec przejścia.
- [ ] JSDoc publicznego API; nazewnictwo wg sekcji 5.
- [ ] Logowanie tylko przez fixture; rola `test.use` na poziomie pliku.
- [ ] describe = TS, test = TC; AAA komentarzami, bez `test.step`; tagi komplet.
- [ ] Dane stałe w .json, import `import * as` + typ.
- [ ] Brak duplikacji (≥ 2 razy → POM / komponent / fixture); testy niezależne i równoległe.
- [ ] `npm run typecheck`, `npm run lint`, `npm run format:check` czyste; testy scenariusza uruchomione na dev.
