# KitaPlaner

Personal- und Dienstplanung für Kitas: Web-App für Leitung und Mitarbeitende, Elternportal und Kiosk-Ansicht.

> **Nur für den lokalen Betrieb gedacht.** Die API hat keine Authentifizierung, und Passwörter liegen im Klartext in der Datenbank.

## Aufbau

| Pfad | Inhalt |
| --- | --- |
| `src/server/` | Express-API und SQLite (`better-sqlite3`), Schema und Demo-Daten in `db.ts` |
| `src/client/` | React 18, Tailwind, Vite |
| `test_backend_full.js` | E2E-Tests gegen einen laufenden Server auf Port 3000 |

## Starten

```bash
npm install
npm run build
npm start
```

Die App läuft dann auf `http://localhost:3000`. Unter Windows geht das auch per `start_windows.bat`.

Eine neue Datenbank startet leer mit dem Konto `admin` / `admin` (Leitung). Demo-Inhalte gibt es nur in Datenbanken, die schon die Demo-Belegschaft enthalten.

## Windows

`install_Vxx.bat` ist einzeln verschickbar und installiert alles nach `%USERPROFILE%\KitaPlaner`, inklusive eigenem Node.js. Danach startet `start_windows.bat` das System, `update.bat` aktualisiert es.

Jedes Update sichert das System vorher nach `backups/update_*` und rollt bei Fehlern oder verlorenen Daten automatisch zurück. Der Server sichert die Datenbank 1 Minute nach jedem Start. Sicherungen werden nach 1 Jahr gelöscht.

## Prüfen

```bash
npm run build
node test_backend_full.js
```
