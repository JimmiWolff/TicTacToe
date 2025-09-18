@echo off
REM Azure Deployment Script for Tic-Tac-Toe Multiplayer Game (Windows)
REM Run this script from your local machine with Azure CLI installed

echo 🚀 Deploying Tic-Tac-Toe to Azure...

REM Configuration
set RESOURCE_GROUP=tic-tac-toe-rg
set APP_SERVICE_PLAN=tic-tac-toe-plan
set WEB_APP_NAME=tic-tac-toe-multiplayer-%RANDOM%
set LOCATION=eastus
set RUNTIME=NODE^|18-lts
set REPO_URL=https://github.com/JimmiWolff/TicTacToe.git
set BRANCH=main

echo 📋 Configuration:
echo   Resource Group: %RESOURCE_GROUP%
echo   App Service Plan: %APP_SERVICE_PLAN%
echo   Web App Name: %WEB_APP_NAME%
echo   Location: %LOCATION%
echo   Runtime: %RUNTIME%
echo.

REM Step 1: Login check
echo 🔐 Checking Azure login status...
az account show >nul 2>&1
if %errorlevel% neq 0 (
    echo Please login to Azure:
    az login
)

REM Step 2: Create Resource Group
echo 📁 Creating resource group...
az group create --name %RESOURCE_GROUP% --location %LOCATION%
if %errorlevel% neq 0 (
    echo ❌ Failed to create resource group
    pause
    exit /b 1
)
echo ✅ Resource group created successfully

REM Step 3: Create App Service Plan (Free Tier)
echo 📋 Creating App Service Plan (Free F1 tier)...
az appservice plan create --name %APP_SERVICE_PLAN% --resource-group %RESOURCE_GROUP% --sku F1 --is-linux
if %errorlevel% neq 0 (
    echo ❌ Failed to create App Service Plan
    pause
    exit /b 1
)
echo ✅ App Service Plan created successfully

REM Step 4: Create Web App
echo 🌐 Creating Web App...
az webapp create --resource-group %RESOURCE_GROUP% --plan %APP_SERVICE_PLAN% --name %WEB_APP_NAME% --runtime "%RUNTIME%"
if %errorlevel% neq 0 (
    echo ❌ Failed to create Web App
    pause
    exit /b 1
)
echo ✅ Web App created successfully

REM Step 5: Configure deployment from GitHub
echo 🔄 Setting up GitHub deployment...
az webapp deployment source config --name %WEB_APP_NAME% --resource-group %RESOURCE_GROUP% --repo-url %REPO_URL% --branch %BRANCH% --manual-integration
if %errorlevel% neq 0 (
    echo ❌ Failed to configure GitHub deployment
    pause
    exit /b 1
)
echo ✅ GitHub deployment configured successfully

REM Step 6: Enable WebSockets
echo 🔌 Enabling WebSockets...
az webapp config set --name %WEB_APP_NAME% --resource-group %RESOURCE_GROUP% --web-sockets-enabled true
if %errorlevel% neq 0 (
    echo ❌ Failed to enable WebSockets
)
echo ✅ WebSockets enabled successfully

echo.
echo 🎉 Deployment completed!
echo.
echo 🌐 Your tic-tac-toe game will be available at:
echo    https://%WEB_APP_NAME%.azurewebsites.net
echo.
echo ⏳ Note: Initial deployment may take 5-10 minutes
echo 💰 Free tier limitations: 60 minutes/day active time
echo.
echo 🔧 To monitor deployment:
echo    az webapp log tail --name %WEB_APP_NAME% --resource-group %RESOURCE_GROUP%
echo.
echo 🗑️ To delete resources when done:
echo    az group delete --name %RESOURCE_GROUP% --yes --no-wait
echo.
pause