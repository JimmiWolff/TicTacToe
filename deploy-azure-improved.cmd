@echo off
setlocal

echo Azure Deployment Script - Improved Architecture
echo ================================================

:: Set deployment variables
set DEPLOYMENT_SOURCE=%~dp0
set DEPLOYMENT_TARGET=%DEPLOYMENT_TARGET%
set KUDU_SYNC_CMD=kudusync
set KUDU_SELECT_NODE_VERSION_CMD=select-node-version

if "%DEPLOYMENT_TARGET%" == "" (
  set DEPLOYMENT_TARGET=%WEBROOT_PATH%
)

if "%DEPLOYMENT_TARGET%" == "" (
  set DEPLOYMENT_TARGET=%~dp0deploy
)

echo Deployment source: %DEPLOYMENT_SOURCE%
echo Deployment target: %DEPLOYMENT_TARGET%
echo.

:: 1. Select Node.js version
echo 1. Selecting Node.js version
call :SelectNodeVersion

:: 2. Install npm packages
echo 2. Installing npm packages
cd /d "%DEPLOYMENT_SOURCE%"
call npm install --production --silent
if errorlevel 1 goto error

:: 3. Copy files to deployment target
echo 3. Copying files to deployment target
if exist "%DEPLOYMENT_TARGET%" rmdir /s /q "%DEPLOYMENT_TARGET%"
mkdir "%DEPLOYMENT_TARGET%"

call :CopyFiles

:: 4. Install npm packages in target
echo 4. Installing npm packages in target
cd /d "%DEPLOYMENT_TARGET%"
call npm install --production --silent
if errorlevel 1 goto error

echo.
echo Deployment successful!
goto end

:SelectNodeVersion
if defined KUDU_SELECT_NODE_VERSION_CMD (
  call %KUDU_SELECT_NODE_VERSION_CMD% "%DEPLOYMENT_SOURCE%" "%DEPLOYMENT_TARGET%" "%DEPLOYMENT_TEMP%"
  if errorlevel 1 goto error
)
goto :EOF

:CopyFiles
xcopy "%DEPLOYMENT_SOURCE%\*" "%DEPLOYMENT_TARGET%\" /s /y /exclude:exclude.txt
goto :EOF

:error
echo.
echo Error occurred during deployment!
echo.
exit /b 1

:end
echo.
echo Deployment completed successfully!