# EWI – testy automatyczne (Playwright + TypeScript)

Testy e2e aplikacji EWI. Konwencje: skill `ewi-playwright` (POM, AAA, `describe` = scenariusz TS, `test` = przypadek TC, dane stałe w `.json`, tagi).

## Uruchomienie

```bash
npm install
npx playwright install chromium
cp .env.example .env   # uzupełnij loginy i hasła ról
npm test               # wszystkie testy
npm run test:smoke     # tylko @smoke
npx playwright test --grep "@TS_01"
npm run report         # raport HTML
```

Logowanie jest automatyczne: fixture `sesjaRoli` (`src/fixtures/index.ts`) loguje się raz na worker kontem roli ustawionej w `test.use({ rola })` i przekazuje sesję wszystkim testom workera. Brak loginu/hasła roli w `.env` kończy test błędem z informacją, czego brakuje.

Jakość kodu: `npm run typecheck`, `npm run lint`, `npm run format:check`.

## Struktura

| Katalog            | Zawartość                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| `src/pages`        | Page Objecty (`LoginPage`, `DashboardPage`, `RejestrJednostekPage`, `KartaJednostkiPage`, `ZarzadzaniePage`) |
| `src/components`   | `MenuGlowne`, `TabelaJednostek`, `PanelFiltrow`, `SlownikComponent`                                          |
| `src/fixtures`     | `test` z opcją `rola`, logowaniem (`sesjaRoli`) i `dashboardPage`                                            |
| `src/data/json`    | dane stałe scenariuszy (import `import * as`)                                                                |
| `src/data/types`   | interfejsy danych z `.json`                                                                                  |
| `src/data/tagi.ts` | słownik tagów                                                                                                |
| `tests/e2e`        | specyfikacje (płasko, bez podfolderów): jeden plik = jeden scenariusz                                        |

## Pokrycie

| Scenariusz                             | Przypadki     | Plik                                                        |
| -------------------------------------- | ------------- | ----------------------------------------------------------- |
| TS_01 Wyszukiwanie jednostek po nazwie | TC-01 – TC-04 | `tests/e2e/ts01-wyszukiwanie-po-nazwie.spec.ts`             |
| TS_02 Wyszukiwanie po MPK, PS, O-ZSI   | TC-05 – TC-09 | `tests/e2e/ts02-wyszukiwanie-po-identyfikatorach.spec.ts`   |
| TS_03 Filtrowanie listy jednostek      | TC-10 – TC-16 | `tests/e2e/ts03-filtrowanie-listy-jednostek.spec.ts`        |
| TS_04 Prezentacja danych na karcie     | TC-17 – TC-22 | `tests/e2e/ts04-prezentacja-danych-karty-jednostki.spec.ts` |
| TS_05 Nawigacja w strukturze           | TC-23 – TC-26 | `tests/e2e/ts05-nawigacja-w-strukturze.spec.ts`             |
| TS_06 Historia zmian jednostki         | TC-27 – TC-30 | `tests/e2e/ts06-historia-zmian-jednostki.spec.ts`           |
| TS_09 Słownik typów jednostek          | TC-39 – TC-47 | `tests/e2e/ts09-slownik-typow-jednostek.spec.ts`            |

## CI (GitHub Actions)

`.github/workflows/playwright.yml` – dwa joby:

1. **quality** – `typecheck`, `lint`, `format:check`.
2. **test** – testy e2e w Chromium (na CI `workers: 1`, `retries: 2`). Raport HTML i `test-results/` jako artefakt.

Uruchomienie ręczne (_Run workflow_) przyjmuje filtr tagów, np. `@smoke`, `@P1`, `@TS_01`.

Wymagana konfiguracja repozytorium (Settings → Secrets and variables → Actions):

| Nazwa                                                 | Typ      | Wartość                                                 |
| ----------------------------------------------------- | -------- | ------------------------------------------------------- |
| `EWI_BASE_URL`                                        | variable | adres środowiska (puste = dev z `playwright.config.ts`) |
| `EWI_ADMINISTRATOR_LOGIN` / `EWI_ADMINISTRATOR_HASLO` | secret   | konto Administratora                                    |
| `EWI_UZYTKOWNIK_PODSTAWOWY_LOGIN` / `_HASLO`          | secret   | konto Użytkownika podstawowego (gdy dostępne)           |

## Playwright MCP (VS Code)

`.vscode/mcp.json` uruchamia serwer `@playwright/mcp` – służy do podglądu ekranów i weryfikacji lokatorów na żywej aplikacji przed pisaniem testów.

## Claude Code

Repozytorium jest przygotowane do pracy w Claude Code (zakładka **Code** w aplikacji Claude albo CLI `claude`).

| Plik                                | Rola                                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `CLAUDE.md`                         | kontekst projektu: komendy, struktura, zasady, definicja „gotowe”                                      |
| `.claude/skills/ewi-playwright/`    | standard pisania testów (stosowany automatycznie)                                                      |
| `.claude/skills/nowy-scenariusz/`   | `/nowy-scenariusz TS_04` – automatyzacja scenariusza od arkusza do zielonego testu                     |
| `.claude/agents/reviewer-testow.md` | agent code review według standardu                                                                     |
| `.claude/settings.json`             | uprawnienia (npm/playwright bez pytania, `.env` zablokowany) i hook Prettier + ESLint po każdej edycji |
| `.mcp.json`                         | serwer Playwright MCP do podglądu ekranów                                                              |
| `scripts/scenariusz.mjs`            | `npm run scenariusz -- TS_04` – przypadki scenariusza z arkusza (ścieżka w `EWI_SCENARIUSZE_PLIK`)     |

Konfiguracja lokalna: skopiuj `.claude/settings.local.json.example` do `.claude/settings.local.json` (dostęp do folderów Scenariusze i Documentation) i dopisz `EWI_SCENARIUSZE_PLIK` do `.env`.

## Założenia i otwarte punkty

- Scenariusze są dla roli „Użytkownik podstawowy”. Do czasu założenia konta testy działają jako Administrator (`test.use({ rola: Rola.Administrator })`).
- Dane testowe to istniejące jednostki ze środowiska dev (stan 12.11.2026). Rejestr jest tylko do odczytu, więc wartości są stałe. Po ponownej migracji sprawdź `src/data/json`.
- TC-09 (fragment MPK) jest oznaczony `test.fixme` – K-07 / P-03. Na dev identyfikatory są wyszukiwane tylko dokładnie.
- TC-03: treść komunikatu „Brak jednostek dla podanych kryteriów.” przyjęta z aplikacji (P-04).
- Komórki tabeli nie mają nazw dostępności – kolumny wskazywane po pozycji (`KolumnaJednostki`). Rekomendacja: `data-testid` w OutSystems.
- TS_03: oczekiwane liczby wyników (KOC 443, pion PBE 27, region „1” 96, SJO + „departament” 10) to stan dev po migracji (12.11.2026) – po zmianie danych zaktualizuj `src/data/json/ts03-filtrowanie-listy-jednostek.json`.
- TS_03: pion i region nie są kolumnami listy – TC-11 i TC-12 sprawdzają je na kartach 3 pierwszych jednostek z wyniku.
- TS_03 / TC-13: brak przełącznika „tylko zlikwidowane” – użyty filtr Status = „Zlikwidowana” (K-05 / P-05).
- TS_03 / TC-14: na dev wszystkie SJO mają region „Z”, więc region nie zawęża wyniku dla SJO.
- TS_04: dane to jednostki dev po imporcie 12.11.2026 (stan 13.11.2026): KOC `Y2D10000` (komplet danych, statystyczna `Y2D19700`), pośrednik bez PS `A1710P03`, zlikwidowana `AA140P18`. Po ponownym zasileniu sprawdź `src/data/json/ts04-prezentacja-danych-karty-jednostki.json`.
- TS_04 / TC-17: wartości „ze źródła” są przepisane z wiersza MPK_DICT do JSON – pliku MPK_DICT nie ma w repozytorium (TODO: czytać wprost z pliku).
- TS_04 / P-01: puste pole karty to „Nie występuje”, a na liście Rejestru „—” (TC-21 traktuje je jako tę samą wartość); pola nieadekwatne dla typu (NIP, PID / CIF dla KOC) – „Nie dotyczy”. Pola opcjonalne przyjęte jako PS i „Statystyczna”. Powiązanie KOC ze statystyczną (TC-22) to pole „Statystyczna” + wiersz w tabeli komórek MPK; JO2 = 97 sprawdzany na pozycjach 5–6 MPK.
- TS_04: od 16.11.2026 karta ma pola „NIP” i „PID / CIF”, a tabela komórek MPK zamiast kolumny JO2 pokazuje „Status” – testy dopasowane do tego stanu.
- TS_04 / TC-20: okres obowiązywania = „Data utworzenia” – „Data likwidacji” (jednostka aktywna nie ma pola „Data likwidacji”). Na dev „Data utworzenia” to data importu, więc dla zlikwidowanych jest późniejsza niż data likwidacji (np. `AA140P18`: 12.11.2026 vs 24.12.2018) – do wyjaśnienia z analitykiem.
- Karta jednostki: pola, nazwa w nagłówku i znaczniki typu/statusu nie mają ról ani powiązań w dostępności – lokatory używają klas OutSystems UI (`.card`, `.font-size-s`, `span.heading1`, `.tag`). Rekomendacja: `data-testid`.
- TS_05: dane = stan dev po imporcie 13.11.2026 (partia 72) – Pion Instytucjonalnej Bankowości Zagranicznej (`Y4D00300`) z 2 podrzędnymi (`Y0AD0000`, `Y2D10000`). Na karcie pionu tabela komórek MPK w sekcji „Umiejscowienie i struktura jednostki” to jego jednostki podrzędne (plus własna komórka pionu); nadrzędne – ścieżka Obszar › Pion › jednostka (P-06).
- TS_05 / P-06: poza pionem (KOC, oddział, pośrednik) ta tabela pokazuje grupę MPK o wspólnym prefiksie, a nie jednostki podrzędne – np. KOC `Y0AD0000` zawiera `Y0910000` z innego pionu, a `Y2D10000` zlikwidowane departamenty bez ścieżki struktury. Dlatego TC-23 – TC-25 używają pionu; do wyjaśnienia z analitykiem (możliwy defekt).
- TS_05 / TC-26 jest `test.fixme` (P-06): karta jednostki bez podrzędnych (np. `A1710P03`) pokazuje w sekcji struktury grupę MPK „A1710…” (84 pozycje całego Oddziału 1 w Głogowie).
- TS_06 / TC-27, TC-28 są `test.fixme`: po imporcie każda jednostka ma tylko wpis „Utworzenie / Import” – potrzebna jednostka zmieniona zgłoszeniami (≥ 2 zmiany, różne osoby; zmiana administratora). Uzupełnij MPK i login w `src/data/json/ts06-historia-zmian-jednostki.json`.
- TS_06 / TC-29 jest `test.fixme` (P-08): migracja tworzy wpis „Utworzenie / Import” w historii, a przyjęta odpowiedź to „Nie”; treść komunikatu o braku historii nieznana.
- TS_06: kolejność historii od najnowszej (P-07); wartość poprzednia/nowa (KO 18.2, K-08) nie jest sprawdzana – brak w makiecie.
- TS_09 / K-09: „słownik typów” to zakładka „Typ jednostki” w Zarządzanie (`/EWI/Managment`) → Słowniki SAP – jedyny edytowalny słownik (dodanie, edycja, „Pozycja aktywna”). Zawiera typy regionalne (Centrala, Jednostka specjalistyczna…), a nie typy z Rejestru (KOC, SJO, Pion) – dlatego TC-39 (filtr typu w Rejestrze) i TC-42 (blokada dla „KOC”) są `test.fixme`, a TC-43 sprawdza duplikat na pozycji utworzonej w teście.
- TS_09: testy tworzą pozycje z unikalnym kodem (`T…`) i nazwą „Typ testowy …” (builder `src/data/builders`). Pozycji nie da się usunąć – zostają w słowniku dev (część jako nieaktywne).
- TS_09 / P-09: EWI pilnuje unikalności kodu („W słowniku tego typu istnieje już pozycja zawierająca ten kod.”); unikalność samej nazwy – do potwierdzenia. Komunikat pola wymaganego jest po angielsku („This field is required.”).
- TS_09 / P-10: rejestr zmian w UI = kolumna „Ostatnia zmiana (data, osoba)”; TC-45 sprawdza dzisiejszą datę i login Administratora.
- TS_09 / TC-46 jest `test.fixme`: brak konta „Użytkownik podstawowy” (test wymaga sesji drugiej roli). TC-47 sprawdza słownik „Kod regionu” (brak „Dodaj” i „Edytuj”).
- Środowisko dev (16.11.2026) bywa niestabilne: logowanie kończy się czasem „The connection has timed out”, a słowniki ładują się do kilkudziesięciu sekund – lokalnie uruchamiaj z `--retries=1`.
- Filtry i fraza wyszukiwania Rejestru są pamiętane w localStorage przeglądarki; testy są od siebie niezależne, bo każdy dostaje nowy kontekst.
- OutSystems animuje przejścia między ekranami (przez chwilę w DOM są dwa ekrany). Page Objecty czekają na koniec przejścia (`BasePage.poPrzejsciuEkranu`).
