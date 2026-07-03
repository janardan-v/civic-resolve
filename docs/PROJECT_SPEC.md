# Project Overview

Civic Resolve is a full-stack civic issue management application. It supports citizen report submission, administrative report management, status tracking, notifications, and analytics.

## Objectives

- Provide a public-facing interface for citizens to submit civic complaints.
- Enable administrators to manage reports, assign departments, and track status.
- Maintain an audit trail of report lifecycle events.
- Send reminders for overdue pending reports.
- Store complaint media using a cloud service.

## Functional Requirements

- Users can register and authenticate with email and password.
- Authenticated citizens can submit reports with photo, optional voice recording, and location data.
- Citizens can view their own reports and notification history.
- Administrators can access protected endpoints for report management.
- Administrators can update report status, assign reports, and mark reports as resolved.
- The system creates a history record for each report change.
- A scheduled task sends notifications for pending reports older than 48 hours.
- Analytics data is generated and available through a dashboard endpoint.

## Architecture

The application consists of a static frontend and a Node.js/Express backend.

- The frontend is composed of HTML, CSS, and JavaScript pages.
- The backend exposes RESTful routes under `/api/v1/`.
- MongoDB stores users, reports, categories, departments, assignments, notifications, analytics, and history.
- Cloudinary stores uploaded media assets.
- Nodemailer sends email notifications.
- `node-cron` schedules background reminders.

## Authentication Flow

1. Users register with username, name, email, phone, and password.
2. Passwords are hashed with `bcrypt` before storage.
3. Login verifies credentials and issues JWT access and refresh tokens.
4. Access tokens are validated by `auth.middleware.js` on protected routes.
5. Refresh tokens are stored in the user document and refreshed via `/api/v1/users/refresh-token`.
6. Logout clears the stored refresh token and cookies.

## Authorization Model

- User roles: `citizen`, `department_admin`, `super_admin`.
- `auth.middleware.js` validates JWT and attaches the user object to requests.
- `admin.controller.js` includes `isAdmin` logic for department and super admin access.
- `superAdmin.middleware.js` restricts routes to `super_admin`.
- `departmentAdmin.middleware.js` verifies department ownership and assigned report access.

## Report Lifecycle

1. Citizen submits a report at `/api/v1/reports/submit`.
2. The backend validates required fields and media upload.
3. Uploaded files are stored temporarily and then sent to Cloudinary.
4. The report document is saved in MongoDB.
5. A `ReportHistory` entry logs the initial `pending` status.
6. Admins retrieve reports via `/api/v1/reports/all`.
7. Admins update status or assign departments.
8. Each status transition creates an audit history record and notification.

## Backend Components

### Controllers
- `user.controller.js` – registration, login, logout, password reset, token refresh, profile retrieval.
- `report.controller.js` – report submission, user reports, all reports, report retrieval.
- `admin.controller.js` – status updates, report assignments, resolution handling, dashboard stats.
- `category.controller.js` – create and list categories.
- `department.controller.js` – create and list departments.
- `notification.controller.js` – user notifications and marking them read.
- `reportHistory.controller.js` – fetch report history.
- `analytic.controller.js` – fetch dashboard data and generate analytics.
- `superAdmin.controller.js` – update user roles.

### Routes
- `user.routes.js` – authentication and account management.
- `report.router.js` – report submission and queries.
- `admin.router.js` – admin actions and protected report endpoints.
- `category.router.js` – category management.
- `department.router.js` – department management.
- `notification.router.js` – notification endpoints.
- `reportHistory.router.js` – report audit history.
- `analytic.router.js` – analytics endpoints.
- `superAdmin.router.js` – super admin user role update.
- `reportAssignment.router.js` – assignment details and status updates.

### Models
- `User` – user identity, role, hashed password, refresh token, password reset metadata.
- `Report` – complaint information, media URLs, location coordinates, status, priority.
- `Category` – complaint categories.
- `Department` – department metadata and associated admin user.
- `ReportAssignment` – assignment records linking reports to departments and officials.
- `ReportHistory` – audit trail for report status changes.
- `Notification` – user notifications linked to reports.
- `Analytic` – generated analytics summary records.

### Middlewares
- `auth.middleware.js` – JWT validation and user lookup.
- `error.middleware.js` – structured error response handling.
- `upload.middleware.js` – `multer` file handling, validation, and error mapping.
- `superAdmin.middleware.js` – super admin access enforcement.
- `departmentAdmin.middleware.js` – verifies department admin assignment access.

### Utilities
- `cloudinary.js` – Cloudinary upload helper.
- `sendEmail.js` – Nodemailer configuration and email sending.
- `notification.service.js` – overdue pending report reminders.
- `analytics.service.js` – analytics generation.
- `ApiError.js` / `ApiResponse.js` – consistent API response objects.
- `asyncHandler.js` – async route wrapper for error propagation.

## Frontend Structure

### Pages
- `login.html` – login and registration interface.
- `aboutus.html` – informational page.
- `dashboard/admin/admin-dashboard.html` – admin overview.
- `dashboard/admin/complaints.html` – complaint management.
- `dashboard/user/new-complaint.html` – citizen complaint submission.
- `dashboard/user/my-complaints.html` – citizen complaint tracking.
- `dashboard/user/notifications.js` – notification logic.
- `features/` and `iframe-features/` – service discovery pages.

### Shared JavaScript
- `frontend/js/api-client.js` – centralized API requests with token handling.
- `frontend/js/auth.js` – auth helpers for localStorage token management.
- `frontend/js/auth-check.js` – page-level auth guard.
- `frontend/script.js` – global UI interactions and feature toggles.
- `frontend/chatbot.js` – chatbot UI behavior.

### Dashboard Modules
- `frontend/dashboard/user/my-complaints.js` – loads user reports, renders complaint cards, and updates status counts.
- `frontend/dashboard/admin/complaints.js` – loads all reports, renders admin complaint list, and handles logout.

## Database Design

### User
- Purpose: authenticate users and control access.
- Relationships: referenced by reports, assignments, history, notifications.
- Important fields: `userId`, `username`, `name`, `email`, `passwordHash`, `role`, `refreshToken`, `passwordResetToken`, `passwordResetExpires`.

### Report
- Purpose: store submitted civic complaints.
- Relationships: references `userId`, `categoryId`; linked to assignment, history, notifications.
- Important fields: `reportId`, `title`, `description`, `photo_url`, `voice_recording_url`, `location_lat`, `location_lng`, `status`, `priority`, `completion_photo_url`.

### Category
- Purpose: classify reports.
- Important fields: `name`, `description`, `categoryId`.

### Department
- Purpose: represent civic departments and associated admin users.
- Important fields: `name`, `description`, `contactInfo`, `userId`.

### ReportAssignment
- Purpose: record report assignment to a department and official.
- Important fields: `assignmentId`, `reportId`, `departmentId`, `assigned_to_userId`, `assigned_at`, `status`, `remarks`.

### ReportHistory
- Purpose: audit report status changes.
- Important fields: `historyId`, `reportId`, `previousStatus`, `newStatus`, `changedByUserId`, `changedAt`.

### Notification
- Purpose: store user notifications for report events.
- Important fields: `notificationId`, `userId`, `reportId`, `message`, `status`.

### Analytic
- Purpose: persist generated report metrics.
- Important fields: `analyticsId`, `reportCount`, `resolvedCount`, `avgResolutionTime`, `categoryId`, `generatedAt`.

## API Overview

### Authentication and users
Handles registration, login, logout, token refresh, password reset, and current user retrieval.

### Reports
Handles complaint submission, user-specific report retrieval, all-report retrieval, and individual report details.

### Admin operations
Handles report status updates, assignments, resolution, and dashboard analytics.

### Support services
Handles categories, departments, notifications, report history, and super admin user role changes.

## Engineering Decisions

### JWT
JWT provides stateless authentication for protected API routes. Access tokens are validated by middleware and refresh tokens are stored in the user document.

### Cloudinary
Cloudinary is used for media asset hosting. Uploaded files are temporarily stored locally and then uploaded to Cloudinary.

### Cron Jobs
`node-cron` runs a schedule every 15 minutes to evaluate overdue pending reports and send notifications.

### MongoDB
MongoDB and Mongoose are used for flexible document storage of reports, users, assignments, notifications, analytics, and history.

### RBAC
Role-based checks enforce admin and super admin access. Department admin middleware verifies department ownership and report assignment.

### History Collection
A dedicated `ReportHistory` model records every status transition and supports auditability.

## Security Considerations

- Passwords are hashed with `bcrypt`.
- Protected routes require JWT validation.
- File uploads are filtered by MIME type and size limits.
- Routes use role checks for admin and super admin access.

## Background Jobs

A cron job in `backend/src/index.js` triggers `sendPendingReportNotifications` every 15 minutes. It identifies pending reports older than 48 hours, finds assigned users, creates notification records, and sends reminder emails.

## Notification Flow

- Notifications are created in MongoDB for assigned users.
- Reports are linked to notifications via `reportId`.
- Users can fetch notifications through `/api/v1/notifications/my-notifications` and mark them read.

## Analytics Flow

- Analytics are generated by `backend/src/utils/analytics.service.js`.
- `analytic.controller.js` returns the latest analytics record via `/api/v1/analytics/dashboard`.
- A manual analytics trigger is available at `/api/v1/analytics/generate`.

## File Upload Flow

- `upload.middleware.js` stores uploads to `./public/temp`.
- `photo`, `completionPhoto`, and `voiceRecording` fields are accepted.
- `cloudinary.js` uploads the files to Cloudinary.
- Report controllers use uploaded file URLs in report documents.

## Folder Structure

- `frontend/` – static web interface and dashboard pages.
- `backend/` – API implementation.
- `backend/src/controllers/` – business logic.
- `backend/src/models/` – data schemas.
- `backend/src/routes/` – route definitions.
- `backend/src/middlewares/` – auth, upload, and error handlers.
- `backend/src/utils/` – helper services.
- `backend/src/db/` – database connection.

## Environment Variables

### Server
- `PORT`
- `CORS_ORIGIN`
- `MONGODB_URI`

### JWT
- `ACCESS_TOKEN_SECRET`
- `ACCESS_TOKEN_EXPIRY`
- `REFRESH_TOKEN_SECRET`
- `REFRESH_TOKEN_EXPIRY`

### Cloudinary
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

### Email
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_SECURE`
- `EMAIL_USER`
- `EMAIL_PASSWORD`
- `EMAIL_FROM`

### Database
- `DB_NAME` is defined in `backend/src/constant.js` as `sih_internals_db`.

## Local Development

1. Change directory to `backend/`.
2. Run `npm install`.
3. Create a `.env` file with required variables.
4. Start the backend with `npm run dev`.
5. Open frontend HTML pages in a browser or a local static server.

## Known Limitations

- Frontend is built with static HTML and does not use a frontend build pipeline.
- Some admin controller endpoints return placeholder responses.
- The application relies on in-browser token storage and browser redirects for auth flows.
- There is no explicit API version negotiation beyond `/api/v1/`.
