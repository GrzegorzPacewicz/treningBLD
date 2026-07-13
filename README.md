# BLD Training Tracker

Habit tracker do treningu blindfolded speedcubingu (3BLD, 4BLD, 5BLD). Aplikacja PWA do codziennego odhaczania zadań treningowych.

## Live

https://treningbld.grzegorzpacewicz.pl

## Stack

- Vanilla JS/CSS/HTML, zero frameworków
- PWA (network-first service worker)
- localStorage do przechowywania postępów
- IBM Plex Sans/Mono + Tabler Icons

## Funkcje

- Codzienny tracker zadań z podziałem na dni tygodnia
- **System wariantów tygodniowych** (periodyzacja treningu)
- Pasek postępu programu (62 dni: lipiec–sierpień 2026)
- Streak counter
- Historia ukończonych dni z badge'ami wariantów
- Sekcja "Na co położyć nacisk" z zasadami treningowymi
- Plan tygodniowy z opisem aktualnego wariantu
- Tagi błędów 3BLD (domyślnie zwinięte)
- Tryb offline (PWA)

## Struktura plików

```
├── index.html      # Główna aplikacja
├── style.css       # Style
├── app.js          # Logika UI
├── plan.js         # Konfiguracja planu treningowego
├── sw.js           # Service worker (cache)
├── manifest.json   # PWA manifest
├── icon.svg        # Ikona aplikacji
└── test.js         # Testy (Node.js)
```

## Jak zmienić plan treningowy

Edytuj `plan.js`:

- `startDate` / `endDate` — okres programu
- `goals` — cele na okres (dyscypliny + targety)
- `focus` — sekcja "Na co położyć nacisk"
- `WEEK_VARIANTS` — szablony wariantów tygodniowych (default, focus_3bld, focus_duze)
- `WEEK_SCHEDULE` — mapa tydzień→wariant (klucz: poniedziałek w formacie ISO)
- `DAY_OVERRIDES` — jednorazowe nadpisania dni (klucz: data ISO)

### Warianty tygodniowe

- **default** — zbalansowany trening: 3BLD jako baza, 4/5BLD w chronionych slotach
- **focus_3bld** — intensywny 3BLD (20-25 solvów), 4/5BLD tylko podtrzymanie
- **focus_duze** — budowanie 4/5BLD, 3BLD zredukowane do 10 solvów/dzień

Żeby przypisać wariant do tygodnia, dodaj wpis w `WEEK_SCHEDULE`:
```js
WEEK_SCHEDULE: {
  "2026-07-06": "focus_3bld",  // tydzień 6-12 lipca
}
```

Po edycji odśwież stronę.

## Dane użytkownika

Postępy zapisywane w localStorage pod kluczami `day:YYYY-MM-DD`.

## Uruchomienie lokalnie

```bash
npx serve .
```

lub dowolny serwer statyczny.

## Testy

```bash
node test.js
```

## Hosting

GitHub Pages + subdomena przez Cloudflare (CNAME).
