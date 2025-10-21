# Warp Team Setup Guide

## 🚀 Quick Team Onboarding

### Prerequisites
1. Install [Warp Terminal](https://www.warp.dev/)
2. Clone this repository: `git clone https://github.com/umamaheshmadala/sync_warp.git`
3. Navigate to project directory: `cd sync_warp`

### Method 1: Import Configuration Files

#### Step 1: Import Rules
1. Open Warp Settings (Ctrl/Cmd + ,)
2. Go to "Rules" section
3. Click "Import Rules"
4. Select `setup/warp-rules-export.json` (if available)

#### Step 2: Import MCPs
1. In Warp Settings, go to "MCPs" section
2. Click "Import MCPs" 
3. Select `setup/warp-mcps-export.json` (if available)

### Method 2: Manual Setup (Current Rules)

#### Configure These MCPs:
```json
{
  "mcps": [
    {
      "name": "context7",
      "description": "Code analysis and intelligent navigation"
    },
    {
      "name": "supabase", 
      "description": "Database operations and SQL execution"
    },
    {
      "name": "netlify",
      "description": "Build, deploy, and site management"
    },
    {
      "name": "github",
      "description": "Repository, issue, and PR management"
    },
    {
      "name": "chrome-devtools",
      "description": "Frontend debugging and inspection"
    },
    {
      "name": "puppeteer",
      "description": "Automated E2E testing"
    },
    {
      "name": "shadcn",
      "description": "UI component scaffolding"
    },
    {
      "name": "memory",
      "description": "Context and preference storage"
    }
  ]
}
```

#### Configure These Rules:

1. **Global Development Router**
   - **ID**: `global-dev-mcps`
   - **Description**: Routes commands to appropriate MCPs
   - **Trigger**: `.*` (all commands)
   - **Priority**: 100

2. **Context 7 MCP Router**
   - **ID**: `global-context7`
   - **Description**: Routes analysis/explanation to Context7
   - **Trigger**: `*explain*`, `*summarize*`, `*refactor*`, `*analyze*`
   - **Priority**: 100

3. **Frontend Testing Router**  
   - **ID**: `smart-frontend-testing`
   - **Description**: Routes to DevTools or Puppeteer based on task
   - **Trigger**: Frontend file extensions, debug commands
   - **Priority**: 90

4. **Dev Server Rule**
   - **ID**: `keep-dev-server-running`
   - **Description**: Always monitor and restart dev server
   - **Trigger**: Development commands
   - **Priority**: 85

5. **Supabase Database Rule**
   - **ID**: `supabase-sql-routing`
   - **Description**: Route all SQL/DB ops to Supabase MCP
   - **Trigger**: `*supabase*`, `*sql*`, `*database*`
   - **Priority**: 90

6. **Netlify Build Rule**
   - **ID**: `netlify-vs-hot-reloading`
   - **Description**: Enforce hot-reloading for dev, Netlify for build/deploy only
   - **Trigger**: `*netlify*`
   - **Priority**: 80

7. **Shadcn MCP Rule**
   - **ID**: `shadcn-mcp-usage`
   - **Description**: UI component scaffolding with natural language
   - **Trigger**: `*shadcn*`, `*component*`, `*ui*`
   - **Priority**: 85

### Method 3: Team Workspace (Advanced)

#### Option A: Warp Teams Feature
1. Create a Warp Team workspace
2. Invite team members
3. Share rules and MCPs through team settings

#### Option B: Configuration Repository
1. Create `warp-config` branch in this repo
2. Export and commit your Warp settings
3. Team members can import from the branch

### Environment Variables Needed

```bash
# Add these to your .env file
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
NETLIFY_AUTH_TOKEN=your_netlify_token
GITHUB_TOKEN=your_github_token
```

### Project-Specific Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Dev Server**:
   ```bash
   npm run dev
   ```

3. **Database Setup**:
   ```bash
   # Use Supabase MCP
   warp mcp run supabase "list projects"
   ```

4. **Test MCP Setup**:
   ```bash
   # Test Context7
   warp mcp run context7 "explain this codebase"
   
   # Test Supabase
   warp mcp run supabase "show tables"
   
   # Test GitHub
   warp mcp run github "list issues"
   ```

## 🔍 Verification Checklist

- [ ] Warp installed and authenticated
- [ ] All MCPs configured and working
- [ ] All rules imported/configured
- [ ] Dev server starts automatically
- [ ] Database connection working
- [ ] GitHub integration working
- [ ] Netlify integration working
- [ ] Can follow workflow: analysis → development → testing → deployment

## 🆘 Troubleshooting

### Common Issues:

1. **MCP not found**: Install missing MCP tools
2. **Auth errors**: Check environment variables
3. **Rules not triggering**: Verify rule priorities and triggers
4. **Dev server issues**: Check port availability

### Getting Help:
- Check `docs/` folder for detailed guides
- Review existing rules in Warp settings
- Ask team lead for specific configuration exports

## 📚 Documentation References

- [Enhanced Project Brief](../docs/SynC_Enhanced_Project_Brief_v2.md)
- [Mermaid Architecture](../docs/Sync_Enhanced_Mermaid_Chart_v2.mmd)
- [Story 4.11 Progress](../docs/stories/STORY_4.11_PROGRESS_UPDATE.md)
- [Implementation Status](../docs/IMPLEMENTATION_STATUS.md)

---

**Note**: This setup ensures your team member gets the same intelligent development experience with context-aware command routing, automated workflows, and integrated tools.