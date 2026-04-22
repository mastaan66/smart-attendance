# Smart Campus - Technical Documentation

## 1. Overview

Smart Campus is a multi-tenant attendance and campus management platform built with Next.js, Prisma, and a separate Python ML service for biometric face handling. The system supports tenant-scoped class management, user registration, face-based onboarding and verification, role-based access control, and attendance tracking.

## 2. Technology Stack

### Frontend / Application
- Next.js 16.2.4 (App Router)
- React 19.2.4
- TypeScript 5
- next-auth 4.24.14 (authentication-related integration)
- next-themes 0.4.6 (theme support)
- lucide-react 1.8.0 (iconography)
- CSS modules / global CSS via `src/app/globals.css`

### Backend / API
- Prisma 5.22.0
- SQLite database for local development (`prisma/schema.prisma` datasource)
- Express-style utilities and middleware in `src/backend`
- ioredis 5.10.1 for rate limiting and queue support
- bullmq 5.75.2 for job queues
- bcryptjs 3.0.3 for password hashing
- jsonwebtoken 9.0.3 for token-related tasks
- helmet 8.1.0 and morgan 1.10.1 for security/logging
- express-rate-limit types included to support rate limiting patterns

### ML Service
- Python 3.10+ virtual environment under `ml-service/venv`
- FastAPI for ML API endpoints
- deepface for face embedding extraction
- OpenCV (cv2) for image decoding and preprocessing
- UVicorn for hosting the service

### Testing
- Jest 30.3.0
- ts-jest 29.4.9
- supertest 7.2.2
- node-mocks-http 1.17.2

## 3. Repository Structure

```
smart-campus/
├── README.md
├── PROJECT_TECHNICAL_DOCUMENTATION.md
├── Dockerfile
├── docker-compose.yml
├── package.json
├── prisma/schema.prisma
├── src/
│   ├── app/
│   │   ├── api/             # API route handlers
│   │   ├── auth/            # auth pages and flows
│   │   ├── classes/         # class pages
│   │   ├── settings/        # user settings pages
│   │   ├── student/         # student dashboard/pages
│   │   ├── teacher/         # teacher dashboard/pages
│   │   └── ...
│   ├── backend/             # controllers, middleware, services
│   ├── components/          # shared React components
│   ├── context/             # React context providers
│   ├── lib/                 # shared helper utilities
│   └── middleware.ts        # app-level middleware
├── ml-service/
│   ├── main.py              # ML service FastAPI app
│   ├── requirements.txt
│   └── venv/                # local Python virtualenv (ignored by git)
└── __tests__/               # Jest test files
```

## 4. Key Domain Concepts and Data Model

### Tenant
Stores institution metadata and email domain registration.
- `id`, `universityName`, `domain`, `location`
- One tenant owns classes and users.

### User
Represents students, teachers, and administrators.
- `name`, `email`, `passwordHash`, `role`, `tenantId`
- Biometric-linked fields: `faceDescriptor`, `faceEmbeddings`, `isBiometricVerified`

### Class
Classroom entity with teacher, schedule and geofence data.
- `code`, `name`, `roomName`, `geofenceLat`, `geofenceLng`, `geofenceRadius`

### Schedule
Weekly class schedule entries.
- `dayOfWeek`, `startTime`, `endTime`

### Session
Class session that tracks attendance events.
- `sessionId`, `startTime`, `endTime`, `qrSeed`

### Attendance
Student attendance records.
- `durationSeconds`, `status`, `faceScore`, `geoStatus`, `timestamp`

### FaceEmbedding
Stores biometric vectors extracted from onboarding images.
- `userId`, `embedding`, `createdAt`

## 5. Authentication and Authorization Flow

### Signup and University Registration
- User submits `name`, `email`, `password`, and optionally `role` and `face_image`.
- API route `src/app/api/auth/signup/route.ts` validates fields.
- It enforces rate limiting using Redis via `checkRateLimit`.
- The email domain is used to lookup the tenant record.
- If a face image is provided, it is sent to the ML service for embedding extraction.
- The user is created in Prisma, and the embedding is saved to `FaceEmbedding`.

### Role-based Access
- Role values include `STUDENT`, `TEACHER`, and admin-like roles.
- UI pages guard access with session role checks and route-level authorization.
- Analytics/settings pages are restricted to admin users.

### Account Deletion
- A user can delete their own account from settings.
- Deletion logic removes user records using Prisma cascade relations where appropriate.

## 6. Biometric Capture and ML Integration

### Camera Capture Component
Location: `src/components/CameraCapture.tsx`

Responsibilities:
- Access the webcam using `navigator.mediaDevices.getUserMedia`.
- Show a live preview with a face guide overlay.
- Capture a centered 480x480 JPEG image to reduce payload.
- Disable capture when disabled or camera permissions are denied.

### Signup Biometric Logic
- Student signup requires face onboarding.
- The frontend collects up to 3 images before auto-submitting.
- The captured image is encoded as Base64 and posted to the signup route.

### ML Service API
Location: `ml-service/main.py`

Endpoints:
- `POST /api/ml/extract_embedding`
  - Decodes Base64 image into OpenCV format.
  - Performs a liveness check using Laplacian variance and brightness heuristics.
  - Uses DeepFace with `Facenet` to extract embedding vectors.
  - Returns `embedding` and `face_confidence`.
- `POST /api/ml/verify`
  - Uses the same image preprocessing and liveness checks.
  - Computes cosine distance to a reference embedding.
  - Returns verification result and confidence.

Security and quality checks:
- `liveness_check

()` rejects blurred or spoofed media.
- `enforce_detection=True` ensures a face is present.

## 7. Database and Persistence

### Prisma Schema
- `datasource db` uses local SQLite (`file:./dev.db`).
- `generator client` builds Prisma Client JS.
- Relationships are strongly typed between `Tenant`, `User`, `Class`, `Session`, and attendance-related models.
- `FaceEmbedding` and `Device` use cascading deletes to keep data consistent.

### Notable Indexes
- `User` has an index on `[tenantId, role]`.
- `Attendance` indexes `studentId` and `sessionId`.

## 8. API Design

### Frontend API Routes
- `src/app/api/auth/signup/route.ts` - registration and biometric onboarding.
- `src/app/api/auth/register-university` - tenant registration UI.
- `src/app/api/attendance/checkin` - attendance check-in flow.
- `src/app/api/session` - session management.
- `src/app/api/user/profile/route.ts` - profile and account deletion.

### Backend Services
- `src/backend/controllers` - request handling and business logic.
- `src/backend/services` - reusable auth and security functions.
- `src/lib/redis.ts` - rate limiting utilities.

## 9. UI / UX Details

### High-level Pages
- `/auth/signup` - student sign-up with face capture.
- `/auth/register-university` - university tenant onboarding.
- `/settings` - profile controls and account deletion.
- `/student` - student dashboard.
- `/teacher` - teacher dashboard.
- `/classes` - class listing and attendance flow.
- `/analytics` - admin analytics pages.

### Capture Experience
- The capture view uses a centered oval overlay to guide face placement.
- The button is disabled until the camera is ready.
- The system ensures 3 images can be taken and automatically submits after the final capture.

## 10. Deployment Notes

### Local Development
- `npm install`
- `npm run dev`
- ML service: `cd ml-service && uvicorn main:app --reload --host 0.0.0.0 --port 8000`

### Docker
- Repository includes `Dockerfile` and `docker-compose.yml`.
- The Python ML service can be containerized separately from the Next.js app.

## 11. Environment and Git Hygiene

### `.gitignore`
- Node dependencies and build artifacts are ignored.
- `ml-service/venv/` is excluded so the Python virtual environment is not tracked.

### Git Cleanup
- The virtual environment was previously tracked and has been removed from git index using:
  - `git rm --cached -r ml-service/venv/`
- The `.gitignore` entry now includes `ml-service/venv/`.

## 12. Screenshot & Documentation Guidance

Add screenshots to a `docs/screenshots/` folder. Recommended captures:
- `docs/screenshots/signup-face-capture.png`
- `docs/screenshots/university-registration.png`
- `docs/screenshots/student-dashboard.png`
- `docs/screenshots/teacher-dashboard.png`
- `docs/screenshots/admin-analytics.png`

Embed images in this Markdown after screenshots are generated:

```md
![Signup Capture UI](docs/screenshots/signup-face-capture.png)
```

## 13. Testing

### Jest
- Run unit and integration tests with `npm test`.
- Watch mode: `npm run test:watch`.
- Performance tests: `npm run test:performance`.

### Test Coverage
- Tests are stored under `__tests__/`.
- API and edge case behavior is verified for signup, auth, and attendance flows.

## 14. Potential Improvement Areas

- Replace Base64 upload with multipart or binary for performance.
- Add strong type-safe role definitions and enums.
- Improve ML service anti-spoofing with sequential frame analysis.
- Add E2E testing for camera capture and face verification.
- Harden tenant isolation in the database for multi-tenant production.

## 15. Appendix

### Important Files
- `package.json` - project dependencies and scripts.
- `prisma/schema.prisma` - data model.
- `src/components/CameraCapture.tsx` - webcam capture logic.
- `src/app/api/auth/signup/route.ts` - registration API.
- `ml-service/main.py` - face embedding API.
- `.gitignore` - ignored files and directories.

### Key Behavior Summary
- Multi-tenant student registration tied to email domain.
- Biometric onboarding via face embedding service.
- Role-aware access control for admin and teacher pages.
- Attendance sessions and QR-based workflows.
- Git hygiene maintained by ignoring local Python venv.
