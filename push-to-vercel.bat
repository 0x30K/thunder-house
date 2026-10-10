@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo   THUNDER HOUSE ENT - PUSH TO GITHUB & VERCEL
echo ========================================================
echo.

:: Ensure git identity
git config user.name "0x30K"
git config user.email "olifedigital@gmail.com"

:: Verify remote origin
git remote get-url origin >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [*] Setting remote origin to https://github.com/0x30K/thunder-house.git...
    git remote add origin https://github.com/0x30K/thunder-house.git
)

:: Ensure on main branch
git branch -M main

:: Stage all changes (excluding items in .gitignore)
echo [*] Staging files...
git add .

:: Check if there are changes to commit
git diff --cached --quiet
if %ERRORLEVEL% EQU 0 (
    echo [i] No new changes to commit.
) else (
    set /p "COMMIT_MSG=Enter commit message (Press Enter for default): "
    if "!COMMIT_MSG!"=="" (
        set "COMMIT_MSG=feat(site): Update Thunder House ENT site and admin backend"
    )
    echo [*] Committing as olifedigital@gmail.com...
    git commit -m "!COMMIT_MSG!"
)

:: Push to GitHub
echo [*] Pushing to https://github.com/0x30K/thunder-house (branch: main)...
git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo   SUCCESSFULLY PUSHED TO GITHUB!
    echo   Vercel deployment has been triggered automatically.
    echo ========================================================
    echo   GitHub: https://github.com/0x30K/thunder-house
    echo.
) else (
    echo.
    echo [X] Error pushing to GitHub. Please check your credentials or network.
    echo.
)

pause
