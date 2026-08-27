@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在启动心院人格 H5...
echo 启动后请在浏览器打开 http://127.0.0.1:4173
node server.mjs
pause
