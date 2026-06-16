# Contract Matrix

This matrix documents the API contracts stabilized in Milestone 2. The canonical contract is the backend DTO/controller shape; mobile and admin clients were aligned to these names and routes.

## Auth

| Endpoint | Method | Request DTO | Response DTO | Client consumers | Notes |
|---|---:|---|---|---|---|
| `/api/v1/auth/register` | POST | `RegisterDto` | `{ user, accessToken, refreshToken }` | Flutter auth, admin auth API | Flat token response remains supported by clients. |
| `/api/v1/auth/login` | POST | `LoginDto` | `{ user, accessToken, refreshToken }` | Flutter auth, admin auth API | Admin debug response logging removed. |
| `/api/v1/auth/refresh` | POST | `RefreshTokenDto` | `{ user, accessToken, refreshToken }` | Flutter auth refresh, admin auth refresh | Refresh clients tolerate flat token response. |
| `/api/v1/auth/logout` | POST | `LogoutDto` | `{ message }` | Flutter logout, admin logout | Uses refresh token revocation. |
| `/api/v1/auth/me` | GET | Bearer JWT | `AuthUserResponse` | Flutter bootstrap, admin bootstrap | JWT strategy now verifies current DB user state. |
| `/api/v1/auth/forgot-password` | POST | `ForgotPasswordDto` | `{ message }` | Flutter/admin forgot password | Email delivery remains future work. |
| `/api/v1/auth/reset-password` | POST | `ResetPasswordDto` | `{ message }` | Flutter/admin reset password | Revokes active refresh sessions. |

## Subscriptions

| Endpoint | Method | Request DTO | Response DTO | Client consumers | Notes |
|---|---:|---|---|---|---|
| `/api/v1/subscriptions/plans` | GET | Bearer JWT | `{ data: SubscriptionPlan[] }` | Future mobile/admin | Protected for user/admin. |
| `/api/v1/subscriptions/subscribe` | POST | `SubscribeDto` with `planCode`, `autoRenew?`, `metadata?` | `{ message, data: { subscription, transaction } }` | Flutter subscription service | Flutter now sends `planCode`; legacy `plan` is not canonical. |
| `/api/v1/subscriptions/cancel` | POST | `CancelSubscriptionDto` | `{ message, data }` | Future mobile/admin | Protected for user/admin. |
| `/api/v1/subscriptions/me` | GET | Bearer JWT | `{ data: UserSubscription | null }` | Future mobile/admin | Same as status. |
| `/api/v1/subscriptions/status` | GET | Bearer JWT | `{ data: UserSubscription | null }` | Flutter subscription status | Existing mobile parser remains tolerant. |

## Notifications

| Endpoint | Method | Request DTO | Response DTO | Client consumers | Notes |
|---|---:|---|---|---|---|
| `/api/v1/notifications` | GET | `ListNotificationsQueryDto` with `isRead?`, `limit?`, `offset?` | `{ data, total, limit, offset }` | Flutter notifications, admin notifications | Flutter now uses `isRead` and `offset`, not `readState`/`page`. |
| `/api/v1/notifications/:id` | GET | `id` param | `Notification` | Flutter/admin notifications | User can access owned or broadcast notifications. |
| `/api/v1/notifications/:id/read-state` | PATCH | `MarkNotificationReadDto` with `isRead` | `Notification` | Flutter/admin notifications | Flutter now sends boolean `isRead`. |
| `/api/v1/notifications/broadcast` | POST | `CreateBroadcastNotificationDto` | `Notification` | Admin notifications | Admin/super admin only. |
| `/api/v1/notifications/targeted` | POST | `CreateTargetedNotificationDto` | `Notification` | Admin notifications | Admin/super admin only. |

## Announcements

| Endpoint | Method | Request DTO | Response DTO | Client consumers | Notes |
|---|---:|---|---|---|---|
| `/api/v1/announcements/public` | GET | `AnnouncementQueryDto` | `{ data, meta }` | Future public/mobile feed | Public published feed. |
| `/api/v1/announcements/public/:id` | GET | `id` param | `AnnouncementResponse` | Future public/mobile detail | Public published item. |
| `/api/v1/announcements/admin` | GET | `AnnouncementQueryDto` | `{ data, meta }` | Admin announcements | Admin client now uses admin route. |
| `/api/v1/announcements/admin` | POST | `CreateAnnouncementDto` with `title`, `content`, `category?`, `imageUrl?`, `isPublished?` | `AnnouncementResponse` | Admin announcements | Admin now sends `content`, not `body`; `isPublished` defaults true client-side. |
| `/api/v1/announcements/admin/:id` | PATCH | `UpdateAnnouncementDto` | `AnnouncementResponse` | Future admin edit | Admin/super admin only. |
| `/api/v1/announcements/admin/:id/publish` | PATCH | Bearer JWT | `AnnouncementResponse` | Future admin publish | Admin/super admin only. |
| `/api/v1/announcements/admin/:id/unpublish` | PATCH | Bearer JWT | `AnnouncementResponse` | Future admin unpublish | Admin/super admin only. |
| `/api/v1/announcements/admin/:id` | DELETE | Bearer JWT | `{ success: true }` | Future admin delete | Admin/super admin only. |

## Ebooks and Library

| Endpoint | Method | Request DTO | Response DTO | Client consumers | Notes |
|---|---:|---|---|---|---|
| `/api/v1/ebooks` | GET | `search?`, `category?`, `featured?`, `recent?` | `{ data, featured, recent }` | Flutter eBook catalog | Contract unchanged. |
| `/api/v1/ebooks/:id` | GET | `id` param | `{ data: Ebook }` | Flutter eBook detail | Contract unchanged. |
| `/api/v1/ebooks/purchase` | POST | `{ ebookId, paymentReference? }` | `{ message, data }` | Flutter eBook purchase | Payment verification remains Milestone 3. |
| `/api/v1/ebooks/:id/access` | GET | `id` param | `{ authorized, reason, streamToken, expiresInSeconds? }` | Flutter reader flow | Stream token hardening remains Milestone 3/4 security work. |
| `/api/v1/library` | GET | Bearer JWT | `{ purchased, subscription, continueReading, downloads, history }` | Flutter library | Contract unchanged. |

## Payments

| Endpoint | Method | Request DTO | Response DTO | Client consumers | Notes |
|---|---:|---|---|---|---|
| `/api/v1/payments/history` | GET | `PaymentHistoryQueryDto` | `{ data: PaymentTransaction[] }` | Future admin/mobile | User sees own history; elevated role may query by user. |
| `/api/v1/payments/webhook` | POST | `PaymentWebhookDto` | `{ message, data }` | Admin/manual testing only today | Still admin-JWT protected. Provider-signature public webhooks are Milestone 3. |

## Admin Web Client Changes

- Announcements client now calls `/announcements/admin`.
- Announcement publish payload now uses `content`, `category`, and `isPublished`.
- Announcement admin page is limited to `SUPER_ADMIN` and `ADMIN`.
- Notification client already matched `isRead`, `limit`, and `offset`.
- Auth debug logging was removed.

## Flutter Client Changes

- Subscription service now sends `planCode`.
- Notification service now sends query `isRead`, `limit`, and `offset`.
- Notification read-state mutation now sends `{ isRead: boolean }`.
- Notification model now parses backend `isRead` and `offset`.
