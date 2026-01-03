# 🏗️ SynC Platform - Architecture Overview

**Last Updated**: October 28, 2025  
**Version**: 2.0  
**Platform**: React + Supabase Full-Stack Application

---

## 📋 Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Frontend Architecture](#frontend-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Data Flow & State Management](#data-flow--state-management)
5. [Database Schema](#database-schema)
6. [API Layer](#api-layer)
7. [Security & Authentication](#security--authentication)
8. [Performance & Optimization](#performance--optimization)
9. [Third-Party Integrations](#third-party-integrations)
10. [Deployment Architecture](#deployment-architecture)

---

## 🎯 High-Level Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │  Browser   │  │   Mobile   │  │   PWA      │                │
│  │  (Desktop) │  │  (Tablet)  │  │  (Offline) │                │
│  └────────────┘  └────────────┘  └────────────┘                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ HTTPS
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    Frontend Application                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  React 18 + TypeScript + Vite                           │   │
│  │  • Component Layer (UI)                                 │   │
│  │  • State Management (Zustand)                           │   │
│  │  • Routing (React Router)                               │   │
│  │  • Forms (React Hook Form + Zod)                        │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ REST API + Realtime
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    Backend Services (Supabase)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  PostgreSQL  │  │  Auth Server │  │   Storage    │         │
│  │   Database   │  │     JWT      │  │   (Images)   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Realtime    │  │  Edge Funcs  │  │     APIs     │         │
│  │  WebSocket   │  │   (Deno)     │  │  (PostgREST) │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    External Services                             │
│  • Google Maps API (Location services)                          │
│  • Email Service (Transactional emails)                         │
│  • CDN (Static assets)                                          │
│  • Payment Gateway (Future integration)                         │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + TypeScript | UI Framework |
| **Build Tool** | Vite 5.0 | Fast dev server & bundler |
| **Styling** | Tailwind CSS 3.3 | Utility-first CSS |
| **State** | Zustand 4.4 | Lightweight state management |
| **Backend** | Supabase | BaaS (Database, Auth, Storage) |
| **Database** | PostgreSQL 15+ | Relational database |
| **Auth** | Supabase Auth | JWT-based authentication |
| **Storage** | Supabase Storage | File/image storage |
| **Realtime** | Supabase Realtime | WebSocket subscriptions |
| **Forms** | React Hook Form + Zod | Form validation |
| **Routing** | React Router 6.20 | Client-side routing |
| **Animation** | Framer Motion 12.23 | UI animations |
| **Icons** | Lucide React 0.294 | Icon library |
| **Testing** | Vitest + Playwright | Unit & E2E testing |
| **Maps** | Google Maps API | Location services |

---

## 🎨 Frontend Architecture

### Project Structure

```
src/
├── components/          # React components (organized by feature)
│   ├── business/       # Business management components
│   ├── campaign/       # Campaign & targeting components
│   ├── following/      # Follower system components
│   ├── offers/         # Offers management
│   ├── products/       # Product catalog
│   ├── reviews/        # Review system
│   ├── social/         # Social features (friends, sharing)
│   ├── search/         # Advanced search
│   ├── ui/             # Reusable UI components
│   └── ...
├── hooks/              # Custom React hooks
│   ├── useBusiness.ts
│   ├── useFollowerNotifications.ts
│   ├── useCampaigns.ts
│   └── ...
├── services/           # Business logic & API calls
│   ├── dashboardService.ts
│   ├── reviewService.ts
│   ├── notificationService.ts
│   └── ...
├── store/              # Global state management (Zustand)
│   └── authStore.ts
├── types/              # TypeScript type definitions
│   ├── business.ts
│   ├── offers.ts
│   ├── campaigns.ts
│   └── ...
├── lib/                # Utilities & configuration
│   ├── supabase.ts    # Supabase client setup
│   └── utils.ts       # Helper functions
├── router/             # Routing configuration
│   ├── Router.tsx
│   └── ProtectedRoute.tsx
└── main.tsx           # Application entry point
```

### Component Architecture

#### 1. **Atomic Design Pattern**

```
Atoms (Basic UI)
  ↓
Molecules (Simple combinations)
  ↓
Organisms (Complex components)
  ↓
Templates (Page layouts)
  ↓
Pages (Full views)
```

**Example:**
- **Atom**: `Button`, `Input`, `Badge`
- **Molecule**: `SearchBar`, `OfferCard`
- **Organism**: `OffersList`, `BusinessProfile`
- **Template**: `AppLayout`, `DashboardLayout`
- **Page**: `BusinessDashboard`, `FollowerFeed`

#### 2. **Component Categories**

| Category | Purpose | Example |
|----------|---------|---------|
| **UI Components** | Reusable design system | `Button`, `Card`, `Modal` |
| **Feature Components** | Business logic | `BusinessRegistration`, `CampaignWizard` |
| **Layout Components** | Page structure | `Header`, `BottomNavigation` |
| **Container Components** | Data fetching | `BusinessDashboard`, `FollowerFeed` |
| **Smart Components** | Complex state logic | `CampaignTargetingForm`, `OfferManager` |

### Routing Architecture

```typescript
// Protected Routes with Guards
<ProtectedRoute requireAuth={true} requireOnboarding={true}>
  <Dashboard />
</ProtectedRoute>

// Route Groups:
// 1. Public: /, /auth/login, /auth/signup
// 2. Protected (User): /dashboard, /profile, /following
// 3. Protected (Business): /business/:id, /business/:id/campaigns
// 4. Admin (Future): /admin/*
```

**Key Routes:**
- **Public**: Landing, Login, Signup
- **User**: Dashboard, Profile, Following, Favorites
- **Business**: Registration, Profile, Products, Campaigns, Analytics
- **Social**: Friends, Following Feed, Notifications

### State Management Strategy

#### Global State (Zustand)

```typescript
// authStore.ts - User authentication state
interface AuthState {
  user: AuthUser | null
  profile: Profile | null
  loading: boolean
  signIn: (email, password) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates) => Promise<Profile>
}
```

#### Local State (React Hooks)

```typescript
// Custom hooks for feature-specific state
- useFollowerNotifications() // Follower updates
- useCampaigns()             // Campaign management
- useOffers()                // Offer CRUD operations
- useBusinessFollowing()     // Follow/unfollow logic
```

#### Server State (@tanstack/react-query)

```typescript
// Cached server data with auto-refetch
const { data, isLoading, error } = useQuery({
  queryKey: ['offers', businessId],
  queryFn: () => fetchOffers(businessId),
  staleTime: 5000
})
```

### Form Management

```typescript
// React Hook Form + Zod validation
const schema = z.object({
  business_name: z.string().min(3),
  email: z.string().email(),
  phone: z.string().regex(/^[0-9]{10}$/)
})

const form = useForm<BusinessFormData>({
  resolver: zodResolver(schema)
})
```

---

## 🔧 Backend Architecture

### Supabase Services

#### 1. **PostgreSQL Database**

**Core Tables (35+ tables):**

```sql
-- User Management
- profiles
- user_profiles (targeting)

-- Business Management
- businesses
- business_products
- business_categories
- business_reviews
- business_checkins

-- Offers & Campaigns
- offers
- offer_analytics
- offer_shares
- campaigns
- campaign_targeting
- campaign_analytics

-- Social Features
- friendships
- friend_requests
- business_follows
- follower_notifications
- follower_updates

-- Content
- coupons
- ads_slots
- notifications

-- System
- cities
- rate_limits
```

**Key Design Patterns:**

1. **Soft Deletes**: Use status flags instead of deleting records
```sql
status VARCHAR(20) CHECK (status IN ('active', 'inactive', 'deleted'))
```

2. **Audit Trails**: Track all changes with timestamps
```sql
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

3. **JSONB for Flexibility**: Store complex data structures
```sql
operating_hours JSONB DEFAULT '{...}'
metadata JSONB DEFAULT '{}'
```

4. **Indexes for Performance**: Optimize frequent queries
```sql
CREATE INDEX idx_businesses_city ON businesses(city);
CREATE INDEX idx_offers_status ON offers(status);
```

#### 2. **Row-Level Security (RLS)**

```sql
-- Example: User can only see their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Business owners can manage their businesses
CREATE POLICY "Business owners manage own businesses" ON businesses
  FOR ALL USING (auth.uid() = user_id);

-- Anyone can view active businesses
CREATE POLICY "Anyone can view active businesses" ON businesses
  FOR SELECT USING (status = 'active');
```

**Security Layers:**
1. **Authentication**: JWT tokens from Supabase Auth
2. **Authorization**: RLS policies at database level
3. **Validation**: Zod schemas at application level
4. **Rate Limiting**: Custom rate limit tables

#### 3. **Database Functions & Triggers**

**Functions:**
```sql
-- Calculate follower reach for campaigns
CREATE OR REPLACE FUNCTION calculate_follower_reach(
  p_business_id UUID,
  p_filters JSONB
) RETURNS INTEGER AS $$
  -- Complex reach calculation logic
$$ LANGUAGE plpgsql;

-- Auto-update business stats
CREATE OR REPLACE FUNCTION update_business_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE businesses
  SET total_reviews = (SELECT COUNT(*) FROM business_reviews WHERE business_id = NEW.business_id)
  WHERE id = NEW.business_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Triggers:**
```sql
-- Notify followers when new offer is created
CREATE TRIGGER notify_followers_new_offer
AFTER INSERT ON offers
FOR EACH ROW
WHEN (NEW.status = 'active')
EXECUTE FUNCTION notify_followers_on_new_offer();

-- Update timestamps automatically
CREATE TRIGGER update_businesses_timestamp
BEFORE UPDATE ON businesses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

#### 4. **Supabase Storage**

**Buckets:**
```
business-assets/
  ├── logos/           # Business logos (500x500)
  ├── covers/          # Cover images (1200x400)
  ├── gallery/         # Product/business gallery
  └── offers/          # Offer images
```

**RLS Policies:**
```sql
-- Anyone can view business assets
CREATE POLICY "Public access to business assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-assets');

-- Only business owners can upload to their folder
CREATE POLICY "Business owners can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'business-assets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

#### 5. **Realtime Subscriptions**

```typescript
// Subscribe to follower notifications
const subscription = supabase
  .channel('follower-notifications')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'follower_notifications',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      // Handle new notification
      addNotification(payload.new)
    }
  )
  .subscribe()
```

**Realtime Features:**
- Follower notifications
- New offer alerts
- Friend request updates
- Review notifications

---

## 🔄 Data Flow & State Management

### Request Flow Architecture

```
┌──────────────┐
│   User       │
│  Component   │
└──────┬───────┘
       │
       │ 1. User Action
       ▼
┌──────────────┐
│  Custom Hook │  (e.g., useOffers)
│  (useState)  │
└──────┬───────┘
       │
       │ 2. Call Service
       ▼
┌──────────────┐
│   Service    │  (e.g., offerService)
│   Layer      │  • Business logic
└──────┬───────┘  • Data transformation
       │
       │ 3. Supabase API Call
       ▼
┌──────────────┐
│  Supabase    │
│   Client     │  • Auth headers
└──────┬───────┘  • RLS filtering
       │
       │ 4. Database Query
       ▼
┌──────────────┐
│  PostgreSQL  │  • RLS policies
│   + RLS      │  • Triggers
└──────┬───────┘  • Functions
       │
       │ 5. Response
       ▼
┌──────────────┐
│  Component   │  • Update UI
│  Re-renders  │  • Show feedback
└──────────────┘
```

### State Management Layers

#### 1. **Global State (Zustand)**
- User authentication
- User profile
- App configuration

#### 2. **Server State (React Query)**
- Cached API responses
- Auto-refetch on window focus
- Optimistic updates

#### 3. **Local State (useState)**
- Form inputs
- UI toggles
- Modal visibility

#### 4. **URL State**
- Search filters
- Pagination
- Selected tabs

### Example: Creating an Offer

```typescript
// 1. Component calls hook
const { createOffer, isCreating } = useOffers(businessId)

// 2. Hook calls service
const createOffer = async (data: OfferFormData) => {
  setIsCreating(true)
  try {
    const result = await offerService.create(businessId, data)
    // Optimistic update
    queryClient.invalidateQueries(['offers', businessId])
    return result
  } catch (error) {
    handleError(error)
  } finally {
    setIsCreating(false)
  }
}

// 3. Service calls Supabase
const create = async (businessId: string, data: OfferFormData) => {
  const { data: offer, error } = await supabase
    .from('offers')
    .insert({
      business_id: businessId,
      ...data,
      status: 'active'
    })
    .select()
    .single()
  
  if (error) throw error
  
  // 4. Trigger notifications (database trigger handles this)
  return offer
}
```

---

## 📊 Database Schema

### Entity Relationship Overview

```
┌──────────────┐
│   profiles   │
└───────┬──────┘
        │
        │ 1:N
        ▼
┌──────────────┐      1:N      ┌──────────────┐
│  businesses  ├───────────────►│   offers     │
└───────┬──────┘                └──────────────┘
        │
        │ 1:N
        ▼
┌──────────────┐      N:M      ┌──────────────┐
│   products   │                │   campaigns  │
└──────────────┘                └──────────────┘
        │
        │ 1:N
        ▼
┌──────────────┐
│   reviews    │
└──────────────┘
```

### Key Tables

#### **profiles**
```sql
- id: UUID (PK, FK to auth.users)
- email: VARCHAR
- full_name: VARCHAR
- city: VARCHAR
- interests: TEXT[]
- avatar_url: TEXT
- role: ENUM ('customer', 'business_owner', 'admin')
- is_driver: BOOLEAN
- driver_score: INTEGER
```

#### **businesses**
```sql
- id: UUID (PK)
- user_id: UUID (FK to profiles)
- business_name: VARCHAR
- business_type: VARCHAR
- address: TEXT
- city: VARCHAR
- latitude/longitude: DECIMAL
- operating_hours: JSONB
- categories: TEXT[]
- logo_url: TEXT
- cover_image_url: TEXT
- status: ENUM
- verified: BOOLEAN
```

#### **offers**
```sql
- id: UUID (PK)
- business_id: UUID (FK to businesses)
- title: VARCHAR
- description: TEXT
- offer_type: ENUM ('discount', 'bogo', 'freebie')
- discount_value: DECIMAL
- terms_conditions: TEXT
- start_date/end_date: TIMESTAMP
- status: ENUM ('draft', 'active', 'paused', 'expired')
- image_url: TEXT
```

#### **follower_notifications**
```sql
- id: UUID (PK)
- user_id: UUID (FK to profiles)
- business_id: UUID (FK to businesses)
- notification_type: ENUM ('new_offer', 'new_product', 'announcement')
- message: TEXT
- action_url: TEXT
- metadata: JSONB
- read_at: TIMESTAMP
```

#### **campaigns**
```sql
- id: UUID (PK)
- business_id: UUID (FK to businesses)
- name: VARCHAR
- targeting_filters: JSONB
- estimated_reach: INTEGER
- actual_reach: INTEGER
- status: ENUM ('draft', 'active', 'paused', 'completed')
- budget: DECIMAL
- start_date/end_date: TIMESTAMP
```

---

## 🔌 API Layer

### Supabase Client Configuration

```typescript
// src/lib/supabase.ts
export const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
)
```

### Service Layer Pattern

```typescript
// services/offerService.ts
export const offerService = {
  // GET /offers (filtered by business)
  getAll: async (businessId: string) => {
    const { data, error } = await supabase
      .from('offers')
      .select(`
        *,
        businesses (business_name, logo_url)
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },
  
  // POST /offers
  create: async (businessId: string, offerData: OfferFormData) => {
    const { data, error } = await supabase
      .from('offers')
      .insert({ business_id: businessId, ...offerData })
      .select()
      .single()
    
    if (error) throw error
    return data
  },
  
  // PATCH /offers/:id
  update: async (offerId: string, updates: Partial<Offer>) => {
    const { data, error } = await supabase
      .from('offers')
      .update(updates)
      .eq('id', offerId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },
  
  // DELETE /offers/:id (soft delete)
  delete: async (offerId: string) => {
    const { error } = await supabase
      .from('offers')
      .update({ status: 'deleted' })
      .eq('id', offerId)
    
    if (error) throw error
  }
}
```

### Error Handling Strategy

```typescript
// Centralized error handler
const handleSupabaseError = (error: PostgrestError) => {
  if (error.code === '23505') {
    // Duplicate key violation
    throw new Error('This record already exists')
  } else if (error.code === '23503') {
    // Foreign key violation
    throw new Error('Related record not found')
  } else if (error.code === 'PGRST116') {
    // No rows returned
    throw new Error('Record not found')
  } else {
    throw new Error(error.message || 'Database error')
  }
}
```

---

## 🔐 Security & Authentication

### Authentication Flow

```
1. User submits login form
   ↓
2. Supabase Auth validates credentials
   ↓
3. JWT token issued (access + refresh)
   ↓
4. Token stored in localStorage
   ↓
5. Token auto-attached to all API requests
   ↓
6. RLS policies validate token claims
   ↓
7. Access granted/denied based on policies
```

### Security Layers

#### 1. **Frontend Validation**
```typescript
const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password too short')
})
```

#### 2. **Route Protection**
```typescript
<ProtectedRoute requireAuth={true} requireOnboarding={true}>
  <Dashboard />
</ProtectedRoute>
```

#### 3. **RLS Policies** (Database Level)
```sql
-- Users can only update their own profiles
CREATE POLICY "profile_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);
```

#### 4. **API Security**
- JWT tokens in Authorization header
- HTTPS only
- CORS configuration
- Rate limiting (3/friend/day, 20 total/day for sharing)

### Authentication Store

```typescript
// store/authStore.ts
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
    set({ user: data.user })
    await fetchProfile(data.user.id)
  },
  
  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  }
}))
```

---

## ⚡ Performance & Optimization

### Frontend Optimizations

#### 1. **Code Splitting**
```typescript
// Lazy loading routes
const Dashboard = lazy(() => import('./Dashboard'))
const BusinessProfile = lazy(() => import('./BusinessProfile'))
```

#### 2. **Image Optimization**
```typescript
// Resize before upload
const resizeImage = async (file: File, maxWidth: number) => {
  // Canvas-based resizing
  return resizedBlob
}
```

#### 3. **React Query Caching**
```typescript
const { data } = useQuery({
  queryKey: ['offers', businessId],
  queryFn: () => fetchOffers(businessId),
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000  // 10 minutes
})
```

#### 4. **Debouncing**
```typescript
const debouncedSearch = useDebounce(searchTerm, 300)
```

### Database Optimizations

#### 1. **Indexes**
```sql
CREATE INDEX idx_businesses_city_status ON businesses(city, status);
CREATE INDEX idx_offers_business_status ON offers(business_id, status);
```

#### 2. **Query Optimization**
```sql
-- Use SELECT specific columns, not *
SELECT id, title, status FROM offers WHERE business_id = $1;

-- Use EXPLAIN ANALYZE to check query plans
EXPLAIN ANALYZE SELECT * FROM offers WHERE status = 'active';
```

#### 3. **Connection Pooling**
- Supabase handles connection pooling automatically
- Max connections: 100 (configurable)

---

## 🔗 Third-Party Integrations

### 1. **Google Maps API**
```typescript
// Location picker with autocomplete
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api'

<LoadScript googleMapsApiKey={process.env.VITE_GOOGLE_MAPS_API_KEY}>
  <GoogleMap center={center} zoom={15}>
    <Marker position={businessLocation} />
  </GoogleMap>
</LoadScript>
```

### 2. **Email Service** (via Supabase)
- Transactional emails for:
  - Password reset
  - New follower notifications
  - Campaign alerts

### 3. **Future Integrations**
- Payment Gateway (Razorpay/Stripe)
- SMS notifications
- Analytics (Google Analytics/Mixpanel)

---

## 🚀 Deployment Architecture

### Development Environment
```
Local Machine
  ├── Vite Dev Server (Port 5173)
  ├── Hot Module Replacement (HMR)
  └── Supabase CLI (Local DB optional)
```

### Production Environment (Netlify)
```
Netlify Edge
  ├── CDN (Static assets)
  ├── Serverless Functions (Future)
  └── Continuous Deployment (GitHub integration)
      ↓
Supabase Cloud
  ├── PostgreSQL Database (Managed)
  ├── Auth Server (JWT)
  ├── Storage (S3-compatible)
  └── Realtime Server (WebSocket)
```

### Build Process

```bash
# 1. Type checking
npm run type-check

# 2. Linting
npm run lint

# 3. Testing
npm run test

# 4. Build for production
npm run build
# Output: dist/ folder with optimized bundles

# 5. Deploy to Netlify
netlify deploy --prod
```

### Environment Variables

```bash
# .env.production
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_GOOGLE_MAPS_API_KEY=xxx
VITE_APP_URL=https://sync-warp.netlify.app
```

---

## 📈 Monitoring & Analytics

### Performance Monitoring
```typescript
import { onCLS, onFID, onLCP } from 'web-vitals'

// Track Core Web Vitals
onCLS(console.log)
onFID(console.log)
onLCP(console.log)
```

### Error Tracking
```typescript
// Global error boundary
<ErrorBoundary fallback={<ErrorPage />}>
  <App />
</ErrorBoundary>
```

### Database Monitoring
- Supabase Dashboard
  - Query performance
  - Connection pool usage
  - RLS policy violations
  - Storage usage

---

## 🔧 Development Workflow

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env

# 3. Start dev server
npm run dev

# 4. Run tests in watch mode
npm run test
```

### Git Workflow

```bash
# Feature branch workflow
git checkout -b feature/story-4.11
git commit -m "feat: implement follower notifications"
git push origin feature/story-4.11
# Create PR on GitHub
```

### Code Quality

```bash
# Linting
npm run lint

# Type checking
npm run type-check

# Format code
npm run format

# Run all checks before commit
npm run build:check
```

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [React Router Documentation](https://reactrouter.com)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [Zustand Documentation](https://zustand-demo.pmnd.rs)
- [Vite Documentation](https://vitejs.dev)

---

## 🎯 Key Architectural Decisions

### 1. **Why Supabase over Custom Backend?**
- Faster development (BaaS approach)
- Built-in auth, storage, realtime
- Auto-generated REST API
- Row-level security at database level
- Real-time subscriptions out of the box

### 2. **Why Zustand over Redux?**
- Simpler API (less boilerplate)
- Better TypeScript support
- Smaller bundle size
- No context provider needed
- Perfect for small to medium apps

### 3. **Why Tailwind CSS?**
- Utility-first approach
- Rapid prototyping
- No CSS file switching
- Built-in responsive design
- Consistent design system

### 4. **Why Vite over CRA?**
- 10-100x faster builds
- Native ESM support
- Lightning-fast HMR
- Better tree-shaking
- Modern tooling

---

## 🔄 Future Architecture Enhancements

### Planned Improvements

1. **Microservices Approach**
   - Edge functions for complex operations
   - Separate admin backend

2. **GraphQL Layer**
   - Replace REST with GraphQL
   - Better data fetching control

3. **Offline Support**
   - Service workers
   - IndexedDB caching
   - PWA features

4. **Real-time Features**
   - Live campaign analytics
   - Real-time follower feed
   - Live chat support

5. **Advanced Analytics**
   - Custom analytics dashboard
   - Business intelligence
   - Predictive analytics

---

**Document Version**: 2.0  
**Last Reviewed**: October 28, 2025  
**Next Review**: November 15, 2025
