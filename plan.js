/**
 * Plan treningowy BLD — lipiec–sierpień 2026
 *
 * Edytuj ten plik, żeby zmienić plan treningowy.
 * Aplikacja automatycznie załaduje zmiany po odświeżeniu.
 */

var PLAN = {
  // Okres trwania programu
  startDate: new Date(2026, 6, 1), // 1 lipca 2026
  endDate: new Date(2026, 7, 31), // 31 sierpnia 2026

  // Cele okresu
  goals: [
    { discipline: "3BLD", target: "średnia ~1 min" },
    { discipline: "4BLD", target: "stabilne 6–7 min" },
    { discipline: "5BLD", target: "ułożenia ~20 min" },
  ],

  // Progresja 4BLD
  ramp4BLD: {
    // 2–12 lipca: 2 próby/sesję
    dates2attempts: [
      "2026-07-02",
      "2026-07-04",
      "2026-07-05", // Czw, Sob, Nd
      "2026-07-09",
      "2026-07-11",
      "2026-07-12", // Czw, Sob, Nd
    ],
    fullRampStart: new Date(2026, 6, 16), // od 16 lipca: 4 próby/sesję
  },

  // Mapa tydzień→wariant (append-only, nigdy nie kasowana)
  // Klucz: poniedziałek danego tygodnia w formacie ISO "YYYY-MM-DD"
  // Wartość: nazwa wariantu z WEEK_VARIANTS
  // Brak wpisu = domyślnie "default"
  WEEK_SCHEDULE: {
    // Lipiec 2026
    "2026-06-29": "default",      // 29 cze – 5 lip: rozgrzewka, start programu
    "2026-07-06": "focus_3bld",   // 6–12 lip: intensywny 3BLD
    "2026-07-13": "default",      // 13–19 lip: standardowy
    "2026-07-20": "focus_duze",   // 20–26 lip: budowanie 4/5BLD
    "2026-07-27": "default",      // 27 lip – 2 sie: standardowy
    // Sierpień 2026
    "2026-08-03": "focus_3bld",   // 3–9 sie: intensywny 3BLD
    "2026-08-10": "default",      // 10–16 sie: standardowy
    "2026-08-17": "focus_duze",   // 17–23 sie: budowanie 4/5BLD
    "2026-08-24": "default",      // 24–30 sie: finalizacja, standardowy
  },

  // Szablony wariantów tygodniowych
  WEEK_VARIANTS: {
    // Tydzień standardowy
    default: {
      name: "Tydzień standardowy",
      description: "Zbalansowany trening: 3BLD jako baza, 4/5BLD w chronionych slotach, rogi i krawędzie jako rozgrzewki",
      monday: [
        { id: "corners_warmup_mon", text: "Rogi", detail: "15 (rozgrzewka)" },
        { id: "solve3bld", text: "3BLD solvy", detail: "15–20 prób" },
        { id: "mon_5bld", text: "5BLD", detail: "1 próba" },
      ],
      tuesday: [
        { id: "speed_memo", text: "Speed-memo", detail: "10 min, limity 60s→45s→20s" },
      ],
      wednesday: [
        { id: "corners_warmup_wed", text: "Rogi", detail: "10 (rozgrzewka)" },
        { id: "solve3bld", text: "3BLD solvy", detail: "15–20 prób" },
      ],
      thursday: [
        { type: "4bld_ramp", idPrefix: "p4", text: "4BLD próba" },
        { id: "thu_5bld", text: "5BLD", detail: "1 próba" },
        { id: "centers", text: "Centry (4/5BLD)", detail: "ułożenia" },
      ],
      friday: [
        { id: "rest", text: "Odpoczynek", detail: "pełny rest, bez kostki" },
      ],
      saturday: [
        { id: "edges_sat", text: "Krawędzie", detail: "10" },
        { id: "solve3bld", text: "3BLD solvy", detail: "15–20 prób" },
        { type: "4bld_ramp", idPrefix: "sat_p4", text: "4BLD próba" },
      ],
      sunday: [
        { id: "edges_sun", text: "Krawędzie", detail: "10" },
        { id: "solve3bld", text: "3BLD solvy", detail: "15–20 prób" },
        { type: "4bld_ramp", idPrefix: "sun_p4", text: "4BLD próba" },
        { id: "centers_review", text: "Centry (4/5BLD)", detail: "przegląd" },
      ],
    },

    // Tydzień nacisku na 3BLD (4/5BLD tylko podtrzymanie)
    focus_3bld: {
      name: "Nacisk na 3BLD",
      description: "Intensywny 3BLD (20-25 solvów/sesję). 4BLD i 5BLD tylko podtrzymanie — po 1 próbie w tygodniu",
      monday: [
        { id: "solve3bld", text: "3BLD solvy", detail: "20–25 prób" },
      ],
      tuesday: [
        { id: "speed_memo", text: "Speed-memo", detail: "10 min" },
        { id: "solve3bld_extra", text: "3BLD solvy", detail: "10 (dodatkowo)" },
      ],
      wednesday: [
        { id: "solve3bld", text: "3BLD solvy", detail: "20–25 prób" },
      ],
      thursday: [
        { type: "4bld_ramp", idPrefix: "p4", text: "4BLD próba", detail: "podtrzymanie" },
      ],
      friday: [
        { id: "rest", text: "Odpoczynek", detail: "pełny rest, bez kostki" },
      ],
      saturday: [
        { id: "solve3bld", text: "3BLD solvy", detail: "20–25 prób" },
      ],
      sunday: [
        { id: "solve3bld", text: "3BLD solvy", detail: "20–25 prób" },
        { id: "sun_5bld", text: "5BLD", detail: "1 próba (podtrzymanie)" },
      ],
    },

    // Tydzień nacisku na 4BLD/5BLD (3BLD tylko podtrzymanie)
    focus_duze: {
      name: "Nacisk na 4/5BLD",
      description: "Budowanie dużych kostek: więcej sesji 4BLD i 5BLD, 3BLD zredukowane do 10 solvów/dzień",
      monday: [
        { id: "corners_warmup_mon", text: "Rogi", detail: "15" },
        { id: "solve3bld", text: "3BLD solvy", detail: "10 (podtrzymanie)" },
        { id: "mon_5bld", text: "5BLD", detail: "1 próba" },
      ],
      tuesday: [
        { id: "speed_memo", text: "Speed-memo", detail: "10 min" },
      ],
      wednesday: [
        { type: "4bld_ramp", idPrefix: "wed_p4", text: "4BLD próba" },
        { id: "centers", text: "Centry (4/5BLD)", detail: "ułożenia" },
      ],
      thursday: [
        { type: "4bld_ramp", idPrefix: "p4", text: "4BLD próba" },
        { id: "thu_5bld", text: "5BLD", detail: "1 próba" },
        { id: "centers", text: "Centry (4/5BLD)", detail: "ułożenia" },
      ],
      friday: [
        { id: "rest", text: "Odpoczynek", detail: "pełny rest, bez kostki" },
      ],
      saturday: [
        { type: "4bld_ramp", idPrefix: "sat_p4", text: "4BLD próba" },
        { id: "sat_5bld", text: "5BLD", detail: "1 próba" },
        { id: "solve3bld", text: "3BLD solvy", detail: "10 (podtrzymanie)" },
      ],
      sunday: [
        { type: "4bld_ramp", idPrefix: "sun_p4", text: "4BLD próba" },
        { id: "centers_review", text: "Centry (4/5BLD)", detail: "przegląd" },
        { id: "solve3bld", text: "3BLD solvy", detail: "10" },
      ],
    },
  },

  // Na co położyć nacisk (zasady ogólne)
  focus: [
    {
      title: "Stabilność > prędkość",
      description:
        "Cel to ponad 40% skuteczności, nie tempo — tempo przyjdzie samo",
    },
    {
      title: "5BLD to cel do spełnienia",
      description:
        "Dążę do tego, żeby 5BLD było w pełni opanowane, a nie tylko „przypadkowe” ułożenia",
    },
    {
      title: "4BLD ma chronione sloty",
      description:
        "4bld przygotowuje do 5bld. Skupiam się na robieniu regularnych ułożeń",
    },
    {
      title: "Rogi > krawędzie (na razie)",
      description:
        "Za mało treningu rogów względem krawędzi — priorytet 25 rogów / 20 krawędzi tygodniowo, rozłożone jako rozgrzewki",
    },
    {
      title: "Minimum to podłoga, nie sufit",
      description:
        "Czerwiec pokazał 500+ solvów jest realne. 300 w lipcu to minimum, nie sufit.",
    },
    {
      title: "Prawdziwy odpoczynek",
      description:
        "Piątek to pełny rest bez kostki — stabilność wymaga regeneracji, nie tylko lżejszego treningu",
    },
  ],

};

if (typeof module !== "undefined" && module.exports) {
  module.exports = PLAN;
}
