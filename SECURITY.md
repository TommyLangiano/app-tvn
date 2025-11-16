# Security Documentation

## Overview

This document outlines the security measures implemented in the application.

## Authentication & Authorization

### Authentication
- **Provider**: Supabase Auth
- **Method**: Email/Password
- **Session Storage**: HTTP-only cookies (secure, sameSite: lax)
- **Token Types**: JWT access token + refresh token

### Multi-Tenant Isolation
- **Row Level Security (RLS)**: All tables enforce tenant isolation at database level
- **Tenant Check**: Middleware validates tenant membership on every request
- **Data Access**: Users can only access data from their tenant(s)

### Role-Based Access Control
- `owner` - Full access to all features
- `admin` - Full read/write access
- `admin_readonly` - Read-only access
- `operaio` - Limited to own work reports
- `billing_manager` - Can manage invoices and billing

## Rate Limiting

### Configuration
- **Login**: 5 attempts per 15 minutes per IP
- **Signup**: 3 registrations per hour per IP
- **File Upload**: 10 uploads per hour per user
- **API Calls**: 100 requests per minute per IP

### Implementation
- **Production**: Upstash Redis (distributed)
- **Development**: In-memory cache (single instance only)

### Setup
To enable production rate limiting, set these environment variables:
```bash
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

Get free Redis at: https://upstash.com

## File Upload Security

### Restrictions
- **Max Size**: 10MB
- **Allowed Types**: PDF, JPG, PNG, WEBP, HEIC, HEIF
- **Blocked Types**: SVG (XSS risk), EXE, scripts
- **Path Validation**: Filenames sanitized to prevent directory traversal

### Storage
- **Provider**: Supabase Storage
- **Bucket**: `app-storage` (public)
- **Path Structure**: `{tenant_id}/{category}/{filename}`
- **RLS**: Users can only upload/access files in their tenant folder

### Validations
1. File size check (server-side)
2. MIME type validation
3. Extension verification
4. Filename sanitization
5. Rate limiting (10 per hour)

## Input Validation

All API endpoints use **Zod** schemas for input validation:

```typescript
const signupSchema = z.object({
  company_name: z.string().min(1).max(100),
  first_name: z.string().min(1).max(50),
  last_name: z.string().min(1).max(50),
  email: z.string().email(),
  password: z.string().min(8),
});
```

## Audit Logging

### Events Tracked
- User creation/update/deletion
- Role changes
- Login attempts (success/failure)
- File uploads
- Permission changes
- Sensitive data access

### Log Structure
```typescript
{
  tenant_id: UUID,
  user_id: UUID,
  event_type: string,
  resource_type: string,
  resource_id: string,
  old_values: JSONB,
  new_values: JSONB,
  ip_address: string,
  user_agent: string,
  notes: string,
  created_at: timestamp
}
```

### Usage
```typescript
import { logAuditEvent } from '@/lib/audit';

await logAuditEvent({
  tenantId: 'xxx',
  userId: 'xxx',
  eventType: 'user_role_changed',
  resourceType: 'user',
  resourceId: userId,
  oldValues: { role: 'member' },
  newValues: { role: 'admin' },
  ipAddress: clientIp,
  userAgent: userAgent,
});
```

## Attack Prevention

### SQL Injection
✅ **Protected** - All queries use Supabase parameterized queries

### XSS (Cross-Site Scripting)
✅ **Protected**
- React auto-escapes output
- SVG files blocked from upload
- No `dangerouslySetInnerHTML` usage

### CSRF (Cross-Site Request Forgery)
✅ **Protected** - SameSite cookies + same-origin API

### Brute Force
✅ **Protected** - Rate limiting on login (5 attempts per 15 min)

### File Upload Malware
⚠️ **Partially Protected**
- MIME type validation
- Extension check
- Size limits
- ⚠️ No virus scanning (recommended: ClamAV or cloud service)

### Tenant Isolation Bypass
✅ **Protected** - RLS policies at database level

### Privilege Escalation
✅ **Protected** - Roles enforced by RLS + API checks

## Security Checklist for Production

### Before Deploying

- [ ] Set strong `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Configure Upstash Redis for rate limiting
- [ ] Enable HTTPS (handled by Vercel)
- [ ] Set secure environment variables
- [ ] Review RLS policies in Supabase dashboard
- [ ] Test tenant isolation thoroughly
- [ ] Configure CORS if needed
- [ ] Enable Supabase email verification (`email_confirm: false`)
- [ ] Set up password reset flow
- [ ] Add security headers (CSP, X-Frame-Options)
- [ ] Run dependency audit: `npm audit`
- [ ] Test file upload with malicious files
- [ ] Review audit logs regularly

### Monitoring

- [ ] Monitor failed login attempts
- [ ] Track rate limit hits
- [ ] Review audit logs weekly
- [ ] Check for unusual file uploads
- [ ] Monitor database query performance
- [ ] Set up alerts for security events

## Known Limitations

1. **No Virus Scanning**: Uploaded files are not scanned for malware
2. **No MFA**: Multi-factor authentication not implemented
3. **In-Memory Rate Limiting**: Development mode uses local cache (not distributed)
4. **No Password Reset**: Users cannot reset forgotten passwords yet
5. **Email Auto-Confirm**: Currently bypasses email verification (temporary)

## Planned Improvements

1. Implement password reset flow
2. Add multi-factor authentication (TOTP)
3. Integrate virus scanning (ClamAV)
4. Add Content Security Policy headers
5. Implement session management (view/revoke active sessions)
6. Add IP allowlisting for enterprise
7. Enhance password policy (12+ chars, complexity)
8. Add EXIF metadata stripping from images

## Reporting Security Issues

If you discover a security vulnerability, please email: **security@tvn.com**

Do NOT create public GitHub issues for security vulnerabilities.

## Security Updates

- 2025-01-14: Added rate limiting, audit logging, Zod validation
- 2025-01-14: Removed SVG upload support
- 2025-01-14: Deleted debug API endpoint
- 2025-01-14: Added file upload validation

---

**Last Updated**: 2025-01-14
