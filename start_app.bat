@echo off
title Amruta - Rice Team ^| AMRUTA Logistics Decision Support System
echo =====================================================================
echo  Amruta - Rice Team ^| MSO-103 Optimisation Models for Managers
echo  AMRUTA Logistics Decision Support System (HFFVRPTW)
echo =====================================================================
echo.
echo 1. Opening interactive dashboard in default browser...
start "" "%~dp0app\index.html"
echo.
echo 2. Launching local Python server on http://localhost:8000 ...
python "%~dp0server.py"
pause
