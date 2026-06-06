"""Backend API integration tests."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"


def test_root():
    r = client.get("/")
    assert r.status_code == 200
    data = r.json()
    assert "F1 Oracle" in data["name"]


def test_get_drivers():
    r = client.get("/api/v1/drivers/?limit=10")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) <= 10
    if data:
        assert "driver_id" in data[0]
        assert "full_name" in data[0]


def test_get_goat_rankings():
    r = client.get("/api/v1/drivers/goat?top_n=10")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) <= 10
    if data:
        assert "goat_rank" in data[0]
        assert "goat_score" in data[0]
        # Rankings should be ordered
        ranks = [d["goat_rank"] for d in data]
        assert ranks == sorted(ranks)


def test_get_races():
    r = client.get("/api/v1/races/?year=2023&limit=5")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert all(d["year"] == 2023 for d in data)


def test_get_seasons():
    r = client.get("/api/v1/races/seasons")
    assert r.status_code == 200
    seasons = r.json()
    assert isinstance(seasons, list)
    assert 2023 in seasons
    assert 2009 in seasons


def test_get_driver_not_found():
    r = client.get("/api/v1/drivers/99999")
    assert r.status_code == 404


def test_get_circuits():
    r = client.get("/api/v1/analytics/circuits")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 77  # All circuits
    if data:
        assert "circuit_id" in data[0]


def test_get_rivalries():
    r = client.get("/api/v1/analytics/rivalries?top_n=5")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) <= 5


def test_driver_clusters():
    r = client.get("/api/v1/drivers/clusters")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 861


def test_driver_standings():
    r = client.get("/api/v1/analytics/standings/drivers/2023")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    if data:
        # Should be ordered by position
        positions = [d["position"] for d in data if d.get("position")]
        assert positions == sorted(positions)


def test_race_results():
    # Race 18 is a known race in the dataset
    r = client.get("/api/v1/races/18/results")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) > 0
    if data:
        assert "driver_id" in data[0]
        assert "position" in data[0]


def test_predictions():
    r = client.get("/api/v1/predictions/race/18")
    assert r.status_code == 200
    data = r.json()
    assert "race_id" in data
    assert "drivers" in data
    assert isinstance(data["drivers"], list)
    if data["drivers"]:
        d = data["drivers"][0]
        assert "win_probability" in d
        assert 0 <= d["win_probability"] <= 1


def test_feature_importance():
    r = client.get("/api/v1/predictions/feature-importance/race_winner")
    assert r.status_code == 200
    data = r.json()
    assert "features" in data
    assert isinstance(data["features"], list)
    if data["features"]:
        assert "feature" in data["features"][0]
        assert "importance" in data["features"][0]


def test_invalid_target_feature_importance():
    r = client.get("/api/v1/predictions/feature-importance/invalid_target")
    assert r.status_code == 400
