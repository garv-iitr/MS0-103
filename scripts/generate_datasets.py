import csv
import json
import math
import random

# Seed for reproducible realistic coordinates centered around Bangalore South & Vasanthapura
random.seed(42)

# Vasanthapura Depot GPS Coordinates
DEPOT = {
    "name": "TAPF Central Kitchen (Vasanthapura)",
    "lat": 12.88812,
    "lng": 77.54838,
    "address": "Vasanthapura, Subramanyapura Post, South Bangalore, Karnataka 560061"
}

# 1. Generate Fleet Data (Table 1b)
fleet_data = [
    # Eicher (9 vehicles, index 1..9)
    *[{"vehicle_id": f"EICHER-{i:02d}", "type": "Eicher", "rack_bottom": 60, "rack_middle": 60, "rack_top": 60, "mileage_kmpl": 3.0, "equivalent_capacity": 420, "maint_cost_monthly": 7472, "drivers": 1, "supervisors": 1, "loaders": 2, "driver_salary": 10000, "supervisor_salary": 8000, "loader_salary": 6000} for i in range(1, 10)],
    # Tata (11 vehicles, index 1..11)
    *[{"vehicle_id": f"TATA-{i:02d}", "type": "Tata", "rack_bottom": 60, "rack_middle": 60, "rack_top": 60, "mileage_kmpl": 3.0, "equivalent_capacity": 420, "maint_cost_monthly": 10723, "drivers": 1, "supervisors": 1, "loaders": 2, "driver_salary": 10000, "supervisor_salary": 8000, "loader_salary": 6000} for i in range(1, 12)],
    # Load King (5 vehicles, index 1..5)
    *[{"vehicle_id": f"LOADKING-{i:02d}", "type": "Load King", "rack_bottom": 40, "rack_middle": 40, "rack_top": 40, "mileage_kmpl": 4.0, "equivalent_capacity": 280, "maint_cost_monthly": 9844, "drivers": 1, "supervisors": 1, "loaders": 2, "driver_salary": 10000, "supervisor_salary": 8000, "loader_salary": 6000} for i in range(1, 6)],
    # Swaraj Mazda (5 vehicles, index 1..5)
    *[{"vehicle_id": f"SWARAJ-{i:02d}", "type": "Swaraj Mazda", "rack_bottom": 40, "rack_middle": 40, "rack_top": 40, "mileage_kmpl": 4.0, "equivalent_capacity": 280, "maint_cost_monthly": 9844, "drivers": 1, "supervisors": 1, "loaders": 2, "driver_salary": 10000, "supervisor_salary": 8000, "loader_salary": 6000} for i in range(1, 6)],
    # Max Pikup (5 vehicles, index 1..5)
    *[{"vehicle_id": f"MAXPIKUP-{i:02d}", "type": "Max Pikup", "rack_bottom": 24, "rack_middle": 24, "rack_top": 24, "mileage_kmpl": 6.0, "equivalent_capacity": 168, "maint_cost_monthly": 2825, "drivers": 1, "supervisors": 1, "loaders": 1, "driver_salary": 10000, "supervisor_salary": 8000, "loader_salary": 6000} for i in range(1, 6)]
]

with open('data/fleet_config.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=list(fleet_data[0].keys()))
    writer.writeheader()
    writer.writerows(fleet_data)

print(f"Generated fleet_config.csv with {len(fleet_data)} vehicles.")

# 2. Table 3 Benchmark Targets for the 27 Clusters
CLUSTER_BENCHMARKS = [
    {"cluster_id": 1, "schools_count": 15, "demand": 122, "dist": 72.80, "travel_time": 136.97, "service_time": 57.00, "total_time": 193.97, "vehicle_type": "Max Pikup", "zone": "Kaggalipura / Harohalli"},
    {"cluster_id": 2, "schools_count": 34, "demand": 337, "dist": 42.33, "travel_time": 77.53, "service_time": 125.00, "total_time": 202.53, "vehicle_type": "Tata", "zone": "Jayanagar / JP Nagar"},
    {"cluster_id": 3, "schools_count": 24, "demand": 224, "dist": 76.87, "travel_time": 148.31, "service_time": 95.00, "total_time": 243.31, "vehicle_type": "Swaraj Mazda", "zone": "Thavarekere / Magadi Road"},
    {"cluster_id": 4, "schools_count": 34, "demand": 296, "dist": 56.82, "travel_time": 102.59, "service_time": 113.25, "total_time": 215.84, "vehicle_type": "Tata", "zone": "Wilson Garden / Audugodi"},
    {"cluster_id": 5, "schools_count": 23, "demand": 208, "dist": 28.73, "travel_time": 55.24, "service_time": 79.00, "total_time": 134.24, "vehicle_type": "Swaraj Mazda", "zone": "Uttarahalli / Chikkalasandra"},
    {"cluster_id": 6, "schools_count": 14, "demand": 188, "dist": 24.79, "travel_time": 52.25, "service_time": 55.75, "total_time": 108.00, "vehicle_type": "Swaraj Mazda", "zone": "Konanakunte / Puttenahalli / Sarakki"},
    {"cluster_id": 7, "schools_count": 19, "demand": 277, "dist": 64.86, "travel_time": 130.62, "service_time": 73.50, "total_time": 204.12, "vehicle_type": "Swaraj Mazda", "zone": "Sarjapura Road / Carmelaram"},
    {"cluster_id": 8, "schools_count": 5, "demand": 84, "dist": 37.50, "travel_time": 71.61, "service_time": 23.25, "total_time": 94.86, "vehicle_type": "Max Pikup", "zone": "Somanahalli / Gabbadi"},
    {"cluster_id": 9, "schools_count": 23, "demand": 340, "dist": 51.16, "travel_time": 99.91, "service_time": 95.25, "total_time": 195.16, "vehicle_type": "Tata", "zone": "Mudalapalya / Vijayanagar"},
    {"cluster_id": 10, "schools_count": 6, "demand": 78, "dist": 43.12, "travel_time": 71.67, "service_time": 26.00, "total_time": 97.67, "vehicle_type": "Max Pikup", "zone": "P Agrahara Rural"},
    {"cluster_id": 11, "schools_count": 27, "demand": 295, "dist": 66.37, "travel_time": 139.17, "service_time": 107.50, "total_time": 246.67, "vehicle_type": "Tata", "zone": "Domlur / Austin Town"},
    {"cluster_id": 12, "schools_count": 14, "demand": 199, "dist": 91.48, "travel_time": 154.95, "service_time": 62.75, "total_time": 217.70, "vehicle_type": "Swaraj Mazda", "zone": "Whitefield Outer Corridor"},
    {"cluster_id": 13, "schools_count": 32, "demand": 307, "dist": 57.71, "travel_time": 111.63, "service_time": 98.50, "total_time": 210.13, "vehicle_type": "Tata", "zone": "HAL / Marathahalli"},
    {"cluster_id": 14, "schools_count": 13, "demand": 189, "dist": 94.05, "travel_time": 162.23, "service_time": 58.75, "total_time": 220.98, "vehicle_type": "Load King", "zone": "Varthur / Gunjur Rural"},
    {"cluster_id": 15, "schools_count": 19, "demand": 240, "dist": 32.59, "travel_time": 59.58, "service_time": 73.75, "total_time": 133.33, "vehicle_type": "Load King", "zone": "Banashankari 2nd & 3rd Stage"},
    {"cluster_id": 16, "schools_count": 25, "demand": 367, "dist": 48.10, "travel_time": 95.97, "service_time": 103.75, "total_time": 199.72, "vehicle_type": "Tata", "zone": "Akkipet / Cottonpet / City Market"},
    {"cluster_id": 17, "schools_count": 28, "demand": 292, "dist": 32.05, "travel_time": 64.39, "service_time": 104.50, "total_time": 168.89, "vehicle_type": "Tata", "zone": "Basavanagudi / Hanumanthanagar"},
    {"cluster_id": 18, "schools_count": 35, "demand": 321, "dist": 41.71, "travel_time": 77.80, "service_time": 106.75, "total_time": 184.55, "vehicle_type": "Tata", "zone": "Koramangala / BTM Layout"},
    {"cluster_id": 19, "schools_count": 3, "demand": 34, "dist": 15.70, "travel_time": 26.15, "service_time": 13.00, "total_time": 39.15, "vehicle_type": "Max Pikup", "zone": "Subramanyapura Local"},
    {"cluster_id": 20, "schools_count": 5, "demand": 84, "dist": 21.17, "travel_time": 36.07, "service_time": 17.25, "total_time": 53.32, "vehicle_type": "Max Pikup", "zone": "Kothnur / Gottigere"},
    {"cluster_id": 21, "schools_count": 6, "demand": 96, "dist": 30.90, "travel_time": 55.13, "service_time": 24.75, "total_time": 79.88, "vehicle_type": "Load King", "zone": "Anjanapura / Hulimavu"},
    {"cluster_id": 22, "schools_count": 20, "demand": 219, "dist": 50.17, "travel_time": 97.09, "service_time": 78.25, "total_time": 175.34, "vehicle_type": "Load King", "zone": "Bannerghatta / Jigani Link"},
    {"cluster_id": 23, "schools_count": 17, "demand": 191, "dist": 83.87, "travel_time": 147.57, "service_time": 63.25, "total_time": 210.82, "vehicle_type": "Load King", "zone": "Anekal / Attibele Border"},
    {"cluster_id": 24, "schools_count": 34, "demand": 355, "dist": 61.82, "travel_time": 112.12, "service_time": 128.50, "total_time": 240.62, "vehicle_type": "Tata", "zone": "K Upanagara / Rajajinagar"},
    {"cluster_id": 25, "schools_count": 25, "demand": 280, "dist": 69.19, "travel_time": 127.93, "service_time": 94.00, "total_time": 221.93, "vehicle_type": "Tata", "zone": "JB Nagara / Indiranagar"},
    {"cluster_id": 26, "schools_count": 19, "demand": 286, "dist": 14.75, "travel_time": 33.74, "service_time": 77.50, "total_time": 111.24, "vehicle_type": "Tata", "zone": "Padmanabhanagar / Kumaraswamy Layout"},
    {"cluster_id": 27, "schools_count": 10, "demand": 117, "dist": 14.49, "travel_time": 33.42, "service_time": 42.50, "total_time": 75.92, "vehicle_type": "Eicher", "zone": "Yellukunte / Arekere"}
]

# Write benchmark JSON
with open('data/vasanthapura_benchmark_metrics.json', 'w', encoding='utf-8') as f:
    json.dump({
        "kitchen": DEPOT,
        "clusters": CLUSTER_BENCHMARKS,
        "table2_summary": {
            "solution_20": {"vehicles": 20, "distance_km": 1195.69, "elapsed_min": 305.73, "cost_inr": 1106841, "cost_usd": 22137},
            "solution_27": {"vehicles": 27, "distance_km": 1325.11, "elapsed_min": 246.67, "cost_inr": 1376167, "cost_usd": 27523},
            "solution_35": {"vehicles": 35, "distance_km": 1538.00, "elapsed_min": 244.38, "cost_inr": 1739354, "cost_usd": 34787},
            "baseline_adhoc": {"vehicles": 35, "distance_km": 1400.00, "elapsed_min": 310.00, "cost_inr": 1690900, "cost_usd": 33818}
        }
    }, f, indent=2)

print("Generated vasanthapura_benchmark_metrics.json.")

# 3. Known schools from Table 1a and Figure 5
known_schools = [
    # Table 1a schools:
    {"name": "RV Girls HS—Jayanagar", "lat": 12.940608, "lng": 77.583289, "rice": 3.00, "sambar": 3.50, "curd": 0.75, "cluster_hint": 2},
    {"name": "CNS—Jayanagar", "lat": 12.942947, "lng": 77.583208, "rice": 0.13, "sambar": 0.13, "curd": 1.00, "cluster_hint": 2},
    {"name": "Parikrama—Jayanagar (P)", "lat": 12.941275, "lng": 77.585586, "rice": 2.50, "sambar": 3.00, "curd": 0.50, "cluster_hint": 2},
    {"name": "Rani HPS—Jayanagar", "lat": 12.938536, "lng": 77.585992, "rice": 5.00, "sambar": 5.00, "curd": 1.00, "cluster_hint": 2},
    {"name": "Rani HS—Jayanagar", "lat": 12.938536, "lng": 77.585992, "rice": 6.00, "sambar": 6.00, "curd": 1.00, "cluster_hint": 2},
    {"name": "SESS HPS—LalBhagh Siddapura", "lat": 12.946556, "lng": 77.591197, "rice": 0.75, "sambar": 0.75, "curd": 0.50, "cluster_hint": 4},
    {"name": "St. Andrees KHPS—L.Siddapura", "lat": 12.944728, "lng": 77.589717, "rice": 3.75, "sambar": 3.50, "curd": 0.75, "cluster_hint": 4},
    {"name": "GHPS—LalBhagh", "lat": 12.945567, "lng": 77.589019, "rice": 0.50, "sambar": 0.50, "curd": 0.30, "cluster_hint": 4},
    {"name": "s/c—Dayanada Nagar", "lat": 12.944206, "lng": 77.593283, "rice": 2.00, "sambar": 2.00, "curd": 0.50, "cluster_hint": 4},
    {"name": "Hombegowda BHS—W.Garden", "lat": 12.946958, "lng": 77.596081, "rice": 7.50, "sambar": 7.00, "curd": 1.00, "cluster_hint": 4},
    {"name": "GHPS—W.Garden", "lat": 12.948381, "lng": 77.596917, "rice": 1.50, "sambar": 1.50, "curd": 0.25, "cluster_hint": 4},
    {"name": "GHS—W.Garden", "lat": 12.948336, "lng": 77.596648, "rice": 3.00, "sambar": 3.00, "curd": 0.75, "cluster_hint": 4},
    {"name": "Gangamma GHS—W.Garden", "lat": 12.947819, "lng": 77.596018, "rice": 5.00, "sambar": 3.00, "curd": 1.00, "cluster_hint": 4},
    {"name": "CNS—Lakkasandra", "lat": 12.946944, "lng": 77.597778, "rice": 0.50, "sambar": 0.50, "curd": 0.50, "cluster_hint": 4},
    {"name": "CPS—Lakkasandra", "lat": 12.946944, "lng": 77.597778, "rice": 1.25, "sambar": 1.25, "curd": 0.25, "cluster_hint": 4},
    
    # Figure 5 Cluster-6 schools:
    {"name": "GHPS—Chandra Nagar (8)", "lat": 12.9050, "lng": 77.5620, "rice": 9.0, "sambar": 10.0, "curd": 8.0, "cluster_hint": 6},
    {"name": "GHS and BHS—Dayananda", "lat": 12.9045, "lng": 77.5640, "rice": 5.0, "sambar": 6.0, "curd": 8.0, "cluster_hint": 6},
    {"name": "Dayananda LPS", "lat": 12.9045, "lng": 77.5640, "rice": 3.5, "sambar": 5.0, "curd": 4.0, "cluster_hint": 6},
    {"name": "GMPS Konanakunte [8]", "lat": 12.8890, "lng": 77.5720, "rice": 7.0, "sambar": 10.0, "curd": 8.0, "cluster_hint": 6},
    {"name": "JSS HS—Konanakunte", "lat": 12.8910, "lng": 77.5710, "rice": 3.5, "sambar": 5.0, "curd": 4.0, "cluster_hint": 6},
    {"name": "S/C—Doresani Palya", "lat": 12.9030, "lng": 77.5950, "rice": 6.0, "sambar": 8.0, "curd": 8.0, "cluster_hint": 6},
    {"name": "GHPS—Puttenahalli (8)", "lat": 12.8980, "lng": 77.5800, "rice": 16.0, "sambar": 24.0, "curd": 16.0, "cluster_hint": 6},
    {"name": "S/C Puttenahalli", "lat": 12.9060, "lng": 77.5810, "rice": 3.5, "sambar": 5.0, "curd": 4.0, "cluster_hint": 6},
    {"name": "GHS—Sarakki", "lat": 12.9130, "lng": 77.5760, "rice": 17.0, "sambar": 26.0, "curd": 16.0, "cluster_hint": 6},
    {"name": "S/C—Pragathipura", "lat": 12.9200, "lng": 77.5710, "rice": 3.5, "sambar": 5.0, "curd": 4.0, "cluster_hint": 6},
    {"name": "GHPS—Kadirenahalli (A)", "lat": 12.9240, "lng": 77.5600, "rice": 6.0, "sambar": 8.0, "curd": 8.0, "cluster_hint": 6},
    {"name": "Banashankari HS—Bendrenagara (A)", "lat": 12.9220, "lng": 77.5590, "rice": 5.0, "sambar": 7.0, "curd": 6.0, "cluster_hint": 6},
    {"name": "Banashankari HPS—Bendrenagara (A)", "lat": 12.9220, "lng": 77.5590, "rice": 4.0, "sambar": 6.0, "curd": 4.0, "cluster_hint": 6},
    {"name": "Bhuvanashweri HPS—Bendrenagar (A)", "lat": 12.9210, "lng": 77.5600, "rice": 6.0, "sambar": 8.0, "curd": 8.0, "cluster_hint": 6}
]

# Generate Full 530 schools distribution matching all 27 clusters exactly
school_prefixes = [
    "GHPS", "GLPS", "GHS", "GJC", "Vidyalaya", "KPS", "SVM", "BHS", "GMS", "Model School",
    "Saraswathi Vidyamandira", "St. Anthony Primary", "Vivekananda School", "Adarsha Vidyalaya", "Jnana Deepa"
]

all_530_schools = []
school_id_counter = 1

# Directional angles and radial distances (in km) for the 27 cluster zones around Vasanthapura
# Kitchen is at Lat 12.88812, Lng 77.54838. 1 deg lat ~= 111 km, 1 deg lng ~= 108 km.
CLUSTER_CENTROIDS = {
    1: {"angle": 200, "dist": 22.0, "name": "Kaggalipura / Harohalli"},
    2: {"angle": 55,  "dist": 7.5,  "name": "Jayanagar / JP Nagar"},
    3: {"angle": 300, "dist": 16.0, "name": "Thavarekere / Magadi Road"},
    4: {"angle": 45,  "dist": 8.5,  "name": "Wilson Garden / Audugodi"},
    5: {"angle": 330, "dist": 4.5,  "name": "Uttarahalli / Chikkalasandra"},
    6: {"angle": 60,  "dist": 4.0,  "name": "Konanakunte / Puttenahalli / Sarakki"},
    7: {"angle": 95,  "dist": 18.0, "name": "Sarjapura Road / Carmelaram"},
    8: {"angle": 190, "dist": 14.0, "name": "Somanahalli / Gabbadi"},
    9: {"angle": 320, "dist": 10.0, "name": "Mudalapalya / Vijayanagar"},
    10: {"angle": 215, "dist": 18.0, "name": "P Agrahara Rural"},
    11: {"angle": 50,  "dist": 12.0, "name": "Domlur / Austin Town"},
    12: {"angle": 75,  "dist": 22.0, "name": "Whitefield Outer Corridor"},
    13: {"angle": 65,  "dist": 16.0, "name": "HAL / Marathahalli"},
    14: {"angle": 85,  "dist": 20.0, "name": "Varthur / Gunjur Rural"},
    15: {"angle": 10,  "dist": 5.0,  "name": "Banashankari 2nd & 3rd Stage"},
    16: {"angle": 15,  "dist": 11.0, "name": "Akkipet / Cottonpet / City Market"},
    17: {"angle": 20,  "dist": 7.5,  "name": "Basavanagudi / Hanumanthanagar"},
    18: {"angle": 65,  "dist": 9.0,  "name": "Koramangala / BTM Layout"},
    19: {"angle": 240, "dist": 2.5,  "name": "Subramanyapura Local"},
    20: {"angle": 120, "dist": 5.5,  "name": "Kothnur / Gottigere"},
    21: {"angle": 140, "dist": 6.5,  "name": "Anjanapura / Hulimavu"},
    22: {"angle": 150, "dist": 13.0, "name": "Bannerghatta / Jigani Link"},
    23: {"angle": 145, "dist": 24.0, "name": "Anekal / Attibele Border"},
    24: {"angle": 345, "dist": 12.0, "name": "K Upanagara / Rajajinagar"},
    25: {"angle": 55,  "dist": 14.0, "name": "JB Nagara / Indiranagar"},
    26: {"angle": 355, "dist": 3.5,  "name": "Padmanabhanagar / Kumaraswamy Layout"},
    27: {"angle": 100, "dist": 5.0,  "name": "Yellukunte / Arekere"}
}

# Add known schools first, grouped by their cluster hint
assigned_known = set()

for bench in CLUSTER_BENCHMARKS:
    cid = bench["cluster_id"]
    target_count = bench["schools_count"]
    target_demand = bench["demand"]
    center_info = CLUSTER_CENTROIDS[cid]
    
    # Calculate approximate center lat/lng from depot
    rad = math.radians(center_info["angle"])
    c_lat = DEPOT["lat"] + (center_info["dist"] * math.cos(rad)) / 111.0
    c_lng = DEPOT["lng"] + (center_info["dist"] * math.sin(rad)) / 108.0
    
    cluster_schools = []
    
    # Pull any matching known schools for this cluster
    for s in known_schools:
        if s["name"] not in assigned_known and s.get("cluster_hint") == cid:
            # calculate equivalent demand = rice + 0.5*sambar + 0.25*curd (or total scaled)
            eq_d = round(s["rice"] + s["sambar"]*0.5 + s["curd"]*0.25, 2)
            cluster_schools.append({
                "school_id": school_id_counter,
                "school_name": s["name"],
                "latitude": round(s["lat"], 6),
                "longitude": round(s["lng"], 6),
                "rice_vessels": s["rice"],
                "sambar_vessels": s["sambar"],
                "curd_vessels": s["curd"],
                "equivalent_demand": eq_d,
                "cluster_zone": center_info["name"],
                "target_cluster": cid
            })
            school_id_counter += 1
            assigned_known.add(s["name"])
            
    # Generate remaining schools for this cluster to meet target_count
    remaining = target_count - len(cluster_schools)
    cur_demand_sum = sum(s["equivalent_demand"] for s in cluster_schools)
    rem_demand = max(target_demand - cur_demand_sum, remaining * 4.0)
    
    # Generate individual demands roughly averaging rem_demand / remaining
    d_shares = [random.uniform(0.6, 1.5) for _ in range(remaining)]
    share_sum = sum(d_shares) if d_shares else 1.0
    
    for i in range(remaining):
        eq_demand = round((d_shares[i] / share_sum) * rem_demand, 1)
        if eq_demand < 1.0:
            eq_demand = 1.0
            
        # Vessels breakdown
        rice_v = round(eq_demand * 0.55, 1)
        sambar_v = round(eq_demand * 0.65, 1)
        curd_v = round(max(0.25, (eq_demand - rice_v - 0.5*sambar_v)*4), 1)
        
        # Local jitter around cluster center (radius ~ 1.2 to 2.5 km)
        jitter_radius = random.uniform(0.2, 2.2) # km
        jitter_angle = random.uniform(0, 2*math.pi)
        s_lat = round(c_lat + (jitter_radius * math.cos(jitter_angle)) / 111.0, 6)
        s_lng = round(c_lng + (jitter_radius * math.sin(jitter_angle)) / 108.0, 6)
        
        prefix = random.choice(school_prefixes)
        s_name = f"{prefix} {center_info['name'].split('/')[0].strip()} #{school_id_counter:03d}"
        
        cluster_schools.append({
            "school_id": school_id_counter,
            "school_name": s_name,
            "latitude": s_lat,
            "longitude": s_lng,
            "rice_vessels": rice_v,
            "sambar_vessels": sambar_v,
            "curd_vessels": curd_v,
            "equivalent_demand": eq_demand,
            "cluster_zone": center_info["name"],
            "target_cluster": cid
        })
        school_id_counter += 1
        
    all_530_schools.extend(cluster_schools)

print(f"Total schools generated: {len(all_530_schools)} across 27 clusters.")

# Write full 530 schools to CSV
with open('data/vasanthapura_schools_530.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=list(all_530_schools[0].keys()))
    writer.writeheader()
    writer.writerows(all_530_schools)

print("Generated vasanthapura_schools_530.csv.")

# 4. Generate Demo 45 dataset (compact 45-school subset covering 4 diverse sectors for fast 5-second live demos)
demo_clusters = [2, 4, 6, 18] # Jayanagar, Wilson Garden, Konanakunte/Puttenahalli, Koramangala
demo_schools = [s for s in all_530_schools if s["target_cluster"] in demo_clusters]
# Re-index for demo
for idx, s in enumerate(demo_schools, 1):
    s_copy = dict(s)
    s_copy["school_id"] = idx

with open('data/vasanthapura_demo_45.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=list(demo_schools[0].keys()))
    writer.writeheader()
    writer.writerows(demo_schools)

print(f"Generated vasanthapura_demo_45.csv with {len(demo_schools)} schools.")
