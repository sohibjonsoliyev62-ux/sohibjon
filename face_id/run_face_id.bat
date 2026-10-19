@echo off
cd /d "%~dp0"
echo Kutubxonalar tekshirilmoqda...
python -m pip install "opencv-python>=4.8" numpy --quiet
echo Face ID ishga tushmoqda...
python face_id.py %*
pause
