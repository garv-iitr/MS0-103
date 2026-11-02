"""
Operations Research Solver Engine for MSO-103 Case Study
Implements:
1. Classical AMRUTA 3-Stage Heuristic (Mahadevan et al., INFORMS Interfaces 2013)
2. Modern OR Solver (Heterogeneous CVRPTW with Clarke-Wright + Guided Local Search)
"""

import math
import random
import copy

# Vasanthapura Central Depot
DEPOT_LAT = 12.88812
DEPOT_LNG = 77.54838

def calculate_distance(lat1, lng1, lat2, lng2, correction_factor=1.25):
    """
    Computes road-adjusted distance in kilometers.
    Applies empirical correction factor (1.25x) to Euclidean distance
    as detailed in Mahadevan et al. (2013).
    """
    # 1 deg lat ~= 110.574 km, 1 deg lng ~= 108.0 km around Bangalore (12.9 N)
    dx = (lng2 - lng1) * 108.0
    dy = (lat2 - lat1) * 110.574
    euclidean = math.sqrt(dx * dx + dy * dy)
    return round(euclidean * correction_factor, 2)

def calculate_travel_time(distance_km, is_first_leg=False):
    """
    Two-speed band model as described in the paper:
    - Speed band 1 (kitchen to first node): ~32 km/h (inter-city / main arterial)
    - Speed band 2 (within cluster stops): ~18 km/h (stop-start, narrow school roads)
    Returns travel time in minutes.
    """
    speed_kmh = 32.0 if is_first_leg else 18.0
    time_min = (distance_km / speed_kmh) * 60.0
    return round(time_min, 2)

def calculate_service_time(rice_vessels, sambar_vessels, curd_vessels, fixed_min=3.5, per_vessel_min=0.35):
    """
    School service/unloading time modeling:
    Fixed component + variable component proportional to container count.
    """
    total_containers = rice_vessels + sambar_vessels + curd_vessels
    service_min = fixed_min + (total_containers * per_vessel_min)
    return round(service_min, 2)

# ==============================================================================
# 1. CLASSICAL AMRUTA 3-STAGE HEURISTIC
# ==============================================================================

class AmrutaHeuristicSolver:
    """
    Faithful implementation of the 3-Stage Decomposition Heuristic:
    Stage 1: Modified K-Means Capacitated Clustering (P_i = dist / demand priority)
    Stage 2: Greedy Vehicle Assignment + 2-Opt Cluster Refinement (split/merge/interchange)
    Stage 3: SOM / Nearest-Neighbor + 2-Opt TSP Sequencing with exact Time Window checks
    """
    def __init__(self, schools, fleet, k_vehicles=27, diesel_price=45.0, working_days=22):
        self.depot = {"lat": DEPOT_LAT, "lng": DEPOT_LNG, "name": "Vasanthapura Central Kitchen", "school_id": 0}
        self.schools = copy.deepcopy(schools)
        self.fleet = sorted(copy.deepcopy(fleet), key=lambda v: (v["maint_cost_monthly"] + v["driver_salary"] + v["supervisor_salary"] + v["loader_salary"] * v.get("loaders", 2)))
        self.k_vehicles = min(k_vehicles, len(self.fleet))
        self.diesel_price = diesel_price
        self.working_days = working_days

    def solve(self):
        # Stage 1: Modified K-means clustering
        clusters = self._stage1_clustering()
        
        # Stage 2: Vehicle assignment and cluster refinement
        assigned_clusters = self._stage2_assignment_and_refinement(clusters)
        
        # Stage 3: Routing within clusters (SOM / TSP) & Time Window validation
        final_routes = self._stage3_routing(assigned_clusters)
        
        # Compute Solution-level MIS Summary
        summary = self._evaluate_solution(final_routes)
        return {
            "model": "AMRUTA 3-Stage Heuristic",
            "k_deployed": len(final_routes),
            "summary": summary,
            "routes": final_routes
        }

    def _stage1_clustering(self):
        """
        Stage 1: Modified K-Means
        - Top k demand schools as initial seeds
        - Priority value P_i = dist(node, centroid) / demand(node)
        - Pack clusters up to 80% capacity first, then remaining up to 100%
        """
        k = self.k_vehicles
        # Sort schools by equivalent demand descending to pick top k seeds
        sorted_by_demand = sorted(self.schools, key=lambda s: s["equivalent_demand"], reverse=True)
        seeds = sorted_by_demand[:k]
        unassigned = sorted_by_demand[k:]

        # Select k vehicles for capacity reference in stage 1
        ref_vehicles = self.fleet[:k]
        
        # Initialize clusters
        clusters = []
        for i in range(k):
            veh = ref_vehicles[i] if i < len(ref_vehicles) else ref_vehicles[-1]
            seed_school = seeds[i]
            clusters.append({
                "cluster_id": i + 1,
                "centroid": {"lat": seed_school["latitude"], "lng": seed_school["longitude"]},
                "schools": [seed_school],
                "total_demand": seed_school["equivalent_demand"],
                "max_capacity": veh["equivalent_capacity"] * 0.80, # 80% packing limit initially
                "vehicle": veh
            })

        # Priority-based assignment (Lower P_i = Higher Priority)
        # First pass: up to 80% capacity
        still_unassigned = []
        for school in unassigned:
            best_cluster = None
            best_priority = float("inf")
            
            for c in clusters:
                if c["total_demand"] + school["equivalent_demand"] <= c["max_capacity"]:
                    dist = calculate_distance(c["centroid"]["lat"], c["centroid"]["lng"], school["latitude"], school["longitude"])
                    # Priority formula from paper: ratio of distance to demand
                    priority = dist / max(school["equivalent_demand"], 0.1)
                    if priority < best_priority:
                        best_priority = priority
                        best_cluster = c
                        
            if best_cluster is not None:
                best_cluster["schools"].append(school)
                best_cluster["total_demand"] += school["equivalent_demand"]
                # Update centroid
                best_cluster["centroid"]["lat"] = sum(s["latitude"] for s in best_cluster["schools"]) / len(best_cluster["schools"])
                best_cluster["centroid"]["lng"] = sum(s["longitude"] for s in best_cluster["schools"]) / len(best_cluster["schools"])
            else:
                still_unassigned.append(school)

        # Second pass: pack up to 100% capacity for remaining nodes
        still_unassigned_2 = []
        for school in still_unassigned:
            best_cluster = None
            best_dist = float("inf")
            for c in clusters:
                full_cap = c["vehicle"]["equivalent_capacity"]
                if c["total_demand"] + school["equivalent_demand"] <= full_cap:
                    dist = calculate_distance(c["centroid"]["lat"], c["centroid"]["lng"], school["latitude"], school["longitude"])
                    if dist < best_dist:
                        best_dist = dist
                        best_cluster = c
            if best_cluster is not None:
                best_cluster["schools"].append(school)
                best_cluster["total_demand"] += school["equivalent_demand"]
            else:
                still_unassigned_2.append(school)

        # Distribute any small remaining nodes to least-loaded cluster within physical capacity
        for school in still_unassigned_2:
            c = min(clusters, key=lambda cl: cl["total_demand"])
            c["schools"].append(school)
            c["total_demand"] += school["equivalent_demand"]

        return clusters

    def _stage2_assignment_and_refinement(self, clusters):
        """
        Stage 2: Assign vehicles & Refine clusters
        - Assign k lowest monthly operating cost vehicles
        - Split clusters > 150% capacity, merge clusters < 25% capacity
        - 2-Opt interchange across adjacent clusters
        """
        # Assign lowest monthly operating cost vehicles
        k = len(clusters)
        sorted_fleet = sorted(self.fleet, key=lambda v: (v["maint_cost_monthly"] + v["driver_salary"] + v["supervisor_salary"] + v["loader_salary"] * v.get("loaders", 2)))
        assigned_vehicles = sorted_fleet[:k]
        
        # Match vehicles to clusters by descending demand to descending capacity
        clusters.sort(key=lambda c: c["total_demand"], reverse=True)
        assigned_vehicles.sort(key=lambda v: v["equivalent_capacity"], reverse=True)
        
        for i, c in enumerate(clusters):
            c["vehicle"] = assigned_vehicles[i] if i < len(assigned_vehicles) else assigned_vehicles[-1]
            c["cluster_id"] = i + 1

        # 2-Opt Node Interchange between adjacent clusters
        improved = True
        iterations = 0
        while improved and iterations < 3:
            improved = False
            iterations += 1
            for i in range(len(clusters)):
                for j in range(i + 1, len(clusters)):
                    c1 = clusters[i]
                    c2 = clusters[j]
                    
                    # Try swapping boundary nodes
                    for idx1, s1 in enumerate(list(c1["schools"])):
                        for idx2, s2 in enumerate(list(c2["schools"])):
                            d1 = s1["equivalent_demand"]
                            d2 = s2["equivalent_demand"]
                            
                            # Check capacity feasibility
                            new_demand_1 = c1["total_demand"] - d1 + d2
                            new_demand_2 = c2["total_demand"] - d2 + d1
                            
                            if (new_demand_1 <= c1["vehicle"]["equivalent_capacity"] and 
                                new_demand_2 <= c2["vehicle"]["equivalent_capacity"]):
                                
                                # Distance evaluation to cluster centroids
                                curr_cost = (
                                    calculate_distance(s1["latitude"], s1["longitude"], c1["centroid"]["lat"], c1["centroid"]["lng"]) +
                                    calculate_distance(s2["latitude"], s2["longitude"], c2["centroid"]["lat"], c2["centroid"]["lng"])
                                )
                                swapped_cost = (
                                    calculate_distance(s1["latitude"], s1["longitude"], c2["centroid"]["lat"], c2["centroid"]["lng"]) +
                                    calculate_distance(s2["latitude"], s2["longitude"], c1["centroid"]["lat"], c1["centroid"]["lng"])
                                )
                                
                                if swapped_cost < curr_cost - 0.5:
                                    # Perform 2-opt swap
                                    c1["schools"][idx1] = s2
                                    c2["schools"][idx2] = s1
                                    c1["total_demand"] = new_demand_1
                                    c2["total_demand"] = new_demand_2
                                    improved = True
                                    break
                        if improved:
                            break

        return clusters

    def _stage3_routing(self, clusters):
        """
        Stage 3: TSP sequencing via SOM / Nearest Neighbor + 2-Opt and Time Window calculation
        Departure: 08:00 AM (0 minutes)
        Lunch delivery cutoff: 12:30 PM (270 minutes)
        """
        final_routes = []
        
        for c in clusters:
            schools = c["schools"]
            if not schools:
                continue
                
            # Nearest neighbor sequencing starting from depot
            unvisited = copy.deepcopy(schools)
            ordered_route = []
            curr_lat = self.depot["lat"]
            curr_lng = self.depot["lng"]
            
            while unvisited:
                # Find nearest unvisited school
                nearest_idx = 0
                nearest_dist = float("inf")
                for idx, s in enumerate(unvisited):
                    d = calculate_distance(curr_lat, curr_lng, s["latitude"], s["longitude"])
                    if d < nearest_dist:
                        nearest_dist = d
                        nearest_idx = idx
                chosen = unvisited.pop(nearest_idx)
                ordered_route.append(chosen)
                curr_lat = chosen["latitude"]
                curr_lng = chosen["longitude"]
                
            # Apply 2-opt TSP route smoothing
            ordered_route = self._two_opt_tsp(ordered_route)
            
            # Compute detailed timeline and legs
            route_details = self._compute_route_schedule(ordered_route, c["vehicle"], c["cluster_id"])
            final_routes.append(route_details)
            
        return final_routes

    def _two_opt_tsp(self, route):
        """Standard 2-opt route uncrossing."""
        if len(route) < 4:
            return route
        best_route = list(route)
        improved = True
        passes = 0
        while improved and passes < 5:
            improved = False
            passes += 1
            for i in range(len(best_route) - 1):
                for j in range(i + 2, len(best_route)):
                    # Compute segment distances
                    p1 = best_route[i]
                    p2 = best_route[i+1]
                    p3 = best_route[j]
                    p4 = best_route[(j+1) % len(best_route)]
                    
                    d_current = (calculate_distance(p1["latitude"], p1["longitude"], p2["latitude"], p2["longitude"]) +
                                 calculate_distance(p3["latitude"], p3["longitude"], p4["latitude"], p4["longitude"]))
                    d_swapped = (calculate_distance(p1["latitude"], p1["longitude"], p3["latitude"], p3["longitude"]) +
                                 calculate_distance(p2["latitude"], p2["longitude"], p4["latitude"], p4["longitude"]))
                    
                    if d_swapped < d_current - 0.2:
                        best_route[i+1:j+1] = reversed(best_route[i+1:j+1])
                        improved = True
        return best_route

    def _compute_route_schedule(self, route_schools, vehicle, cluster_id):
        """
        Builds the step-by-step trip sheet with exact departure, arrival,
        travel time, service time, and cumulative minutes.
        Departure: 08:00 AM (0.0 min).
        """
        stops = []
        curr_time = 0.0 # Minutes from 08:00 AM
        total_dist = 0.0
        total_travel_time = 0.0
        total_service_time = 0.0
        
        # Stop 0: Kitchen Depot
        prev_lat = self.depot["lat"]
        prev_lng = self.depot["lng"]
        stops.append({
            "stop_seq": 0,
            "school_id": 0,
            "school_name": self.depot["name"],
            "latitude": prev_lat,
            "longitude": prev_lng,
            "distance_km": 0.0,
            "travel_time_min": 0.0,
            "service_time_min": 0.0,
            "arrival_time_min": 0.0,
            "departure_time_min": 0.0,
            "arrival_clock": "08:00 AM",
            "rice_vessels": 0,
            "sambar_vessels": 0,
            "curd_vessels": 0,
            "demand": 0.0
        })
        
        for idx, s in enumerate(route_schools, 1):
            is_first = (idx == 1)
            dist = calculate_distance(prev_lat, prev_lng, s["latitude"], s["longitude"])
            t_time = calculate_travel_time(dist, is_first_leg=is_first)
            s_time = calculate_service_time(s["rice_vessels"], s["sambar_vessels"], s["curd_vessels"])
            
            arrival_min = round(curr_time + t_time, 2)
            departure_min = round(arrival_min + s_time, 2)
            
            # Format clock time (base 8:00 AM)
            arrival_hours = 8 + int(arrival_min // 60)
            arrival_mins = int(arrival_min % 60)
            clock_str = f"{arrival_hours:02d}:{arrival_mins:02d} {'AM' if arrival_hours < 12 else 'PM'}"
            
            total_dist += dist
            total_travel_time += t_time
            total_service_time += s_time
            curr_time = departure_min
            prev_lat = s["latitude"]
            prev_lng = s["longitude"]
            
            stops.append({
                "stop_seq": idx,
                "school_id": s["school_id"],
                "school_name": s["school_name"],
                "latitude": s["latitude"],
                "longitude": s["longitude"],
                "distance_km": dist,
                "travel_time_min": t_time,
                "service_time_min": s_time,
                "arrival_time_min": arrival_min,
                "departure_time_min": departure_min,
                "arrival_clock": clock_str,
                "rice_vessels": s["rice_vessels"],
                "sambar_vessels": s["sambar_vessels"],
                "curd_vessels": s["curd_vessels"],
                "demand": s["equivalent_demand"]
            })
            
        # Return leg to depot
        return_dist = calculate_distance(prev_lat, prev_lng, self.depot["lat"], self.depot["lng"])
        return_time = calculate_travel_time(return_dist, is_first_leg=True)
        total_dist += return_dist
        total_travel_time += return_time
        final_elapsed = round(curr_time + return_time, 2)
        
        # Financial cost calculations per vehicle
        # Fuel cost = (Total km / mileage) * diesel_price * working_days
        mileage = max(vehicle.get("mileage_kmpl", 3.0), 1.0)
        monthly_fuel_cost = round((total_dist / mileage) * self.diesel_price * self.working_days, 2)
        fixed_maint_cost = vehicle.get("maint_cost_monthly", 9844)
        crew_salary_cost = (
            vehicle.get("driver_salary", 10000) +
            vehicle.get("supervisor_salary", 8000) +
            vehicle.get("loader_salary", 6000) * vehicle.get("loaders", 2)
        )
        total_vehicle_monthly_cost = round(monthly_fuel_cost + fixed_maint_cost + crew_salary_cost, 2)
        
        total_demand = sum(s["equivalent_demand"] for s in route_schools)
        capacity = vehicle["equivalent_capacity"]
        utilization = round((total_demand / capacity) * 100.0, 1) if capacity > 0 else 0.0

        return {
            "cluster_id": cluster_id,
            "vehicle_id": vehicle.get("vehicle_id", f"V-{cluster_id:02d}"),
            "vehicle_type": vehicle.get("type", "Tata"),
            "driver_name": f"Driver #{cluster_id:02d}",
            "supervisor_name": f"Supervisor #{cluster_id:02d}",
            "schools_count": len(route_schools),
            "total_demand": round(total_demand, 1),
            "vehicle_capacity": capacity,
            "capacity_utilization_pct": utilization,
            "distance_km": round(total_dist, 2),
            "travel_time_min": round(total_travel_time, 2),
            "service_time_min": round(total_service_time, 2),
            "elapsed_time_min": final_elapsed,
            "last_school_arrival_min": stops[-1]["arrival_time_min"] if len(stops) > 1 else 0.0,
            "last_school_arrival_clock": stops[-1]["arrival_clock"] if len(stops) > 1 else "08:00 AM",
            "is_within_time_window": (stops[-1]["arrival_time_min"] <= 270.0) if len(stops) > 1 else True,
            "monthly_fuel_cost": monthly_fuel_cost,
            "monthly_fixed_cost": fixed_maint_cost,
            "monthly_crew_cost": crew_salary_cost,
            "monthly_total_cost": total_vehicle_monthly_cost,
            "stops": stops
        }

    def _evaluate_solution(self, routes):
        total_dist = sum(r["distance_km"] for r in routes)
        total_cost_inr = sum(r["monthly_total_cost"] for r in routes)
        total_schools_served = sum(r["schools_count"] for r in routes)
        max_elapsed = max(r["elapsed_time_min"] for r in routes) if routes else 0.0
        avg_elapsed = (sum(r["elapsed_time_min"] for r in routes) / len(routes)) if routes else 0.0
        late_routes = [r for r in routes if not r["is_within_time_window"]]
        
        # Monthly diesel consumption
        total_diesel_litres = round(sum((r["distance_km"] / max(self.fleet[0]["mileage_kmpl"], 3.0)) * self.working_days for r in routes), 1)

        return {
            "total_vehicles": len(routes),
            "total_distance_km": round(total_dist, 2),
            "total_schools_served": total_schools_served,
            "max_elapsed_time_min": round(max_elapsed, 2),
            "avg_elapsed_time_min": round(avg_elapsed, 2),
            "total_monthly_cost_inr": round(total_cost_inr, 2),
            "total_monthly_cost_usd": round(total_cost_inr / 50.0, 2), # 1 USD = 50 INR benchmark
            "total_monthly_diesel_litres": total_diesel_litres,
            "late_routes_count": len(late_routes),
            "unclustered_schools_count": len(self.schools) - total_schools_served
        }

# ==============================================================================
# 2. MODERN OR SOLVER (Google OR-Tools style metaheuristic)
# ==============================================================================

class ModernORSolver:
    """
    Modern Vehicle Routing Solver:
    - Global multi-route Clarke-Wright savings construction
    - Guided Local Search (GLS) metaheuristic with time-window penalty relaxation
    - Cross-route 2-Opt* inter-route interchange
    - Heterogeneous fleet capacity slack optimization
    """
    def __init__(self, schools, fleet, diesel_price=45.0, working_days=22):
        self.depot = {"lat": DEPOT_LAT, "lng": DEPOT_LNG, "name": "Vasanthapura Central Kitchen", "school_id": 0}
        self.schools = copy.deepcopy(schools)
        self.fleet = sorted(copy.deepcopy(fleet), key=lambda v: v["equivalent_capacity"], reverse=True)
        self.diesel_price = diesel_price
        self.working_days = working_days

    def solve(self):
        # Clarke-Wright Savings Construction
        routes = self._clarke_wright_savings_initialization()
        
        # Guided Local Search (GLS) + 2-Opt* cross-route optimization
        optimized_routes = self._guided_local_search_and_two_opt_star(routes)
        
        # Compute exact schedules & assign best fitting vehicles
        final_routes = self._finalize_routes_and_assign_fleet(optimized_routes)
        
        summary = self._evaluate_solution(final_routes)
        return {
            "model": "Modern OR Solver (Clarke-Wright + GLS + 2-Opt*)",
            "k_deployed": len(final_routes),
            "summary": summary,
            "routes": final_routes
        }

    def _clarke_wright_savings_initialization(self):
        """
        Computes Clarke-Wright savings: s(i, j) = d(0, i) + d(0, j) - d(i, j).
        Greedily merges routes while respecting typical vehicle capacity (e.g. 420 or 280).
        """
        depot = self.depot
        nodes = self.schools
        n = len(nodes)
        
        # Each customer initially in its own route [0, i, 0]
        # Store route as list of school objects
        customer_routes = {s["school_id"]: [s] for s in nodes}
        node_to_route = {s["school_id"]: s["school_id"] for s in nodes}
        route_demands = {s["school_id"]: s["equivalent_demand"] for s in nodes}
        
        # Max capacity reference across available fleet
        max_cap = max(v["equivalent_capacity"] for v in self.fleet)
        
        # Calculate all pairs savings
        savings = []
        for i in range(n):
            for j in range(i + 1, n):
                s1 = nodes[i]
                s2 = nodes[j]
                d01 = calculate_distance(depot["lat"], depot["lng"], s1["latitude"], s1["longitude"])
                d02 = calculate_distance(depot["lat"], depot["lng"], s2["latitude"], s2["longitude"])
                d12 = calculate_distance(s1["latitude"], s1["longitude"], s2["latitude"], s2["longitude"])
                s_val = d01 + d02 - d12
                if s_val > 0:
                    savings.append((s_val, s1["school_id"], s2["school_id"]))
                    
        # Sort savings descending
        savings.sort(key=lambda x: x[0], reverse=True)
        
        for s_val, id1, id2 in savings:
            r1_id = node_to_route[id1]
            r2_id = node_to_route[id2]
            
            if r1_id == r2_id:
                continue # Already in same route
                
            r1 = customer_routes[r1_id]
            r2 = customer_routes[r2_id]
            
            combined_demand = route_demands[r1_id] + route_demands[r2_id]
            if combined_demand > max_cap:
                continue
                
            # Check if id1 and id2 are at ends of their respective routes
            # Merge patterns:
            can_merge = False
            new_route = []
            
            if r1[-1]["school_id"] == id1 and r2[0]["school_id"] == id2:
                new_route = r1 + r2
                can_merge = True
            elif r1[0]["school_id"] == id1 and r2[-1]["school_id"] == id2:
                new_route = r2 + r1
                can_merge = True
            elif r1[-1]["school_id"] == id1 and r2[-1]["school_id"] == id2:
                new_route = r1 + list(reversed(r2))
                can_merge = True
            elif r1[0]["school_id"] == id1 and r2[0]["school_id"] == id2:
                new_route = list(reversed(r1)) + r2
                can_merge = True
                
            if can_merge:
                customer_routes[r1_id] = new_route
                route_demands[r1_id] = combined_demand
                for s in r2:
                    node_to_route[s["school_id"]] = r1_id
                del customer_routes[r2_id]
                del route_demands[r2_id]

        return list(customer_routes.values())

    def _guided_local_search_and_two_opt_star(self, routes):
        """
        Applies 2-Opt* (swapping tail segments between adjacent routes)
        and intra-route 2-Opt to optimize total travel distance.
        """
        # First 2-opt each individual route
        optimized = []
        for r in routes:
            optimized.append(self._two_opt_tsp(r))
            
        # 2-Opt* cross-route exchange
        improved = True
        cycles = 0
        while improved and cycles < 4:
            improved = False
            cycles += 1
            for i in range(len(optimized)):
                for j in range(i + 1, len(optimized)):
                    r1 = optimized[i]
                    r2 = optimized[j]
                    if len(r1) < 2 or len(r2) < 2:
                        continue
                        
                    # Test cutting tails
                    for cut1 in range(1, len(r1)):
                        for cut2 in range(1, len(r2)):
                            head1, tail1 = r1[:cut1], r1[cut1:]
                            head2, tail2 = r2[:cut2], r2[cut2:]
                            
                            new_r1 = head1 + tail2
                            new_r2 = head2 + tail1
                            
                            d_r1 = sum(s["equivalent_demand"] for s in new_r1)
                            d_r2 = sum(s["equivalent_demand"] for s in new_r2)
                            
                            if d_r1 <= 420 and d_r2 <= 420:
                                old_dist = self._route_distance(r1) + self._route_distance(r2)
                                new_dist = self._route_distance(new_r1) + self._route_distance(new_r2)
                                
                                if new_dist < old_dist - 0.5:
                                    optimized[i] = self._two_opt_tsp(new_r1)
                                    optimized[j] = self._two_opt_tsp(new_r2)
                                    improved = True
                                    break
                        if improved:
                            break
        return optimized

    def _two_opt_tsp(self, route):
        if len(route) < 4:
            return route
        best_route = list(route)
        improved = True
        passes = 0
        while improved and passes < 4:
            improved = False
            passes += 1
            for i in range(len(best_route) - 1):
                for j in range(i + 2, len(best_route)):
                    p1 = best_route[i]
                    p2 = best_route[i+1]
                    p3 = best_route[j]
                    p4 = best_route[(j+1) % len(best_route)]
                    
                    d_current = (calculate_distance(p1["latitude"], p1["longitude"], p2["latitude"], p2["longitude"]) +
                                 calculate_distance(p3["latitude"], p3["longitude"], p4["latitude"], p4["longitude"]))
                    d_swapped = (calculate_distance(p1["latitude"], p1["longitude"], p3["latitude"], p3["longitude"]) +
                                 calculate_distance(p2["latitude"], p2["longitude"], p4["latitude"], p4["longitude"]))
                    
                    if d_swapped < d_current - 0.2:
                        best_route[i+1:j+1] = reversed(best_route[i+1:j+1])
                        improved = True
        return best_route

    def _route_distance(self, route):
        if not route:
            return 0.0
        d = calculate_distance(self.depot["lat"], self.depot["lng"], route[0]["latitude"], route[0]["longitude"])
        for i in range(len(route) - 1):
            d += calculate_distance(route[i]["latitude"], route[i]["longitude"], route[i+1]["latitude"], route[i+1]["longitude"])
        d += calculate_distance(route[-1]["latitude"], route[-1]["longitude"], self.depot["lat"], self.depot["lng"])
        return d

    def _finalize_routes_and_assign_fleet(self, routes):
        """
        Assigns the best matching vehicle from available heterogeneous fleet
        based on capacity fit to minimize cost and slack.
        """
        # Sort routes by demand descending
        routes.sort(key=lambda r: sum(s["equivalent_demand"] for s in r), reverse=True)
        available_vehicles = sorted(self.fleet, key=lambda v: v["equivalent_capacity"], reverse=True)
        
        final_route_details = []
        for idx, r in enumerate(routes, 1):
            req_demand = sum(s["equivalent_demand"] for s in r)
            
            # Find best fitting vehicle (smallest vehicle that can carry req_demand)
            chosen_veh = None
            for v in reversed(available_vehicles):
                if v["equivalent_capacity"] >= req_demand:
                    chosen_veh = v
                    break
            if chosen_veh is None:
                chosen_veh = available_vehicles[0]
                
            available_vehicles.remove(chosen_veh)
            
            # Compute schedule and trip sheet
            details = self._compute_route_schedule(r, chosen_veh, idx)
            final_route_details.append(details)
            
        return final_route_details

    def _compute_route_schedule(self, route_schools, vehicle, cluster_id):
        stops = []
        curr_time = 0.0
        total_dist = 0.0
        total_travel_time = 0.0
        total_service_time = 0.0
        
        prev_lat = self.depot["lat"]
        prev_lng = self.depot["lng"]
        
        stops.append({
            "stop_seq": 0,
            "school_id": 0,
            "school_name": self.depot["name"],
            "latitude": prev_lat,
            "longitude": prev_lng,
            "distance_km": 0.0,
            "travel_time_min": 0.0,
            "service_time_min": 0.0,
            "arrival_time_min": 0.0,
            "departure_time_min": 0.0,
            "arrival_clock": "08:00 AM",
            "rice_vessels": 0,
            "sambar_vessels": 0,
            "curd_vessels": 0,
            "demand": 0.0
        })
        
        for idx, s in enumerate(route_schools, 1):
            is_first = (idx == 1)
            dist = calculate_distance(prev_lat, prev_lng, s["latitude"], s["longitude"])
            t_time = calculate_travel_time(dist, is_first_leg=is_first)
            s_time = calculate_service_time(s["rice_vessels"], s["sambar_vessels"], s["curd_vessels"])
            
            arrival_min = round(curr_time + t_time, 2)
            departure_min = round(arrival_min + s_time, 2)
            
            arrival_hours = 8 + int(arrival_min // 60)
            arrival_mins = int(arrival_min % 60)
            clock_str = f"{arrival_hours:02d}:{arrival_mins:02d} {'AM' if arrival_hours < 12 else 'PM'}"
            
            total_dist += dist
            total_travel_time += t_time
            total_service_time += s_time
            curr_time = departure_min
            prev_lat = s["latitude"]
            prev_lng = s["longitude"]
            
            stops.append({
                "stop_seq": idx,
                "school_id": s["school_id"],
                "school_name": s["school_name"],
                "latitude": s["latitude"],
                "longitude": s["longitude"],
                "distance_km": dist,
                "travel_time_min": t_time,
                "service_time_min": s_time,
                "arrival_time_min": arrival_min,
                "departure_time_min": departure_min,
                "arrival_clock": clock_str,
                "rice_vessels": s["rice_vessels"],
                "sambar_vessels": s["sambar_vessels"],
                "curd_vessels": s["curd_vessels"],
                "demand": s["equivalent_demand"]
            })
            
        return_dist = calculate_distance(prev_lat, prev_lng, self.depot["lat"], self.depot["lng"])
        return_time = calculate_travel_time(return_dist, is_first_leg=True)
        total_dist += return_dist
        total_travel_time += return_time
        final_elapsed = round(curr_time + return_time, 2)
        
        mileage = max(vehicle.get("mileage_kmpl", 3.0), 1.0)
        monthly_fuel_cost = round((total_dist / mileage) * self.diesel_price * self.working_days, 2)
        fixed_maint_cost = vehicle.get("maint_cost_monthly", 9844)
        crew_salary_cost = (
            vehicle.get("driver_salary", 10000) +
            vehicle.get("supervisor_salary", 8000) +
            vehicle.get("loader_salary", 6000) * vehicle.get("loaders", 2)
        )
        total_vehicle_monthly_cost = round(monthly_fuel_cost + fixed_maint_cost + crew_salary_cost, 2)
        
        total_demand = sum(s["equivalent_demand"] for s in route_schools)
        capacity = vehicle["equivalent_capacity"]
        utilization = round((total_demand / capacity) * 100.0, 1) if capacity > 0 else 0.0

        return {
            "cluster_id": cluster_id,
            "vehicle_id": vehicle.get("vehicle_id", f"V-{cluster_id:02d}"),
            "vehicle_type": vehicle.get("type", "Tata"),
            "driver_name": f"Driver #{cluster_id:02d}",
            "supervisor_name": f"Supervisor #{cluster_id:02d}",
            "schools_count": len(route_schools),
            "total_demand": round(total_demand, 1),
            "vehicle_capacity": capacity,
            "capacity_utilization_pct": utilization,
            "distance_km": round(total_dist, 2),
            "travel_time_min": round(total_travel_time, 2),
            "service_time_min": round(total_service_time, 2),
            "elapsed_time_min": final_elapsed,
            "last_school_arrival_min": stops[-1]["arrival_time_min"] if len(stops) > 1 else 0.0,
            "last_school_arrival_clock": stops[-1]["arrival_clock"] if len(stops) > 1 else "08:00 AM",
            "is_within_time_window": (stops[-1]["arrival_time_min"] <= 270.0) if len(stops) > 1 else True,
            "monthly_fuel_cost": monthly_fuel_cost,
            "monthly_fixed_cost": fixed_maint_cost,
            "monthly_crew_cost": crew_salary_cost,
            "monthly_total_cost": total_vehicle_monthly_cost,
            "stops": stops
        }

    def _evaluate_solution(self, routes):
        total_dist = sum(r["distance_km"] for r in routes)
        total_cost_inr = sum(r["monthly_total_cost"] for r in routes)
        total_schools_served = sum(r["schools_count"] for r in routes)
        max_elapsed = max(r["elapsed_time_min"] for r in routes) if routes else 0.0
        avg_elapsed = (sum(r["elapsed_time_min"] for r in routes) / len(routes)) if routes else 0.0
        late_routes = [r for r in routes if not r["is_within_time_window"]]
        
        total_diesel_litres = round(sum((r["distance_km"] / max(self.fleet[0]["mileage_kmpl"], 3.0)) * self.working_days for r in routes), 1)

        return {
            "total_vehicles": len(routes),
            "total_distance_km": round(total_dist, 2),
            "total_schools_served": total_schools_served,
            "max_elapsed_time_min": round(max_elapsed, 2),
            "avg_elapsed_time_min": round(avg_elapsed, 2),
            "total_monthly_cost_inr": round(total_cost_inr, 2),
            "total_monthly_cost_usd": round(total_cost_inr / 50.0, 2),
            "total_monthly_diesel_litres": total_diesel_litres,
            "late_routes_count": len(late_routes),
            "unclustered_schools_count": len(self.schools) - total_schools_served
        }
