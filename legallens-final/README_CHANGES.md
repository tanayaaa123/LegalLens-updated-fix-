# LegalLens — Complete Feature Update

## How to Run

### Backend
```bash
cd Backend
npm install
# Create .env file:
# MONGO_URI=your_mongodb_uri
# JWT_SECRET=your_secret
# PORT=5000
npm start
```

### Frontend
```bash
cd Frontend
npm install
npm start
```

---

## New Files Added

### Backend
| File | Description |
|------|-------------|
| `Backend/models/Notification.js` | New: Notification model |
| `Backend/models/Evidence.js` | Updated: Added title, file_url, file_name, file_type fields |
| `Backend/models/User.js` | Updated: Added phone, department, bio, avatar fields |
| `Backend/server.js` | Updated: All new endpoints (see below) |

### Frontend — New Pages
| Page | Route | Access |
|------|-------|--------|
| Notifications | `/notifications` | All roles |
| Audit Log | `/audit-log` | Admin (role 1) only |
| Settings | `/settings` | All roles |
| Profile | `/profile` | All roles |

### Frontend — New Components
| Component | Description |
|-----------|-------------|
| `EvidenceTab.js` | Full evidence upload/view/verify/delete per case |
| `MembersTab.js` | Updated: add/remove members (admin only) |

---

## Role-Based Access

| Role ID | Name | Access |
|---------|------|--------|
| 1 | Supervising_Officer (Admin) | Everything: create cases, delete cases, view audit log, add/remove members, verify/delete evidence |
| 2 | Lead_Investigator | Upload evidence, view assigned cases |
| 3 | Forensic_Officer | Upload + verify evidence, view assigned cases |
| 4 | Police_Officer | View assigned cases and evidence only |

---

## New API Endpoints

### Notifications
- `GET /notifications` — get all for current user
- `PATCH /notifications/:id/read` — mark one read
- `PATCH /notifications/read-all` — mark all read
- `GET /notifications/unread-count` — badge count

### Audit Log
- `GET /audit-logs?page=1&limit=15&search=` — paginated, admin only

### Evidence (isolated by case)
- `GET /case/:id/evidence` — only returns evidence for THAT case
- `POST /case/:id/evidence` — upload with file (multipart/form-data)
- `PATCH /evidence/:id/verify` — forensic + admin only
- `DELETE /evidence/:id` — admin only

### Profile
- `GET /profile` — get own profile
- `PUT /profile` — update name, phone, department, bio
- `POST /profile/avatar` — upload profile picture
- `POST /change-password` — change password with current password check
- `POST /forgot-password` — reset to temp password

### Case Management (admin)
- `PATCH /case/:id/status` — update case status
- `DELETE /case/:id` — delete case + all its members and evidence
- `POST /case/:caseId/member` — add member
- `DELETE /case/:caseId/member/:userId` — remove member

---

## Key Design Decisions

1. **Notification dots**: Red = unread, Green = read (visible on bell icon and in notifications list)
2. **Evidence isolation**: Evidence is stored with MongoDB ObjectId of case — backend only returns evidence matching that case's ObjectId, so evidence uploaded to case 8 never appears in case 1
3. **Audit log**: Every significant action (case create/delete, member add/remove, evidence upload/verify/delete, profile update) creates an automatic audit log entry
4. **Notifications**: When a case is created or evidence uploaded, all case members receive notifications automatically
5. **Light/Dark theme**: Toggled in Settings, stored in localStorage, applied via `data-theme="light"` on `<html>`
6. **File uploads**: Stored in `Backend/uploads/` folder, served as static files
7. **Security**: JWT auth on all routes, role middleware guards sensitive endpoints
