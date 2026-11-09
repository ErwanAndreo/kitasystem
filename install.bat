@echo off
setlocal
rem KitaPlaner-Installer: Diese eine Datei genuegt, alles Weitere wird heruntergeladen.
set "TARGET=%USERPROFILE%\KitaPlaner"
set "NODE=node-v22.20.0-win-x64"

if exist "%TARGET%\kita.sqlite" goto installed
if not exist "%TARGET%" mkdir "%TARGET%"
cd /d "%TARGET%" || goto fail
if exist "node\node.exe" goto download_app

echo Lade Node.js...
powershell -NoProfile -Command "$ProgressPreference='SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol='Tls12'; Invoke-WebRequest 'https://nodejs.org/dist/v22.20.0/%NODE%.zip' -OutFile 'node.zip'" || goto fail
"%SystemRoot%\System32\tar.exe" -xf node.zip || goto fail
ren "%NODE%" node || goto fail
del node.zip

:download_app
echo Lade KitaPlaner...
powershell -NoProfile -Command "$ProgressPreference='SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol='Tls12'; Invoke-WebRequest 'https://raw.githubusercontent.com/ErwanAndreo/kitasystem/main/update.mjs' -OutFile 'update.mjs'" || goto fail
set "PATH=%TARGET%\node;%PATH%"
node update.mjs || goto fail
call start_windows.bat
exit /b 0

:installed
echo KitaPlaner ist bereits installiert: %TARGET%
echo Zum Aktualisieren dort update.bat starten.
pause
exit /b 1

:fail
echo.
echo Die Installation ist fehlgeschlagen. Bitte die Meldung oben weitergeben.
pause
exit /b 1
