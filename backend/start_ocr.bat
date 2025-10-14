@echo off
echo Starting PieTracker Backend with OCR support...
echo Virtual environment should be activated
echo.

REM Check if we're in virtual environment
python -c "import sys; print('Python path:', sys.executable)"
echo.

REM Test OCR dependencies
echo Testing OCR dependencies...
python -c "from PIL import Image; import google.generativeai as genai; print('✅ Dependencies OK')" 2>nul
if errorlevel 1 (
    echo ❌ Missing dependencies. Installing...
    pip install google-generativeai pillow python-magic-bin
)

echo.
echo Starting server on http://localhost:8000
echo Press Ctrl+C to stop
echo.

uvicorn main:app --reload --host 0.0.0.0 --port 8000