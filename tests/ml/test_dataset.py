from pathlib import Path
import sys

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "ml"))

from data import FEATURE_ORDER, load_heart_dataset


def test_dataset_loads() -> None:
    df = load_heart_dataset(REPO / "ml" / "data" / "heart_disease.csv")
    assert list(df.columns) == FEATURE_ORDER + ["target"]
    assert len(df) > 50
    assert set(df["target"].unique()) <= {0, 1}
