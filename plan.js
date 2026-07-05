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

  // Definicje zadań
  tasks: {
    // Poniedziałek (1) — rogi jako rozgrzewka + baza 3BLD + 5BLD
    monday: [
      { id: "corners_warmup_mon", text: "Rogi", detail: "15 (rozgrzewka)" },
      { id: "solve3bld", text: "3BLD solvy", detail: "15–20 prób" },
      { id: "mon_5bld", text: "5BLD", detail: "1 próba" },
    ],

    // Wtorek (2) — najlżejszy dzień, tylko speed-memo
    tuesday: [
      {
        id: "speed_memo",
        text: "Speed-memo",
        detail: "10 min, limity 60s→45s→20s",
      },
    ],

    // Środa (3) — rogi jako rozgrzewka + baza 3BLD
    wednesday: [
      { id: "corners_warmup_wed", text: "Rogi", detail: "10 (rozgrzewka)" },
      { id: "solve3bld", text: "3BLD solvy", detail: "15–20 prób" },
    ],

    // Czwartek (4) — dzień dużych kostek: 4BLD + 5BLD + centry
    thursday: [
      { type: "4bld_ramp", idPrefix: "p4", text: "4BLD próba" },
      { id: "thu_5bld", text: "5BLD", detail: "1 próba" },
      { id: "centers", text: "Centry (4/5BLD)", detail: "ułożenia" },
    ],

    // Piątek (5) — pełny odpoczynek
    friday: [
      { id: "rest", text: "Odpoczynek", detail: "pełny rest, bez kostki" },
    ],

    // Sobota (6) — krawędzie jako rozgrzewka + 3BLD + 4BLD
    saturday: [
      { id: "edges_sat", text: "Krawędzie", detail: "10" },
      { id: "solve3bld", text: "3BLD solvy", detail: "15–20 prób" },
      { type: "4bld_ramp", idPrefix: "sat_p4", text: "4BLD próba" },
    ],

    // Niedziela (0) — krawędzie jako rozgrzewka + 3BLD + 4BLD + przegląd centr
    sunday: [
      { id: "edges_sun", text: "Krawędzie", detail: "10" },
      { id: "solve3bld", text: "3BLD solvy", detail: "15–20 prób" },
      { type: "4bld_ramp", idPrefix: "sun_p4", text: "4BLD próba" },
      { id: "centers_review", text: "Centry (4/5BLD)", detail: "2 próby" },
    ],
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = PLAN;
}
