@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install the LTS version from https://nodejs.org and run this file again.
  pause
  exit /b 1
)
if not exist .env call npm run setup
if not exist .env (
  pause
  exit /b 1
)
call npm run check
start "Sasan clinic server" cmd /k npm start
timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:8080
