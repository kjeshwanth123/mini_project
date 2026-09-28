"""Print metrics from the last training run."""

from __future__ import annotations

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
META = REPO_ROOT / "ml" / "models" / "model_metadata.json"


def main() -> None:
    if not META.exists():
        raise SystemExit("NOT IMPLEMENTED YET: train first with python ml/train.py")
    print(META.read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()
