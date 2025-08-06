# Canar SPA Application Architecture & Flow

## Overview
Canar is a Single Page Application (SPA) for professional profile building with credit-based editing and subscription management. The application follows a modern full-stack architecture with React frontend and Node.js backend.

## Application Structure

### 1. Frontend Architecture (React SPA)

#### Entry Point & Routing Flow
```
client/src/main.tsx → App.tsx → Router → Individual Pages
```

**App.tsx Structure:**
- **QueryClientProvider**: Manages server state with TanStack Query
- **AuthProvider**: Handles user authentication context
- **TooltipProvider**: UI component context
- **Router**: Client-side routing with Wouter

#### Page Flow & Navigation

**1. Landing Page (`/`)**
- File: `client/src/pages/landing-page.tsx`
- Purpose: Marketing page with hero section
- Navigation: "Get Started" → `/auth`
- Public access (no authentication required)

**2. Authentication Page (`/auth`)**
- File: `client/src/pages/auth-page.tsx`
- Purpose: Login/Register forms with toggle
- Navigation: After login → `/subscription`
- Uses React Hook Form + Zod validation
- Calls `/api/login` or `/api/register`

**3. Subscription Page (`/subscription`)**
- File: `client/src/pages/subscription-page.tsx`
- Purpose: Display subscription plans and handle purchases
- Protection: Requires authentication (ProtectedRoute)
- Navigation: After subscription → `/profile`
- Fetches plans from `/api/subscription/plans`
- Calls `/api/subscription/subscribe`

**4. Profile Builder Page (`/profile`)**
- File: `client/src/pages/profile-builder-page.tsx`
- Purpose: Main application - profile editing with credit system
- Protection: Requires authentication + active subscription
- Features: Autosave, credit management, file uploads, PDF export

### 2. Backend Architecture (Node.js/Express)

#### Server Structure
```
server/index.ts → routes.ts → auth.ts + storage.ts
```

**Authentication Flow:**
1. `server/auth.ts` - Passport.js with local strategy
2. Session-based authentication with PostgreSQL store
3. Password hashing with Node.js crypto (scrypt)
4. Routes: `/api/register`, `/api/login`, `/api/logout`, `/api/user`

**API Routes Structure:**
```
/api/user - Get current user
/api/login - User login
/api/register - User registration
/api/logout - User logout
/api/subscription/plans - Get available plans
/api/subscription/subscribe - Subscribe to plan
/api/subscription/credits/topup - Add credits
/api/credits - Get user credits
/api/profile/* - Profile CRUD operations
```

### 3. Database Schema (PostgreSQL)

**Core Tables:**
- **users**: User accounts and authentication
- **subscriptions**: Active plans and credit tracking
- **profiles**: User profile data
- **education**: Education entries
- **projects**: Project entries  
- **skills**: Skill entries
- **experiences**: Work experience entries
- **creditPurchases**: Credit purchase history

## Execution Flow

### 1. Initial App Load
```
Browser Request → server/index.ts → Vite Dev Server → client/index.html → main.tsx → App.tsx
```

### 2. Authentication Flow
```
Landing Page → Click "Get Started" → Auth Page → Login/Register Form → 
API Call (/api/login or /api/register) → Session Created → Redirect to /subscription
```

### 3. Subscription Flow
```
/subscription → Fetch Plans (/api/subscription/plans) → 
Select Plan → Subscribe (/api/subscription/subscribe) → 
Credits Allocated → Redirect to /profile
```

### 4. Profile Building Flow
```
/profile → Load Profile Data → Edit Sections → 
Credit Check (5 credits per edit) → API Calls → 
Auto-save → Real-time Credit Updates
```

### 5. Credit Management System

**Credit Deduction Logic:**
1. **Middleware**: `requireCredits()` in `server/routes.ts`
2. **Check**: Verifies active subscription + sufficient credits (≥5)
3. **Deduction**: 5 credits per profile edit operation
4. **Update**: Real-time credit counter in UI

**Credit Sources:**
- **Subscription**: Basic (500 credits), Premium (1,000 credits)
- **Top-ups**: 100 credits for ₹500 (active subscribers only)

## Key Components & Hooks

### Frontend State Management
- **useAuth()**: Authentication context with login/logout mutations
- **useQuery()**: Server state fetching with caching
- **useMutation()**: Server state mutations with optimistic updates
- **ProtectedRoute**: Route protection based on authentication

### Backend Middleware
- **requireAuth()**: Ensures user is authenticated
- **requireCredits()**: Ensures sufficient credits for operations
- **setupAuth()**: Configures Passport.js authentication

## File Upload & Storage
- **Strategy**: Direct-to-cloud upload with presigned URLs
- **Storage**: Google Cloud Storage integration
- **Types**: Profile photos (images) and CV documents (PDFs)
- **Component**: ObjectUploader with Uppy library

## Development Setup
- **Frontend**: Vite dev server with HMR
- **Backend**: Express with tsx for TypeScript execution
- **Database**: PostgreSQL with Drizzle ORM
- **Development**: Single port (5000) serving both frontend and API
- **Build**: Vite builds frontend, esbuild bundles backend

## Production Deployment
- **Build Process**: `npm run build`
- **Static Files**: Frontend built to `dist/public`
- **Server**: Express serves static files + API routes
- **Database**: Neon PostgreSQL serverless
- **Environment**: Replit deployment platform

This architecture provides a scalable, maintainable SPA with robust authentication, subscription management, and credit-based feature gating.