# Heart Health AI — Architecture (Phase 1)

**Status:** Architecture locked for implementation. Application logic beyond a health-check is **NOT IMPLEMENTED YET**.

This system is a **decision-support and educational** web application. It estimates model-based heart-disease *risk* from structured clinical features. It does not diagnose, prescribe, or replace a clinician.

---

## 1. High-level architecture

```
┌─────────────────┐     JWT      ┌──────────────────┐     ORM      ┌────────────┐
│  React + Vite   │ ───────────► │  FastAPI (REST)  │ ───────────► │  SQLite    │
│  TypeScript UI  │ ◄─────────── │  RBAC + Pydantic │ ◄─────────── │ (Postgres- │
│  Tailwind/shadcn│   JSON       │  services layer  │   SQLAlchemy │  ready)    │
└─────────────────┘              └────────┬─────────┘              └────────────┘
                                          │
                                          ▼
                                 ┌──────────────────┐
                                 │  ML artifacts    │
                                 │  preprocessor    │
                                 │  best_model      │
                                 │  metadata JSON   │
                                 └──────────────────┘
```

**Request flow (target, later phases):**

1. Patient authenticates (`/api/auth/login`) and receives a JWT.
2. Patient submits an assessment (`POST /api/predictions`).
3. API validates input; optionally flags emergency symptoms (not used as ML features unless present in the model schema).
4. Preprocessor + model generate a class and probability.
5. Risk band is applied from **configurable thresholds**.
6. Explainability is computed from the loaded model (coefficients / importances / SHAP when feasible).
7. Educational precautions and medication *information* are selected from the database (not invented per request).
8. Health record, prediction, recommendations, and audit log are persisted.
9. Frontend dashboards read stored rows only — no hard-coded patients or metrics.

---

## 2. Technology choices

| Layer | Choice | Reason |
| --- | --- | --- |
| Frontend | React + TypeScript + Vite | Fast local DX for a B.Tech demo, typed UI |
| UI | Tailwind CSS + shadcn/ui | Professional healthcare layout without a template look |
| Backend | FastAPI + Pydantic | Validation-first APIs |
| ORM | SQLAlchemy 2.x | SQLite now, PostgreSQL later via `DATABASE_URL` |
| Auth | JWT + password hashing (passlib/bcrypt) | Stateless API + hashed credentials |
| ML | scikit-learn (+ XGBoost if it installs and wins comparison) | Standard classification stack |
| Explainability | Model-native importances, then SHAP if compatible | Honest fallback if SHAP cannot run on the chosen estimator |
| Reports | ReportLab | Server-side PDF from DB rows |
| Assistant | OpenAI if `OPENAI_API_KEY` set, else curated KB | Optional; never overrides ML or DB rules |

**Not using** hardcoded accuracy, mock prediction tables, or client-only “fake APIs”.

---

## 3. Folder structure (this repository)

The git root *is* the Heart Health AI project (workspace `mini`).

```
.
├── backend/                 # FastAPI application
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/          # SQLAlchemy models — Phase 2
│   │   ├── schemas/         # Pydantic schemas — Phase 2+
│   │   ├── routers/         # HTTP routers — Phase 3+
│   │   ├── services/        # Business + ML inference — Phase 7+
│   │   ├── security/        # JWT, hashing, RBAC — Phase 3
│   │   └── utils/
│   └── requirements.txt
├── ml/                      # Training pipeline — Phases 4–6
│   ├── data/
│   ├── models/              # Generated joblib + metadata
│   ├── train.py
│   ├── evaluate.py
│   └── predict.py
├── frontend/                # Vite React app — Phase 9+
├── reports/                 # Generated PDFs
├── uploads/
├── tests/
├── docs/
├── .env.example
├── docker-compose.yml
└── README.md
```

---

## 4. Database (relational)

**Required tables** (Phase 2): `users`, `patient_profiles`, `health_records`, `predictions`, `model_versions`, `recommendations`, `medication_information`, `doctor_notes`, `audit_logs`.

**Additional table required for authorization (not in the original list, but necessary):**

- `doctor_patient_assignments` — `doctor_id`, `patient_user_id`, timestamps.  
  A doctor **only** sees patients assigned by an admin (or a later explicit consent flow). Doctors do not list all users.

Roles live on `users.role`: `patient` | `doctor` | `admin`.

PostgreSQL-ready: types are portable (JSON stored as JSON/Text), FKs on all child tables, `created_at`/`updated_at` timezone-aware where the dialect allows.

---

## 5. API surface (target)

All under `/api`. Protected unless noted.

| Method | Path | Roles | Phase |
| --- | --- | --- | --- |
| GET | `/health` | public | 1 |
| POST | `/api/auth/register` | public (patient) | 3 |
| POST | `/api/auth/login` | public | 3 |
| GET | `/api/auth/me` | any auth | 3 |
| GET/PATCH | `/api/users/me` | any auth | 3 |
| GET | `/api/patients/me` | patient | 2–3 |
| GET | `/api/health-records` | patient / assigned doctor | 10 |
| GET | `/api/health-records/{id}` | patient / assigned doctor | 10 |
| POST | `/api/predictions` | patient | 7 |
| GET | `/api/predictions/history` | patient / assigned doctor | 10 |
| GET | `/api/predictions/{id}` | patient / assigned doctor | 10 |
| GET | `/api/reports/{prediction_id}` | patient / assigned doctor | 11 |
| GET | `/api/recommendations/{prediction_id}` | patient / assigned doctor | 8 |
| GET | `/api/medications` | any auth | 8 |
| GET | `/api/doctor/patients` | doctor | 12 |
| GET | `/api/doctor/patients/{id}` | doctor (assigned) | 12 |
| POST | `/api/doctor/patients/{id}/notes` | doctor (assigned) | 12 |
| GET | `/api/admin/stats` | admin | 13 |
| GET/POST/PATCH | `/api/admin/users` | admin | 13 |
| GET | `/api/admin/audit-logs` | admin | 13 |
| GET | `/api/model/info` | admin (metrics public to admin UI) | 13 |
| POST | `/api/assistant/chat` | any auth | 14 |

---

## 6. ML pipeline components

1. Load `DATASET_PATH` CSV (must exist; not fabricated).
2. Validate required columns and ranges.
3. Handle missing values (impute or drop with logged counts).
4. Encode categoricals; scale numerics in a sklearn `ColumnTransformer`.
5. Stratified train/test split + cross-validation.
6. Compare: Logistic Regression, Decision Tree, Random Forest, KNN, SVM, XGBoost (if import succeeds).
7. Select by a documented primary metric (ROC-AUC, with F1/recall reported).
8. Serialize `best_model.joblib`, `preprocessor.joblib`, `model_metadata.json` with **measured** metrics only.
9. Runtime inference loads those files; if missing, the prediction API returns a clear error (not a fake score).

**Expected feature set (UCI-style / 11-feature heart datasets):**  
age, sex, chest_pain_type, resting_bp, cholesterol, fasting_blood_sugar, resting_ecg, max_heart_rate, exercise_angina, oldpeak, st_slope.

---

## 7. Frontend routes (target)

| Route | Role |
| --- | --- |
| `/`, `/login`, `/register` | public |
| `/dashboard`, `/assessment`, `/prediction/:id`, `/history`, `/trends`, `/reports`, `/medications`, `/assistant` | patient |
| `/doctor`, `/doctor/patients`, `/doctor/patients/:id` | doctor |
| `/admin`, `/admin/users`, `/admin/models`, `/admin/audit-logs` | admin |

Guards: missing token → login; wrong role → 403 page.

---

## 8. Security requirements

- Passwords hashed (never stored plaintext).
- JWT with expiry; role checks on every protected router.
- Pydantic validation; ORM parameterized queries.
- CORS from `CORS_ORIGINS` only.
- Secrets only in `.env` (gitignored); `.env.example` has placeholders.
- Audit log for auth, predictions, admin mutations, report downloads.
- Safe error messages (no stack traces to clients when `DEBUG=false`).
- Login attempt limiting via `MAX_LOGIN_ATTEMPTS`.
- Medical disclaimer and emergency banner flags.

---

## 9. Risk levels (documented, configurable)

Applied to the **model probability of the positive (heart-disease) class**, not to medical certainty:

| Level | Default rule | Env |
| --- | --- | --- |
| low | `p < RISK_LOW_MAX` | `RISK_LOW_MAX` default 0.33 |
| moderate | `RISK_LOW_MAX ≤ p < RISK_MODERATE_MAX` | `RISK_MODERATE_MAX` default 0.66 |
| high | `p ≥ RISK_MODERATE_MAX` | |

UI copy must state this is a model score, not a diagnosis.

---

## 10. Safety / product rules

- No diagnosis language.
- Medication module is educational rows from DB + cited sources.
- Emergency module is symptom-triggered guidance to seek care, not an emergency diagnosis.
- Assistant cannot change predictions, users, or DB rules.
- Metrics in the UI come from `model_metadata.json` produced by training.

---

## 11. Missing resources (you may need to provide)

See `docs/MISSING_RESOURCES.md`.

Primary blocker for Phases 4–7: **`ml/data/heart_disease.csv` is not in the repo yet.**
