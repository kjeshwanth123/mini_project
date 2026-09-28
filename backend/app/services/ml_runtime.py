from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from app.config import REPO_ROOT, get_settings

FEATURE_ORDER = [
    "age",
    "sex",
    "chest_pain_type",
    "resting_bp",
    "cholesterol",
    "fasting_blood_sugar",
    "resting_ecg",
    "max_heart_rate",
    "exercise_angina",
    "oldpeak",
    "st_slope",
]

FEATURE_LABELS = {
    "age": "Age",
    "sex": "Sex",
    "chest_pain_type": "Chest pain type",
    "resting_bp": "Resting blood pressure",
    "cholesterol": "Cholesterol",
    "fasting_blood_sugar": "Fasting blood sugar",
    "resting_ecg": "Resting ECG",
    "max_heart_rate": "Maximum heart rate",
    "exercise_angina": "Exercise-induced angina",
    "oldpeak": "ST depression (oldpeak)",
    "st_slope": "ST slope",
}


@dataclass
class MLRuntime:
    model: object
    preprocessor: object
    metadata: dict


def resolve_repo_path(configured: str) -> Path:
    path = Path(configured)
    if path.is_absolute():
        return path
    cleaned = Path(*[part for part in path.parts if part not in (".",)])
    return REPO_ROOT / cleaned


def load_runtime() -> MLRuntime:
    settings = get_settings()
    model_path = resolve_repo_path(settings.model_path)
    pre_path = resolve_repo_path(settings.preprocessor_path)
    meta_path = resolve_repo_path(settings.model_metadata_path)
    missing = [str(p) for p in (model_path, pre_path, meta_path) if not p.exists()]
    if missing:
        raise FileNotFoundError(
            "Trained model artifacts are missing. Run `python ml/train.py` from the repo root. "
            f"Missing: {', '.join(missing)}"
        )
    metadata = json.loads(meta_path.read_text(encoding="utf-8"))
    return MLRuntime(
        model=joblib.load(model_path),
        preprocessor=joblib.load(pre_path),
        metadata=metadata,
    )


@lru_cache
def get_runtime() -> MLRuntime:
    return load_runtime()


def clear_runtime_cache() -> None:
    get_runtime.cache_clear()


def risk_level(probability: float) -> str:
    settings = get_settings()
    if probability < settings.risk_low_max:
        return "low"
    if probability < settings.risk_moderate_max:
        return "moderate"
    return "high"


def explain_prediction(runtime: MLRuntime, features: dict, transformed: np.ndarray) -> list[dict]:
    model = runtime.model
    items: list[dict] = []
    vector = np.ravel(transformed)
    if hasattr(model, "coef_"):
        coefs = np.ravel(model.coef_)
        contrib = coefs * vector
        order = np.argsort(np.abs(contrib))[::-1]
        for idx in order[:6]:
            name = FEATURE_ORDER[idx]
            value = float(contrib[idx])
            direction = "increased the model's estimated risk score" if value > 0 else "decreased the model's estimated risk score"
            items.append(
                {
                    "feature": name,
                    "contribution": round(value, 4),
                    "direction": "positive" if value > 0 else "negative",
                    "kind": "MODEL_CONTRIBUTION",
                    "text": (
                        f"{FEATURE_LABELS[name]} contributed to the model's prediction "
                        f"({direction}). This is a model attribution, not medical causation."
                    ),
                }
            )
        return items
    if hasattr(model, "feature_importances_"):
        imps = np.ravel(model.feature_importances_)
        order = np.argsort(imps)[::-1]
        for idx in order[:6]:
            name = FEATURE_ORDER[idx]
            items.append(
                {
                    "feature": name,
                    "contribution": round(float(imps[idx]), 4),
                    "direction": "importance",
                    "kind": "MODEL_CONTRIBUTION",
                    "text": (
                        f"{FEATURE_LABELS[name]} was an important input in this model's structure. "
                        "This does not mean the feature medically caused a condition."
                    ),
                }
            )
        return items
    return [
        {
            "feature": "model",
            "contribution": 0.0,
            "direction": "unavailable",
            "kind": "MODEL_CONTRIBUTION",
            "text": "This estimator does not expose coefficients or feature importances.",
        }
    ]


def predict_features(runtime: MLRuntime, features: dict) -> dict:
    frame = pd.DataFrame([{name: features[name] for name in FEATURE_ORDER}])
    transformed = runtime.preprocessor.transform(frame)
    model = runtime.model
    pred = int(model.predict(transformed)[0])
    if hasattr(model, "predict_proba"):
        probability = float(model.predict_proba(transformed)[0][1])
    else:
        probability = float(pred)
    label = "higher_estimated_risk" if pred == 1 else "lower_estimated_risk"
    return {
        "prediction": label,
        "class": pred,
        "probability": probability,
        "risk_level": risk_level(probability),
        "model_version": runtime.metadata.get("version", "unknown"),
        "model_name": runtime.metadata.get("model_name", "unknown"),
        "explanation": explain_prediction(runtime, features, transformed),
    }
