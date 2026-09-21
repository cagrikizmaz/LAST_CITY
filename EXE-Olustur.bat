@echo off
setlocal
cd /d "%~dp0"
call npm.cmd run desktop:exe
if errorlevel 1 (
 echo EXE olusturulamadi. Yukaridaki hatayi kontrol edin.
 pause
 exit /b 1
)
explorer.exe /select,"%~dp0artifacts\windows\Farming-Kurulum.exe"
echo Farming-Kurulum.exe hazir. Hizli acilis icin bir kez kurun.
pause
