# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Common Development Commands

### Core Development
```bash
# Start development server (main command)
npm run dev

# Build for production (includes TypeScript checking)
npm run build

# Preview production build
npm run preview

# Type checking only
npm run type-check
```

### Testing Commands
```bash
# Run all unit tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test src/hooks/__tests__/useRateLimit.test.ts

# Run tests in watch mode during development
npm test -- --watch

# End-to-end testing (Playwright)
npm run test:e2e
npm run test:e2e:ui          # Interactive UI mode
npm run test:e2e:debug       # Debug mode

# Story-specific E2E tests
npm run test:e2e:story4.1    # Business registration tests
npm run test:e2e:story4.2    # Business dashboard tests
npm run test:e2e:story4.3    # Business profile tests
```

### Code Quality
```bash
# Lint code
npm run lint

# Format code
npm run format

# Check formatting only
npm run format:check
```

### Database Operations
```bash
# Start Supabase locally (if using local setup)
npx supabase start

# Apply migrations
npx supabase migration up

# Create new migration
npx supabase migration new migration_name

# Reset local database
npx supabase db reset
```

## High-Level Architecture

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Lucide Icons
- **State Management**: Zustand (primary) + React Query for server state
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **Authentication**: Supabase Auth with comprehensive error handling
- **Testing**: Vitest (unit) + Chrome-Devtools + Testing Library
- **Forms**: React Hook Form + Zod validation

### Project Structure Philosophy
The project follows a **feature-driven architecture** with clear separation of concerns:

```
src/
├── components/           # React components organized by feature
│   ├── business/        # Business features (registration, dashboard, profiles)
│   ├── auth/            # Authentication components
│   └── shared/          # Shared/reusable components
├── hooks/               # Custom React hooks for data management
├── services/            # External service integrations (API calls, business logic)
├── store/               # Global state management (Zustand)
├── lib/                 # Core utilities and configurations
└── types/               # TypeScript type definitions
```

### Key Architectural Patterns

#### State Management Strategy
- **Zustand**: Primary state management for authentication, user preferences
- **React Query**: Server state management, caching, and synchronization
- **Local State**: Component-specific state using React hooks

#### Data Flow Architecture
1. **Components** → Call hooks or services
2. **Hooks** → Orchestrate data fetching and state management
3. **Services** → Handle API calls and business logic
4. **Store** → Manage global application state

#### Error Handling Strategy
- **ErrorBoundary**: React error boundaries at page level
- **Service Layer**: Consistent error transformation and user-friendly messages  
- **Rate Limiting**: Built-in rate limiting with user feedback
- **Network Resilience**: Timeout handling and retry mechanisms

### Core Systems

#### Authentication System (`src/store/authStore.ts`)
- Comprehensive Supabase Auth integration with timeout protection
- Automatic profile creation during signup
- Password reset functionality with secure token handling
- Network error handling and user-friendly error messages
- **Test Coverage**: 86% (28 passing tests)

#### Business Management System (`src/components/business/`)
- **BusinessRegistration**: 4-step wizard with image upload and location services
- **BusinessDashboard**: Complete management interface for business owners
- **BusinessProfile**: Advanced view/edit with live image preview
- Multi-schema database synchronization (old/new business tables)

#### Social Features System
- **Friends Management**: Unified `/friends` page with tabbed interface
- **Real-time Updates**: Live friend status and notifications
- **Deal Sharing**: Coupon sharing system with rate limiting
- **Social Analytics**: Track sharing activity and friend engagement

#### Search & Discovery System
- **Multi-layer Search**: Basic, advanced, and AI-powered search capabilities
- **Location-based Discovery**: GPS integration for nearby business finding
- **Category Browser**: Organized business classification system
- **Search Analytics**: Track search patterns and optimize recommendations

### Database Schema Overview

#### Core Tables
- **profiles**: User profiles with preferences and social data
- **businesses**: Business information with location data
- **business_checkins**: GPS-verified check-ins with analytics
- **coupons**: Deal management with advanced analytics
- **friends_system**: Social relationships and friend requests
- **favorites_system**: User favorites with categories

#### Key Features
- **Row Level Security (RLS)**: All tables protected with proper policies
- **PostGIS Integration**: Advanced location-based queries
- **Analytics Functions**: Built-in analytics for businesses and users
- **Migration System**: Chronological database versioning

### Testing Philosophy

#### Test Coverage Priorities
1. **Critical Infrastructure**: 85-99% coverage (auth, rate limiting, security)
2. **Business Logic**: 60%+ coverage (services, workflows) 
3. **UI Components**: 40%+ coverage (forms, complex interactions)
4. **Overall Project Goal**: 60% comprehensive coverage

#### Current Test Status
- **67 passing tests** with excellent performance (sub-3 second execution)
- **useRateLimit Hook**: 99% coverage (21 tests)
- **authStore**: 86% coverage (28 tests)  
- **rateLimitService**: ~95% coverage (18 tests)

#### Testing Tools Configuration
- **Vitest**: Primary test runner with JSdom environment
- **Playwright**: E2E testing with story-specific test suites
- **MSW**: API mocking for isolated component testing
- **Coverage**: V8 provider with comprehensive reporting

### Development Guidelines

#### Component Organization
- Group components by **feature** (business/, auth/, social/) not by type
- Use **index.ts** files for clean imports
- Keep components focused on single responsibilities
- Implement proper TypeScript interfaces for all props

#### Service Layer Patterns
- All API calls go through dedicated service files
- Implement consistent error handling and transformation
- Use proper TypeScript types for all API responses
- Include timeout protection for external API calls

#### Database Interaction
- All database queries use Supabase client with RLS policies
- Migrations are chronologically numbered and descriptive
- Use proper PostgreSQL functions for complex operations
- Implement proper error handling for network failures

#### State Management Guidelines
- Use **Zustand** for global app state (user, preferences)
- Use **React Query** for server state management and caching
- Keep component state local when possible
- Implement proper loading and error states

### Performance Considerations

#### Bundle Optimization
- **Lazy Loading**: Route-based code splitting implemented
- **Tree Shaking**: Vite handles dead code elimination
- **Asset Optimization**: Images optimized through Supabase Storage

#### Database Performance
- **Indexes**: Proper indexing on frequently queried columns
- **RLS Policies**: Optimized for performance without security compromise
- **Connection Pooling**: Supabase handles connection management
- **Query Optimization**: Use of PostgreSQL functions for complex operations

### Environment Setup

#### Required Environment Variables
```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Development Dependencies
- **Node.js**: >=18.0.0
- **npm**: >=8.0.0
- **Playwright**: Auto-installed via `npm run install-playwright`

### Debugging and Troubleshooting

#### Common Issues
1. **Supabase Connection**: Check environment variables and network connectivity
2. **Test Failures**: Run `npm test -- --clearCache --run` to clear Vitest cache
3. **Build Errors**: Run `npm run type-check` to isolate TypeScript issues
4. **E2E Test Failures**: Ensure development server is running on port 5173

#### Debug Tools
- **React Query Devtools**: Enabled in development for server state inspection
- **Supabase Dashboard**: Monitor database queries and RLS policies
- **Browser DevTools**: React DevTools extension recommended
- **Debug Routes**: `/debug/` routes available for system testing (development only)

### Deployment Considerations

#### Production Checklist
- Environment variables properly configured
- Database migrations applied in correct order
- RLS policies tested and secured
- Error boundaries properly implemented
- Analytics and monitoring configured

This project represents a mature, production-ready local business discovery platform with comprehensive testing, proper architecture patterns, and robust error handling throughout the system.