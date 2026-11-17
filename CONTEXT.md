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
- `pocketbase.js` — klient PocketBase (plan, postępy, auth; filtr po użytkowniku)
- `sw.js` — service worker (cache)
- `manifest.json` — PWA manifest
- `icon.svg` — ikona aplikacji
- `Plan_treningowy_BLD_lipiec-sierpien_2026.md` — dokument źródłowy planu

## Jak zmienić plan treningowy
Plan jest w PocketBase i edytuje się go w aplikacji (panel planów). Szczegóły w README.

## Dane użytkownika
Postępy w PocketBase (`training_progress`, klucz `date`), filtrowane po polu `user`.
Zmiana wariantu nie kasuje postępów (klucz bez nazwy wariantu).
