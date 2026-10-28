@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Node.js belum dipasang. Pasang Node.js LTS dahulu, kemudian buka fail ini semula.
 pause
 exit /b 1
)
set /p "HOST_PIN=Masukkan kod hos pilihan anda (6-12 digit): "
node server.js
pause
