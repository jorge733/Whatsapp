@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Bot de moderacion WhatsApp - NO CERRAR esta ventana
if not exist node_modules (
  echo Instalando componentes, espera un momento...
  call npm install --omit=dev
)
if not exist .env (
  call npm run configurar
)
call npm start
pause
