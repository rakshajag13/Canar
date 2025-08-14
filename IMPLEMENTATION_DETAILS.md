# CPM Project Implementation Details

## Table of Contents

1. [Authentication Strategy Implementation](#authentication-strategy-implementation)
2. [Database Multi-Tenant Architecture](#database-multi-tenant-architecture)
3. [Subscription System Implementation](#subscription-system-implementation)
4. [Navigation and Access Flow](#navigation-and-access-flow)
5. [Service-Oriented Architecture](#service-oriented-architecture)
6. [Database Evidence and Queries](#database-evidence-and-queries)

---

## Authentication Strategy Implementation

### Approach and Requirements Analysis

**Initial Requirements:**

- Make existing auth structure fully functional both locally and production-ready
- Test authentication using different strategies
- Recommend best strategy for multi-tenant SaaS
- Ensure all APIs use auth middleware with tenant isolation

### Implementation Strategy

#### 1. Hybrid Authentication Architecture

We implemented a **hybrid authentication system** that supports three modes:

```typescript
// Environment-based strategy selection
const AUTH_STRATEGY = process.env.AUTH_STRATEGY || "session"; // "session" | "jwt" | "hybrid"
```

**Why Hybrid Approach?**

- **Development**: Session-based for easy debugging and development
- **Production**: JWT-based for scalability and microservices
- **Flexibility**: Can switch between strategies without code changes

#### 2. Authentication Strategies Comparison

| Strategy          | Pros                                                                                     | Cons                                                                              | Best For                  |
| ----------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------- |
| **Session-Based** | ✅ Simple to debug<br>✅ Built-in CSRF protection<br>✅ Easy to invalidate               | ❌ Not stateless<br>❌ Poor scalability<br>❌ Memory usage grows                  | Development, small apps   |
| **JWT-Based**     | ✅ Stateless and scalable<br>✅ Works with microservices<br>✅ No server storage needed  | ❌ Cannot be invalidated<br>❌ Larger payload size<br>❌ Complex token management | Production, microservices |
| **Hybrid**        | ✅ Best of both worlds<br>✅ Environment-specific optimization<br>✅ Easy migration path | ❌ More complex implementation<br>❌ Requires careful strategy selection          | Multi-environment SaaS    |

#### 3. Implementation Details

**Password Security:**

```typescript
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
```

**JWT Token Generation:**

```typescript
function generateJWT(user: SelectUser): string {
  const payload = {
    id: user.id,
    email: user.email,
    tenantId: user.id, // For multi-tenant isolation
    iat: Math.floor(Date.now() / 1000),
  };
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}
```

**Tenant Isolation Middleware:**

```typescript
export function requireTenantAccess(req: any, res: any, next: any) {
  const userId = req.user?.id;
  const requestedUserId = req.params.userId || req.body.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  // Users can only access their own data (tenant isolation)
  if (requestedUserId && requestedUserId !== userId) {
    return res.status(403).json({
      success: false,
      message: "Access denied: tenant isolation",
    });
  }

  next();
}
```

### Authentication Strategy Recommendation

**Recommended for Production: Hybrid with JWT Primary**

**Rationale:**

1. **Scalability**: JWT enables horizontal scaling without session sharing
2. **Microservices Ready**: Stateless tokens work across service boundaries
3. **Performance**: No database lookups for authentication
4. **Security**: Proper token rotation and refresh mechanisms
5. **Flexibility**: Can fall back to sessions for specific use cases
