# 🚀 SynC - Social Coupon Sharing Platform

**A modern social platform for discovering, sharing, and redeeming local business coupons.**

[![React](https://img.shields.io/badge/React-18.2-blue?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green?logo=supabase)](https://supabase.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.3-blue?logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🎯 **Project Overview**

SynC is a comprehensive social platform that connects users with local businesses through coupon sharing and discovery. Users can find deals, share coupons with friends, and help businesses reach new customers through social engagement.

### **🌟 Key Features**
- 👥 **Social Coupon Sharing** - Share deals with friends within configurable limits
- 🏪 **Business Discovery** - Find local businesses and trending offers
- 📱 **Mobile-First Design** - Responsive UI optimized for mobile devices
- 🎯 **Smart Recommendations** - Personalized coupon suggestions
- 📊 **Admin Dashboard** - Complete business and user management
- 🔐 **Secure Authentication** - Powered by Supabase Auth

---

## 🏗️ **Architecture & Tech Stack**

### **Frontend**
- **React 18** with TypeScript for type-safe development
- **Vite** for fast development and optimized builds
- **TailwindCSS** + **Headless UI** for modern, accessible styling
- **Zustand** for lightweight state management
- **React Query** for server state management
- **React Router** for client-side routing

### **Backend & Database**
- **Supabase** for authentication, database, and real-time features
- **PostgreSQL** with PostGIS for location-based features
- **Row Level Security (RLS)** for data protection
- **25+ optimized database tables** supporting all platform features

### **Testing & Quality**
- **Vitest** for unit testing
- **Playwright** for end-to-end testing
- **ESLint** + **Prettier** for code quality
- **TypeScript** for compile-time error catching

---

## 🚦 **Current Status**

### **📊 Progress Overview**
- **Overall Progress**: 6/27 stories completed (22%)
- **Epic 1**: ✅ **Foundation & Infrastructure** (6/6 stories - COMPLETE)
- **Epic 2**: 🟢 **User Authentication Flow** (0/4 stories - READY)
- **Epic 3-6**: ⏳ **Planned** (Navigation, Business Features, Social Features, Admin)

### **✅ Completed Features**
- ✅ Complete project setup with modern tooling
- ✅ Supabase integration with live database
- ✅ Core components: Landing, Login, Dashboard
- ✅ Mobile navigation with bottom tabs and contacts sidebar
- ✅ Testing infrastructure with comprehensive test suites
- ✅ Epic-based project tracking system

### **🔄 In Progress**
- 🟡 **Story 2.1**: Sign-up Registration Form (Next up)
- 🟡 **Story 2.2**: User Onboarding Flow
- 🟡 **Story 2.3**: Password Reset Flow
- 🟡 **Story 2.4**: Protected Route System

---

## 🛠️ **Quick Start**

### **Prerequisites**
- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **Supabase Account** (for database)

### **Installation**

```bash
# Clone the repository
git clone https://github.com/umamaheshmadala/sync_warp.git
cd sync_warp

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Apply database schema
# Copy contents of database_schema.sql to Supabase SQL Editor and run

# Start development server
npm run dev
```

### **🔧 Available Scripts**

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run unit tests
npm run test:e2e     # Run end-to-end tests
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

---

## 🗂️ **Project Structure**

```
sync_warp/
├── src/
│   ├── components/          # React components
│   │   ├── Landing.tsx      # Landing page
│   │   ├── Login.tsx        # Authentication
│   │   ├── Dashboard.tsx    # Main dashboard
│   │   ├── BottomNavigation.tsx  # Mobile navigation
│   │   └── ContactsSidebar.tsx   # Friends sidebar
│   ├── lib/
│   │   └── supabase.ts      # Supabase configuration
│   ├── store/
│   │   └── authStore.ts     # Authentication state
│   └── App.tsx              # Main app component
├── database_schema.sql      # Complete database schema
├── EPIC_*.md               # Project tracking files
├── PROJECT_TRACKER.md      # Main project dashboard
└── SUPABASE_SETUP_GUIDE.md # Database setup guide
```

---

## 📚 **Documentation**

### **Project Management**
- 📋 **[PROJECT_TRACKER.md](PROJECT_TRACKER.md)** - Main project dashboard
- 📖 **[Epic Files](EPIC_1_Foundation.md)** - Detailed user stories and progress
- 🚀 **[SUPABASE_SETUP_GUIDE.md](SUPABASE_SETUP_GUIDE.md)** - Database setup instructions

### **Database**
- 🗄️ **[database_schema.sql](database_schema.sql)** - Complete PostgreSQL schema
- 📊 **25+ Tables** supporting users, businesses, coupons, social features
- 🔒 **Row Level Security** policies for data protection

---

## 🎭 **Development Workflow**

This project follows an **Epic-based development approach** with detailed user stories:

1. **Epic 1**: ✅ Foundation & Infrastructure (COMPLETE)
2. **Epic 2**: 🔄 User Authentication Flow (IN PROGRESS)
3. **Epic 3**: 📋 Core Navigation & UI (PLANNED)
4. **Epic 4**: 📋 Business Features (PLANNED)
5. **Epic 5**: 📋 Social Features (PLANNED)
6. **Epic 6**: 📋 Admin Panel (PLANNED)

Each epic contains detailed user stories with acceptance criteria, technical tasks, and time estimates.

---

## 🧪 **Testing**

### **Unit Tests**
```bash
npm run test         # Run all unit tests
npm run test:ui      # Run tests with UI
npm run test:coverage # Generate coverage report
```

### **E2E Tests**
```bash
npm run test:e2e     # Run end-to-end tests
npm run test:e2e:ui  # Run with Playwright UI
```

**Test Coverage**:
- 🧪 Component unit tests
- 🎭 End-to-end user journey tests
- 📱 Mobile responsiveness tests
- ♿ Accessibility compliance tests

---

## 🚀 **Deployment**

### **Production Build**
```bash
npm run build
npm run preview  # Test production build locally
```

### **Environment Variables**
```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_APP_ENV=production
```

---

## 🤝 **Contributing**

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### **Development Guidelines**
- Follow the existing code style and conventions
- Write tests for new features
- Update documentation as needed
- Follow the Epic-based development approach

---

## 📜 **License**

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 📞 **Contact & Support**

- **Repository**: [github.com/umamaheshmadala/sync_warp](https://github.com/umamaheshmadala/sync_warp)
- **Issues**: [Report bugs or request features](https://github.com/umamaheshmadala/sync_warp/issues)
- **Discussions**: [Join project discussions](https://github.com/umamaheshmadala/sync_warp/discussions)

---

## 🎉 **Acknowledgments**

- **Supabase** for providing excellent backend-as-a-service
- **Vercel** for React and development tools
- **Tailwind Labs** for the amazing CSS framework
- **Open Source Community** for the incredible ecosystem

---

**⭐ Star this repository if you find it helpful!**

*Built with ❤️ for local businesses and communities*