# Heart Health AI

**AI-Based Heart Disease Prediction and Personalized Health Support System** — a B.Tech CSE decision-support web application.

This is **not** a diagnostic product. It does not prescribe medicine or replace a qualified clinician.

**Current milestone: Phase 1 — project structure and architecture.**  
Authentication, database tables, ML training, dashboards, and predictions are **NOT IMPLEMENTED YET**.

Full architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## 1. Project overview

The system will collect structured heart-health features, validate them, run a trained classifier, store results, explain model contributions (not medical causation), show educational precautions and medication information, warn on emergency-like symptoms, and provide patient / doctor / admin dashboards.

## 2. Features (target)

| Feature | Status |
| --- | --- |
| Health assessment form + validation | NOT IMPLEMENTED YET |
| Real ML prediction + probability | NOT IMPLEMENTED YET |
| Explainability | NOT IMPLEMENTED YET |
| Precautions / educational medications | NOT IMPLEMENTED YET |
| Emergency warnings | NOT IMPLEMENTED YET |
| History, trends, PDF reports | NOT IMPLEMENTED YET |
| Patient / doctor / admin dashboards | NOT IMPLEMENTED YET |
| JWT auth + RBAC | NOT IMPLEMENTED YET |
| Optional AI assistant | NOT IMPLEMENTED YET |
| `GET /health` | Implemented (Phase 1) |

## 3. Technology stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, shadcn/ui (from Phase 9)
- Backend: Python, FastAPI, Pydantic, SQLAlchemy
- Database: SQLite locally; PostgreSQL-ready `DATABASE_URL`
- ML: pandas, NumPy, scikit-learn, XGBoost (if available), joblib, SHAP where appropriate
- Auth: JWT, hashed passwords, roles
- Reports: ReportLab (Phase 11)

## 4. Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## 5. Folder structure

See architecture doc. Repository root contains `backend/`, `frontend/`, `ml/`, `tests/`, `docs/`.

## 6. Installation (Phase 1)

### Prerequisites

- Python 3.11 or 3.12
- Node.js 20+ (needed when the Vite app is scaffolded)
- Git

### Environment

```powershell
cd C:\Users\kittu\mini
copy .env.example .env
```

Edit `.env` if needed. Do not commit `.env`.

### Backend

```powershell
cd C:\Users\kittu\mini\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Working directory for the API should be **`backend`** so `app` imports resolve:

```powershell
cd C:\Users\kittu\mini\backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Check: http://127.0.0.1:8000/health

## 7. Environment variables

Documented in `.env.example`. Secrets never belong in source code.

## 8. Database setup

**NOT IMPLEMENTED YET** (Phase 2). SQLite file will be created when models are defined and tables created.

## 9. Dataset setup

Place a CSV at `ml/data/heart_disease.csv`. See [docs/MISSING_RESOURCES.md](docs/MISSING_RESOURCES.md).

## 10. ML training

**NOT IMPLEMENTED YET** (`python ../ml/train.py` will exit with that message until Phases 4–6).

## 11. Running the backend

See Installation above.

## 12. Running the frontend

**NOT IMPLEMENTED YET** as a full Vite+Tailwind app. `frontend/` is reserved for Phase 9 scaffolding.

## 13. API documentation

- Live OpenAPI (when backend is running): http://127.0.0.1:8000/docs
- Inventory: [docs/API.md](docs/API.md)

## 14. Testing

**NOT IMPLEMENTED YET** (Phase 15). A Phase 1 smoke test may be added next if the health endpoint is used in CI.

## 15. Deployment

`docker-compose.yml` is a sketch. A production Dockerfile is **NOT IMPLEMENTED YET** (Phase 18).

## 16. Security

Phase 1: CORS from env, no secrets in git. Hashing, JWT, audit logs, lockout: later phases.

## 17. Medical safety limitations

- Model output is a statistical score, not a diagnosis.
- Medication content is educational only.
- Emergency UI advises seeking care; it does not triage professionally.
- Always consult a qualified clinician.

## 18. Future enhancements

Listed after the core system works: PostgreSQL hosting, better explainability, assignment/consent workflows, richer monitoring.

---

B.Tech viva notes will live in `docs/` after the system is real (Phase 17). Placeholder: **NOT IMPLEMENTED YET**.
