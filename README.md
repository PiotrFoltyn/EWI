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

| Katalog            | Zawartość                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------- |
| `src/pages`        | Page Objecty (`LoginPage`, `DashboardPage`, `RejestrJednostekPage`, `KartaJednostkiPage`) |
| `src/components`   | `MenuGlowne`, `TabelaJednostek`, `PanelFiltrow`                                           |
| `src/fixtures`     | `test` z opcją `rola`, logowaniem (`sesjaRoli`) i `dashboardPage`                         |
| `src/data/json`    | dane stałe scenariuszy (import `import * as`)                                             |
| `src/data/types`   | interfejsy danych z `.json`                                                               |
| `src/data/tagi.ts` | słownik tagów                                                                             |
| `tests/e2e`        | specyfikacje: jeden plik = jeden scenariusz                                               |

## Pokrycie

| Scenariusz                             | Przypadki     | Plik                                                              |
| -------------------------------------- | ------------- | ----------------------------------------------------------------- |
| TS_01 Wyszukiwanie jednostek po nazwie | TC-01 – TC-04 | `tests/e2e/rejestr/ts01-wyszukiwanie-po-nazwie.spec.ts`           |
| TS_02 Wyszukiwanie po MPK, PS, O-ZSI   | TC-05 – TC-09 | `tests/e2e/rejestr/ts02-wyszukiwanie-po-identyfikatorach.spec.ts` |
| TS_03 Filtrowanie listy jednostek      | TC-10 – TC-16 | `tests/e2e/rejestr/ts03-filtrowanie-listy-jednostek.spec.ts`      |

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
- Filtry i fraza wyszukiwania Rejestru są pamiętane w localStorage przeglądarki; testy są od siebie niezależne, bo każdy dostaje nowy kontekst.
- OutSystems animuje przejścia między ekranami (przez chwilę w DOM są dwa ekrany). Page Objecty czekają na koniec przejścia (`BasePage.poPrzejsciuEkranu`).
