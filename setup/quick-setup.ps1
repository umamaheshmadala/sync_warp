# Quick Setup Script for Team Members
# Run this after cloning the repository

Write-Host "ðŸš€ Setting up SynC Warp development environment..." -ForegroundColor Cyan

# 1. Install dependencies
Write-Host "ðŸ“¦ Installing dependencies..." -ForegroundColor Yellow
npm install

# 2. Copy environment template
if (-not (Test-Path ".env")) {
    Copy-Item "setup/.env.template" ".env"
    Write-Host "ðŸ“ Created .env file from template. Please fill in your values!" -ForegroundColor Yellow
    Write-Host "âš ï¸  You need to add your actual API keys and tokens to .env" -ForegroundColor Red
} else {
    Write-Host "âœ… .env file already exists" -ForegroundColor Green
}

# 3. Start development server
Write-Host "ðŸ”¥ Starting development server..." -ForegroundColor Yellow
Write-Host "ðŸ’¡ Your Warp rules will automatically manage the dev server" -ForegroundColor Cyan

npm run dev
