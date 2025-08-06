# Overview

Canar is a modern Single Page Application (SPA) for building and managing professional profiles with a subscription-based credit system. The platform allows users to create comprehensive profiles with personal information, education, projects, skills, and work experience. Key features include autosave functionality, PDF export, profile sharing, and file uploads for photos and CVs. The application implements a credit-based editing system where users consume credits for each profile modification, encouraging thoughtful updates while generating revenue through subscription plans and credit top-ups.

## Application Flow
1. **Landing Page** (`/`) → **Subscription** (`/subscription`) → **Profile Builder** (`/profile`)
2. **Credit System**: 5 credits per edit operation with real-time tracking
3. **Authentication**: BYPASSED - All routes accessible without authentication
4. **State Management**: TanStack Query for server state, React Context for authentication
5. **Protection**: ProtectedRoute bypassed - direct access to all pages

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **UI Library**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with CSS variables for theming support
- **State Management**: TanStack Query (React Query) for server state management
- **Form Handling**: React Hook Form with Zod validation for type-safe form schemas
- **Authentication**: Context-based authentication with protected routes

## Backend Architecture
- **Runtime**: Node.js with Express.js web framework
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy using session-based authentication
- **Session Management**: Express sessions with PostgreSQL session store
- **Password Security**: Node.js crypto module with scrypt hashing and salt
- **API Design**: RESTful endpoints with JSON responses
- **Middleware**: Request logging, error handling, and authentication guards

## Database Design
- **Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema**: Normalized relational design with foreign key constraints
- **Tables**: Users, subscriptions, profiles, education, projects, skills, experiences, credit purchases
- **Validation**: Zod schemas for runtime type checking and validation

## Credit System Architecture
- **Credit Deduction**: 5 credits per profile edit operation
- **Subscription Plans**: Basic (₹1,999, 500 credits) and Premium (₹2,999, 1,000 credits)
- **Top-up System**: Additional 100 credits for ₹500 for active subscribers
- **Access Control**: Middleware to check credit availability before allowing edits
- **Credit Tracking**: Real-time credit counter with automatic updates

## File Upload Strategy
- **Cloud Storage**: Google Cloud Storage for photo and CV uploads
- **Upload Library**: Uppy for drag-and-drop file upload interface
- **File Types**: Images for profile photos, PDFs for CV documents
- **Integration**: AWS S3-compatible upload flow with Uppy dashboard

# External Dependencies

## Cloud Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Google Cloud Storage**: Object storage for user-uploaded files (photos and CVs)
- **Replit Platform**: Development and hosting environment with integrated tooling

## Payment Processing
- **Stripe**: Payment gateway for subscription purchases and credit top-ups
- **Stripe React**: Client-side payment components for secure checkout flows

## UI and Components
- **Radix UI**: Headless UI components for accessibility and functionality
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Icon library for consistent iconography
- **shadcn/ui**: Pre-built component library built on Radix and Tailwind

## Development Tools
- **Vite**: Fast development server and build tool with HMR support
- **TypeScript**: Static type checking across frontend and backend
- **Drizzle Kit**: Database migration and schema management tools
- **ESBuild**: Fast JavaScript bundler for production builds

## Authentication and Security
- **Passport.js**: Authentication middleware with local strategy support
- **Express Session**: Server-side session management with PostgreSQL storage
- **bcrypt/scrypt**: Password hashing with salt for secure credential storage

## Data Fetching and Validation
- **TanStack Query**: Server state management with caching and synchronization
- **Zod**: Runtime type validation and schema definition
- **React Hook Form**: Form state management with validation integration