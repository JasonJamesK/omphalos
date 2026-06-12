@echo off
setlocal

if not exist .env (
    echo [ERROR] .env file not found.
    echo Copy .env.example to .env and fill in your values first.
    echo.
    echo   copy .env.example .env
    echo.
    pause
    exit /b 1
)

echo Starting Omphalos stack...
docker compose up -d --build

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Docker Compose failed. Is Docker Desktop running?
    pause
    exit /b 1
)

echo.
echo Omphalos is running.

for /f "tokens=2 delims==" %%a in ('findstr /i "API_PORT" .env') do set PORT=%%a
if "%PORT%"=="" set PORT=8080

echo Open: http://localhost:%PORT%
echo.
echo To stop:  docker compose down
echo To logs:  docker compose logs -f
echo.
endlocal
