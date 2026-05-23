@echo off
title Lanzador de Software Informatico - USB Mode
color 0b

echo ==========================================
echo   CONFIGURANDO PUERTOS (ADB REVERSE)
echo ==========================================
:: Configuramos los tuneles para Expo, Node y PostgreSQL
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3001 tcp:3001
adb reverse tcp:5432 tcp:5432

echo.
echo [OK] Puertos sincronizados con el celular.
echo.

echo ==========================================
echo   INICIANDO BACKEND (PostgreSQL + Node)
echo ==========================================
:: Abrimos el backend en una nueva ventana
start "BACKEND - Node.js" cmd /k "cd /d "C:\Users\Dell\Desktop\proyecto_posada-main\backent" && node index.js"

echo.
echo ==========================================
echo   INICIANDO FRONTEND (React Native)
echo ==========================================
:: Abrimos el frontend en otra ventana nueva
start "FRONTEND - Expo" cmd /k "cd /d "C:\Users\Dell\Desktop\proyecto_posada-main\login-app" && npx expo start --localhost --android"

echo.
echo ------------------------------------------
echo PROCESO COMPLETADO
echo Mantén estas ventanas abiertas para trabajar.
echo ------------------------------------------
pause