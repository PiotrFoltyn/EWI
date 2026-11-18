# EWI – testy automatyczne Playwright

Testy e2e aplikacji EWI (OutSystems, PKO BP) – parametryzacja jednostek: PS, MPK, O-ZSI.
Stos: `@playwright/test` + TypeScript (strict, CommonJS), ESLint, Prettier.

## Komendy

- `npm run typecheck` – kompilacja TypeScript
- `npm run lint` – ESLint
- `npm run format` / `npm run format:check` – Prettier
- `npx playwright test --grep "@TS_03"` – testy jednego scenariusza (tagi: `@TS_XX`, `@TC-XX`, `@P1`–`@P3`, `@smoke`, `@regresja`)
- `npx playwright test --list` – lista testów bez uruchamiania
- `npm run scenariusz -- TS_04` – przypadki testowe scenariusza z arkusza (Markdown)

## Środowisko

- Aplikacja dev: `https://sourceful-dev.outsystemscloud.com/EWI/` (adres w `EWI_BASE_URL`).
- Loginy i hasła ról są w `.env` (`EWI_<ROLA>_LOGIN` / `_HASLO`). **Nie czytaj, nie edytuj i nie wypisuj `.env`.** Wzór: `.env.example`.
- Logowanie wykonuje fixture `sesjaRoli` (`src/fixtures/index.ts`) – nigdy nie loguj się w teście.
- Arkusz scenariuszy: ścieżka w `EWI_SCENARIUSZE_PLIK` (domyślnie `Scenariusze_Zbiorczy_EWI_*.xlsx` w folderze PKO/EWI/Scenariusze).

## Struktura

- `src/pages` – Page Objecty (`BasePage`, `LoginPage`, `DashboardPage`, `RejestrJednostekPage`, `KartaJednostkiPage`, `ZarzadzaniePage`, `RaportyPage`, `ZgloszeniePage`, `PodgladZgloszeniaPage`)
- `src/components` – `MenuGlowne`, `TabelaJednostek`, `PanelFiltrow`, `SlownikComponent`, `KalendarzComponent`
- `src/fixtures` – `test` z opcją `rola`, logowaniem, `dashboardPage` i `zgloszeniaDoWycofania` (sprzątanie zgłoszeń po teście)
- `src/data/builders` – unikalne dane (data i godzina) tworzonych rekordów; `src/data/json` – dane stałe scenariuszy; `src/data/types` – ich interfejsy; `src/data/tagi.ts` – tagi
- `tests/e2e/tsXX-<nazwa>.spec.ts` – jeden plik = jeden scenariusz; wszystkie scenariusze płasko w `tests/e2e` (bez podfolderów obszarów)

## Zasady

Pełne zasady pisania testów: skill **ewi-playwright** (`.claude/skills/ewi-playwright/SKILL.md`) – stosuj go zawsze przy pisaniu, poprawianiu i review testów.
Najważniejsze w skrócie:

- `test.describe` = scenariusz TS, `test` = przypadek TC; tylko komentarze `// Arrange`, `// Act`, `// Assert` – bez `test.step`.
- Lokatory po rolach i etykietach, nigdy po generowanych ID OutSystems; web-first assertions; zakaz `waitForTimeout`.
- Dane stałe w `.json` (import `import * as`), daty i unikalne wartości z buildera – w EWI nie może być duplikatów, więc każdy tworzony rekord (zgłoszenie, pozycja słownika) ma wartości z datą i godziną.
- Testy nie wysyłają niczego do systemów zewnętrznych (np. „wyślij plik na skrzynkę Alnovy” zawsze odznaczone).
- Każdy test ma tagi: TS, TC, priorytet, pozytywny/negatywny, e2e/api (z `TAGI`).

## Zanim uznasz zadanie za skończone

1. `npm run typecheck`, `npm run lint`, `npm run format:check` – bez błędów i ostrzeżeń.
2. Uruchom zmienione testy (`npx playwright test --grep "@TS_XX"`) na dev. Przy błędzie przeanalizuj trace i popraw przyczynę.
3. Zaktualizuj tabelę pokrycia i założenia w `README.md`.
4. Nie rób commitów ani pushy bez prośby użytkownika.
