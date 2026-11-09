@echo off
setlocal
rem KitaPlaner-Installer: Diese eine Datei genuegt, alles Weitere wird heruntergeladen.
rem Die Version steht im Dateinamen und wird bei jeder Aenderung erhoeht.

rem Fordert Admin-Rechte an und uebergibt das Benutzerprofil, denn ein anderes Admin-Konto haette ein anderes.
if not "%~1"=="" goto elevated
net session >nul 2>&1 && goto elevated
set "SELF=%~f0"
echo Bitte die Windows-Abfrage fuer Administratorrechte bestaetigen...
rem cmd /k haelt das Fenster offen; die aeusseren Anfuehrungszeichen entfernt cmd selbst.
powershell -NoProfile -Command "$q=[char]34; Start-Process cmd.exe -Verb RunAs -ArgumentList ('/k ' + $q + $q + $env:SELF + $q + ' ' + $q + $env:USERPROFILE + $q + $q)" || goto denied
exit /b 0

:elevated
set "TARGET=%USERPROFILE%\KitaPlaner"
if not "%~1"=="" set "TARGET=%~1\KitaPlaner"
set "NODE=node-v22.20.0-win-x64"
echo Installiere nach %TARGET%
echo.

if exist "%TARGET%\kita.sqlite" goto installed
if not exist "%TARGET%" mkdir "%TARGET%"
cd /d "%TARGET%" || goto fail
if exist "node\node.exe" goto download_app

echo Lade Node.js...
powershell -NoProfile -Command "$ProgressPreference='SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol='Tls12'; Invoke-WebRequest 'https://nodejs.org/dist/v22.20.0/%NODE%.zip' -OutFile 'node.zip'" || goto fail
rem Direkt in den Zielordner entpacken: Umbenennen scheitert, solange der Virenscanner die neuen Dateien prueft.
if not exist "node" mkdir "node"
"%SystemRoot%\System32\tar.exe" -xf node.zip -C node --strip-components=1 || goto fail
del node.zip
rem Reste eines frueheren, abgebrochenen Versuchs
rmdir /s /q "%NODE%" 2>nul

:download_app
echo Lade KitaPlaner...
powershell -NoProfile -Command "$ProgressPreference='SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol='Tls12'; Invoke-WebRequest 'https://raw.githubusercontent.com/ErwanAndreo/kitasystem/main/update.mjs' -OutFile 'update.mjs'" || goto fail
set "PATH=%TARGET%\node;%PATH%"
node update.mjs || goto fail
powershell -NoProfile -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('CommonDesktopDirectory')+'\KitaPlaner.lnk'); $s.TargetPath=$env:TARGET+'\start_windows.bat'; $s.WorkingDirectory=$env:TARGET; $s.Save()" || echo Die Desktop-Verknuepfung konnte nicht angelegt werden.
echo.
echo Installation abgeschlossen. Dieses Fenster kann geschlossen werden.
rem Ueber Explorer startet der Server ohne Admin-Rechte; er braucht sie nicht.
explorer.exe "%TARGET%\start_windows.bat"
exit /b 0

:denied
echo.
echo Ohne Administratorrechte wird nicht installiert.
pause
exit /b 1

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
