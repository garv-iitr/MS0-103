/**
 * Classical AMRUTA 3-Stage Heuristic Engine
 * Implements Mahadevan et al. (INFORMS Interfaces 2013)
 * Stage 1: Modified K-means clustering (Priority = dist / demand)
 * Stage 2: Vehicle assignment & 2-Opt cluster refinement
 * Stage 3: SOM / TSP route sequencing with exact time window evaluation
 */

const AmrutaEngine = {
  /**
   * Main entry point for AMRUTA algorithm
   */
  solve(schools, fleet, options = {}) {
    const k = options.k_vehicles || 27;
    const dieselPrice = options.dieselPriceInr || 45.0;
    const workingDays = options.workingDaysPerMonth || 22;
    const roadSpeedFactor = options.roadSpeedFactor || 1.0;
    const departureClock = options.departureClock || "08:00 AM";

    // 1. Stage 1: Modified K-Means Clustering
    const clusters = this.stage1Clustering(schools, fleet, k);

    // 2. Stage 2: Vehicle Assignment & Refinement
    const assignedClusters = this.stage2Refinement(clusters, fleet);

    // 3. Stage 3: TSP Routing within Clusters & Time Window Checking
    const finalRoutes = this.stage3Routing(assignedClusters, {
      dieselPrice,
      workingDays,
      roadSpeedFactor,
      departureClock
    });

    // 4. Summarize
    const summary = CostEvaluator.evaluateSolution(finalRoutes, {
      dieselPriceInr: dieselPrice,
      workingDaysPerMonth: workingDays
    });

    return {
      model: "AMRUTA 3-Stage Heuristic",
      kDeployed: finalRoutes.length,
      routes: finalRoutes,
      summary: summary
    };
  },

  /**
   * Stage 1: Modified K-Means Clustering
   * Top k demand schools as initial seeds
   * Priority P_i = dist / demand
   */
  stage1Clustering(schools, fleet, k) {
    const availableK = Math.min(k, fleet.length, schools.length);
    const sortedByDemand = [...schools].sort((a, b) => b.equivalent_demand - a.equivalent_demand);
    
    // Top k demand schools serve as initial centroids
    const seeds = sortedByDemand.slice(0, availableK);
    const unassigned = sortedByDemand.slice(availableK);

    // Sort fleet by lowest cost
    const sortedFleet = [...fleet].sort((a, b) => {
      const costA = (a.maint_cost_monthly || 0) + (a.driver_salary || 0) + (a.supervisor_salary || 0) + (a.loader_salary || 0) * (a.loaders || 2);
      const costB = (b.maint_cost_monthly || 0) + (b.driver_salary || 0) + (b.supervisor_salary || 0) + (b.loader_salary || 0) * (b.loaders || 2);
      return costA - costB;
    });

    const clusters = seeds.map((seed, idx) => {
      const veh = sortedFleet[idx % sortedFleet.length];
      return {
        cluster_id: idx + 1,
        centroid: { lat: seed.latitude, lng: seed.longitude },
        schools: [seed],
        total_demand: seed.equivalent_demand,
        max_capacity_80: (veh.equivalent_capacity || 420) * 0.80,
        max_capacity_100: (veh.equivalent_capacity || 420),
        vehicle: veh
      };
    });

    // Pass 1: Pack up to 80% capacity using priority P_i = dist / demand
    const remainingAfterPass1 = [];
    for (const school of unassigned) {
      let bestCluster = null;
      let lowestPriority = Infinity;

      for (const c of clusters) {
        if (c.total_demand + school.equivalent_demand <= c.max_capacity_80) {
          const dist = DataManager.calculateDistance(c.centroid.lat, c.centroid.lng, school.latitude, school.longitude);
          const priority = dist / Math.max(school.equivalent_demand, 0.1);
          if (priority < lowestPriority) {
            lowestPriority = priority;
            bestCluster = c;
          }
        }
      }

      if (bestCluster) {
        bestCluster.schools.push(school);
        bestCluster.total_demand += school.equivalent_demand;
        // Update centroid
        bestCluster.centroid.lat = bestCluster.schools.reduce((acc, s) => acc + s.latitude, 0) / bestCluster.schools.length;
        bestCluster.centroid.lng = bestCluster.schools.reduce((acc, s) => acc + s.longitude, 0) / bestCluster.schools.length;
      } else {
        remainingAfterPass1.push(school);
      }
    }

    // Pass 2: Pack remaining up to 100% capacity
    const unassignedFinal = [];
    for (const school of remainingAfterPass1) {
      let bestCluster = null;
      let minDist = Infinity;

      for (const c of clusters) {
        if (c.total_demand + school.equivalent_demand <= c.max_capacity_100) {
          const dist = DataManager.calculateDistance(c.centroid.lat, c.centroid.lng, school.latitude, school.longitude);
          if (dist < minDist) {
            minDist = dist;
            bestCluster = c;
          }
        }
      }

      if (bestCluster) {
        bestCluster.schools.push(school);
        bestCluster.total_demand += school.equivalent_demand;
      } else {
        unassignedFinal.push(school);
      }
    }

    // Allocate any spillover to least loaded cluster
    for (const school of unassignedFinal) {
      clusters.sort((a, b) => a.total_demand - b.total_demand);
      clusters[0].schools.push(school);
      clusters[0].total_demand += school.equivalent_demand;
    }

    return clusters;
  },

  /**
   * Stage 2: Greedy Vehicle Assignment & 2-Opt Cluster Refinement
   */
  stage2Refinement(clusters, fleet) {
    const k = clusters.length;
    // Sort fleet by capacity descending, match with clusters sorted by demand descending
    const fleetCopy = [...fleet].sort((a, b) => b.equivalent_capacity - a.equivalent_capacity);
    clusters.sort((a, b) => b.total_demand - a.total_demand);

    clusters.forEach((c, i) => {
      c.vehicle = fleetCopy[i] || fleetCopy[fleetCopy.length - 1];
      c.cluster_id = i + 1;
    });

    // 2-Opt Cluster Boundary Node Interchange
    let improved = true;
    let iterations = 0;
    while (improved && iterations < 3) {
      improved = false;
      iterations++;

      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const c1 = clusters[i];
          const c2 = clusters[j];

          for (let idx1 = 0; idx1 < c1.schools.length; idx1++) {
            for (let idx2 = 0; idx2 < c2.schools.length; idx2++) {
              const s1 = c1.schools[idx1];
              const s2 = c2.schools[idx2];

              const newDem1 = c1.total_demand - s1.equivalent_demand + s2.equivalent_demand;
              const newDem2 = c2.total_demand - s2.equivalent_demand + s1.equivalent_demand;

              if (newDem1 <= c1.vehicle.equivalent_capacity && newDem2 <= c2.vehicle.equivalent_capacity) {
                const currentDist = (
                  DataManager.calculateDistance(s1.latitude, s1.longitude, c1.centroid.lat, c1.centroid.lng) +
                  DataManager.calculateDistance(s2.latitude, s2.longitude, c2.centroid.lat, c2.centroid.lng)
                );
                const swappedDist = (
                  DataManager.calculateDistance(s1.latitude, s1.longitude, c2.centroid.lat, c2.centroid.lng) +
                  DataManager.calculateDistance(s2.latitude, s2.longitude, c1.centroid.lat, c1.centroid.lng)
                );

                if (swappedDist < currentDist - 0.5) {
                  c1.schools[idx1] = s2;
                  c2.schools[idx2] = s1;
                  c1.total_demand = newDem1;
                  c2.total_demand = newDem2;
                  improved = true;
                  break;
                }
              }
            }
            if (improved) break;
          }
        }
      }
    }

    return clusters;
  },

  /**
   * Stage 3: Routing (SOM / TSP) & Time Window Schedule
   */
  stage3Routing(clusters, options) {
    const finalRoutes = [];
    const depot = DataManager.depot;

    clusters.forEach(c => {
      if (!c.schools || c.schools.length === 0) return;

      // 1. Nearest Neighbor TSP from Kitchen Depot
      let unvisited = [...c.schools];
      const ordered = [];
      let curLat = depot.lat;
      let curLng = depot.lng;

      while (unvisited.length > 0) {
        let nearestIdx = 0;
        let minDist = Infinity;
        for (let i = 0; i < unvisited.length; i++) {
          const d = DataManager.calculateDistance(curLat, curLng, unvisited[i].latitude, unvisited[i].longitude);
          if (d < minDist) {
            minDist = d;
            nearestIdx = i;
          }
        }
        const chosen = unvisited.splice(nearestIdx, 1)[0];
        ordered.push(chosen);
        curLat = chosen.latitude;
        curLng = chosen.longitude;
      }

      // 2. Intra-route 2-Opt smoothing
      const optimizedRoute = this.twoOptTSP(ordered);

      // 3. Compute Schedule and Trip Sheet
      const routeSheet = this.computeRouteSchedule(optimizedRoute, c.vehicle, c.cluster_id, options);
      finalRoutes.push(routeSheet);
    });

    return finalRoutes;
  },

  twoOptTSP(route) {
    if (route.length < 4) return route;
    const best = [...route];
    let improved = true;
    let passes = 0;

    while (improved && passes < 4) {
      improved = false;
      passes++;
      for (let i = 0; i < best.length - 1; i++) {
        for (let j = i + 2; j < best.length; j++) {
          const p1 = best[i];
          const p2 = best[i + 1];
          const p3 = best[j];
          const p4 = best[(j + 1) % best.length];

          const curD = (
            DataManager.calculateDistance(p1.latitude, p1.longitude, p2.latitude, p2.longitude) +
            DataManager.calculateDistance(p3.latitude, p3.longitude, p4.latitude, p4.longitude)
          );
          const swapD = (
            DataManager.calculateDistance(p1.latitude, p1.longitude, p3.latitude, p3.longitude) +
            DataManager.calculateDistance(p2.latitude, p2.longitude, p4.latitude, p4.longitude)
          );

          if (swapD < curD - 0.2) {
            // Reverse subarray from i+1 to j
            let left = i + 1;
            let right = j;
            while (left < right) {
              const tmp = best[left];
              best[left] = best[right];
              best[right] = tmp;
              left++;
              right--;
            }
            improved = true;
          }
        }
      }
    }
    return best;
  },

  computeRouteSchedule(schools, vehicle, clusterId, options) {
    const depot = DataManager.depot;
    const stops = [];
    let curTime = 0.0; // Minutes from 08:00 AM
    let totalDist = 0.0;
    let totalTravelTime = 0.0;
    let totalServiceTime = 0.0;

    let prevLat = depot.lat;
    let prevLng = depot.lng;

    // Stop 0: Depot
    stops.push({
      stop_seq: 0,
      school_id: 0,
      school_name: depot.name,
      latitude: prevLat,
      longitude: prevLng,
      distance_km: 0.0,
      travel_time_min: 0.0,
      service_time_min: 0.0,
      arrival_time_min: 0.0,
      departure_time_min: 0.0,
      arrival_clock: "08:00 AM",
      rice_vessels: 0,
      sambar_vessels: 0,
      curd_vessels: 0,
      demand: 0.0
    });

    schools.forEach((s, idx) => {
      const isFirst = (idx === 0);
      const dist = DataManager.calculateDistance(prevLat, prevLng, s.latitude, s.longitude);
      const tTime = DataManager.calculateTravelTime(dist, isFirst, options.roadSpeedFactor || 1.0);
      const sTime = DataManager.calculateServiceTime(s.rice_vessels, s.sambar_vessels, s.curd_vessels);

      const arrivalMin = Number((curTime + tTime).toFixed(2));
      const departureMin = Number((arrivalMin + sTime).toFixed(2));

      // Clock formatting
      const arrivalHours = 8 + Math.floor(arrivalMin / 60);
      const arrivalMins = Math.floor(arrivalMin % 60);
      const clockStr = `${String(arrivalHours).padStart(2, "0")}:${String(arrivalMins).padStart(2, "0")} ${arrivalHours < 12 ? "AM" : "PM"}`;

      totalDist += dist;
      totalTravelTime += tTime;
      totalServiceTime += sTime;
      curTime = departureMin;
      prevLat = s.latitude;
      prevLng = s.longitude;

      stops.push({
        stop_seq: idx + 1,
        school_id: s.school_id,
        school_name: s.school_name,
        latitude: s.latitude,
        longitude: s.longitude,
        distance_km: dist,
        travel_time_min: tTime,
        service_time_min: sTime,
        arrival_time_min: arrivalMin,
        departure_time_min: departureMin,
        arrival_clock: clockStr,
        rice_vessels: s.rice_vessels,
        sambar_vessels: s.sambar_vessels,
        curd_vessels: s.curd_vessels,
        demand: s.equivalent_demand
      });
    });

    // Return to Depot
    const returnDist = DataManager.calculateDistance(prevLat, prevLng, depot.lat, depot.lng);
    const returnTime = DataManager.calculateTravelTime(returnDist, true, options.roadSpeedFactor || 1.0);
    totalDist += returnDist;
    totalTravelTime += returnTime;
    const finalElapsed = Number((curTime + returnTime).toFixed(2));

    // Vehicle financials
    const costDetails = CostEvaluator.evaluateVehicleRoute(totalDist, vehicle, {
      dieselPriceInr: options.dieselPrice,
      workingDaysPerMonth: options.workingDays
    });

    const totalDemand = Number(schools.reduce((acc, s) => acc + s.equivalent_demand, 0).toFixed(1));
    const capacity = vehicle.equivalent_capacity || 420;
    const utilizationPct = Number(((totalDemand / capacity) * 100).toFixed(1));

    return {
      cluster_id: clusterId,
      vehicle_id: vehicle.vehicle_id || `V-${String(clusterId).padStart(2, "0")}`,
      vehicle_type: vehicle.type || "Tata",
      driver_name: `Driver #${String(clusterId).padStart(2, "0")}`,
      supervisor_name: `Supervisor #${String(clusterId).padStart(2, "0")}`,
      schools_count: schools.length,
      total_demand: totalDemand,
      vehicle_capacity: capacity,
      capacity_utilization_pct: utilizationPct,
      distance_km: Number(totalDist.toFixed(2)),
      travel_time_min: Number(totalTravelTime.toFixed(2)),
      service_time_min: Number(totalServiceTime.toFixed(2)),
      elapsed_time_min: finalElapsed,
      last_school_arrival_min: stops[stops.length - 1].arrival_time_min,
      last_school_arrival_clock: stops[stops.length - 1].arrival_clock,
      is_within_time_window: stops[stops.length - 1].arrival_time_min <= 270.0,
      monthly_fuel_cost: costDetails.monthlyFuelCost,
      monthly_fixed_cost: costDetails.fixedMaintCost,
      monthly_crew_cost: costDetails.crewSalaryCost,
      monthly_total_cost: costDetails.totalMonthlyCost,
      stops: stops
    };
  }
};

window.AmrutaEngine = AmrutaEngine;
