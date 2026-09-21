@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { $p = Start-Process powershell.exe -Verb RunAs -Wait -PassThru -ArgumentList '-NoProfile -ExecutionPolicy Bypass -NoExit -File ""%~dp0scripts\repair-lan-firewall.ps1""'; exit $p.ExitCode } catch { Write-Host $_; exit 1 }"
if errorlevel 1 pause
