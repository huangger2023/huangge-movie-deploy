@echo off
title 荒哥说电影 - 一键启动
echo ========================================
echo  荒哥说电影 - 一键启动
echo ========================================
echo.

start "Next.js" cmd /c "cd /d D:\Hgdev\荒哥独选 && npm run dev"
echo [1/3] Next.js (localhost:3000)

timeout /t 5 /nobreak >nul

start "Python-Agent" cmd /c "cd /d D:\Hgdev\荒哥独选\livekit-agent-python && python agent.py dev"
echo [2/3] Python LiveKit Agent

echo.
echo ========================================
echo  打开 http://localhost:3000
echo  关闭窗口停止所有服务
echo ========================================
pause
