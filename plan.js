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
      title: "Rogi/krawędzie",
      description:
        "Trening samych rogów i samych krawędzi na czas jest tak samo ważny jak pełne ułożenia.",
    },
    {
      title: "Minimum to podłoga, nie sufit",
      description:
        "Czerwiec pokazał 500+ solvów jest realne. 300 w lipcu to minimum, nie sufit.",
    },
  ],

  // Definicje zadań
  tasks: {
    // Poniedziałek (1) — solidna baza 3BLD
    monday: [{ id: "solve3bld", text: "3BLD solvy", detail: "15–20 prób" }],

    // Wtorek (2) — praca nad słabszymi elementami
    tuesday: [
      { id: "corners_only", text: "Rogi-only", detail: "min. 20 prób" },
      { id: "edges_only", text: "Krawędzie-only", detail: "min. 20 prób" },
    ],

    // Środa (3) — solidna baza 3BLD
    wednesday: [
      { id: "solve3bld", text: "3BLD solve'y", detail: "15–20 prób" },
    ],

    // Czwartek (4) — 4BLD (rampa) + centra
    thursday: [
      { type: "4bld_ramp", idPrefix: "p4", text: "4BLD próba" },
      { id: "centers", text: "Centry (4/5BLD)", detail: "ułożenia" },
    ],

    // Piątek (5) — lekki dzień przed weekendem
    friday: [{ id: "solve3bld_light", text: "3BLD lekko", detail: "10 prób" }],

    // Sobota (6) — PEAK: wszystkie 3 dyscypliny
    saturday: [
      { id: "solve3bld", text: "3BLD solve'y", detail: "15–20 prób" },
      { type: "4bld_ramp", idPrefix: "sat_p4", text: "4BLD próba" },
      { id: "sat_5bld", text: "5BLD", detail: "1 próba" },
      { id: "centers", text: "Centry (4/5BLD)", detail: "1" },
    ],

    // Niedziela (0) — PEAK: wszystkie 3 dyscypliny
    sunday: [
      { id: "solve3bld", text: "3BLD solve'y", detail: "15–20 prób" },
      { type: "4bld_ramp", idPrefix: "sun_p4", text: "4BLD próba" },
      { id: "sun_5bld", text: "5BLD", detail: "1 próba" },
      { id: "centers", text: "Centry (4/5BLD)", detail: "próba" },
    ],
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = PLAN;
}
