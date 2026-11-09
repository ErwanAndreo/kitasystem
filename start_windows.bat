@echo off
cd /d "%~dp0"
set "PATH=%~dp0node;%PATH%"
echo ========================================================
echo    KitaPlaner Pro - Startskript (Windows)
echo ========================================================
echo.
echo Pruefe Node.js Installation...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [FEHLER] Node.js ist nicht installiert! Bitte von https://nodejs.org installieren.
    pause
    exit /b
)

if not exist "node_modules" (
    echo Installiere Abhaengigkeiten...
    call npm install
)

if not exist "dist\client" (
    echo Baue Anwendung...
    call npm run build
)

echo.
echo Starte KitaPlaner Pro auf http://localhost:3000 ...
echo Tipp: Oeffne http://localhost:3000 in Edge/Chrome und klicke auf 'App installieren',
echo um KitaPlaner als vollwertige Windows-Desktop-App zu nutzen!
echo.
rem Oeffnet den Browser erst, wenn der Server antwortet, sonst zeigt er eine Fehlerseite.
start "" /b powershell -NoProfile -Command "for($i=0;$i -lt 60;$i++){try{Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 http://localhost:3000/api/health|Out-Null;Start-Process http://localhost:3000;break}catch{Start-Sleep 1}}"
node dist\server\index.js
pause
