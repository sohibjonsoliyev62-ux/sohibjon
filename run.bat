@echo off
cd /d "%~dp0"
echo Kutubxonalar tekshirilmoqda...
python -m pip install -r requirements.txt --quiet
echo AI Virtual Mouse ishga tushmoqda...
python main.py %*
pause
