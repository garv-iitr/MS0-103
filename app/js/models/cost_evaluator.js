/**
 * Cost and Impact Evaluator
 * Based on financial parameters in Mahadevan et al. (2013):
 * - Benchmark Diesel: Rs. 45 / litre (configurable)
 * - Working Days: 22 days / month
 * - Exchange Rate: 1 USD = 50 INR
 * - Meal Cost: ~10 cents ($0.10) per meal, 2/3rd subsidized by government
 * - Impact conversion: US$ 75,000 annual savings = 2,400 additional children fed
 */

const CostEvaluator = {
  // Configurable operational settings
  settings: {
    dieselPriceInr: 45.0,
    workingDaysPerMonth: 22,
    inrPerUsd: 50.0,
    annualCostPerChildUsd: 31.25 // $75,000 / 2,400 children = $31.25 per child/year
  },

  // Baseline from Paper (Existing ad-hoc routing prior to AMRUTA, Table 4)
  baseline: {
    name: "Pre-AMRUTA Existing Route Plan",
    vehicles: 35,
    distanceKm: 1400.0,
    elapsedMinutes: 310.0,
    monthlyCostInr: 1690900.0,
    monthlyCostUsd: 33818.0
  },

  /**
   * Evaluates cost for a single vehicle route
   */
  evaluateVehicleRoute(routeDistanceKm, vehicle, customSettings = {}) {
    const dieselPrice = customSettings.dieselPriceInr || this.settings.dieselPriceInr;
    const workingDays = customSettings.workingDaysPerMonth || this.settings.workingDaysPerMonth;
    const mileage = Math.max(vehicle.mileage_kmpl || 3.0, 1.0);

    // Monthly Fuel Cost
    const monthlyFuelCost = (routeDistanceKm / mileage) * dieselPrice * workingDays;
    
    // Fixed monthly maintenance
    const fixedMaintCost = Number(vehicle.maint_cost_monthly || 9844);

    // Crew salaries: 1 Driver + 1 Supervisor + N Loaders
    const loadersCount = Number(vehicle.loaders !== undefined ? vehicle.loaders : 2);
    const crewSalaryCost = (
      Number(vehicle.driver_salary || 10000) +
      Number(vehicle.supervisor_salary || 8000) +
      Number(vehicle.loader_salary || 6000) * loadersCount
    );

    const totalMonthlyCost = monthlyFuelCost + fixedMaintCost + crewSalaryCost;

    return {
      monthlyFuelCost: Number(monthlyFuelCost.toFixed(2)),
      fixedMaintCost: Number(fixedMaintCost.toFixed(2)),
      crewSalaryCost: Number(crewSalaryCost.toFixed(2)),
      totalMonthlyCost: Number(totalMonthlyCost.toFixed(2))
    };
  },

  /**
   * Evaluates full fleet solution performance and impact against baseline
   */
  evaluateSolution(routes, customSettings = {}) {
    const inrPerUsd = customSettings.inrPerUsd || this.settings.inrPerUsd;
    const workingDays = customSettings.workingDaysPerMonth || this.settings.workingDaysPerMonth;
    const dieselPrice = customSettings.dieselPriceInr || this.settings.dieselPriceInr;

    let totalDistKm = 0;
    let totalMonthlyCostInr = 0;
    let maxElapsed = 0;
    let sumElapsed = 0;
    let totalSchools = 0;
    let lateRoutesCount = 0;
    let totalDieselLitresMonth = 0;

    routes.forEach(r => {
      totalDistKm += r.distance_km || 0;
      totalMonthlyCostInr += r.monthly_total_cost || 0;
      totalSchools += r.schools_count || 0;
      const elapsed = r.elapsed_time_min || 0;
      if (elapsed > maxElapsed) maxElapsed = elapsed;
      sumElapsed += elapsed;
      if (elapsed > 270) lateRoutesCount++; // cutoff 12:30 PM (270 min from 08:00 AM)
      
      const mileage = r.vehicle_type === "Max Pikup" ? 6.0 : (r.vehicle_type === "Tata" || r.vehicle_type === "Eicher" ? 3.0 : 4.0);
      totalDieselLitresMonth += ((r.distance_km || 0) / mileage) * workingDays;
    });

    const kDeployed = routes.length;
    const avgElapsed = kDeployed > 0 ? sumElapsed / kDeployed : 0;
    const totalMonthlyCostUsd = totalMonthlyCostInr / inrPerUsd;

    // Savings vs Baseline
    const monthlySavingsInr = this.baseline.monthlyCostInr - totalMonthlyCostInr;
    const monthlySavingsUsd = this.baseline.monthlyCostUsd - totalMonthlyCostUsd;
    const costReductionPct = (monthlySavingsInr / this.baseline.monthlyCostInr) * 100;
    const annualizedSavingsUsd = monthlySavingsUsd * 12;
    const additionalChildrenFed = Math.round(annualizedSavingsUsd / this.settings.annualCostPerChildUsd);
    
    // Baseline diesel ~ 443 litres more per month
    const baselineMonthlyDiesel = (this.baseline.distanceKm / 3.0) * workingDays;
    const dieselSavedLitres = Math.round(baselineMonthlyDiesel - totalDieselLitresMonth);

    return {
      totalVehicles: kDeployed,
      totalDistanceKm: Number(totalDistKm.toFixed(2)),
      totalSchoolsServed: totalSchools,
      maxElapsedMinutes: Number(maxElapsed.toFixed(2)),
      avgElapsedMinutes: Number(avgElapsed.toFixed(2)),
      totalMonthlyCostInr: Number(totalMonthlyCostInr.toFixed(2)),
      totalMonthlyCostUsd: Number(totalMonthlyCostUsd.toFixed(2)),
      totalDieselLitresMonth: Number(totalDieselLitresMonth.toFixed(1)),
      lateRoutesCount,
      
      // Impact & Savings
      monthlySavingsInr: Number(monthlySavingsInr.toFixed(2)),
      monthlySavingsUsd: Number(monthlySavingsUsd.toFixed(2)),
      annualizedSavingsUsd: Number(annualizedSavingsUsd.toFixed(2)),
      costReductionPct: Number(costReductionPct.toFixed(1)),
      dieselSavedLitres: Math.max(0, dieselSavedLitres),
      additionalChildrenFed: Math.max(0, additionalChildrenFed)
    };
  }
};

window.CostEvaluator = CostEvaluator;
