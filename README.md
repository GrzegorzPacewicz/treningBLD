# BLD Training Tracker

Habit tracker do treningu blindfolded speedcubingu (3BLD, 4BLD, 5BLD). Aplikacja PWA do codziennego odhaczania zadań treningowych.

## Live

https://bldtracker.grzegorzpacewicz.pl

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
├── pocketbase.js   # Klient PocketBase (dane, auth)
├── sw.js           # Service worker (cache)
├── manifest.json   # PWA manifest
├── icon.svg        # Ikona aplikacji
└── test.js         # Testy (Node.js)
```

## Jak zmienić plan treningowy

Cały plan jest w PocketBase (`gp1.pecet.it`) i edytuje się go w aplikacji, w **panelu planów** (wymaga zalogowania):

- **Warianty** — szablony tygodni (`weekly_variants`)
- **Tydzień** — przypisanie wariantu do tygodnia (`weekly_schedule`)
- **Zasady** — sekcja "Na co położyć nacisk" (`training_focus`)
- edycja pojedynczego dnia — nadpisania (`training_overrides`)

Start programu = najwcześniejszy dzień z postępem, a gdy go brak — pierwszy zaplanowany tydzień.

## Dane per użytkownik

Każdy rekord ma pole `user` (relacja do `users`). Aplikacja pobiera tylko rekordy zalogowanego użytkownika; bez logowania nic nie pokazuje. Dzięki temu na tej samej bazie może działać kilka osób (np. zawodnicy).

## Definicje zadań

Zadania dostępne w edytorach (typ + lista szczegółów) edytujesz w panelu planów → zakładka **Zadania**.
Zapisywane są w kolekcji PocketBase `task_templates`:

- `text` (text, wymagane) — nazwa zadania
- `details` (json) — lista szczegółów, np. `["5", "10", "15"]`
- `order` (number) — kolejność
- `user` (relation → users)

Reguły API jak w `training_focus`. Dopóki kolekcja jest pusta lub nie istnieje, aplikacja używa wbudowanych zadań (`DEFAULT_TASK_TEMPLATES` w `app.js`).

Zadania w wariantach i nadpisaniach dni są zapisywane po nazwie — zmiana nazwy definicji nie zmienia istniejących planów (edytor pokaże starą nazwę jako osobną pozycję).

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
