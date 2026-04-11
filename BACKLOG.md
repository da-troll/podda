# Podda Backlog

## User Management

### Phase A — Admin User Management Panel
- Admin-only Settings section (gated by `is_admin`)
- List all users (username, name, email, admin status, created date)
- Create user (username, password, first/last name, email, admin toggle)
- Delete user (with confirmation modal)
- Reset another user's password

### Phase B — Self-Service Settings
- Change own display name
- Change own first/last name and email
- Change own password (requires current password confirmation)

### Phase C — Full Multi-User (A + B + enforcement)
- `requireAdmin` middleware for admin-only routes
- Admin flag enforced on user management endpoints
- All Phase A and Phase B features complete

### Phase D — Quick DB Fix
- Change Daniel's password from `changeme` to something real
- Change Terje's temp password `podda2026`
- *(Unblocked once Phase B lands)*
