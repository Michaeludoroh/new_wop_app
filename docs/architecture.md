# Architecture Blueprint

## Tech Stack

- Mobile: Flutter
- Admin Web: Next.js
- Backend: NestJS
- ORM: Prisma
- DB: PostgreSQL
- Cache/Queue: Redis
- Auth: Firebase Auth + backend JWT
- Notifications: Firebase Cloud Messaging
- Payments: Flutterwave

## High-Level Components

1. **Flutter Mobile App**
   - Feature-first module organization
   - Offline cache for selected resources
   - Secure token handling
   - Clips-first video consumption, eBook access, and user interactions

2. **Next.js Admin Dashboard**
   - Role-based access control
   - Clips, announcement, and library content management
   - Subscription/payment monitoring
   - Analytics reporting

3. **NestJS API**
   - Modular architecture by domain:
     - auth
     - users
     - subscriptions
     - payments
     - announcements
     - clips
     - ebooks
     - policies
     - programs
     - mentorship
     - notifications
     - analytics
   - Payment webhook verification
   - Entitlement checks for subscription-gated resources

4. **Data Layer**
   - PostgreSQL relational schema for transactional consistency
   - Redis for caching, pub/sub, and asynchronous jobs

## Security Design

- Firebase ID token verification and API JWT issuance
- RBAC + permission guards at API layer
- Webhook signature verification for gateways
- Signed URL media access for protected content
- Audit logs for privileged actions
- Rate limiting and secure headers

## Scalability Design

- Stateless API containers
- Read-heavy modules use caching
- CDN-backed media delivery
- Queue-based processing for notifications and background jobs
- Modular services to support future microservice decomposition

## Core Domain Entities (Initial)

- users
- roles / permissions / user_roles
- subscription_plans
- subscriptions
- payments
- announcements
- clips with category metadata, tags, scripture references, featured placement, view counts, and favorites
- ebooks / ebook_access_rules / ebook_bookmarks
- policies
- programs / courses / lessons / enrollments / progress
- mentorship_sessions / bookings / assignments / feedback
- notifications / notification_logs
- audit_logs

## Delivery Phases

### Phase 1 (MVP)
- Authentication
- Subscription/payments
- Announcements
- Clips as the primary ministry content experience
- eBooks basic access
- Admin basics

### Phase 2
- Mentorship workflows
- Empowerment programs and progress
- Certificates and live session integrations

### Phase 3
- Advanced analytics
- Personalization
- Broader offline capabilities
