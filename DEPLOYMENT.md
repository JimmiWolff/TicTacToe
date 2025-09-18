# Azure Deployment Guide

Since Azure CLI is having compatibility issues in this environment, here are **3 working alternatives** to deploy your tic-tac-toe app to Azure for **FREE**:

## 🌐 Option 1: Azure Portal (Recommended - Easiest)

1. **Go to Azure Portal**: https://portal.azure.com
2. **Create Web App**:
   - Click "Create a resource"
   - Search "Web App" → Click "Create"
3. **Configuration**:
   ```
   Resource Group: Create new → "tic-tac-toe-rg"
   Name: tic-tac-toe-multiplayer-[yourname] (must be unique)
   Runtime Stack: Node 18 LTS
   Operating System: Linux
   Region: East US (or nearest to you)
   Pricing Plan: F1 (Free) ⭐
   ```
4. **Click**: "Review + Create" → "Create"
5. **Deploy from GitHub**:
   - Go to your new Web App
   - Click "Deployment Center" in left menu
   - Source: "GitHub"
   - Authorize GitHub access
   - Repository: `JimmiWolff/TicTacToe`
   - Branch: `main`
   - Click "Save"
6. **Enable WebSockets**:
   - Go to "Configuration" → "General settings"
   - Set "Web sockets" to "On"
   - Click "Save"

**Result**: Your app will be live at `https://your-app-name.azurewebsites.net`

---

## 🚀 Option 2: GitHub Actions (Automated)

A workflow file has been created at `.github/workflows/azure-deploy.yml`.

**Setup**:
1. Create your Azure Web App using Option 1 above
2. In Azure Portal, go to your Web App → "Deployment Center"
3. Download the "Publish Profile"
4. In GitHub, go to your repository → Settings → Secrets
5. Add secret: `AZUREAPPSERVICE_PUBLISHPROFILE` with the publish profile content
6. Push code to trigger automatic deployment!

---

## 💻 Option 3: Local Azure CLI (If you fix CLI)

Run these commands from your local machine:

```bash
# Login
az login

# Create resources
az group create --name tic-tac-toe-rg --location eastus

az appservice plan create \
  --name tic-tac-toe-plan \
  --resource-group tic-tac-toe-rg \
  --sku F1 --is-linux

az webapp create \
  --resource-group tic-tac-toe-rg \
  --plan tic-tac-toe-plan \
  --name YOUR-UNIQUE-NAME \
  --runtime "NODE|18-lts"

# Deploy from GitHub
az webapp deployment source config \
  --name YOUR-UNIQUE-NAME \
  --resource-group tic-tac-toe-rg \
  --repo-url https://github.com/JimmiWolff/TicTacToe.git \
  --branch main --manual-integration

# Enable WebSockets (essential!)
az webapp config set \
  --name YOUR-UNIQUE-NAME \
  --resource-group tic-tac-toe-rg \
  --web-sockets-enabled true
```

---

## 💰 Free Tier Details

- **F1 Free Plan**: 60 minutes/day active time
- **1GB storage** and **165MB/day bandwidth**
- **SSL certificate** included
- **Custom domain** support available

---

## ✅ After Deployment

Your multiplayer tic-tac-toe game will be live with:
- ✅ Real-time multiplayer via WebSockets
- ✅ User authentication system
- ✅ Cross-browser support
- ✅ Turn-based gameplay
- ✅ Score tracking

**Game URL**: `https://your-app-name.azurewebsites.net`

---

## 🔧 Troubleshooting

- **WebSockets not working?** Make sure you enabled Web Sockets in Configuration
- **App not starting?** Check the logs in "Log stream" or "App Service logs"
- **GitHub deployment failed?** Check "Deployment Center" for error details
- **Need help?** Use Azure Cloud Shell at https://shell.azure.com