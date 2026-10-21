@echo off
echo ====================================================
echo        KitaPlaner Pro - Server wird gestartet
echo ====================================================
echo.
cd /d "%~dp0"

if not exist "node_modules" (
    echo Installiere Abhaengigkeiten...
    npm install
)

if not exist "dist" (
    echo Kompiliere Anwendung...
    npm run build
)

echo.
echo Server laeuft auf: http://localhost:3000
echo Zum Beenden dieses Fenster schliessen oder Strg+C druecken.
echo.
npm run start
pause
