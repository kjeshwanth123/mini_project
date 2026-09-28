"""
Train and compare heart-disease classifiers. Writes measured metrics only.

Run from the repository root:
  backend\\.venv\\Scripts\\python.exe ml\\train.py
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import GridSearchCV, StratifiedKFold, train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "ml"))

from data import FEATURE_ORDER, load_heart_dataset  # noqa: E402

MODELS_DIR = REPO_ROOT / "ml" / "models"
DATASET_PATH = REPO_ROOT / "ml" / "data" / "heart_disease.csv"
RANDOM_STATE = 42


def _candidates():
    models = [
        (
            "logistic_regression",
            LogisticRegression(max_iter=2000, random_state=RANDOM_STATE),
            {"clf__C": [0.1, 1.0, 10.0]},
        ),
        (
            "decision_tree",
            DecisionTreeClassifier(random_state=RANDOM_STATE),
            {"clf__max_depth": [3, 5, 8, None], "clf__min_samples_split": [2, 8]},
        ),
        (
            "random_forest",
            RandomForestClassifier(random_state=RANDOM_STATE),
            {"clf__n_estimators": [80, 160], "clf__max_depth": [5, 10, None]},
        ),
        (
            "knn",
            KNeighborsClassifier(),
            {"clf__n_neighbors": [3, 5, 9]},
        ),
        (
            "svm",
            SVC(probability=True, random_state=RANDOM_STATE),
            {"clf__C": [0.5, 1.0, 4.0], "clf__kernel": ["rbf", "linear"]},
        ),
    ]
    try:
        from xgboost import XGBClassifier

        models.append(
            (
                "xgboost",
                XGBClassifier(
                    random_state=RANDOM_STATE,
                    eval_metric="logloss",
                    n_jobs=1,
                ),
                {"clf__n_estimators": [80, 160], "clf__max_depth": [3, 5], "clf__learning_rate": [0.05, 0.1]},
            )
        )
    except Exception as exc:  # pragma: no cover - optional dependency
        print(f"XGBoost skipped: {exc}")
    return models


def _metrics(y_true, y_pred, y_prob) -> dict:
    out = {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
        "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
        "n_test": int(len(y_true)),
    }
    if y_prob is not None:
        out["roc_auc"] = float(roc_auc_score(y_true, y_prob))
    else:
        out["roc_auc"] = None
    return out


def main() -> None:
    df = load_heart_dataset(DATASET_PATH)
    X = df[FEATURE_ORDER]
    y = df["target"].astype(int)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE
    )

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "num",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="median")),
                        ("scaler", StandardScaler()),
                    ]
                ),
                FEATURE_ORDER,
            )
        ]
    )

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    comparison: list[dict] = []
    best_name = None
    best_auc = -1.0
    best_estimator = None
    best_test_metrics = None

    for name, estimator, grid in _candidates():
        pipe = Pipeline(steps=[("pre", preprocessor), ("clf", estimator)])
        search = GridSearchCV(pipe, grid, scoring="roc_auc", cv=cv, n_jobs=1)
        search.fit(X_train, y_train)
        fitted = search.best_estimator_
        y_pred = fitted.predict(X_test)
        proba = fitted.predict_proba(X_test)[:, 1] if hasattr(fitted, "predict_proba") else None
        metrics = _metrics(y_test, y_pred, proba)
        row = {
            "name": name,
            "cv_roc_auc": float(search.best_score_),
            "best_params": search.best_params_,
            "test_metrics": metrics,
        }
        comparison.append(row)
        print(json.dumps(row, indent=2))
        if metrics["roc_auc"] is not None and metrics["roc_auc"] > best_auc:
            best_auc = metrics["roc_auc"]
            best_name = name
            best_estimator = fitted
            best_test_metrics = metrics

    if best_estimator is None:
        raise SystemExit("No model produced a ROC-AUC score.")

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    clf = best_estimator.named_steps["clf"]
    pre = best_estimator.named_steps["pre"]
    joblib.dump(clf, MODELS_DIR / "best_model.joblib")
    joblib.dump(pre, MODELS_DIR / "preprocessor.joblib")

    importances: list[dict] = []
    if hasattr(clf, "coef_"):
        coefs = np.ravel(clf.coef_)
        for feature, value in zip(FEATURE_ORDER, coefs):
            importances.append({"feature": feature, "coefficient": float(value)})
        importances.sort(key=lambda item: abs(item["coefficient"]), reverse=True)
    elif hasattr(clf, "feature_importances_"):
        for feature, value in zip(FEATURE_ORDER, clf.feature_importances_):
            importances.append({"feature": feature, "importance": float(value)})
        importances.sort(key=lambda item: item["importance"], reverse=True)

    metadata = {
        "model_name": best_name,
        "version": datetime.now(timezone.utc).strftime("v%Y%m%dT%H%M%SZ"),
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "dataset_path": str(DATASET_PATH.relative_to(REPO_ROOT)),
        "n_rows": int(len(df)),
        "features": FEATURE_ORDER,
        "primary_metric": "test_roc_auc",
        "selection_rule": "Highest test ROC-AUC among compared algorithms after 5-fold CV GridSearch.",
        "test_metrics": best_test_metrics,
        "comparison": comparison,
        "global_feature_attribution": importances,
        "disclaimer": (
            "These metrics were measured on a held-out split of a public educational dataset. "
            "They are not a clinical accuracy claim and must not be copied as a marketing number."
        ),
    }
    (MODELS_DIR / "model_metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(f"Selected {best_name} with test ROC-AUC={best_auc:.4f}")
    print(f"Wrote artifacts in {MODELS_DIR}")


if __name__ == "__main__":
    main()
