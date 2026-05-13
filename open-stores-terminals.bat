@echo off
REM Opens three Cmd windows: FE + Admin dev servers, BE Django with venv.
REM Keep this .bat next to Stores-FE, Stores-Admin, and Stores-BE.

cd /d "%~dp0"

start "Stores-FE" cmd /k "pushd Stores-FE && npm run dev"
start "Stores-Admin" cmd /k "pushd Stores-Admin && npm run dev"
start "Stores-BE" cmd /k "pushd Stores-BE && call venv\Scripts\activate.bat && python manage.py runserver 0.0.0.0:8000"
