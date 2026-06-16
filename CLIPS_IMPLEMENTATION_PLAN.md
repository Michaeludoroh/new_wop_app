# Clips Product Direction

The platform no longer includes a Sermons module. Clips is the primary ministry content experience across backend, admin web, and mobile.

## Architecture Update

- Backend owns Clips as a first-class content module with published public routes and protected admin management routes.
- `Clip.mediaUrl` remains the database storage field for existing compatibility; API, admin, and mobile expose this as `videoUrl`.
- Clips support categories, title, description, thumbnail URL, video URL, duration, speaker/presenter, scripture references, tags, view count, featured placement, status, publishing, and soft deletion.
- Mobile treats Clips as the primary video destination with feed, featured clips, search, category filtering, favorites, share, detail, and playback.
- Admin web manages clip metadata, featured placement, and publish/unpublish workflow.

## Roadmap Update

1. Clips production workflow and playback.
2. eBook/library production completion.
3. Donations and giving flows.
4. Mobile release hardening.
5. Operational monitoring, backups, and content moderation polish.

## Navigation Update

- Mobile dashboard replaces the Sermons tab with Clips.
- Admin dashboard Clips navigation now opens a working management module instead of a placeholder.
- Public API consumers should use `/clips/public*`; admin clients should use `/clips/admin*`.

## Implementation Priorities

1. Keep Clips stable as the canonical ministry video module.
2. Add media upload/storage integration when a production object storage provider is selected.
3. Add deeper analytics for watch time and completion rate.
4. Add server-backed favorites if favorites need to sync across devices.
5. Add moderation workflow if non-admin users are later allowed to submit clips.
