@echo off
REM PieTracker Backend Startup Script
echo Starting PieTracker Backend...
echo.

REM Check if .env file exists
if not exist .env (
    echo WARNING: .env file not found!
    echo Please create a .env file with your DATABASE_URL
    echo.
)

REM Check if virtual environment is activated
if not defined VIRTUAL_ENV (
    echo INFO: Virtual environment not detected
    echo Activating virtual environment...
    call ..\.venv\Scripts\activate.bat
)

REM Install/update dependencies
echo Installing dependencies...
pip install -r requirements.txt

echo.
echo Starting uvicorn server...
uvicorn main:app --reload --host 0.0.0.0 --port 8000