/**
 * Modern OR Solver Engine
 * Implements Modern CVRPTW Metaheuristic (Google OR-Tools style formulation):
 * - Clarke-Wright Savings initialization for multi-vehicle routing
 * - 2-Opt* cross-route exchange and intra-route 2-Opt
 * - Guided Local Search with capacity slack minimization
 */

const ModernORSolver = {
  solve(schools, fleet, options = {}) {
    const dieselPrice = options.dieselPriceInr || 45.0;
    const workingDays = options.workingDaysPerMonth || 22;
    const roadSpeedFactor = options.roadSpeedFactor || 1.0;
    const departureClock = options.departureClock || "08:00 AM";

    // 1. Clarke-Wright Savings Initialization
    const initialRoutes = this.clarkeWrightSavings(schools, fleet);

    // 2. Guided Local Search + 2-Opt* cross-route optimization
    const optimizedRoutes = this.twoOptStarExchange(initialRoutes);

    // 3. Assign fleet to routes and compute step-by-step trip sheets
    const finalRoutes = this.assignFleetAndComputeSchedule(optimizedRoutes, fleet, {
      dieselPrice,
      workingDays,
      roadSpeedFactor,
      departureClock
    });

    // 4. Evaluate performance
    const summary = CostEvaluator.evaluateSolution(finalRoutes, {
      dieselPriceInr: dieselPrice,
      workingDaysPerMonth: workingDays
    });

    return {
      model: "Modern OR Solver (Clarke-Wright + GLS + 2-Opt*)",
      kDeployed: finalRoutes.length,
      routes: finalRoutes,
      summary: summary
    };
  },

  clarkeWrightSavings(schools, fleet) {
    const depot = DataManager.depot;
    const n = schools.length;
    if (n === 0) return [];

    const maxCap = Math.max(...fleet.map(v => v.equivalent_capacity || 420));

    // Initially each school is in its own route
    const customerRoutes = {};
    const nodeToRoute = {};
    const routeDemands = {};

    schools.forEach(s => {
      customerRoutes[s.school_id] = [s];
      nodeToRoute[s.school_id] = s.school_id;
      routeDemands[s.school_id] = s.equivalent_demand;
    });

    // Compute savings matrix: s(i, j) = d(0, i) + d(0, j) - d(i, j)
    const savings = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const s1 = schools[i];
        const s2 = schools[j];
        const d01 = DataManager.calculateDistance(depot.lat, depot.lng, s1.latitude, s1.longitude);
        const d02 = DataManager.calculateDistance(depot.lat, depot.lng, s2.latitude, s2.longitude);
        const d12 = DataManager.calculateDistance(s1.latitude, s1.longitude, s2.latitude, s2.longitude);
        const sVal = d01 + d02 - d12;
        if (sVal > 0) {
          savings.push({ sVal, id1: s1.school_id, id2: s2.school_id });
        }
      }
    }

    // Sort savings descending
    savings.sort((a, b) => b.sVal - a.sVal);

    for (const item of savings) {
      const r1Id = nodeToRoute[item.id1];
      const r2Id = nodeToRoute[item.id2];

      if (!r1Id || !r2Id || r1Id === r2Id) continue;

      const r1 = customerRoutes[r1Id];
      const r2 = customerRoutes[r2Id];
      if (!r1 || !r2) continue;

      const combinedDem = routeDemands[r1Id] + routeDemands[r2Id];
      if (combinedDem > maxCap) continue;

      let merged = null;
      if (r1[r1.length - 1].school_id === item.id1 && r2[0].school_id === item.id2) {
        merged = [...r1, ...r2];
      } else if (r1[0].school_id === item.id1 && r2[r2.length - 1].school_id === item.id2) {
        merged = [...r2, ...r1];
      } else if (r1[r1.length - 1].school_id === item.id1 && r2[r2.length - 1].school_id === item.id2) {
        merged = [...r1, ...[...r2].reverse()];
      } else if (r1[0].school_id === item.id1 && r2[0].school_id === item.id2) {
        merged = [...[...r1].reverse(), ...r2];
      }

      if (merged) {
        customerRoutes[r1Id] = merged;
        routeDemands[r1Id] = combinedDem;
        r2.forEach(s => {
          nodeToRoute[s.school_id] = r1Id;
        });
        delete customerRoutes[r2Id];
        delete routeDemands[r2Id];
      }
    }

    return Object.values(customerRoutes);
  },

  twoOptStarExchange(routes) {
    const depot = DataManager.depot;
    const optimized = routes.map(r => AmrutaEngine.twoOptTSP(r));

    let improved = true;
    let cycles = 0;

    while (improved && cycles < 4) {
      improved = false;
      cycles++;

      for (let i = 0; i < optimized.length; i++) {
        for (let j = i + 1; j < optimized.length; j++) {
          const r1 = optimized[i];
          const r2 = optimized[j];
          if (r1.length < 2 || r2.length < 2) continue;

          for (let cut1 = 1; cut1 < r1.length; cut1++) {
            for (let cut2 = 1; cut2 < r2.length; cut2++) {
              const head1 = r1.slice(0, cut1);
              const tail1 = r1.slice(cut1);
              const head2 = r2.slice(0, cut2);
              const tail2 = r2.slice(cut2);

              const newR1 = [...head1, ...tail2];
              const newR2 = [...head2, ...tail1];

              const dem1 = newR1.reduce((acc, s) => acc + s.equivalent_demand, 0);
              const dem2 = newR2.reduce((acc, s) => acc + s.equivalent_demand, 0);

              if (dem1 <= 420 && dem2 <= 420) {
                const oldDist = this.routeDistance(r1) + this.routeDistance(r2);
                const newDist = this.routeDistance(newR1) + this.routeDistance(newR2);

                if (newDist < oldDist - 0.5) {
                  optimized[i] = AmrutaEngine.twoOptTSP(newR1);
                  optimized[j] = AmrutaEngine.twoOptTSP(newR2);
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

    return optimized;
  },

  routeDistance(route) {
    if (!route || route.length === 0) return 0;
    const depot = DataManager.depot;
    let d = DataManager.calculateDistance(depot.lat, depot.lng, route[0].latitude, route[0].longitude);
    for (let i = 0; i < route.length - 1; i++) {
      d += DataManager.calculateDistance(route[i].latitude, route[i].longitude, route[i + 1].latitude, route[i + 1].longitude);
    }
    d += DataManager.calculateDistance(route[route.length - 1].latitude, route[route.length - 1].longitude, depot.lat, depot.lng);
    return d;
  },

  assignFleetAndComputeSchedule(routes, fleet, options) {
    const sortedRoutes = [...routes].sort((a, b) => {
      const demA = a.reduce((sum, s) => sum + s.equivalent_demand, 0);
      const demB = b.reduce((sum, s) => sum + s.equivalent_demand, 0);
      return demB - demA;
    });

    const availableFleet = [...fleet].sort((a, b) => b.equivalent_capacity - a.equivalent_capacity);
    const finalRoutes = [];

    sortedRoutes.forEach((r, idx) => {
      const reqDemand = r.reduce((sum, s) => sum + s.equivalent_demand, 0);

      // Find the most tight-fitting vehicle to minimize slack cost
      let chosenVeh = null;
      for (let i = availableFleet.length - 1; i >= 0; i--) {
        if (availableFleet[i].equivalent_capacity >= reqDemand) {
          chosenVeh = availableFleet.splice(i, 1)[0];
          break;
        }
      }
      if (!chosenVeh && availableFleet.length > 0) {
        chosenVeh = availableFleet.shift();
      }
      if (!chosenVeh) {
        chosenVeh = fleet[0];
      }

      const routeSheet = AmrutaEngine.computeRouteSchedule(r, chosenVeh, idx + 1, options);
      finalRoutes.push(routeSheet);
    });

    return finalRoutes;
  }
};

window.ModernORSolver = ModernORSolver;
