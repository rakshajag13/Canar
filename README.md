# Canar SPA Profile Builder - Enhanced Authentication System

A comprehensive SaaS application for building professional profiles with advanced authentication, subscription management, and multi-tenant architecture.

## 🚀 Features

### Authentication & Security
- **Dual Authentication Modes**: Session-based (development) and JWT (production)
- **Multi-tenant Architecture**: Complete tenant isolation
- **Password Security**: bcrypt hashing with salt
- **Token Management**: Automatic refresh and secure storage
- **Rate Limiting**: Built-in protection against abuse

### Subscription Management
- **Credit-based System**: Pay-per-edit model
- **Plan Management**: Basic and Premium plans
- **Automatic Deduction**: Credits deducted on profile edits
- **Expiration Handling**: Subscription expiry management
- **Top-up System**: Additional credit purchases

### Database & Performance
- **PostgreSQL Integration**: Robust relational database
- **Automated Setup**: Database initialization and validation
- **Performance Indexes**: Optimized queries
- **Migration Ready**: Drizzle ORM with schema management

### Client-Side Features
- **Protected Routes**: Authentication and subscription checks
- **Real-time Updates**: Live credit balance and subscription status
- **Responsive UI**: Modern, mobile-friendly interface
- **Error Handling**: Comprehensive error management

## 🏗️ Architecture Overview

### Service-Oriented Design
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Auth Service  │    │ Subscription    │    │   Profile       │
│                 │    │   Service       │    │   Service       │
│ • Registration  │    │ • Plan Mgmt     │    │ • CRUD Ops      │
│ • Login/Logout  │    │ • Credit Mgmt   │    │ • File Upload   │
│ • Token Mgmt    │    │ • Billing       │    │ • PDF Export    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │   Database      │
                    │                 │
                    │ • Users         │
                    │ • Subscriptions │
                    │ • Profiles      │
                    │ • Analytics     │
                    └─────────────────┘
```

### Authentication Flow
```
1. User Registration → Password Hashing → User Creation
2. User Login → Credential Validation → Token/Session Creation
3. API Requests → Token Validation → Tenant Isolation Check
4. Protected Operations → Credit Validation → Action Execution
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

### 1. Clone and Install Dependencies
```bash
git clone <repository-url>
cd CPM
npm install --legacy-peer-deps
```

### 2. Environment Configuration
Create a `.env` file in the root directory:

```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/canar_db

# Authentication
AUTH_STRATEGY=hybrid  # session, jwt, or hybrid
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_EXPIRES_IN=7d
SESSION_SECRET=your-session-secret-key

# Environment
NODE_ENV=development
PORT=5000

# Security
CORS_ORIGIN=http://localhost:3000
```

### 3. Database Setup
```bash
# The database will be automatically set up on first run
npm run dev
```

### 4. Run the Application
```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

## 🧪 Testing

### Run Authentication Tests
```bash
# Install test dependencies
npm install node-fetch --legacy-peer-deps

# Run comprehensive test suite
node test-auth.js
```

The test suite validates:
- ✅ User registration and login
- ✅ JWT/Session authentication
- ✅ Subscription creation and management
- ✅ Credit deduction system
- ✅ Tenant isolation
- ✅ Protected route access
- ✅ Database integration

### Test Coverage
- **17 comprehensive tests** covering the entire authentication flow
- **Database validation** and connection testing
- **API endpoint testing** with proper error handling
- **Security validation** including tenant isolation
- **Subscription logic** testing with credit management

## 🔧 Configuration Options

### Authentication Strategies

#### Session-Based (Development)
```bash
AUTH_STRATEGY=session
```
- Simple to debug
- Built-in CSRF protection
- No client-side token management

#### JWT-Based (Production)
```bash
AUTH_STRATEGY=jwt
```
- Stateless and scalable
- Works with microservices
- Requires proper token management

#### Hybrid (Recommended)
```bash
AUTH_STRATEGY=hybrid
```
- Best of both worlds
- Session for development, JWT for production
- Flexible deployment options

### Subscription Plans

#### Basic Plan
- **Price**: ₹1,999/month
- **Credits**: 500 editing credits
- **Features**: PDF export, profile sharing, photo upload

#### Premium Plan
- **Price**: ₹2,999/month
- **Credits**: 1,000 editing credits
- **Features**: All Basic features + priority support

## 📊 API Endpoints

### Authentication
```
POST /api/register          # User registration
POST /api/login            # User login
POST /api/logout           # User logout
GET  /api/user             # Get current user
GET  /api/auth/health      # Health check
```

### Subscription
```
GET  /api/subscription/plans     # Get available plans
POST /api/subscription/subscribe # Create subscription
GET  /api/credits               # Get credit status
POST /api/subscription/credits/topup # Add credits
```

### Profile Management
```
GET  /api/profile              # Get user profile
PUT  /api/profile              # Update profile (5 credits)
GET  /api/education            # Get education
POST /api/education            # Add education (5 credits)
PUT  /api/education/:id        # Update education (5 credits)
DELETE /api/education/:id      # Delete education
```

## 🔒 Security Features

### Implemented Security Measures
- ✅ **Password Hashing**: bcrypt with salt
- ✅ **JWT Token Validation**: Secure token verification
- ✅ **Tenant Isolation**: User data separation
- ✅ **Input Validation**: Zod schema validation
- ✅ **CORS Protection**: Cross-origin request handling
- ✅ **Rate Limiting**: Basic request throttling

### Security Best Practices
- **Token Storage**: httpOnly cookies for refresh tokens
- **Password Policy**: Strong password requirements
- **Session Management**: Secure session configuration
- **Error Handling**: No sensitive data in error messages
- **Database Security**: Prepared statements and validation

## 🚀 Production Deployment

### Environment Variables
```bash
# Production Configuration
NODE_ENV=production
AUTH_STRATEGY=jwt
JWT_SECRET=your-super-secure-production-secret
DATABASE_URL=your-production-database-url
REDIS_URL=your-redis-url-for-caching

# Security
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
```

### Deployment Checklist
- [ ] Set secure environment variables
- [ ] Configure production database
- [ ] Set up SSL/TLS certificates
- [ ] Configure reverse proxy (nginx)
- [ ] Set up monitoring and logging
- [ ] Implement backup strategies
- [ ] Configure rate limiting
- [ ] Set up CI/CD pipeline

## 📈 Performance Optimization

### Database Optimization
- **Indexes**: Optimized for common queries
- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Selective field loading
- **Caching**: Redis integration for frequently accessed data

### API Optimization
- **Response Caching**: Cache static data
- **Pagination**: Large dataset handling
- **Compression**: Gzip response compression
- **CDN Integration**: Static asset delivery

## 🔍 Monitoring & Observability

### Metrics to Track
- **Authentication**: Login success/failure rates
- **Subscription**: Plan conversion rates
- **Performance**: API response times
- **Security**: Failed authentication attempts

### Logging
- **Structured Logging**: JSON format for easy parsing
- **Error Tracking**: Comprehensive error logging
- **Audit Trail**: User action logging
- **Performance Monitoring**: Query and response time tracking

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `node test-auth.js`
5. Submit a pull request

### Code Standards
- **TypeScript**: Strict type checking
- **ESLint**: Code quality enforcement
- **Prettier**: Code formatting
- **Testing**: Comprehensive test coverage

## 📚 Documentation

### Additional Resources
- [Authentication Analysis](./AUTHENTICATION_ANALYSIS.md) - Detailed architecture analysis
- [API Documentation](./docs/api.md) - Complete API reference
- [Database Schema](./shared/schema.ts) - Database structure
- [Deployment Guide](./docs/deployment.md) - Production deployment

### Architecture Decisions
- **JWT vs Sessions**: See [Authentication Analysis](./AUTHENTICATION_ANALYSIS.md)
- **Database Design**: Optimized for multi-tenancy
- **Service Architecture**: Modular and scalable design
- **Security Model**: Defense in depth approach

## 🆘 Support

### Common Issues
1. **Database Connection**: Check DATABASE_URL and PostgreSQL service
2. **Authentication Errors**: Verify JWT_SECRET and session configuration
3. **Credit Deduction**: Ensure subscription is active and credits available
4. **CORS Issues**: Configure CORS_ORIGIN for your domain

### Getting Help
- Check the [Authentication Analysis](./AUTHENTICATION_ANALYSIS.md) for detailed explanations
- Run the test suite to validate your setup
- Review the API documentation for endpoint details
- Check the logs for detailed error information

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for secure, scalable SaaS applications**
