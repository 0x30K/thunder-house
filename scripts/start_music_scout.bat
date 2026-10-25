@echo off
title Thunder House Music Scout Engine
echo ========================================================
echo   THUNDER HOUSE ENT - NEW MUSIC SCOUT & INGEST ENGINE
echo   Target: E:\Thunder House - Music\Music of the Week
echo ========================================================
echo.
cd /d "%~dp0\.."
python scripts\music_scout_engine.py
pause
