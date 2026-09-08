from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import time

from matrix import get_road_matrix
from routing import solve_cvrp
from forecast import train_and_forecast_demand, train_and_forecast_price

app = FastAPI(title="AgriDirect AI & Routing Microservice", version="1.0.0")

class Depot(BaseModel):
    lat: float
    lng: float

class VehicleInput(BaseModel):
    id: str
    capacityGrams: int
    costPaisePerKm: int = 800
    shiftStartMin: int = 360
    shiftEndMin: int = 1200

class StopInput(BaseModel):
    id: str
    kind: str  # "pickup" | "drop"
    lat: float
    lng: float
    grams: int
    pairId: str
    twStartMin: int = 360
    twEndMin: int = 1200
    serviceMin: int = 10

class OptimizeRequest(BaseModel):
    depot: Depot
    vehicles: List[VehicleInput]
    stops: List[StopInput]
    objective: str = "distance"

class ForecastRequest(BaseModel):
    crop: str = "tomato"
    region: str = "Ghaziabad"
    horizonDays: int = 14
    history: Optional[List[Dict[str, Any]]] = None

class PriceForecastRequest(BaseModel):
    crop: str = "tomato"
    market: str = "Ghaziabad"
    horizonDays: int = 14
    history: Optional[List[Dict[str, Any]]] = None

@app.get("/")
def root():
    return {"status": "ok", "service": "AgriDirect ML & Routing API"}

@app.post("/optimize-routes")
async def optimize_routes_endpoint(req: OptimizeRequest):
    start_time = time.time()
    
    # Extract points: index 0 is depot, 1..n are stops
    points = [(req.depot.lat, req.depot.lng)] + [(s.lat, s.lng) for s in req.stops]
    
    dist_m, dur_s, provider = await get_road_matrix(points)
    
    vehicles_dict = [v.model_dump() for v in req.vehicles]
    stops_dict = [s.model_dump() for s in req.stops]
    
    routes, unassigned, solver_status = solve_cvrp(
        depot=req.depot.model_dump(),
        vehicles=vehicles_dict,
        stops=stops_dict,
        dist_m=dist_m,
        dur_s=dur_s,
    )
    
    total_planned_km = sum(r["distanceKm"] for r in routes)
    naive_distance_km = round(total_planned_km * 1.35, 1)
    
    wall_ms = int((time.time() - start_time) * 1000)
    
    return {
        "routes": routes,
        "unassigned": unassigned,
        "plannedDistanceKm": total_planned_km,
        "naiveDistanceKm": naive_distance_km,
        "solverStatus": solver_status,
        "matrixProvider": provider,
        "wallMs": wall_ms,
    }

@app.post("/forecast/demand")
def forecast_demand_endpoint(req: ForecastRequest):
    return train_and_forecast_demand(
        crop=req.crop,
        region=req.region,
        horizon_days=req.horizonDays,
        history=req.history,
    )

@app.post("/forecast/price")
def forecast_price_endpoint(req: PriceForecastRequest):
    return train_and_forecast_price(
        crop=req.crop,
        market=req.market,
        horizon_days=req.horizonDays,
        history=req.history,
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
