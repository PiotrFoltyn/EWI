import { expect, test } from '../../src/fixtures';
import * as ts05Dane from '../../src/data/json/ts05-nawigacja-w-strukturze.json';
import { Rola } from '../../src/data/rola';
import { TAGI } from '../../src/data/tagi';
import type { DaneTs05 } from '../../src/data/types/karta-jednostki.types';
import { EtykietaPola } from '../../src/pages/karta-jednostki.page';

const dane: DaneTs05 = ts05Dane;

// Rola jest opcją workera (logowanie raz na worker), dlatego ustawiana na poziomie pliku – jeden plik = jeden scenariusz.
// TODO [ZAŁOŻENIE]: zmienić na Rola.UzytkownikPodstawowy po założeniu konta na środowisku.
test.use({ rola: Rola.Administrator });

const ZALOZENIE_DANYCH_DEV = {
  type: 'założenie',
  description:
    'Struktura = stan dev po imporcie 13.11.2026 (partia 72): Pion Instytucjonalnej Bankowości Zagranicznej (Y4D00300) ma 2 jednostki podrzędne – DFH (Y0AD0000) i DBZ (Y2D10000).',
};

const ZALOZENIE_SEKCJI_STRUKTURY = {
  type: 'założenie',
  description:
    'P-06: na karcie PIONU tabela komórek MPK w sekcji „Umiejscowienie i struktura jednostki” to jego jednostki podrzędne + własna komórka (nazwy są linkami do kart); nadrzędne – ścieżka Obszar › Pion › jednostka. Dla innych typów (KOC, oddział, pośrednik) tabela pokazuje grupę MPK o wspólnym prefiksie, nie strukturę (dev 13.11.2026) – dlatego scenariusz używa pionu.',
};

test.describe(
  'TS_05 – Nawigacja w strukturze nadrzędna–podrzędna',
  {
    tag: ['@TS_05', '@KO-16.4', '@KO-17.5'],
    annotation: {
      type: 'założenie',
      description:
        'Scenariusz dla roli „Użytkownik podstawowy” – uruchamiany jako Administrator do czasu udostępnienia konta (karta jednostki jest wspólna dla ról).',
    },
  },
  () => {
    test(
      'TC-23 Przejście z jednostki nadrzędnej do podrzędnej',
      {
        tag: ['@TC-23', TAGI.priorytet.wysoki, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e, TAGI.kwalifikacja.regresja],
        annotation: [ZALOZENIE_DANYCH_DEV, ZALOZENIE_SEKCJI_STRUKTURY],
      },
      async ({ dashboardPage }) => {
        // Arrange
        const { mpkNadrzednej, nazwaPodrzednej, mpkPodrzednej } = dane.tc23;
        const rejestr = await dashboardPage.otworzRejestrJednostek();
        const kartaNadrzednej = await rejestr.otworzKarteJednostki(mpkNadrzednej);

        // Act
        const kartaPodrzednej = await kartaNadrzednej.przejdzDoJednostkiZTabeli(mpkPodrzednej);

        // Assert
        await expect(kartaPodrzednej.nazwaWNaglowku).toHaveText(nazwaPodrzednej);
        await expect(kartaPodrzednej.pole(EtykietaPola.MpkGlowny)).toHaveText(mpkPodrzednej);
      },
    );

    test(
      'TC-24 Lista jednostek podrzędnych jest kompletna',
      {
        tag: ['@TC-24', TAGI.priorytet.wysoki, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e, TAGI.kwalifikacja.regresja],
        annotation: [
          ZALOZENIE_DANYCH_DEV,
          ZALOZENIE_SEKCJI_STRUKTURY,
          {
            type: 'uwaga',
            description: 'Tabela zawiera też własną komórkę pionu (Y4D00300, JO2 03) – jest częścią oczekiwanej listy.',
          },
        ],
      },
      async ({ dashboardPage }) => {
        // Arrange
        const { mpkNadrzednej, mpkWTabeli } = dane.tc24;
        const rejestr = await dashboardPage.otworzRejestrJednostek();

        // Act
        const karta = await rejestr.otworzKarteJednostki(mpkNadrzednej);

        // Assert
        // Pełna lista w kolejności z karty: wszystkie podrzędne i żadna inna (lista mieści się na jednej stronie).
        await expect(karta.kolumnaMpkKomorek).toHaveText(mpkWTabeli);
      },
    );

    test(
      'TC-25 Przejście z jednostki podrzędnej do nadrzędnej',
      {
        tag: ['@TC-25', TAGI.priorytet.sredni, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e],
        annotation: [
          ZALOZENIE_DANYCH_DEV,
          {
            type: 'założenie',
            description: 'P-06: nawigacja w górę przez link jednostki nadrzędnej w ścieżce struktury.',
          },
        ],
      },
      async ({ dashboardPage }) => {
        // Arrange
        const { mpkPodrzednej, nazwaNadrzednej, mpkNadrzednej } = dane.tc25;
        const rejestr = await dashboardPage.otworzRejestrJednostek();
        const kartaPodrzednej = await rejestr.otworzKarteJednostki(mpkPodrzednej);

        // Act
        const kartaNadrzednej = await kartaPodrzednej.przejdzWGoreStruktury(nazwaNadrzednej);

        // Assert
        await expect(kartaNadrzednej.nazwaWNaglowku).toHaveText(nazwaNadrzednej);
        await expect(kartaNadrzednej.pole(EtykietaPola.MpkGlowny)).toHaveText(mpkNadrzednej);
      },
    );

    test(
      'TC-26 Jednostka bez jednostek podrzędnych',
      {
        tag: ['@TC-26', TAGI.priorytet.niski, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e],
        annotation: [
          {
            type: 'założenie',
            description:
              'P-06: jednostka bez podrzędnych = tabela struktury zawiera tylko jej własną komórkę MPK. Na dev poza pionem tabela pokazuje grupę MPK o wspólnym prefiksie – karta pośrednika A1710P03 ma 84 pozycje „A1710…” (cały Oddział 1 w Głogowie), a np. tabela KOC Y0AD0000 zawiera jednostki z innego pionu.',
          },
        ],
      },
      async ({ dashboardPage }) => {
        test.fixme(
          true,
          'P-06: poza pionem sekcja struktury pokazuje grupę MPK o wspólnym prefiksie zamiast jednostek podrzędnych – do potwierdzenia z analitykiem, jak karta ma prezentować podrzędne (możliwy defekt).',
        );

        // Arrange
        const { mpk } = dane.tc26;
        const rejestr = await dashboardPage.otworzRejestrJednostek();

        // Act
        const karta = await rejestr.otworzKarteJednostki(mpk);

        // Assert
        await expect(karta.komunikatBledu).toHaveCount(0);
        await expect(karta.kolumnaMpkKomorek).toHaveText([mpk]);
      },
    );
  },
);
