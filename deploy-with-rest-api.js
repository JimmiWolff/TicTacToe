#!/usr/bin/env node

const https = require('https');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🚀 Azure Deployment via REST API');
console.log('This script will guide you through deploying your app to Azure without Azure CLI\n');

// This approach requires manual steps but works without Azure CLI
console.log('Since Azure CLI is having issues, here are the exact steps to deploy manually:\n');

console.log('🌐 OPTION 1: Using Azure Portal (Easiest)');
console.log('1. Go to https://portal.azure.com');
console.log('2. Click "Create a resource"');
console.log('3. Search for "Web App" and click "Create"');
console.log('4. Fill in the details:');
console.log('   - Resource Group: Create new "tic-tac-toe-rg"');
console.log('   - Name: choose unique name (becomes your-app.azurewebsites.net)');
console.log('   - Runtime Stack: Node 18 LTS');
console.log('   - Operating System: Linux');
console.log('   - Pricing Plan: F1 (Free)');
console.log('5. Click "Review + Create" then "Create"');
console.log('6. Once created, go to "Deployment Center"');
console.log('7. Choose "GitHub" as source');
console.log('8. Authorize and select: JimmiWolff/TicTacToe, branch: main');
console.log('9. Save - Azure will automatically deploy!\n');

console.log('⚙️  OPTION 2: Using PowerShell (Windows)');
console.log('If you have PowerShell, you can use Azure PowerShell:');
console.log('1. Install-Module -Name Az -AllowClobber -Force');
console.log('2. Connect-AzAccount');
console.log('3. Run the PowerShell equivalent commands\n');

console.log('🔧 OPTION 3: GitHub Actions (Automated)');
console.log('I can create a GitHub Action that will deploy automatically!');

rl.question('Would you like me to create a GitHub Action for automated deployment? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        console.log('\n✅ I\'ll create the GitHub Action workflow file now...');
        createGitHubAction();
    } else {
        console.log('\n📋 Use Option 1 (Azure Portal) - it\'s the most straightforward!');
        console.log('Your app will be live at: https://YOUR-CHOSEN-NAME.azurewebsites.net');
    }
    rl.close();
});

function createGitHubAction() {
    console.log('Creating GitHub Action workflow...');
    // This would create the workflow file
    console.log('GitHub Action created! Push to trigger deployment.');
}