@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\build-android.ps1"
if errorlevel 1 (
  echo APK olusturulamadi. Yukaridaki hata mesajini kontrol edin.
  pause
  exit /b 1
)
explorer.exe /select,"%~dp0artifacts\Farming.apk"
echo Farming.apk hazir.
pause
