from datetime import datetime, timedelta
import numpy as np
from forecast import train_and_forecast_demand, train_and_forecast_price

def generate_sample_demand_history(days=60):
    start = datetime(2025, 1, 1)
    data = []
    for i in range(days):
        dt = start + timedelta(days=i)
        base = 250.0 + (i * 0.5) + np.sin(i * 2 * np.pi / 7) * 40.0
        data.append({
            "date": dt.strftime("%Y-%m-%d"),
            "qtyKg": round(base + np.random.normal(0, 3), 1),
        })
    return data

def generate_sample_price_history(days=60):
    start = datetime(2025, 1, 1)
    data = []
    for i in range(days):
        dt = start + timedelta(days=i)
        base_paise = 2400.0 + (i * 2.0) + np.sin(i * 2 * np.pi / 7) * 150.0
        data.append({
            "date": dt.strftime("%Y-%m-%d"),
            "pricePaisePerKg": round(base_paise + np.random.normal(0, 15), 0),
        })
    return data

def test_demand_forecast_beats_baseline():
    history = generate_sample_demand_history(days=60)
    result = train_and_forecast_demand(
        crop="tomato",
        region="Ghaziabad",
        horizon_days=14,
        history=history,
    )
    assert "points" in result
    assert len(result["points"]) == 14
    assert result["mape"] <= result["baselineMape"]
    assert result["model"] == "lightgbm_lag_features"
    print("[PASS] test_demand_forecast_beats_baseline: LightGBM MAPE < Baseline MAPE")

def test_price_forecast_beats_baseline():
    history = generate_sample_price_history(days=60)
    result = train_and_forecast_price(
        crop="tomato",
        market="Ghaziabad",
        horizon_days=14,
        history=history,
    )
    assert "points" in result
    assert len(result["points"]) == 14
    assert result["mape"] <= result["baselineMape"]
    assert result["model"] == "lightgbm"
    print("[PASS] test_price_forecast_beats_baseline: LightGBM MAPE < Baseline MAPE")

def test_short_history_returns_naive():
    # Only 15 days history (less than 30)
    short_history = generate_sample_price_history(days=15)
    result = train_and_forecast_price(
        crop="potato",
        market="Ghaziabad",
        horizon_days=7,
        history=short_history,
    )
    assert "points" in result
    assert len(result["points"]) == 7
    assert "insufficient_history_seasonal_naive" in result["warnings"]
    assert result["model"] == "seasonal_naive_fallback"
    print("[PASS] test_short_history_returns_naive: Falls back to seasonal naive with warning")

if __name__ == "__main__":
    print("Running ML Forecasting Test Suite...")
    test_demand_forecast_beats_baseline()
    test_price_forecast_beats_baseline()
    test_short_history_returns_naive()
    print("All 3 ML forecast tests passed 100%!")
