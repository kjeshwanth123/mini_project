"""Load and normalize the heart-disease tabular dataset."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

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

ALIASES = {
    "age": ["age"],
    "sex": ["sex"],
    "chest_pain_type": ["chest_pain_type", "cp", "chestpaintype"],
    "resting_bp": ["resting_bp", "trestbps", "restingbp"],
    "cholesterol": ["cholesterol", "chol"],
    "fasting_blood_sugar": ["fasting_blood_sugar", "fbs", "fastingbs"],
    "resting_ecg": ["resting_ecg", "restecg", "restingecg"],
    "max_heart_rate": ["max_heart_rate", "thalach", "maxhr"],
    "exercise_angina": ["exercise_angina", "exang", "exerciseangina"],
    "oldpeak": ["oldpeak"],
    "st_slope": ["st_slope", "slope", "stslope"],
    "target": ["target", "heartdisease", "output", "num"],
}

SEX_MAP = {"m": 1, "male": 1, "f": 0, "female": 0}
CP_MAP = {"ta": 0, "ata": 1, "nap": 2, "asy": 3}
ECG_MAP = {"normal": 0, "st": 1, "lvh": 2}
ANGINA_MAP = {"n": 0, "no": 0, "y": 1, "yes": 1}
SLOPE_MAP = {"down": 0, "downsloping": 0, "flat": 1, "up": 2, "upsloping": 2}


def _find_column(columns: list[str], names: list[str]) -> str | None:
    lowered = {c.lower().lstrip("\ufeff"): c for c in columns}
    for name in names:
        if name in lowered:
            return lowered[name]
    return None


def _map_series(series: pd.Series, mapping: dict[str, int]) -> pd.Series:
    if pd.api.types.is_numeric_dtype(series):
        return pd.to_numeric(series, errors="coerce")
    return series.astype(str).str.strip().str.lower().map(mapping)


def load_heart_dataset(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(
            f"Dataset not found at {path}. Place heart_disease.csv there or see docs/MISSING_RESOURCES.md."
        )
    df = pd.read_csv(path)
    df.columns = [str(c).replace("\ufeff", "").strip() for c in df.columns]
    mapped: dict[str, pd.Series] = {}
    for canonical, aliases in ALIASES.items():
        col = _find_column(list(df.columns), aliases)
        if col is None:
            if canonical == "target":
                raise ValueError("Dataset is missing a target/HeartDisease column.")
            raise ValueError(f"Dataset is missing required column: {canonical} (aliases: {aliases})")
        mapped[canonical] = df[col]

    out = pd.DataFrame(mapped)
    out["sex"] = _map_series(out["sex"], SEX_MAP)
    out["chest_pain_type"] = _map_series(out["chest_pain_type"], CP_MAP)
    out["resting_ecg"] = _map_series(out["resting_ecg"], ECG_MAP)
    out["exercise_angina"] = _map_series(out["exercise_angina"], ANGINA_MAP)
    out["st_slope"] = _map_series(out["st_slope"], SLOPE_MAP)
    for col in out.columns:
        out[col] = pd.to_numeric(out[col], errors="coerce")

    # Cleveland-style: num > 0 means disease present
    out["target"] = (out["target"] > 0).astype(int)
    # Cholesterol 0 is a known missing sentinel in several public heart CSVs
    out.loc[out["cholesterol"] == 0, "cholesterol"] = pd.NA
    out.loc[out["resting_bp"] == 0, "resting_bp"] = pd.NA
    before = len(out)
    out = out.dropna()
    dropped = before - len(out)
    if dropped:
        print(f"Dropped {dropped} rows with missing values after coercion.")
    return out[FEATURE_ORDER + ["target"]]
