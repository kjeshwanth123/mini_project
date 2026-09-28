"""CLI inference using saved artifacts."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.services.ml_runtime import FEATURE_ORDER, load_runtime, predict_features  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Score one heart-health feature vector.")
    for name in FEATURE_ORDER:
        parser.add_argument(f"--{name.replace('_', '-')}", required=True, type=float)
    args = parser.parse_args()
    features = {name: getattr(args, name) for name in FEATURE_ORDER}
    runtime = load_runtime()
    print(json.dumps(predict_features(runtime, features), indent=2))


if __name__ == "__main__":
    main()
