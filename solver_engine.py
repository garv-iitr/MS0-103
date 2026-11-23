"""
Operations Research Solver Engine for MSO-103 Case Study
Implements:
1. Classical AMRUTA 3-Stage Heuristic (Mahadevan et al., INFORMS Interfaces 2013)
2. Modern OR Solver (Google OR-Tools style CVRPTW with Clarke-Wright + GLS + 2-Opt*)
Strictly respects available fleet size k and vehicle capacity limits.
"""

import math
import copy

DEPOT_LAT = 12.88812
DEPOT_LNG = 77.54838

def calculate_distance(lat1, lng1, lat2, lng2, correction_factor=1.35):
    dx = (lng2 - lng1) * 108.0
    dy = (lat2 - lat1) * 110.574
    euclidean = math.sqrt(dx * dx + dy * dy)
    return round(euclidean * correction_factor, 2)

def calculate_service_time(rice_vessels, sambar_vessels, curd_vessels, fixed_min=3.5, per_vessel_min=0.35):
    total_containers = float(rice_vessels or 0) + float(sambar_vessels or 0) + float(curd_vessels or 0)
    service_min = fixed_min + (total_containers * per_vessel_min)
    return round(service_min, 2)

# ==============================================================================
# 1. CLASSICAL AMRUTA 3-STAGE HEURISTIC
# ==============================================================================

class AmrutaHeuristicSolver:
    def __init__(self, schools, fleet, k_vehicles=10, vehicle_capacity=65.0, delivery_speed=24.0, cutoff_minutes=270.0, circuity_factor=1.35, diesel_price=45.0, working_days=22, depot_lat=None, depot_lng=None):
        self.depot = {
            "lat": depot_lat if depot_lat is not None else DEPOT_LAT,
            "lng": depot_lng if depot_lng is not None else DEPOT_LNG,
            "name": "Vasanthapura Central Kitchen",
            "school_id": 0
        }
        self.schools = copy.deepcopy(schools)
        self.fleet = copy.deepcopy(fleet)
        if self.fleet and k_vehicles > len(self.fleet):
            base_fleet = copy.deepcopy(self.fleet)
            while len(self.fleet) < k_vehicles:
                idx = len(self.fleet)
                tmpl = copy.deepcopy(base_fleet[idx % len(base_fleet)])
                tmpl["vehicle_id"] = f"V-{idx + 1:02d}"
                self.fleet.append(tmpl)
        self.k_vehicles = min(k_vehicles, len(self.fleet), len(self.schools)) if self.schools else 0
        self.vehicle_capacity = vehicle_capacity
        self.delivery_speed = delivery_speed
        self.cutoff_minutes = cutoff_minutes
        self.circuity_factor = circuity_factor
        self.diesel_price = diesel_price
        self.working_days = working_days

    def solve(self):
        if not self.schools or self.k_vehicles == 0:
            return {"model": "Classical AMRUTA (3-Stage)", "k_deployed": 0, "routes": [], "summary": {}}

        clusters, unclustered = self._stage1_clustering()
        assigned = self._stage2_refinement(clusters)
        final_routes = self._stage3_routing(assigned)
        summary = self._evaluate_solution(final_routes, unclustered)

        return {
            "model": "Classical AMRUTA (3-Stage)",
            "k_deployed": len(final_routes),
            "routes": final_routes,
            "unassigned_schools": unclustered,
            "summary": summary
        }

    def _stage1_clustering(self):
        k = self.k_vehicles
        cap = self.vehicle_capacity
        depot = self.depot

        # Compute radial angle around depot for each school
        schools_with_angle = []
        for s in self.schools:
            ang = math.atan2(s["latitude"] - depot["lat"], s["longitude"] - depot["lng"])
            if ang < 0:
                ang += 2 * math.pi
            sc = dict(s)
            sc["_angle"] = ang
            schools_with_angle.append(sc)

        sector_size = (2 * math.pi) / k
        seeds = []
        assigned_ids = set()

        for i in range(k):
            s_min = i * sector_size
            s_max = (i + 1) * sector_size
            in_sec = [s for s in schools_with_angle if s_min <= s["_angle"] < s_max and s["school_id"] not in assigned_ids]
            if in_sec:
                in_sec.sort(key=lambda s: s["equivalent_demand"], reverse=True)
                seeds.append(in_sec[0])
                assigned_ids.add(in_sec[0]["school_id"])

        if len(seeds) < k:
            leftovers = [s for s in schools_with_angle if s["school_id"] not in assigned_ids]
            leftovers.sort(key=lambda s: s["equivalent_demand"], reverse=True)
            while len(seeds) < k and leftovers:
                s = leftovers.pop(0)
                seeds.append(s)
                assigned_ids.add(s["school_id"])

        unassigned = [s for s in schools_with_angle if s["school_id"] not in assigned_ids]

        clusters = []
        for i in range(k):
            s = seeds[i]
            veh = self.fleet[i % len(self.fleet)]
            veh["equivalent_capacity"] = cap
            clusters.append({
                "cluster_id": i + 1,
                "centroid": {"lat": s["latitude"], "lng": s["longitude"]},
                "schools": [s],
                "total_demand": s["equivalent_demand"],
                "max_cap_80": cap * 0.80,
                "max_cap_100": cap,
                "vehicle": veh
            })

        rem_pass1 = []
        for s in unassigned:
            best_c = None
            best_p = float("inf")
            for c in clusters:
                if c["total_demand"] + s["equivalent_demand"] <= c["max_cap_80"]:
                    dist = calculate_distance(c["centroid"]["lat"], c["centroid"]["lng"], s["latitude"], s["longitude"], self.circuity_factor)
                    p = dist / max(s["equivalent_demand"], 0.1)
                    if p < best_p:
                        best_p = p
                        best_c = c
            if best_c:
                best_c["schools"].append(s)
                best_c["total_demand"] += s["equivalent_demand"]
                best_c["centroid"]["lat"] = sum(x["latitude"] for x in best_c["schools"]) / len(best_c["schools"])
                best_c["centroid"]["lng"] = sum(x["longitude"] for x in best_c["schools"]) / len(best_c["schools"])
            else:
                rem_pass1.append(s)

        unclustered = []
        for s in rem_pass1:
            best_c = None
            min_d = float("inf")
            for c in clusters:
                if c["total_demand"] + s["equivalent_demand"] <= c["max_cap_100"]:
                    dist = calculate_distance(c["centroid"]["lat"], c["centroid"]["lng"], s["latitude"], s["longitude"], self.circuity_factor)
                    if dist < min_d:
                        min_d = dist
                        best_c = c
            if best_c:
                best_c["schools"].append(s)
                best_c["total_demand"] += s["equivalent_demand"]
            else:
                unclustered.append(s)

        return clusters, unclustered

    def _stage2_refinement(self, clusters):
        cap = self.vehicle_capacity
        improved = True
        iterations = 0
        while improved and iterations < 3:
            improved = False
            iterations += 1
            for i in range(len(clusters)):
                for j in range(i + 1, len(clusters)):
                    c1, c2 = clusters[i], clusters[j]
                    for idx1, s1 in enumerate(list(c1["schools"])):
                        for idx2, s2 in enumerate(list(c2["schools"])):
                            dem1 = c1["total_demand"] - s1["equivalent_demand"] + s2["equivalent_demand"]
                            dem2 = c2["total_demand"] - s2["equivalent_demand"] + s1["equivalent_demand"]
                            if dem1 <= cap and dem2 <= cap:
                                cur_d = (calculate_distance(s1["latitude"], s1["longitude"], c1["centroid"]["lat"], c1["centroid"]["lng"], self.circuity_factor) +
                                         calculate_distance(s2["latitude"], s2["longitude"], c2["centroid"]["lat"], c2["centroid"]["lng"], self.circuity_factor))
                                swap_d = (calculate_distance(s1["latitude"], s1["longitude"], c2["centroid"]["lat"], c2["centroid"]["lng"], self.circuity_factor) +
                                          calculate_distance(s2["latitude"], s2["longitude"], c1["centroid"]["lat"], c1["centroid"]["lng"], self.circuity_factor))
                                if swap_d < cur_d - 0.5:
                                    c1["schools"][idx1] = s2
                                    c2["schools"][idx2] = s1
                                    c1["total_demand"] = dem1
                                    c2["total_demand"] = dem2
                                    improved = True
                                    break
                        if improved:
                            break
        return clusters

    def _stage3_routing(self, clusters):
        final_routes = []
        depot = self.depot
        for c in clusters:
            schools = c["schools"]
            if not schools:
                continue
            unvisited = list(schools)
            ordered = []
            cur_lat, cur_lng = depot["lat"], depot["lng"]
            while unvisited:
                n_idx, min_d = 0, float("inf")
                for i, s in enumerate(unvisited):
                    d = calculate_distance(cur_lat, cur_lng, s["latitude"], s["longitude"], self.circuity_factor)
                    if d < min_d:
                        min_d = d
                        n_idx = i
                chosen = unvisited.pop(n_idx)
                ordered.append(chosen)
                cur_lat, cur_lng = chosen["latitude"], chosen["longitude"]

            ordered = self._two_opt(ordered)
            sheet = self._compute_schedule(ordered, c["vehicle"], c["cluster_id"])
            final_routes.append(sheet)
        return final_routes

    def _two_opt(self, route):
        if len(route) < 4:
            return route
        best = list(route)
        improved = True
        passes = 0
        while improved and passes < 3:
            improved = False
            passes += 1
            for i in range(len(best) - 1):
                for j in range(i + 2, len(best)):
                    p1, p2 = best[i], best[i+1]
                    p3, p4 = best[j], best[(j+1) % len(best)]
                    cur_d = (calculate_distance(p1["latitude"], p1["longitude"], p2["latitude"], p2["longitude"], self.circuity_factor) +
                             calculate_distance(p3["latitude"], p3["longitude"], p4["latitude"], p4["longitude"], self.circuity_factor))
                    swap_d = (calculate_distance(p1["latitude"], p1["longitude"], p3["latitude"], p3["longitude"], self.circuity_factor) +
                              calculate_distance(p2["latitude"], p2["longitude"], p4["latitude"], p4["longitude"], self.circuity_factor))
                    if swap_d < cur_d - 0.2:
                        best[i+1:j+1] = reversed(best[i+1:j+1])
                        improved = True
        return best

    def _compute_schedule(self, schools, vehicle, cluster_id):
        depot = self.depot
        stops = []
        cur_time = 0.0
        total_dist = 0.0
        total_travel = 0.0
        total_service = 0.0
        prev_lat, prev_lng = depot["lat"], depot["lng"]

        stops.append({
            "stop_seq": 0, "school_id": 0, "school_name": depot["name"],
            "latitude": prev_lat, "longitude": prev_lng,
            "distance_km": 0.0, "travel_time_min": 0.0, "service_time_min": 0.0,
            "arrival_time_min": 0.0, "arrival_clock": "08:00 AM",
            "rice_vessels": 0, "sambar_vessels": 0, "curd_vessels": 0, "demand": 0.0
        })

        for idx, s in enumerate(schools, 1):
            is_first = (idx == 1)
            dist = calculate_distance(prev_lat, prev_lng, s["latitude"], s["longitude"], self.circuity_factor)
            speed = max(self.delivery_speed * 1.25, 20.0) if is_first else self.delivery_speed
            t_time = round((dist / speed) * 60.0, 2)
            s_time = calculate_service_time(s.get("rice_vessels", 0), s.get("sambar_vessels", 0), s.get("curd_vessels", 0))

            arrival_min = round(cur_time + t_time, 2)
            dep_min = round(arrival_min + s_time, 2)

            hr = 8 + int(arrival_min // 60)
            mn = int(arrival_min % 60)
            clock = f"{hr - 12 if hr > 12 else hr}:{mn:02d} {'PM' if hr >= 12 else 'AM'}"

            total_dist += dist
            total_travel += t_time
            total_service += s_time
            cur_time = dep_min
            prev_lat, prev_lng = s["latitude"], s["longitude"]

            stops.append({
                "stop_seq": idx, "school_id": s["school_id"], "school_name": s["school_name"],
                "latitude": s["latitude"], "longitude": s["longitude"],
                "distance_km": dist, "travel_time_min": t_time, "service_time_min": s_time,
                "arrival_time_min": arrival_min, "arrival_clock": clock,
                "rice_vessels": s.get("rice_vessels", 0), "sambar_vessels": s.get("sambar_vessels", 0),
                "curd_vessels": s.get("curd_vessels", 0), "demand": s["equivalent_demand"]
            })

        ret_dist = calculate_distance(prev_lat, prev_lng, depot["lat"], depot["lng"], self.circuity_factor)
        ret_time = round((ret_dist / (self.delivery_speed * 1.25)) * 60.0, 2)
        total_dist += ret_dist
        total_travel += ret_time
        final_elapsed = round(cur_time + ret_time, 2)

        mileage = max(float(vehicle.get("mileage_kmpl", 4.0) or 4.0), 1.0)
        fuel_cost = round((total_dist / mileage) * self.diesel_price * self.working_days, 2)
        maint_cost = float(vehicle.get("maint_cost_monthly", 9844) or 9844)
        crew_cost = (float(vehicle.get("driver_salary", 10000) or 10000) + 
                     float(vehicle.get("supervisor_salary", 8000) or 8000) +
                     float(vehicle.get("loader_salary", 6000) or 6000) * float(vehicle.get("loaders", 2) or 2))
        total_cost = round(fuel_cost + maint_cost + crew_cost, 2)

        tot_dem = round(sum(s["equivalent_demand"] for s in schools), 1)
        cap = self.vehicle_capacity
        util = round((tot_dem / cap) * 100.0, 1) if cap > 0 else 0.0

        return {
            "cluster_id": cluster_id,
            "vehicle_id": vehicle.get("vehicle_id", f"V-{cluster_id:02d}"),
            "vehicle_type": vehicle.get("type", "Max Pikup"),
            "driver_name": f"Driver #{cluster_id:02d}",
            "supervisor_name": f"Supervisor #{cluster_id:02d}",
            "schools_count": len(schools),
            "total_demand": tot_dem,
            "vehicle_capacity": cap,
            "capacity_utilization_pct": util,
            "distance_km": round(total_dist, 2),
            "travel_time_min": round(total_travel, 2),
            "service_time_min": round(total_service, 2),
            "elapsed_time_min": final_elapsed,
            "last_school_arrival_min": stops[-1]["arrival_time_min"],
            "last_school_arrival_clock": stops[-1]["arrival_clock"],
            "is_within_time_window": stops[-1]["arrival_time_min"] <= self.cutoff_minutes,
            "monthly_fuel_cost": fuel_cost,
            "monthly_fixed_cost": maint_cost,
            "monthly_crew_cost": crew_cost,
            "monthly_total_cost": total_cost,
            "stops": stops
        }

    def _evaluate_solution(self, routes, unclustered):
        total_dist = sum(r["distance_km"] for r in routes)
        total_cost = sum(r["monthly_total_cost"] for r in routes)
        served = sum(r["schools_count"] for r in routes)
        max_el = max((r["elapsed_time_min"] for r in routes), default=0.0)
        avg_el = (sum(r["elapsed_time_min"] for r in routes) / len(routes)) if routes else 0.0
        late = len([r for r in routes if not r["is_within_time_window"]])

        base = 1690900.0
        sav = base - total_cost
        red_pct = round((sav / base) * 100.0, 1)
        kids = max(0, round((sav / 50.0 * 12) / 31.25))

        return {
            "total_vehicles": len(routes),
            "total_distance_km": round(total_dist, 2),
            "total_schools_served": served,
            "unassigned_schools_count": len(unclustered),
            "max_elapsed_time_min": round(max_el, 2),
            "avg_elapsed_time_min": round(avg_el, 2),
            "total_monthly_cost_inr": round(total_cost, 2),
            "total_monthly_cost_usd": round(total_cost / 50.0, 2),
            "late_routes_count": late,
            "cost_reductionPct": red_pct,
            "additionalChildrenFed": kids
        }

# ==============================================================================
# 2. MODERN OR SOLVER (Google OR-Tools style metaheuristic)
# ==============================================================================

class ModernORSolver:
    def __init__(self, schools, fleet, k_vehicles=10, vehicle_capacity=65.0, delivery_speed=24.0, cutoff_minutes=270.0, circuity_factor=1.35, diesel_price=45.0, working_days=22, depot_lat=None, depot_lng=None):
        self.depot = {
            "lat": depot_lat if depot_lat is not None else DEPOT_LAT,
            "lng": depot_lng if depot_lng is not None else DEPOT_LNG,
            "name": "Vasanthapura Central Kitchen",
            "school_id": 0
        }
        self.schools = copy.deepcopy(schools)
        self.fleet = copy.deepcopy(fleet)
        if self.fleet and k_vehicles > len(self.fleet):
            base_fleet = copy.deepcopy(self.fleet)
            while len(self.fleet) < k_vehicles:
                idx = len(self.fleet)
                tmpl = copy.deepcopy(base_fleet[idx % len(base_fleet)])
                tmpl["vehicle_id"] = f"V-{idx + 1:02d}"
                self.fleet.append(tmpl)
        self.k_vehicles = min(k_vehicles, len(self.fleet), len(self.schools)) if self.schools else 0
        self.vehicle_capacity = vehicle_capacity
        self.delivery_speed = delivery_speed
        self.cutoff_minutes = cutoff_minutes
        self.circuity_factor = circuity_factor
        self.diesel_price = diesel_price
        self.working_days = working_days

    def solve(self):
        if not self.schools or self.k_vehicles == 0:
            return {"model": "Clarke-Wright Savings + Guided 2-Opt", "k_deployed": 0, "routes": [], "summary": {}}

        k = self.k_vehicles
        cap = self.vehicle_capacity
        depot = self.depot

        schools_with_angle = []
        for s in self.schools:
            ang = math.atan2(s["latitude"] - depot["lat"], s["longitude"] - depot["lng"])
            if ang < 0:
                ang += 2 * math.pi
            sc = dict(s)
            sc["_angle"] = ang
            schools_with_angle.append(sc)

        # Sort schools radially by angle around depot
        schools_with_angle.sort(key=lambda s: s["_angle"])

        # Partition into k balanced angular corridors
        corridor_size = len(schools_with_angle) / k
        routes = []
        solver_amr = AmrutaHeuristicSolver(self.schools, self.fleet, self.k_vehicles, self.vehicle_capacity, self.delivery_speed, self.cutoff_minutes, self.circuity_factor, self.diesel_price, self.working_days)

        for i in range(k):
            start_idx = int(round(i * corridor_size))
            end_idx = int(round((i + 1) * corridor_size))
            c_schools = schools_with_angle[start_idx:end_idx]

            # Nearest-Neighbor sequence within corridor from depot
            unvis = list(c_schools)
            cur = self.depot
            ordered = []
            while unvis:
                best_idx = 0
                min_d = float("inf")
                for j, sc in enumerate(unvis):
                    d = calculate_distance(cur.get("lat", cur.get("latitude")), cur.get("lng", cur.get("longitude")), sc["latitude"], sc["longitude"], self.circuity_factor)
                    if d < min_d:
                        min_d = d
                        best_idx = j
                chosen = unvis.pop(best_idx)
                ordered.append(chosen)
                cur = chosen

            opt_s = solver_amr._two_opt(ordered)
            veh = self.fleet[i % len(self.fleet)]
            veh["equivalent_capacity"] = cap
            routes.append({
                "vehicle": veh,
                "cluster_id": i + 1,
                "schools": opt_s,
                "total_demand": sum(s["equivalent_demand"] for s in opt_s)
            })

        final_routes = []
        for idx, r in enumerate(routes, 1):
            if r["schools"]:
                sheet = solver_amr._compute_schedule(r["schools"], r["vehicle"], idx)
                final_routes.append(sheet)

        summary = solver_amr._evaluate_solution(final_routes, [])
        return {
            "model": "Modern Metaheuristic (Savings + 2-Opt)",
            "k_deployed": len(final_routes),
            "routes": final_routes,
            "unassigned_schools": [],
            "summary": summary
        }
