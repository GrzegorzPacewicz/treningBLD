# BLD Training Tracker

## Opis
Habit tracker do treningu blindfolded speedcubingu (3BLD, 4BLD, 5BLD). Aplikacja PWA do codziennego odhaczania zadań treningowych.

## Live
https://treningbld.grzegorzpacewicz.pl (do skonfigurowania)

## Stack
- Vanilla JS/CSS/HTML, zero frameworków
- PWA (network-first service worker)
- localStorage do przechowywania postępów

## Struktura plików
- `index.html` — główna aplikacja (UI + logika)
- `plan.js` — konfiguracja planu treningowego (daty, zadania, focus)
- `sw.js` — service worker (cache)
- `manifest.json` — PWA manifest
- `icon.svg` — ikona aplikacji
- `Plan_treningowy_BLD_lipiec-sierpien_2026.md` — dokument źródłowy planu

## Jak zmienić plan treningowy
Edytuj `plan.js`:
- `startDate` / `endDate` — okres programu
- `ramp4BLD` — progresja 4BLD (daty z 2 próbami, start pełnej rampy)
- `focus` — sekcja "Na co położyć nacisk"
- `tasks` — zadania na każdy dzień tygodnia

Po edycji odśwież stronę.

## Dane użytkownika
Postępy zapisywane w localStorage pod kluczami `day:YYYY-MM-DD`.
