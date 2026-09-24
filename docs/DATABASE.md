# Database design

Engine: SQLAlchemy 2.x. Default URL: `sqlite:///./heart_health.db`. Swap to PostgreSQL by changing `DATABASE_URL`.

## Tables

### users
id, name, email (unique), password_hash, role (`patient`/`doctor`/`admin`), is_active, created_at, updated_at

### patient_profiles
id, user_id (FK users, unique), date_of_birth (nullable), sex (nullable), phone (nullable), created_at, updated_at

### doctor_patient_assignments
id, doctor_id (FK users), patient_user_id (FK users), created_at, unique(doctor_id, patient_user_id)

### health_records
id, patient_id (FK patient_profiles), age, sex, chest_pain_type, resting_bp, cholesterol, fasting_blood_sugar, resting_ecg, max_heart_rate, exercise_angina, oldpeak, st_slope, emergency_symptoms (JSON, optional, not ML features), created_at

### model_versions
id, version, model_name, metrics (JSON), trained_at, active

### predictions
id, patient_id (FK), health_record_id (FK), model_version_id (FK), prediction, probability, risk_level, explanation (JSON), emergency_warning (bool), created_at

### recommendations
id, prediction_id (FK), category, recommendation, created_at

### medication_information
id, condition, medication_name, purpose, general_information, warnings, source, updated_at

### doctor_notes
id, patient_id (FK patient_profiles), doctor_id (FK users), note, created_at

### audit_logs
id, user_id (FK, nullable), action, timestamp, details (JSON)

## Seed data (later, real rows)

- One admin user from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (hashed).
- Curated **educational** medication rows with sources (e.g. public labeling summaries). No fabricated drug facts.
- No fake patients, doctors, or predictions.
