#!/bin/bash

# Azure Deployment Script for Tic-Tac-Toe Multiplayer Game
# Run this script from your local machine with Azure CLI installed

echo "🚀 Deploying Tic-Tac-Toe to Azure..."

# Configuration
RESOURCE_GROUP="tic-tac-toe-rg"
APP_SERVICE_PLAN="tic-tac-toe-plan"
WEB_APP_NAME="tic-tac-toe-multiplayer-$(date +%s)"  # Unique name with timestamp
LOCATION="eastus"
RUNTIME="NODE|18-lts"
REPO_URL="https://github.com/JimmiWolff/TicTacToe.git"
BRANCH="main"

echo "📋 Configuration:"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  App Service Plan: $APP_SERVICE_PLAN"
echo "  Web App Name: $WEB_APP_NAME"
echo "  Location: $LOCATION"
echo "  Runtime: $RUNTIME"
echo ""

# Step 1: Login to Azure (if not already logged in)
echo "🔐 Checking Azure login status..."
az account show > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Please login to Azure:"
    az login
fi

# Step 2: Create Resource Group
echo "📁 Creating resource group..."
az group create \
    --name $RESOURCE_GROUP \
    --location $LOCATION

if [ $? -eq 0 ]; then
    echo "✅ Resource group created successfully"
else
    echo "❌ Failed to create resource group"
    exit 1
fi

# Step 3: Create App Service Plan (Free Tier)
echo "📋 Creating App Service Plan (Free F1 tier)..."
az appservice plan create \
    --name $APP_SERVICE_PLAN \
    --resource-group $RESOURCE_GROUP \
    --sku F1 \
    --is-linux

if [ $? -eq 0 ]; then
    echo "✅ App Service Plan created successfully"
else
    echo "❌ Failed to create App Service Plan"
    exit 1
fi

# Step 4: Create Web App
echo "🌐 Creating Web App..."
az webapp create \
    --resource-group $RESOURCE_GROUP \
    --plan $APP_SERVICE_PLAN \
    --name $WEB_APP_NAME \
    --runtime $RUNTIME

if [ $? -eq 0 ]; then
    echo "✅ Web App created successfully"
else
    echo "❌ Failed to create Web App"
    exit 1
fi

# Step 5: Configure deployment from GitHub
echo "🔄 Setting up GitHub deployment..."
az webapp deployment source config \
    --name $WEB_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --repo-url $REPO_URL \
    --branch $BRANCH \
    --manual-integration

if [ $? -eq 0 ]; then
    echo "✅ GitHub deployment configured successfully"
else
    echo "❌ Failed to configure GitHub deployment"
    exit 1
fi

# Step 6: Enable WebSockets (required for Socket.IO)
echo "🔌 Enabling WebSockets..."
az webapp config set \
    --name $WEB_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --web-sockets-enabled true

if [ $? -eq 0 ]; then
    echo "✅ WebSockets enabled successfully"
else
    echo "❌ Failed to enable WebSockets"
fi

# Step 7: Show deployment status
echo "📊 Getting deployment status..."
az webapp deployment source show \
    --name $WEB_APP_NAME \
    --resource-group $RESOURCE_GROUP

echo ""
echo "🎉 Deployment completed!"
echo ""
echo "🌐 Your tic-tac-toe game will be available at:"
echo "   https://$WEB_APP_NAME.azurewebsites.net"
echo ""
echo "⏳ Note: Initial deployment may take 5-10 minutes"
echo "💰 Free tier limitations: 60 minutes/day active time"
echo ""
echo "🔧 To monitor deployment:"
echo "   az webapp log tail --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP"
echo ""
echo "🗑️ To delete resources when done:"
echo "   az group delete --name $RESOURCE_GROUP --yes --no-wait"