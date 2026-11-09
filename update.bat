@echo off
rem Alles in einer Zeile: Das Update ersetzt diese Datei, waehrend sie laeuft.
cd /d "%~dp0" & set "PATH=%~dp0node;%PATH%" & node update.mjs & pause & exit /b
