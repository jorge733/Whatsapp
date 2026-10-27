@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Configurar bot
if not exist node_modules (
  echo Instalando componentes, espera un momento...
  call npm install --omit=dev
)
call npm run configurar
pause
