---
name: nowy-scenariusz
description: Automatyzuje scenariusz testowy EWI z arkusza (np. TS_04) – pobiera przypadki, bada ekrany przez Playwright MCP, pisze Page Objecty, dane i spec, uruchamia testy na dev i poprawia do skutku.
argument-hint: TS_XX
disable-model-invocation: true
---

# Automatyzacja scenariusza $ARGUMENTS

Stosuj skill **ewi-playwright** na każdym kroku.

## 1. Zakres

1. Uruchom `npm run scenariusz -- $ARGUMENTS` i przeczytaj scenariusz, przypadki (BDD), kwalifikację, status walidacji i otwarte pytania.
2. Przypadki „Do potwierdzenia” lub zablokowane konfliktem K-xx zaplanuj jako `test.fixme` z numerem K-xx / P-xx.
3. Sprawdź istniejący kod (`src/pages`, `src/components`, `src/data`) – rozszerzaj, nie duplikuj.
4. Przedstaw krótki plan: lista TC → plik/test, nowe i zmieniane pliki, założenia. Przy niejasnościach zapytaj użytkownika, zanim zaczniesz pisać.

## 2. Rozpoznanie na żywej aplikacji (Playwright MCP)

1. Otwórz `https://sourceful-dev.outsystemscloud.com/EWI/login`. Danych logowania **nie czytaj z `.env`** – poproś użytkownika, żeby zalogował się w oknie przeglądarki MCP albo podał login na czas sesji.
2. Dla każdego ekranu scenariusza zrób snapshot dostępności i ustal role/etykiety.
3. Dobierz **deterministyczne** dane testowe: sprawdź, że wyszukiwanie/filtr daje stały wynik (liczba wyników, konkretne jednostki). Zanotuj stan danych z datą.
4. Zwróć uwagę na specyfikę OutSystems (sekcja 3 skilla ewi-playwright): przejścia ekranów, listy rozwijane, panele, localStorage.

## 3. Implementacja

1. Page Objecty / komponenty (JSDoc, `expectLoaded()` z `poPrzejsciuEkranu()`).
2. `src/data/types` – interfejs `DaneTsXX`; `src/data/json/tsXX-<nazwa>.json` – dane stałe.
3. `tests/e2e/<obszar>/tsXX-<nazwa>.spec.ts` – describe = TS, test = TC, AAA komentarzami, komplet tagów, adnotacje założeń.

## 4. Weryfikacja (do skutku)

1. `npm run typecheck`, `npm run lint`, `npm run format:check`.
2. `npx playwright test --grep "@$ARGUMENTS"` – przy błędzie przeczytaj komunikat i trace (`test-results/`), popraw **przyczynę** (lokator, synchronizacja, dane), nie podnoś timeoutów.
3. Uruchom scenariusz drugi raz, żeby wykluczyć niestabilność.
4. Uruchom cały pakiet (`npx playwright test`) – nowe zmiany nie mogą zepsuć istniejących testów.

## 5. Zakończenie

1. Zaktualizuj `README.md` (tabela pokrycia, założenia).
2. Uruchom agenta **reviewer-testow** na zmienionych plikach i popraw zgłoszone uwagi.
3. Podsumuj: TC → test + tagi, wynik uruchomienia, założenia i pytania do analityka. Nie rób commita bez prośby.
