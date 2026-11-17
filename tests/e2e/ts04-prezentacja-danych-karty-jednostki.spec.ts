import { expect, test } from '../../src/fixtures';
import * as ts04Dane from '../../src/data/json/ts04-prezentacja-danych-karty-jednostki.json';
import { Rola } from '../../src/data/rola';
import { TAGI } from '../../src/data/tagi';
import type { DaneTs04 } from '../../src/data/types/karta-jednostki.types';
import { EtykietaPola, KolumnaKomorkiMpk } from '../../src/pages/karta-jednostki.page';

const dane: DaneTs04 = ts04Dane;

// Rola jest opcją workera (logowanie raz na worker), dlatego ustawiana na poziomie pliku – jeden plik = jeden scenariusz.
// TODO [ZAŁOŻENIE]: zmienić na Rola.UzytkownikPodstawowy po założeniu konta na środowisku.
test.use({ rola: Rola.Administrator });

const ZALOZENIE_DANYCH_DEV = {
  type: 'założenie',
  description:
    'Oczekiwane wartości = jednostki dev po migracji (import 12.11.2026, stan 13.11.2026) – aktualizować po ponownym zasileniu.',
};

const ZALOZENIE_P01 = {
  type: 'założenie',
  description:
    'P-01: lista pól karty i prezentacja pustych pól („Nie występuje”, na liście „—”) wg makiety karty [FIG] 27.10 i aplikacji dev.',
};

const ZALOZENIE_OKRESU_OBOWIAZYWANIA = {
  type: 'założenie',
  description:
    'Okres obowiązywania = „Data utworzenia” – „Data likwidacji”; jednostka aktywna nie ma pola „Data likwidacji”. Na dev „Data utworzenia” to data importu (12.11.2026), także dla jednostek zlikwidowanych wcześniej.',
};

/**
 * Wartość pola z listy Rejestru w postaci prezentowanej na karcie – puste pole lista pokazuje jako „—”,
 * a karta jako „Nie występuje” (dev 16.11.2026).
 * @param wartoscNaLiscie - wartość z wiersza listy
 * @returns oczekiwana wartość na karcie
 */
function wartoscNaKarcie(wartoscNaLiscie: string): string {
  return wartoscNaLiscie === dane.wartoscPustegoPolaNaLiscie ? dane.wartoscPustegoPola : wartoscNaLiscie;
}

test.describe(
  'TS_04 – Prezentacja danych na karcie jednostki',
  {
    tag: ['@TS_04', '@BR-KAT-01', '@KO-17.3'],
    annotation: {
      type: 'założenie',
      description:
        'Scenariusz dla roli „Użytkownik podstawowy” – uruchamiany jako Administrator do czasu udostępnienia konta (Rejestr jednostek jest wspólny dla ról).',
    },
  },
  () => {
    test(
      'TC-17 Karta jednostki zawiera MPK, PS i O-ZSI zgodne ze źródłem',
      {
        tag: [
          '@TC-17',
          TAGI.priorytet.wysoki,
          TAGI.rodzaj.pozytywny,
          TAGI.warstwa.e2e,
          TAGI.kwalifikacja.smoke,
          TAGI.kwalifikacja.regresja,
          '@BR-NUM-10',
        ],
        annotation: {
          type: 'założenie',
          description:
            'Wartości oczekiwane przepisane z wiersza pliku MPK_DICT (import – partia 69, 12.11.2026); pliku źródłowego nie ma w repozytorium.',
        },
      },
      async ({ dashboardPage }) => {
        // Arrange
        // TODO [ZAŁOŻENIE]: po udostępnieniu pliku MPK_DICT czytać wartości oczekiwane bezpośrednio z pliku.
        const { mpk, ps, ozsi } = dane.tc17;
        const rejestr = await dashboardPage.otworzRejestrJednostek();

        // Act
        const karta = await rejestr.otworzKarteJednostki(mpk);

        // Assert
        await expect.soft(karta.pole(EtykietaPola.MpkGlowny)).toHaveText(mpk);
        await expect.soft(karta.pole(EtykietaPola.Ps)).toHaveText(ps);
        await expect.soft(karta.pole(EtykietaPola.Ozsi)).toHaveText(ozsi);
      },
    );

    test(
      'TC-18 Karta jednostki zawiera komplet danych',
      {
        tag: ['@TC-18', TAGI.priorytet.wysoki, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e, TAGI.kwalifikacja.regresja],
        annotation: [
          ZALOZENIE_DANYCH_DEV,
          ZALOZENIE_P01,
          {
            type: 'założenie',
            description:
              'Jednostka nadrzędna KOC to pion – prezentowana w ścieżce „Umiejscowienie i struktura jednostki” (Obszar › Pion).',
          },
        ],
      },
      async ({ dashboardPage }) => {
        // Arrange
        const { mpk, nazwa, typWNaglowku, status, pola, struktura } = dane.tc18;
        const rejestr = await dashboardPage.otworzRejestrJednostek();

        // Act
        const karta = await rejestr.otworzKarteJednostki(mpk);

        // Assert
        await expect(karta.nazwaWNaglowku).toHaveText(nazwa);
        await expect(karta.znacznikiNaglowka).toHaveText([typWNaglowku, status]);
        for (const { etykieta, wartosc } of pola) {
          await expect.soft(karta.pole(etykieta), `pole „${etykieta}”`).toHaveText(wartosc);
        }
        for (const element of struktura) {
          await expect.soft(karta.elementStruktury(element), `struktura: ${element}`).toBeVisible();
        }
      },
    );

    test(
      'TC-19 Karta jednostki z minimalnym zestawem danych',
      {
        tag: ['@TC-19', TAGI.priorytet.sredni, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e, '@KO-8.3'],
        annotation: [
          ZALOZENIE_DANYCH_DEV,
          ZALOZENIE_P01,
          {
            type: 'założenie',
            description:
              'Pola opcjonalne = PS (KO 8.3) i jednostka statystyczna; obowiązkowe = nazwa, typ, region, MPK, O-ZSI.',
          },
        ],
      },
      async ({ dashboardPage }) => {
        // Arrange
        const { mpk, polaObowiazkowe, polaPuste } = dane.tc19;
        const rejestr = await dashboardPage.otworzRejestrJednostek();

        // Act
        const karta = await rejestr.otworzKarteJednostki(mpk);

        // Assert
        for (const { etykieta, wartosc } of polaObowiazkowe) {
          await expect.soft(karta.pole(etykieta), `pole obowiązkowe „${etykieta}”`).toHaveText(wartosc);
        }
        for (const etykieta of polaPuste) {
          await expect.soft(karta.pole(etykieta), `puste pole „${etykieta}”`).toHaveText(dane.wartoscPustegoPola);
        }
        await expect(karta.komunikatBledu).toHaveCount(0);
      },
    );

    test(
      'TC-20 Karta prezentuje status i okres obowiązywania – jednostka zlikwidowana',
      {
        tag: [
          '@TC-20',
          TAGI.priorytet.wysoki,
          TAGI.rodzaj.pozytywny,
          TAGI.warstwa.e2e,
          TAGI.kwalifikacja.regresja,
          '@KO-16.3',
        ],
        annotation: [ZALOZENIE_DANYCH_DEV, ZALOZENIE_OKRESU_OBOWIAZYWANIA],
      },
      async ({ dashboardPage }) => {
        // Arrange
        const { mpk, typWNaglowku, status, dataUtworzenia, dataLikwidacji } = dane.tc20.zlikwidowana;
        const rejestr = await dashboardPage.otworzRejestrJednostek();

        // Act
        const karta = await rejestr.otworzKarteJednostki(mpk);

        // Assert
        await expect(karta.znacznikiNaglowka).toHaveText([typWNaglowku, status]);
        await expect(karta.pole(EtykietaPola.DataUtworzenia)).toHaveText(dataUtworzenia);
        await expect(karta.pole(EtykietaPola.DataLikwidacji)).toHaveText(dataLikwidacji);
      },
    );

    test(
      'TC-20 Karta prezentuje status i okres obowiązywania – jednostka aktywna',
      {
        tag: [
          '@TC-20',
          TAGI.priorytet.wysoki,
          TAGI.rodzaj.pozytywny,
          TAGI.warstwa.e2e,
          TAGI.kwalifikacja.regresja,
          '@KO-16.3',
        ],
        annotation: [ZALOZENIE_DANYCH_DEV, ZALOZENIE_OKRESU_OBOWIAZYWANIA],
      },
      async ({ dashboardPage }) => {
        // Arrange
        const { mpk, typWNaglowku, status, dataUtworzenia } = dane.tc20.aktywna;
        const rejestr = await dashboardPage.otworzRejestrJednostek();

        // Act
        const karta = await rejestr.otworzKarteJednostki(mpk);

        // Assert
        await expect(karta.znacznikiNaglowka).toHaveText([typWNaglowku, status]);
        await expect(karta.pole(EtykietaPola.DataUtworzenia)).toHaveText(dataUtworzenia);
        await expect(karta.etykietaPola(EtykietaPola.DataLikwidacji)).toHaveCount(0);
      },
    );

    for (const mpk of dane.tc21.mpkJednostek) {
      test(
        `TC-21 Dane karty są zgodne z wierszem listy – ${mpk}`,
        {
          tag: ['@TC-21', TAGI.priorytet.sredni, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e, TAGI.kwalifikacja.regresja],
        },
        async ({ dashboardPage }) => {
          // Arrange
          const rejestr = await dashboardPage.otworzRejestrJednostek();
          const wiersz = await rejestr.wyszukajJednostke(mpk);
          const naLiscie = await rejestr.tabela.daneWiersza(wiersz);

          // Act
          const karta = await rejestr.otworzKarte(wiersz);

          // Assert
          await expect.soft(karta.nazwaWNaglowku, 'nazwa w nagłówku').toHaveText(naLiscie.nazwaPelna);
          await expect.soft(karta.pole(EtykietaPola.NazwaPelna)).toHaveText(naLiscie.nazwaPelna);
          await expect.soft(karta.pole(EtykietaPola.NazwaKrotka)).toHaveText(naLiscie.nazwaKrotka);
          await expect
            .soft(karta.znacznikiNaglowka, 'typ i status')
            .toHaveText([naLiscie.typJednostki, naLiscie.status]);
          await expect.soft(karta.pole(EtykietaPola.MpkGlowny)).toHaveText(naLiscie.mpk);
          await expect.soft(karta.pole(EtykietaPola.Ps)).toHaveText(wartoscNaKarcie(naLiscie.ps));
          await expect.soft(karta.pole(EtykietaPola.Ozsi)).toHaveText(naLiscie.ozsi);
        },
      );
    }

    test(
      'TC-22 Karta KOC/SJO pokazuje powiązanie z jednostką statystyczną',
      {
        tag: ['@TC-22', TAGI.priorytet.sredni, TAGI.rodzaj.pozytywny, TAGI.warstwa.e2e, '@BR-NUM-10', '@BR-PAR-01'],
        annotation: [
          ZALOZENIE_DANYCH_DEV,
          {
            type: 'założenie',
            description:
              'P-01: powiązanie prezentowane polem „Statystyczna” (Numery identyfikacyjne) i wierszem w tabeli komórek MPK. Od 16.11.2026 tabela nie ma kolumny JO2 (zastąpiona kolumną „Status”) – JO2 = 97 sprawdzany na pozycjach 5–6 MPK.',
          },
        ],
      },
      async ({ dashboardPage }) => {
        // Arrange
        const { mpkKoc, mpkStatystycznej, jo2Statystycznej, statusStatystycznej } = dane.tc22;
        const rejestr = await dashboardPage.otworzRejestrJednostek();

        // Act
        const karta = await rejestr.otworzKarteJednostki(mpkKoc);

        // Assert
        await expect(karta.pole(EtykietaPola.Statystyczna)).toHaveText(mpkStatystycznej);
        const wierszStatystycznej = karta.wierszKomorkiMpk(mpkStatystycznej);
        await expect(karta.komorkaMpk(wierszStatystycznej, KolumnaKomorkiMpk.Status)).toHaveText(statusStatystycznej);
        // BR-NUM-10: MPK jednostki statystycznej ma JO2 (97) na pozycjach 5–6.
        await expect(karta.pole(EtykietaPola.Statystyczna)).toHaveText(new RegExp(`^.{4}${jo2Statystycznej}.{2}$`));
      },
    );
  },
);
