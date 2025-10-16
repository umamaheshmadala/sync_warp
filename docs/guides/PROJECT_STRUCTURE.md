# 📁 SynC Project Structure

This document outlines the organized structure of the SynC project for easy navigation and development.

## 📊 Main Project Structure

```
sync_warp/
├── 📁 src/                          # Source code
│   ├── 📁 components/               # React components
│   │   ├── 📁 business/            # Business-related components
│   │   │   ├── BusinessRegistration.tsx
│   │   │   ├── BusinessProfile.tsx
│   │   │   ├── BusinessDashboard.tsx
│   │   │   └── index.ts
│   │   ├── 📁 auth/                # Authentication components (future)
│   │   ├── 📁 social/              # Social features components (future)
│   │   └── *.tsx                   # Main components
│   ├── 📁 hooks/                   # Custom React hooks
│   │   └── useBusiness.ts
│   ├── 📁 lib/                     # Utilities and configurations
│   │   └── supabase.ts
│   ├── 📁 store/                   # State management
│   │   └── authStore.ts
│   ├── 📁 router/                  # Routing configuration
│   │   └── Router.tsx
│   └── 📁 assets/                  # Static assets
│
├── 📁 supabase/                     # Supabase configuration
│   └── 📁 migrations/              # Database migrations
│       └── 20241201_create_business_tables.sql
│
├── 📁 database/                     # Database schemas and documentation
│   └── business_schema.sql
│
├── 📁 docs/                        # Project documentation
│   ├── EPIC_4_BUSINESS_IMPLEMENTATION.md
│   └── PROJECT_STRUCTURE.md
│
├── 📁 public/                      # Public assets
├── 📁 tests/                       # Test files
├── 📁 e2e/                        # End-to-end tests
├── 📁 node_modules/               # Dependencies (auto-generated)
├── 📁 dist/                       # Build output (auto-generated)
│
├── 📁 scripts/                     # Development scripts
│   ├── dev-bg.ps1
│   ├── dev-monitor.ps1
│   └── *.ps1
│
├── 📁 debug/                       # Debug and development SQL files
│   ├── Various debugging SQL files
│   └── Development database scripts
│
├── 📁 archive/                     # Archived documents and assets
│   ├── Project PDFs
│   ├── Mermaid charts
│   └── Old documentation
│
├── 📁 temp_cleanup/                # Temporary files to review/delete
│   ├── Screenshots
│   ├── Test output files
│   └── Temporary assets
│
└── 📄 Configuration Files          # Root configuration
    ├── package.json               # Dependencies and scripts
    ├── vite.config.ts             # Vite configuration  
    ├── tailwind.config.js         # Tailwind CSS config
    ├── tsconfig.json              # TypeScript config
    ├── .env                       # Environment variables
    ├── .env.example               # Environment template
    ├── .gitignore                 # Git ignore rules
    └── README.md                  # Project overview
```

## 🎯 Key Directories Explained

### **📁 src/** - Main Source Code
- **components/**: React components organized by feature
  - **business/**: All business registration & management components
  - **auth/**: Authentication related components (future organization)
  - **social/**: Social features components (future organization)
- **hooks/**: Reusable React hooks for data management
- **lib/**: Utility libraries and configurations (Supabase, etc.)
- **store/**: Global state management (Zustand stores)
- **router/**: Application routing configuration

### **📁 supabase/** - Database & Backend
- **migrations/**: Database migration files in chronological order
- Production database schema and configuration

### **📁 database/** - Database Documentation
- Standalone SQL schemas for reference
- Database design documentation

### **📁 docs/** - Project Documentation
- Implementation guides and technical documentation
- Feature specifications and development notes

### **📁 scripts/** - Development Tools
- PowerShell scripts for development automation
- Build and deployment helpers

### **📁 debug/** - Development Artifacts
- SQL debugging files
- Development database scripts
- Troubleshooting queries

### **📁 archive/** - Historical Documents
- Old project documentation
- Previous versions and design documents
- Archived assets no longer in active use

### **📁 temp_cleanup/** - Temporary Files
- Files that need review before deletion
- Screenshots and test outputs
- Temporary development artifacts

## 🗂️ Navigation Guide

### **For Development:**
- Main code: `src/components/`
- Business features: `src/components/business/`
- Database: `supabase/migrations/`
- Documentation: `docs/`

### **For Testing:**
- Test files: `tests/` and `e2e/`
- Scripts: `scripts/`
- Debug queries: `debug/`

### **For Project Management:**
- Documentation: `docs/`
- Archive: `archive/`
- Configuration: Root level files

## 🧹 Clean-up Status

### ✅ **Organized:**
- PowerShell scripts → `scripts/`
- SQL debug files → `debug/`
- Images and screenshots → `temp_cleanup/`
- Old documentation → `archive/`
- Test files → `temp_cleanup/`

### 🎯 **Next Steps:**
1. Review files in `temp_cleanup/` and delete if not needed
2. Consider moving `debug/` SQL files to `archive/` when no longer needed
3. Organize future components by feature in `src/components/`

## 📝 File Naming Conventions

### **Components:**
- PascalCase: `BusinessRegistration.tsx`
- Feature-based folders: `business/`, `auth/`, `social/`

### **Hooks:**
- camelCase with 'use' prefix: `useBusiness.ts`

### **Database:**
- Migrations: `YYYYMMDD_description.sql`
- Schemas: `feature_schema.sql`

### **Documentation:**
- UPPERCASE: `README.md`, `PROJECT_STRUCTURE.md`
- Feature docs: `EPIC_X_FEATURE_IMPLEMENTATION.md`

## 🔍 Quick Find Guide

**Looking for...**
- Business components? → `src/components/business/`
- Database setup? → `supabase/migrations/`
- Project docs? → `docs/`
- Configuration? → Root directory
- Development scripts? → `scripts/`
- Debugging queries? → `debug/`
- Old files? → `archive/` or `temp_cleanup/`

---

**This structure makes the project professional, maintainable, and easy to navigate for both development and collaboration.**