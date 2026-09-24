# Missing resources and what you must provide

## Required before ML training (Phases 4–7)

### Heart disease dataset

**File expected:** `ml/data/heart_disease.csv`

This repository does **not** include a medical dataset. The training pipeline will refuse to invent rows.

The 11 features the product specifies match the commonly used **Heart Failure Prediction** tabular dataset (Age, Sex, ChestPainType, RestingBP, Cholesterol, FastingBS, RestingECG, MaxHR, ExerciseAngina, Oldpeak, ST_Slope) and similar UCI-derived heart-disease CSVs.

**You should either:**

1. Place a CSV at `ml/data/heart_disease.csv` with those columns (names can be mapped in `ml/train.py` later), **or**
2. Confirm that Phase 4 may download a **public-domain / openly licensed** copy from a URL you approve (for example a GitHub raw CSV you already use for the college report).

Do not send PHI (real patient hospital dumps) into this student project.

Until the CSV exists, prediction APIs cannot load a trained model.

## Optional

| Item | Needed for | If missing |
| --- | --- | --- |
| `OPENAI_API_KEY` | Live AI assistant | Curated fallback knowledge base (Phase 14) |
| Production JWT secret | Any shared host | Keep the placeholder on localhost only |
| PostgreSQL | Deployment | SQLite remains the local default |
| SMTP / SMS | Notifications | **NOT IMPLEMENTED** (out of scope unless requested) |
| Real doctor/patient assignment list | Doctor dashboard realism | Admin will assign doctors to patients in-app |

## Not required from you for Phase 1

- Trained `.joblib` files (generated in Phase 6)
- Frontend design assets
- Cloud accounts

## Credentials note

The assignment listed development admin credentials. They are **placeholders**. They will live only in `.env` (gitignored). Change them before any demo on a shared machine.
