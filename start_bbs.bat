@echo off
title MaNiAc BBS - Web Rebirth
cd /d "%~dp0"

echo ========================================
echo        MaNiAc BBS - Web Rebirth
echo ========================================
echo.

echo [1/3] Checking dependencies...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] ERROR: Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo [2/3] node_modules not found. Installing dependencies...
    npm install
) else (
    echo [2/3] node_modules found. Skipping install.
)

echo [3/3] Starting MaNiAc BBS Server...
echo.
echo Server will be available at: http://localhost:3000
echo Press Ctrl+C to stop the server.
echo ----------------------------------------
echo.

node server.js
pause
