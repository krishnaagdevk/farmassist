import pytest
from routing import solve_cvrp

def test_pickup_before_drop_and_capacity_respected():
    depot = {"lat": 28.6692, "lng": 77.4538}
    vehicles = [
        {"id": "V1", "capacityGrams": 500000, "costPaisePerKm": 800, "shiftStartMin": 360, "shiftEndMin": 1200}
    ]
    stops = [
        {
            "id": "PU1", "kind": "pickup", "lat": 28.70, "lng": 77.50, "grams": 40000,
            "pairId": "PAIR1", "twStartMin": 360, "twEndMin": 1080, "serviceMin": 10
        },
        {
            "id": "DR1", "kind": "drop", "lat": 28.61, "lng": 77.23, "grams": 40000,
            "pairId": "PAIR1", "twStartMin": 480, "twEndMin": 1140, "serviceMin": 8
        }
    ]
    # Simple synthetic 3x3 distance and duration matrix (Depot, PU1, DR1)
    dist_m = [
        [0, 15000, 25000],
        [15000, 0, 20000],
        [25000, 20000, 0]
    ]
    dur_s = [
        [0, 1800, 3000],
        [1800, 0, 2400],
        [3000, 2400, 0]
    ]

    routes, unassigned, status = solve_cvrp(depot, vehicles, stops, dist_m, dur_s)

    assert status == "OPTIMAL"
    assert len(routes) == 1
    route = routes[0]
    assert route["sequence"] == ["PU1", "DR1"]  # Pickup must be strictly before drop
    assert route["loadPeakGrams"] <= 500000
    assert len(unassigned) == 0
