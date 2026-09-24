# API inventory

Implemented now:

- `GET /health` — liveness/readiness style check for Phase 1.

Everything below is **specified, NOT IMPLEMENTED YET**.

## Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

## Users / patients

- `GET /api/users/me`
- `GET /api/patients/me`

## Health records & predictions

- `POST /api/predictions`
- `GET /api/predictions/history`
- `GET /api/predictions/{id}`
- `GET /api/health-records`
- `GET /api/health-records/{id}`

## Reports, recommendations, medications

- `GET /api/reports/{prediction_id}`
- `GET /api/recommendations/{prediction_id}`
- `GET /api/medications`

## Doctor

- `GET /api/doctor/patients`
- `GET /api/doctor/patients/{id}`
- `POST /api/doctor/patients/{id}/notes`

## Admin

- `GET /api/admin/stats`
- `GET /api/admin/users`
- `POST /api/admin/users` (create doctor/admin)
- `PATCH /api/admin/users/{id}`
- `POST /api/admin/assignments`
- `GET /api/admin/audit-logs`
- `PATCH /api/admin/medications/{id}`

## Model & assistant

- `GET /api/model/info`
- `POST /api/assistant/chat`

OpenAPI (`/docs`) will expand as routers are added.
