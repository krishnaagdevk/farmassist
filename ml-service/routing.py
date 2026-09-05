from ortools.constraint_solver import routing_enums_pb2, pywrapcp
from typing import List, Dict, Any

def solve_cvrp(
    depot: Dict[str, float],
    vehicles: List[Dict[str, Any]],
    stops: List[Dict[str, Any]],
    dist_m: List[List[int]],
    dur_s: List[List[int]],
    time_limit_s: int = 10,
):
    """
    Solves Capacitated Vehicle Routing Problem with Pickup & Delivery and Time Windows.
    Index 0 is the depot; Stops occupy indices 1..n.
    """
    n = len(stops) + 1
    num_vehicles = len(vehicles)

    manager = pywrapcp.RoutingIndexManager(n, num_vehicles, 0)
    routing = pywrapcp.RoutingModel(manager)

    # 1. Distance Arc Cost Evaluator
    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return dist_m[from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # 2. Capacity Dimension: Pickups add grams, Drops subtract grams
    def demand_callback(from_index):
        from_node = manager.IndexToNode(from_index)
        if from_node == 0:
            return 0
        stop = stops[from_node - 1]
        return stop["grams"] if stop["kind"] == "pickup" else -stop["grams"]

    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
    capacities = [v.get("capacityGrams", 1000000) for v in vehicles]

    routing.AddDimensionWithVehicleCapacity(
        demand_callback_index,
        0,  # null capacity slack
        capacities,
        True,  # start cumulative load at zero
        "Capacity",
    )

    # 3. Time Dimension: Travel duration + Service duration per stop
    def time_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        service = 0 if from_node == 0 else stops[from_node - 1].get("serviceMin", 10) * 60
        return dur_s[from_node][to_node] + service

    time_callback_index = routing.RegisterTransitCallback(time_callback)
    routing.AddDimension(
        time_callback_index,
        3600,  # 60-minute waiting time slack
        24 * 3600,  # max time per day
        False,  # Don't force start at 0
        "Time",
    )
    time_dimension = routing.GetDimensionOrDie("Time")

    # Set Time Windows for stops
    for k, stop in enumerate(stops, start=1):
        index = manager.NodeToIndex(k)
        start_sec = stop.get("twStartMin", 360) * 60
        end_sec = stop.get("twEndMin", 1200) * 60
        time_dimension.CumulVar(index).SetRange(start_sec, end_sec)

    # Set Shift Windows for vehicles
    for vi, v in enumerate(vehicles):
        start_sec = v.get("shiftStartMin", 360) * 60
        end_sec = v.get("shiftEndMin", 1200) * 60
        time_dimension.CumulVar(routing.Start(vi)).SetRange(start_sec, end_sec)

    # 4. Pickup & Delivery Pairing Constraints (same vehicle + pickup before drop)
    pair_dict = {}
    for k, stop in enumerate(stops, start=1):
        pair_id = stop.get("pairId")
        if pair_id:
            if pair_id not in pair_dict:
                pair_dict[pair_id] = {}
            pair_dict[pair_id][stop["kind"]] = k

    for pair_id, p_nodes in pair_dict.items():
        if "pickup" in p_nodes and "drop" in p_nodes:
            pu_idx = manager.NodeToIndex(p_nodes["pickup"])
            dr_idx = manager.NodeToIndex(p_nodes["drop"])
            routing.AddPickupAndDelivery(pu_idx, dr_idx)
            routing.solver().Add(routing.VehicleVar(pu_idx) == routing.VehicleVar(dr_idx))
            routing.solver().Add(time_dimension.CumulVar(pu_idx) <= time_dimension.CumulVar(dr_idx))

    # 5. Allow dropping nodes with large penalty instead of failing completely
    penalty = 5000000  # Large disjunction penalty
    for k in range(1, n):
        routing.AddDisjunction([manager.NodeToIndex(k)], penalty)

    # Search Parameters
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PARALLEL_CHEAPEST_INSERTION
    )
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_parameters.time_limit.FromSeconds(time_limit_s)

    # Solve
    solution = routing.SolveWithParameters(search_parameters)

    routes = []
    unassigned = []

    if solution:
        for vi in range(num_vehicles):
            index = routing.Start(vi)
            seq = []
            arrival_min = []
            route_dist_meters = 0
            peak_load = 0
            current_load = 0

            while not routing.IsEnd(index):
                node = manager.IndexToNode(index)
                if node != 0:
                    stop = stops[node - 1]
                    seq.append(stop["id"])
                    time_val = solution.Min(time_dimension.CumulVar(index)) // 60
                    arrival_min.append(time_val)
                    current_load += (
                        stop["grams"] if stop["kind"] == "pickup" else -stop["grams"]
                    )
                    peak_load = max(peak_load, current_load)

                previous_index = index
                index = solution.Value(routing.NextVar(index))
                route_dist_meters += routing.GetArcCostForVehicle(previous_index, index, vi)

            if seq:
                routes.append(
                    {
                        "vehicleId": vehicles[vi]["id"],
                        "sequence": seq,
                        "arrivalMin": arrival_min,
                        "distanceKm": round(route_dist_meters / 1000.0, 1),
                        "durationMin": arrival_min[-1] - (vehicles[vi].get("shiftStartMin", 360))
                        if arrival_min
                        else 0,
                        "loadPeakGrams": peak_load,
                        "polyline": "",
                        "costPaise": int(
                            (route_dist_meters / 1000.0) * vehicles[vi].get("costPaisePerKm", 800)
                        ),
                    }
                )

        for k in range(1, n):
            if solution.Value(routing.NextVar(manager.NodeToIndex(k))) == manager.NodeToIndex(k):
                unassigned.append(stops[k - 1]["id"])

        solver_status = "OPTIMAL"
    else:
        solver_status = "NO_SOLUTION_FOUND"

    return routes, unassigned, solver_status
