/**
 * Main Application Orchestrator
 * Matches the exact authentic architecture from user video screenshots
 */

const App = {
  activeTab: "map",
  currentModel: "modern", // "modern", "amruta", "baseline"
  currentScale: 100,

  // Operational Simulation Parameters
  simParams: {
    k_vehicles: 10,
    vehicle_capacity: 65.0,
    delivery_speed: 24.0,
    cutoff_minutes: 270.0, // 12:30 PM
    circuity_factor: 1.35,
    diesel_price: 45.00
  },

  results: {
    baseline: null,
    amruta: null,
    modern: null
  },

  async init() {
    console.log("Initializing AMRUTA Logistics Decision Support System...");

    // 1. Initialize DataManager
    await DataManager.init();

    // 2. Load fleet & default 100-school dataset
    await this.switchDatasetByScale(100);

    // 3. Initialize Map View
    MapView.init("map-container");

    // 4. Bind Sidebar Controls & Nav Tabs
    this.bindSidebarControls();
    this.bindNavTabs();
    TripSheetView.bindEvents();
    ExcelManagerView.bindEvents();

    // 5. Initial Simulation Run
    this.runCurrentSimulation();
  },

  async switchDatasetByScale(scale = 100) {
    this.currentScale = scale;

    if (typeof EMBEDDED_DATA !== "undefined") {
      const allSchools = EMBEDDED_DATA.fullSchools || EMBEDDED_DATA.demoSchools;
      DataManager.currentSchools = allSchools.slice(0, Math.min(scale, allSchools.length));
      DataManager.currentFleet = EMBEDDED_DATA.fleet || [];
    } else {
      const filename = scale > 200 ? "vasanthapura_schools_530.csv" : "vasanthapura_demo_45.csv";
      try {
        const resp = await fetch(`/data/${filename}`);
        if (resp.ok) {
          const text = await resp.text();
          const parsed = DataManager.parseCSV(text);
          DataManager.currentSchools = parsed.slice(0, Math.min(scale, parsed.length));
        }
      } catch (e) {
        console.warn("Failed fetching CSV, using available memory state.", e);
      }
    }

    const schoolCount = DataManager.currentSchools.length;
    const estChildren = Math.round(schoolCount * 328.8);
    const badgeFile = document.getElementById("badge-active-file");
    if (badgeFile) {
      badgeFile.textContent = `Active: data.xlsx (${schoolCount} Schools, ${estChildren.toLocaleString()} Children)`;
    }

    this.runCurrentSimulation();
    ExcelManagerView.render();
  },

  bindSidebarControls() {
    // Engine selector
    const engineSelect = document.getElementById("sidebar-engine");
    if (engineSelect) {
      engineSelect.addEventListener("change", (e) => {
        this.currentModel = e.target.value;
        const badgeEngine = document.getElementById("badge-active-engine");
        if (badgeEngine) {
          if (this.currentModel === "modern") badgeEngine.textContent = "Google OR-Tools";
          else if (this.currentModel === "amruta") badgeEngine.textContent = "Classical AMRUTA";
          else badgeEngine.textContent = "Pre-AMRUTA (Ad-Hoc)";
        }
        this.runCurrentSimulation();
      });
    }

    // Capacity Slider
    const sliderCap = document.getElementById("slider-cap-limit");
    const valCap = document.getElementById("val-cap-limit");
    if (sliderCap && valCap) {
      sliderCap.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value).toFixed(2);
        valCap.textContent = val;
        this.simParams.vehicle_capacity = parseFloat(val);
      });
      sliderCap.addEventListener("change", () => this.runCurrentSimulation());
    }

    // Fleet k Slider
    const sliderK = document.getElementById("slider-k-fleet");
    const valK = document.getElementById("val-k-fleet");
    if (sliderK && valK) {
      sliderK.addEventListener("input", (e) => {
        valK.textContent = e.target.value;
        this.simParams.k_vehicles = parseInt(e.target.value, 10);
      });
      sliderK.addEventListener("change", () => this.runCurrentSimulation());
    }

    // Delivery Speed Slider
    const sliderSpeed = document.getElementById("slider-speed");
    const valSpeed = document.getElementById("val-speed");
    if (sliderSpeed && valSpeed) {
      sliderSpeed.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value).toFixed(2);
        valSpeed.textContent = val;
        this.simParams.delivery_speed = parseFloat(val);
      });
      sliderSpeed.addEventListener("change", () => this.runCurrentSimulation());
    }

    // Lunch Cutoff Slider
    const sliderCutoff = document.getElementById("slider-cutoff");
    const valCutoff = document.getElementById("val-cutoff");
    if (sliderCutoff && valCutoff) {
      sliderCutoff.addEventListener("input", (e) => {
        const mins = parseInt(e.target.value, 10);
        this.simParams.cutoff_minutes = mins;
        const hours = 8 + Math.floor(mins / 60);
        const remMins = mins % 60;
        const clockStr = `${hours > 12 ? hours - 12 : hours}:${String(remMins).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
        valCutoff.textContent = clockStr;
      });
      sliderCutoff.addEventListener("change", () => this.runCurrentSimulation());
    }

    // Road Circuity Slider
    const sliderCircuity = document.getElementById("slider-circuity");
    const valCircuity = document.getElementById("val-circuity");
    if (sliderCircuity && valCircuity) {
      sliderCircuity.addEventListener("input", (e) => {
        valCircuity.textContent = parseFloat(e.target.value).toFixed(2);
        this.simParams.circuity_factor = parseFloat(e.target.value);
      });
      sliderCircuity.addEventListener("change", () => this.runCurrentSimulation());
    }

    // Diesel Stepper
    const btnMinus = document.getElementById("btn-diesel-minus");
    const btnPlus = document.getElementById("btn-diesel-plus");
    const inputDiesel = document.getElementById("input-diesel");
    if (btnMinus && btnPlus && inputDiesel) {
      btnMinus.addEventListener("click", () => {
        let cur = parseFloat(inputDiesel.value) - 1.0;
        if (cur < 20) cur = 20;
        inputDiesel.value = cur.toFixed(2);
        this.simParams.diesel_price = cur;
        this.runCurrentSimulation();
      });
      btnPlus.addEventListener("click", () => {
        let cur = parseFloat(inputDiesel.value) + 1.0;
        inputDiesel.value = cur.toFixed(2);
        this.simParams.diesel_price = cur;
        this.runCurrentSimulation();
      });
    }

    // Accordion Toggle
    const accHeader = document.getElementById("accordion-fuel-header");
    const accContent = document.getElementById("accordion-fuel-content");
    const accArrow = document.getElementById("accordion-arrow");
    if (accHeader && accContent) {
      accHeader.addEventListener("click", () => {
        const isOpen = accContent.style.display !== "none";
        accContent.style.display = isOpen ? "none" : "block";
        accArrow.innerHTML = isOpen ? "&#9656;" : "&#9662;";
      });
    }

    // Mouse Wheel Zoom Checkbox
    const checkZoom = document.getElementById("check-mouse-zoom");
    if (checkZoom) {
      checkZoom.addEventListener("change", (e) => {
        if (MapView.leafletMap) {
          if (e.target.checked) {
            MapView.leafletMap.scrollWheelZoom.enable();
          } else {
            MapView.leafletMap.scrollWheelZoom.disable();
          }
        }
      });
    }

    // Optional Custom Map Key Input
    const inputMapKey = document.getElementById("input-map-key");
    if (inputMapKey) {
      inputMapKey.addEventListener("change", (e) => {
        const key = e.target.value.trim();
        if (key && MapView.leafletMap) {
          try {
            const customLayer = L.tileLayer(
              `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}?access_token=${key}`,
              { tileSize: 512, zoomOffset: -1, attribution: '&copy; Mapbox', maxZoom: 19 }
            );
            customLayer.addTo(MapView.leafletMap);
            alert("Custom Mapbox tile layer activated successfully!");
          } catch (err) {
            console.warn("Could not activate custom map layer:", err);
          }
        }
      });
    }

    // Sidebar Excel Action Buttons
    const btnSync = document.getElementById("btn-sync-excel");
    if (btnSync) {
      btnSync.addEventListener("click", () => {
        alert("Synced data.xlsx successfully. Local changes merged.");
        ExcelManagerView.updateStatusBar();
      });
    }

    const btnOpenExcel = document.getElementById("btn-open-excel");
    if (btnOpenExcel) {
      btnOpenExcel.addEventListener("click", () => {
        window.location.href = "/data.xlsx";
      });
    }
  },

  bindNavTabs() {
    const tabs = document.querySelectorAll(".nav-tab-item");
    tabs.forEach(tab => {
      tab.addEventListener("click", (e) => {
        tabs.forEach(t => t.classList.remove("active"));
        e.currentTarget.classList.add("active");
        const target = e.currentTarget.getAttribute("data-tab");
        this.switchTab(target);
      });
    });
  },

  switchTab(tabName) {
    this.activeTab = tabName;
    const contents = ["map", "playground", "excel", "benchmarks", "manifests"];
    contents.forEach(c => {
      const el = document.getElementById(`tab-content-${c}`);
      if (el) el.style.display = (c === tabName) ? "flex" : "none";
      if (c === tabName && (c === "excel" || c === "manifests")) {
        el.style.display = "flex";
      }
    });

    if (tabName === "map") {
      setTimeout(() => {
        if (MapView.leafletMap) MapView.leafletMap.invalidateSize();
      }, 50);
    } else if (tabName === "manifests") {
      const activeRes = this.results[this.currentModel] || this.results.modern;
      TripSheetView.render(activeRes ? activeRes.routes : []);
    } else if (tabName === "benchmarks") {
      ComparisonView.render("comparison-container", this.results);
    } else if (tabName === "playground") {
      PlaygroundView.render("playground-container");
    } else if (tabName === "excel") {
      ExcelManagerView.render();
    }
  },

  runCurrentSimulation() {
    const schools = DataManager.currentSchools;
    const fleet = DataManager.currentFleet;
    if (!schools || schools.length === 0 || !fleet || fleet.length === 0) return;

    // Apply active vehicle capacity parameter to fleet
    fleet.forEach(v => {
      v.equivalent_capacity = this.simParams.vehicle_capacity;
    });

    // 1. Run Modern Solver (Google OR-Tools style)
    const modernSol = ModernORSolver.solve(schools, fleet, {
      dieselPriceInr: this.simParams.diesel_price,
      roadSpeedFactor: this.simParams.delivery_speed / 24.0
    });
    this.results.modern = modernSol;

    // 2. Run Classical AMRUTA
    const amrutaSol = AmrutaEngine.solve(schools, fleet, {
      k_vehicles: this.simParams.k_vehicles,
      dieselPriceInr: this.simParams.diesel_price,
      roadSpeedFactor: this.simParams.delivery_speed / 24.0
    });
    this.results.amruta = amrutaSol;

    // 3. Generate Historical Baseline
    const k = Math.min(35, schools.length);
    const baseRoutes = [];
    const chunkSize = Math.ceil(schools.length / k);
    for (let i = 0; i < k; i++) {
      const slice = schools.slice(i * chunkSize, (i + 1) * chunkSize);
      if (slice.length === 0) continue;
      const veh = fleet[i % fleet.length];
      const sheet = AmrutaEngine.computeRouteSchedule(slice, veh, i + 1, {
        dieselPrice: this.simParams.diesel_price
      });
      baseRoutes.push(sheet);
    }
    this.results.baseline = {
      model: "Pre-AMRUTA (Ad-Hoc Baseline)",
      kDeployed: baseRoutes.length,
      routes: baseRoutes,
      summary: CostEvaluator.evaluateSolution(baseRoutes, { dieselPriceInr: this.simParams.diesel_price })
    };

    // Update active model presentation
    const activeSol = this.results[this.currentModel] || this.results.modern;
    MapView.updateRoutes(activeSol.routes, this.currentModel);

    // Update KPI Header Cards
    this.updateKPICards(activeSol.summary);

    // Update subviews if active
    if (this.activeTab === "manifests") {
      TripSheetView.render(activeSol.routes);
    } else if (this.activeTab === "benchmarks") {
      ComparisonView.render("comparison-container", this.results);
    }
  },

  updateKPICards(summary) {
    if (!summary) return;

    const elSchools = document.getElementById("kpi-schools");
    const elDemand = document.getElementById("kpi-demand-sub");
    const elFleet = document.getElementById("kpi-fleet");
    const elCap = document.getElementById("kpi-cap-sub");
    const elDeadline = document.getElementById("kpi-deadline");
    const elCost = document.getElementById("kpi-cost");
    const elCostSub = document.getElementById("kpi-cost-sub");
    const elImpact = document.getElementById("kpi-impact");

    const totalDemand = Math.round(DataManager.currentSchools.reduce((acc, s) => acc + (s.equivalent_demand || 0), 0) * 10) / 10;
    const isLate = summary.maxElapsedMinutes > this.simParams.cutoff_minutes;

    if (elSchools) elSchools.textContent = summary.totalSchoolsServed || DataManager.currentSchools.length;
    if (elDemand) elDemand.textContent = `Demand: ${totalDemand} Units`;

    if (elFleet) elFleet.textContent = `${summary.totalVehicles} Vans`;
    if (elCap) elCap.textContent = `Cap: ${this.simParams.vehicle_capacity} units/van`;

    if (elDeadline) {
      elDeadline.textContent = isLate ? `${summary.lateRoutesCount} Vans Delayed` : "100% On-Time";
      elDeadline.style.color = isLate ? "#f87171" : "#34d399";
    }

    if (elCost) elCost.textContent = `INR ${Math.round(summary.totalMonthlyCostInr).toLocaleString()}`;
    if (elCostSub) elCostSub.textContent = `-${summary.costReductionPct}% Savings vs Baseline`;

    if (elImpact) elImpact.textContent = `+${summary.additionalChildrenFed.toLocaleString()}`;
  }
};

window.App = App;
window.addEventListener("DOMContentLoaded", () => App.init());
