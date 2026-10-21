# KitaPlaner Mitarbeiter-App (Android & iOS)

Die offizielle mobile App für Erzieher:innen und Kita-Personal. 

Entwickelt mit Flutter für **Android & iOS**, um den Arbeitsalltag am Kind zu erleichtern: **Desto öfter etwas getan werden muss, desto schneller geht es (z.B. 1-Tap Stempeln in < 2 Sekunden), während alles, was man wissen muss, transparent einsehbar ist.**

---

## 📱 Was Mitarbeiter in der App tun können ("Machen")

1. **1-Tap Zeiterfassung & Stempeluhr:**
   * Live-Uhrzeit im Sekundentakt.
   * Drei große 1-Klick-Tasten: **[Kommen]**, **[Pause]**, **[Gehen]**.
   * Dynamische Status-Pille (*Eingestempelt*, *In der Pause*, *Ausgestempelt*).
2. **Schichttausch-Börse:**
   * Eigene Schicht auswählen $\rightarrow$ Kolleg:in auswählen $\rightarrow$ Notiz hinzufügen $\rightarrow$ Anfrage absenden.
   * Sobald Kolleg:in zustimmt, geht die Anfrage automatisch zur **Freigabe an die Einrichtungsleitung**.
3. **Urlaub & Abwesenheiten einreichen:**
   * Erholungsurlaub, Brückentage, Sonderurlaub oder Fortbildungstage per Kalender auswählen und verbindlich an die Leitung übermitteln.
4. **Morgendliche Krankmeldung:**
   * 1-Klick-Notfallmeldung $\rightarrow$ alarmiert sofort die Leitung und löst den Betreuungsschlüssel-Schutz aus.
5. **Schichtwünsche für Folgemonat:**
   * Wünsche für den nächsten Dienstplan direkt an die Leitung übermitteln.

---

## 💡 Was Mitarbeiter in der App einsehen können ("Wissen")

1. **Heutiger Dienst & Team-Partner:**
   * Genaue Dienstzeit (z.B. `08:30 – 17:30 Uhr`), Pausendauer und Gruppenraum.
   * **Wer arbeitet heute mit mir?** Live-Anzeige der Kolleg:innen in der gleichen Gruppe mit Dienstzeiten.
2. **Kinder-Besonderheiten & Allergien (Tages-Briefing):**
   * Farbige Warnhinweise direkt auf dem Startbildschirm:
     * *Felix (2J)*: Starke Erdnussallergie (Notfall-Pen im Kasten)
     * *Mia (4J)*: Laktose- & Glutenunverträglichkeit (Spezialessen)
     * *Noah (2J)*: Abholung heute um 14:30 Uhr durch Oma
3. **Live-Betreuungsschlüssel der eigenen Gruppe:**
   * Echtzeit-Ampel (z.B. `Schlüssel 1:6.2 (Grün)`).
4. **Persönliches Zeit- & Urlaubskonto:**
   * Aktueller Überstundensaldo (z.B. `+4.5 Std.`).
   * Verbleibende Resturlaubstage (z.B. `24 von 30 Tagen`).
5. **Digitale Kita-Pinnwand (Aushänge der Leitung):**
   * Wichtige Mitteilungen, Termine (z.B. Teammeetings, Fotografentag, Erste-Hilfe-Kurs) mit Prioritätskennzeichnung.
6. **Freigabestatus-Tracker:**
   * Vollständige Historie aller Anträge mit Status der Leitung:
     * `⏳ Wartet auf Leitung (Sabine Weber)`
     * `✓ Freigegeben von Sabine Weber` (inkl. Leitungsnotiz)
     * `✗ Abgelehnt` (inkl. Begründung)

---

## 🚀 Installation & Start

### Android:
Das fertig kompilierte Installationspaket (APK) liegt bereit unter:
```bash
kita_mobile/build/app/outputs/flutter-apk/app-debug.apk
```
* **Auf dem Android-Smartphone installieren:**
  * Verbinde dein Smartphone per USB und führe aus:
    ```bash
    adb install build/app/outputs/flutter-apk/app-debug.apk
    ```
  * Oder sende die `app-debug.apk` direkt an das Gerät.

### iOS:
* Öffne den iOS-Ordner in Xcode:
  ```bash
  open ios/Runner.xcworkspace
  ```
* Wähle dein Entwickler-Team unter *Signing & Capabilities* und starte die App auf deinem iPhone oder Simulator.

### Lokale Entwicklung & Live-Test:
```bash
cd kita_mobile
flutter run
```
