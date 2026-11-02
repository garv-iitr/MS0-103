/**
 * Classical AMRUTA 3-Stage Heuristic Engine
 * Faithfully implements Mahadevan et al. (INFORMS Interfaces 2013)
 * Strictly constrained to k deployed vehicles and capacity limits:
 * - Stage 1: Modified K-Means Clustering (Priority P_i = dist / demand, capped to k clusters)
 * - Stage 2: Vehicle Assignment & 2-Opt Cluster Refinement (maintains k clusters)
 * - Stage 3: SOM / TSP route sequencing with exact time window checks
 */

const AmrutaEngine = {
  solve(schools, fleet, options = {}) {
    const k = options.k_vehicles !== undefined ? options.k_vehicles : 10;
    const capacityLimit = options.vehicle_capacity !== undefined ? options.vehicle_capacity : 65.0;
    const speedKmh = options.delivery_speed !== undefined ? options.delivery_speed : 24.0;
    const cutoffMins = options.cutoff_minutes !== undefined ? options.cutoff_minutes : 270.0;
    const circuityFactor = options.circuity_factor !== undefined ? options.circuity_factor : 1.35;
    const dieselPrice = options.dieselPriceInr !== undefined ? options.dieselPriceInr : 45.0;
    const workingDays = options.workingDaysPerMonth !== undefined ? options.workingDaysPerMonth : 22;

    const n = schools.length;
    if (n === 0) {
      return { model: "AMRUTA 3-Stage Heuristic", kDeployed: 0, routes: [], summary: {} };
    }

    // 1. Stage 1: Modified K-Means Clustering (creates exactly <= k clusters)
    const { clusters, unclustered } = this.stage1Clustering(schools, fleet, k, capacityLimit, circuityFactor);

    // 2. Stage 2: Vehicle Assignment & Refinement (strictly preserves the k clusters)
    const assignedClusters = this.stage2Refinement(clusters, fleet, capacityLimit, circuityFactor);

    // 3. Stage 3: TSP Routing within Clusters & Time Window Checking
    const finalRoutes = this.stage3Routing(assignedClusters, {
      dieselPrice,
      workingDays,
      speedKmh,
      cutoffMins,
      circuityFactor
    });

    // 4. Summarize Solution
    const summary = ModernORSolver.evaluateSolution(finalRoutes, unclustered, {
      dieselPriceInr: dieselPrice,
      workingDaysPerMonth: workingDays,
      cutoffMins
    });

    return {
      model: "Classical AMRUTA (3-Stage)",
      kDeployed: finalRoutes.length,
      routes: finalRoutes,
      unassigned_schools: unclustered,
      summary: summary
    };
  },

  stage1Clustering(schools, fleet, kRequested, capacityLimit, circuityFactor) {
    const k = Math.min(kRequested, fleet.length, schools.length);
    const sortedByDemand = [...schools].sort((a, b) => b.equivalent_demand - a.equivalent_demand);

    // Initial Seeds: Top k demand schools become cluster seeds
    const seeds = sortedByDemand.slice(0, k);
    const unassigned = sortedByDemand.slice(k);

    const sortedFleet = [...fleet].slice(0, k).map((v, i) => ({
      ...v,
      equivalent_capacity: capacityLimit,
      vehicle_id: v.vehicle_id || `V-${String(i + 1).padStart(2, "0")}`
    }));

    const clusters = seeds.map((seed, idx) => ({
      cluster_id: idx + 1,
      centroid: { lat: seed.latitude, lng: seed.longitude },
      schools: [seed],
      total_demand: seed.equivalent_demand,
      max_capacity_80: capacityLimit * 0.80,
      max_capacity_100: capacityLimit,
      vehicle: sortedFleet[idx % sortedFleet.length]
    }));

    // Pass 1: Pack up to 80% capacity using priority P_i = dist / demand
    const remainingAfterPass1 = [];
    for (const school of unassigned) {
      let bestCluster = null;
      let lowestPriority = Infinity;

      for (const c of clusters) {
        if (c.total_demand + school.equivalent_demand <= c.max_capacity_80) {
          const dist = DataManager.calculateDistance(c.centroid.lat, c.centroid.lng, school.latitude, school.longitude, circuityFactor);
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
        bestCluster.centroid.lat = bestCluster.schools.reduce((acc, s) => acc + s.latitude, 0) / bestCluster.schools.length;
        bestCluster.centroid.lng = bestCluster.schools.reduce((acc, s) => acc + s.longitude, 0) / bestCluster.schools.length;
      } else {
        remainingAfterPass1.push(school);
      }
    }

    // Pass 2: Pack remaining up to 100% capacity
    const unclustered = [];
    for (const school of remainingAfterPass1) {
      let bestCluster = null;
      let minDist = Infinity;

      for (const c of clusters) {
        if (c.total_demand + school.equivalent_demand <= c.max_capacity_100) {
          const dist = DataManager.calculateDistance(c.centroid.lat, c.centroid.lng, school.latitude, school.longitude, circuityFactor);
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
        // As defined in the paper: left unclustered when capacity of the k fleet is exhausted
        unclustered.push(school);
      }
    }

    return { clusters, unclustered };
  },

  stage2Refinement(clusters, fleet, capacityLimit, circuityFactor) {
    // Preserves exactly k clusters without spawning extra vehicles
    const fleetCopy = [...fleet].slice(0, clusters.length);
    clusters.forEach((c, i) => {
      c.vehicle = fleetCopy[i] || fleetCopy[fleetCopy.length - 1];
      c.vehicle.equivalent_capacity = capacityLimit;
      c.cluster_id = i + 1;
    });

    // 2-Opt Boundary Interchange between adjacent clusters
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

              if (newDem1 <= capacityLimit && newDem2 <= capacityLimit) {
                const currentDist = (
                  DataManager.calculateDistance(s1.latitude, s1.longitude, c1.centroid.lat, c1.centroid.lng, circuityFactor) +
                  DataManager.calculateDistance(s2.latitude, s2.longitude, c2.centroid.lat, c2.centroid.lng, circuityFactor)
                );
                const swappedDist = (
                  DataManager.calculateDistance(s1.latitude, s1.longitude, c2.centroid.lat, c2.centroid.lng, circuityFactor) +
                  DataManager.calculateDistance(s2.latitude, s2.longitude, c1.centroid.lat, c1.centroid.lng, circuityFactor)
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

  stage3Routing(clusters, options) {
    const finalRoutes = [];
    const depot = DataManager.depot;

    clusters.forEach(c => {
      if (!c.schools || c.schools.length === 0) return;

      // 1. Nearest Neighbor TSP sequencing
      let unvisited = [...c.schools];
      const ordered = [];
      let curLat = depot.lat;
      let curLng = depot.lng;

      while (unvisited.length > 0) {
        let nearestIdx = 0;
        let minDist = Infinity;
        for (let i = 0; i < unvisited.length; i++) {
          const d = DataManager.calculateDistance(curLat, curLng, unvisited[i].latitude, unvisited[i].longitude, options.circuityFactor);
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
      const optimizedRoute = ModernORSolver.twoOptIntraRoute(ordered, options.circuityFactor);

      // 3. Compute Schedule and Trip Sheet
      const routeSheet = ModernORSolver.computeRouteSchedule(optimizedRoute, c.vehicle, c.cluster_id, options);
      finalRoutes.push(routeSheet);
    });

    return finalRoutes;
  }
};

window.AmrutaEngine = AmrutaEngine;
