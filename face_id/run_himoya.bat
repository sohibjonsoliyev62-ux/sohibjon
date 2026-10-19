@echo off
cd /d "%~dp0"
python -m pip install "opencv-python>=4.8" numpy --quiet
echo Face ID HIMOYA rejimi: notanish yuz yoki siz ketsangiz kompyuter qulflanadi.
python face_id.py --lock %*
pause
