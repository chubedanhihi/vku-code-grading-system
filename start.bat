@echo off
echo ==============================================
echo   VKU CODE GRADING SYSTEM - STARTUP SCRIPT
echo ==============================================

echo [1/3] Khoi dong Docker MySQL...
docker-compose up -d

echo [2/3] Khoi dong Backend Spring Boot...
start "VKU Backend (Port 8080)" cmd /k "cd backend && java -jar target\backend-0.0.1-SNAPSHOT.jar"

echo [3/3] Khoi dong Frontend React Vite...
start "VKU Frontend (Port 5173)" cmd /k "cd frontend && npx vite --host 0.0.0.0 --port 5173"

echo.
echo ==============================================
echo He thong dang khoi dong!
echo Frontend: http://localhost:5173/
echo Backend:  http://localhost:8080/
echo ==============================================
pause
