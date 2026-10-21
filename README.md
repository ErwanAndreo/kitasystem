# KitaPlaner Pro — Personal- & Dienstplanung

Vollständiges, einsatzbereites Software-System für Kindertagesstätten von A bis Z. Entwickelt nach dem Grundsatz: **Je häufiger eine Aufgabe anfällt, desto schneller muss sie gehen — und seltene Aufgaben bleiben trotzdem intuitiv.**

---

## 📱 Plattformen & Zielgruppen

1. **Windows & Web-Applikation (für Leitung & Verwaltung):**
   * Vollwertiges Desktop-Cockpit im Browser oder als eigenständige Windows-App (via PWA / Edge / Chrome *"App installieren"*).
   * **Live-Betreuungsschlüssel-Radar:** Dynamische Ampel für jede Gruppe (KiBiz / KiTaG-Berechnung im 15-Minuten-Raster).
   * **Freigabe-Center der Einrichtungsleitung:** Verbindliche 1-Klick-Freigabe für Schichtwechsel, Urlaub und Notfallmaßnahmen.
   * **Wochendienstplaner:** Interaktiver Roster mit ArbZG-Ruhezeitprüfung (mind. 11h) und Pausenlogik.
   * **DATEV- & Lohnexport:** Monatsabschluss, Stundennachweise und CSV-Export für das Lohnbüro.

2. **Mobile App (für Erzieher:innen auf dem Smartphone):**
   * Läuft auf iOS und Android (über den mobilen Browser oder als installierte App auf dem Home-Bildschirm).
   * **Mein Tag:** Geplante Schichtzeiten, Gruppenpartner und Pausen.
   * **1-Tap Stempeluhr:** Kommen, Pause und Gehen in 1 Sekunde mit digitaler Zeitanzeige.
   * **Schichttausch-Börse:** Schicht an Kolleg:innen abgeben $\rightarrow$ Kolleg:in stimmt zu $\rightarrow$ Geht zur Freigabe an die Leitung.
   * **Urlaubs- & Krankmeldungen:** Statusanzeige in Echtzeit (*"Wartet auf Freigabe durch Sabine Weber"*).

3. **Kiosk-Terminal (für das Tablet am Kita-Eingang / Personalraum):**
   * Stationäre Zeiterfassung in 2 Sekunden.
   * Große Fototasten & tastenversetztes 4-stelliges PIN-Pad.
   * Automatische Rücksetzung nach 3 Sekunden.

---

## ⚡ Schnellstart

### Auf Mac / Linux:
```bash
cd /Users/erwan/.gemini/antigravity/scratch/kita-dienstplan
./start.sh
```

### Auf Windows:
Doppelklick auf `start_windows.bat` oder im Terminal:
```cmd
npm run build
npm run start
```
Die App öffnet sich automatisch unter: **`http://localhost:3000`**

### Als Windows-Desktop-App installieren:
1. `http://localhost:3000` in Microsoft Edge oder Google Chrome öffnen.
2. In der Adresszeile rechts auf das Icon **"App installieren"** klicken (oder Menü $\rightarrow$ *Apps* $\rightarrow$ *Diese Website als App installieren*).
3. KitaPlaner Pro läuft nun in einem eigenen Windows-Fenster mit Taskleisten-Icon!

---

## 🏢 Vorinstallierte Demo-Daten ("Kita Sonnenschein")

Das System ist bereits mit authentischen Daten vorkonfiguriert:
* **3 Gruppen:**
  * *Krabbelmäuse (U3, Krippe)*: 10 Kinder, gesetzlicher Soll-Schlüssel 1:3.33, Fachkraftquote $\ge$ 67%
  * *Sonnenschein (Ü3)*: 25 Kinder, gesetzlicher Soll-Schlüssel 1:8.0, Fachkraftquote $\ge$ 50%
  * *Waldwichtel (Ü3)*: 24 Kinder, gesetzlicher Soll-Schlüssel 1:8.0, Fachkraftquote $\ge$ 50%
* **10 Mitarbeiter:innen:**
  * Sabine Weber (Einrichtungsleitung, 39h)
  * Sarah Klein (Erzieherin U3, *heute krankgemeldet $\rightarrow$ Notfall aktiv*)
  * Lisa Hoffmann (Erzieherin U3, 35h)
  * Markus Becker (Kinderpfleger U3, 30h)
  * Anna Schmidt (Erzieherin Ü3, 39h, *Urlaubsantrag ausstehend*)
  * Lukas Wagner (Erzieher Ü3, 39h, *Schichttausch mit Elena Rossi ausstehend*)
  * Elena Rossi (Erzieherin Ü3, 32h)
  * Jonas Meyer (Kinderpfleger Ü3, 25h)
  * Julia Fischer (Springerin, 20h, *Notfalleinsatz vorgeschlagen*)
  * Leonie Wolf (FSJ / Bundesfreiwilligendienst, 39h)

---

## 🛡️ Freigabe-Center der Leitung (Core Feature)

Alle wesentlichen Änderungen am Kita-Ablauf erfordern die Freigabe der Leitung:
1. **Schichttausch:** Erzieher A bittet Erzieher B via Mobile App $\rightarrow$ Erzieher B stimmt zu $\rightarrow$ Der Antrag landet mit automatischer Betreuungsschlüssel- und ArbZG-Prüfung bei der Leitung $\rightarrow$ 1-Klick auf *"Freigeben"* $\rightarrow$ Dienstplan wird in Echtzeit aktualisiert.
2. **Krankheitsfall / Notfall:** Bei Ausfall berechnet das System sofort die Unterdeckung und schlägt die beste verfügbare Springerin vor $\rightarrow$ Leitung gibt den Einsatz frei $\rightarrow$ Schlüssel springt wieder auf Grün!
3. **Urlaub:** Antrag aus der Mobile-App $\rightarrow$ Prüfung gegen Mindestbesetzung $\rightarrow$ Leitung genehmigt oder lehnt mit Begründung ab.

---

## 📁 Projektstruktur

```
kita-dienstplan/
├── package.json               # Fullstack Konfiguration & Skripte
├── vite.config.ts             # Vite Bundler & API-Proxy
├── tailwind.config.js         # Styling & Kita-Farbpalette
├── start.sh                   # Startskript für Mac/Linux
├── start_windows.bat          # 1-Klick Startskript für Windows
├── public/
│   └── manifest.json          # PWA / Windows-App Manifest
├── src/
│   ├── server/                # Node.js + Express Backend
│   │   ├── db.ts              # SQLite Schema, Relationen & Demo-Seed
│   │   └── index.ts           # REST API, Ratio-Engine & Approval-Engine
│   └── client/                # React 18 + Tailwind Frontend
│       ├── App.tsx            # State, View-Switcher & Toast-Notifikationen
│       ├── types.ts           # TypeScript Interfaces
│       └── components/
│           ├── Header.tsx            # Navigation, Rollen- & Geräteswitcher
│           ├── RatioRadar.tsx        # Live-Schlüsselwächter (Ampel)
│           ├── ApprovalCenter.tsx    # Freigabe-Center der Leitung
│           ├── ShiftPlanner.tsx      # Wochendienstplan (Roster Grid)
│           ├── MobileAppView.tsx     # Smartphone-App für Erzieher:innen
│           ├── KioskView.tsx         # Kiosk Zeiterfassung (PIN-Pad)
│           ├── StaffManagement.tsx   # Personal & Qualifikations-Wizard
│           ├── EmergencyModal.tsx    # Notfall-Krisenmanager
│           └── DatevExportModal.tsx  # DATEV Lohnexport
└── dist/                      # Produktions-Build (Client & Server)
```
