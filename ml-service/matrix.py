import math
import httpx
from typing import List, Tuple

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance in kilometers."""
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def haversine_matrix(points: List[Tuple[float, float]]) -> Tuple[List[List[int]], List[List[int]]]:
    """Generates symmetric distance (meters) and duration (seconds) matrix using haversine x 1.3 road factor."""
    n = len(points)
    dist_matrix = [[0] * n for _ in range(n)]
    dur_matrix = [[0] * n for _ in range(n)]
    avg_speed_kmh = 35.0  # 35 km/h average rural/peri-urban transport speed

    for i in range(n):
        for j in range(n):
            if i == j:
                dist_matrix[i][j] = 0
                dur_matrix[i][j] = 0
            else:
                dist_km = haversine_distance(points[i][0], points[i][1], points[j][0], points[j][1]) * 1.3  # winding factor
                dist_meters = int(dist_km * 1000)
                dur_seconds = int((dist_km / avg_speed_kmh) * 3600)
                dist_matrix[i][j] = dist_meters
                dur_matrix[i][j] = dur_seconds

    return dist_matrix, dur_matrix

async def get_road_matrix(points: List[Tuple[float, float]]) -> Tuple[List[List[int]], List[List[int]], str]:
    """
    Attempts to query OSRM public table API for accurate road driving distances.
    Falls back to haversine matrix x 1.3 road-winding factor if OSRM is blocked/offline.
    """
    if len(points) <= 1:
        return [[0]], [[0]], "identity"

    # OSRM expects coordinates in lng,lat order
    coords_str = ";".join(f"{lon},{lat}" for lat, lon in points)
    url = f"https://router.project-osrm.org/table/v1/driving/{coords_str}"

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url, params={"annotations": "duration,distance"})
            if resp.status_code == 200:
                data = resp.json()
                if "distances" in data and "durations" in data:
                    distances = [[int(d) for d in row] for row in data["distances"]]
                    durations = [[int(d) for d in row] for row in data["durations"]]
                    return distances, durations, "osrm"
    except Exception as e:
        print(f"[Matrix] OSRM query failed ({e}), using robust Haversine fallback.")

    dist_m, dur_s = haversine_matrix(points)
    return dist_m, dur_s, "haversine_fallback"
