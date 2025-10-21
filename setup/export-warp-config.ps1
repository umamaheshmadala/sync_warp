# Export Warp Configuration Script
# Run this to export your current Warp rules and MCPs for team sharing

Write-Host "🔄 Exporting Warp Configuration..." -ForegroundColor Cyan

# Create setup directory if it doesn't exist
$setupDir = ".\setup"
if (-not (Test-Path $setupDir)) {
    New-Item -ItemType Directory -Path $setupDir -Force
    Write-Host "✅ Created setup directory" -ForegroundColor Green
}

# Export current rules (manual copy from Warp UI required)
$rulesExport = @{
    "rules" = @(
        @{
            "document_type" = "RULE"
            "document_id" = "yCm2e9oHOnrU5qbhrGa2IE"
            "rule_name" = "All MCP Rules"
            "description" = "Global development router for efficient coding"
            "trigger_patterns" = @(".*")
            "priority" = 100
            "actions" = "Route commands to appropriate MCPs"
        },
        @{
            "document_type" = "RULE"
            "document_id" = "YeMZqNNtGJHhiCDFVLBFl6"
            "rule_name" = "Context 7 MCP"
            "description" = "Route project analysis and code explanation to Context 7"
            "trigger_patterns" = @("*explain*", "*summarize*", "*refactor*", "*analyze*")
            "priority" = 100
            "actions" = "Use Context 7 MCP for code intelligence"
        },
        @{
            "document_type" = "RULE"
            "document_id" = "IS4NiSAvhnumY2cKNCv6su"
            "rule_name" = "Chrome DevTools vs Puppeteer MCP"
            "description" = "Smart frontend testing tool selection"
            "trigger_patterns" = @("*debug frontend*", "*inspect*", "*e2e*", "*automated test*")
            "priority" = 90
            "actions" = "Route to DevTools for manual debug, Puppeteer for automation"
        },
        @{
            "document_type" = "RULE"
            "document_id" = "wcSakMTbr6ksUsjt43GZqZ"
            "rule_name" = "Supabase Tables"
            "description" = "Route all DB operations to Supabase MCP"
            "trigger_patterns" = @("*supabase*", "*sql*", "*database*")
            "priority" = 90
            "actions" = "Use Supabase MCP for database interactions"
        },
        @{
            "document_type" = "RULE"
            "document_id" = "KfaNgncA1ZiuhZwfl5KBcT"
            "rule_name" = "Netlify vs Hot Reloading"
            "description" = "Enforce hot-reloading for dev, Netlify for build/deploy only"
            "trigger_patterns" = @("*netlify*")
            "priority" = 80
            "actions" = "Allow only build/deploy commands to Netlify"
        },
        @{
            "document_type" = "RULE"
            "document_id" = "4Enbc2LgwyPs8CT7Q3m5rM"
            "rule_name" = "Shadcn MCP"
            "description" = "UI component scaffolding with natural language"
            "trigger_patterns" = @("*shadcn*", "*component*", "*ui*", "*scaffold*")
            "priority" = 85
            "actions" = "Use shadcn MCP for component generation"
        },
        @{
            "document_type" = "RULE"
            "document_id" = "eLYncXKBH3A0lWnWCjjm8b"
            "rule_name" = "Keep Dev Server Running"
            "description" = "Always monitor and restart dev server when needed"
            "trigger_patterns" = @("*dev*", "*server*")
            "priority" = 85
            "actions" = "Monitor and maintain local development server"
        }
    )
    "export_date" = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "export_version" = "1.0"
    "project" = "sync_warp"
}

# Export MCPs configuration
$mcpsExport = @{
    "mcps" = @(
        @{
            "name" = "context7"
            "description" = "Code analysis and intelligent navigation"
            "capabilities" = @("code_explanation", "refactoring", "project_analysis")
        },
        @{
            "name" = "supabase"
            "description" = "Database operations and SQL execution"
            "capabilities" = @("sql_execution", "table_management", "auth_policies")
        },
        @{
            "name" = "netlify"
            "description" = "Build, deploy, and site management"
            "capabilities" = @("site_deployment", "build_management", "form_handling")
        },
        @{
            "name" = "github"
            "description" = "Repository, issue, and PR management"
            "capabilities" = @("repo_management", "issue_tracking", "pr_reviews")
        },
        @{
            "name" = "chrome-devtools"
            "description" = "Frontend debugging and inspection"
            "capabilities" = @("dom_inspection", "network_monitoring", "performance_analysis")
        },
        @{
            "name" = "puppeteer"
            "description" = "Automated E2E testing"
            "capabilities" = @("automated_testing", "screenshot_capture", "form_automation")
        },
        @{
            "name" = "shadcn"
            "description" = "UI component scaffolding"
            "capabilities" = @("component_generation", "ui_scaffolding", "design_system")
        },
        @{
            "name" = "memory"
            "description" = "Context and preference storage"
            "capabilities" = @("context_storage", "user_preferences", "session_memory")
        }
    )
    "export_date" = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "export_version" = "1.0"
    "project" = "sync_warp"
}

# Save exports to JSON files
$rulesPath = Join-Path $setupDir "warp-rules-export.json"
$mcpsPath = Join-Path $setupDir "warp-mcps-export.json"

$rulesExport | ConvertTo-Json -Depth 10 | Out-File -FilePath $rulesPath -Encoding UTF8
$mcpsExport | ConvertTo-Json -Depth 10 | Out-File -FilePath $mcpsPath -Encoding UTF8

Write-Host "✅ Exported rules to: $rulesPath" -ForegroundColor Green
Write-Host "✅ Exported MCPs to: $mcpsPath" -ForegroundColor Green

# Create environment template
$envTemplate = @"
# SynC Warp Project Environment Variables
# Copy this to .env and fill in your actual values

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Netlify Configuration  
NETLIFY_AUTH_TOKEN=your_netlify_auth_token
NETLIFY_SITE_ID=your_site_id

# GitHub Configuration
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_REPO=umamaheshmadala/sync_warp

# Development Configuration
NODE_ENV=development
PORT=5173
VITE_APP_NAME=SynC

# Optional: Database URLs for different environments
DATABASE_URL_DEV=your_dev_database_url
DATABASE_URL_STAGING=your_staging_database_url
DATABASE_URL_PROD=your_prod_database_url
"@

$envPath = Join-Path $setupDir ".env.template"
$envTemplate | Out-File -FilePath $envPath -Encoding UTF8
Write-Host "✅ Created environment template: $envPath" -ForegroundColor Green

# Create quick setup script for team members
$quickSetup = @"
# Quick Setup Script for Team Members
# Run this after cloning the repository

Write-Host "🚀 Setting up SynC Warp development environment..." -ForegroundColor Cyan

# 1. Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

# 2. Copy environment template
if (-not (Test-Path ".env")) {
    Copy-Item "setup/.env.template" ".env"
    Write-Host "📝 Created .env file from template. Please fill in your values!" -ForegroundColor Yellow
    Write-Host "⚠️  You need to add your actual API keys and tokens to .env" -ForegroundColor Red
} else {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
}

# 3. Start development server
Write-Host "🔥 Starting development server..." -ForegroundColor Yellow
Write-Host "💡 Your Warp rules will automatically manage the dev server" -ForegroundColor Cyan

npm run dev
"@

$quickSetupPath = Join-Path $setupDir "quick-setup.ps1"
$quickSetup | Out-File -FilePath $quickSetupPath -Encoding UTF8
Write-Host "✅ Created quick setup script: $quickSetupPath" -ForegroundColor Green

# Instructions
Write-Host "`n🎯 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Commit these files to your repository" -ForegroundColor White
Write-Host "2. Share the repository with your team member" -ForegroundColor White
Write-Host "3. Team member should follow setup/warp-team-setup.md" -ForegroundColor White
Write-Host "4. Team member can run setup/quick-setup.ps1 for fast onboarding" -ForegroundColor White

Write-Host "`n💡 Pro Tips:" -ForegroundColor Yellow
Write-Host "- Export your actual Warp rules from Settings > Rules > Export" -ForegroundColor White
Write-Host "- Export your actual MCPs from Settings > MCPs > Export" -ForegroundColor White
Write-Host "- Replace the generated files with your actual exports for best results" -ForegroundColor White

Write-Host "`n✅ Configuration export complete!" -ForegroundColor Green