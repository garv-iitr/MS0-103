/**
 * Main Application Orchestrator
 * High-performance real-time simulation updates, strict fleet constraint enforcement,
 * and seamless coordination between UI, Solvers, MapView, and Spreadsheets.
 */

const App = {
  activeTab: "map",
  currentModel: "modern", // "modern", "amruta", "baseline"
  currentScale: 100,
  debounceTimer: null,

  // Operational Simulation Parameters
  simParams: {
    k_vehicles: 10,
    vehicle_capacity: 65.0,
    delivery_speed: 24.0,
    cutoff_minutes: 270.0, // 12:30 PM (270 min from 08:00 AM)
    circuity_factor: 1.35,
    diesel_price: 45.00
  },

  results: {
    baseline: null,
    amruta: null,
    modern: null
  },

  async init() {
    console.log("Initializing AMRUTA Decision Support Engine...");

    // 1. Initialize DataManager
    await DataManager.init();
    DataManager.setDepotCoordinates(DataManager.depot.lat, DataManager.depot.lng);

    // 2. Load default 100-school dataset & fleet
    await this.switchDatasetByScale(100);

    // 3. Initialize Map View
    MapView.init("map-container");

    // 4. Bind Sidebar Controls & Nav Tabs
    this.initSidebarToggle();
    this.bindSidebarControls();
    this.bindNavTabs();
    TripSheetView.bindEvents();
    ExcelManagerView.bindEvents();
    this.updateSidebarSchoolSelector();

    // 5. Initial Simulation Run
    this.runCurrentSimulation();
  },

  debounceSimulation(delay = 40) {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.runCurrentSimulation();
    }, delay);
  },

  async switchDatasetByScale(scale = 100) {
    this.currentScale = scale;

    if (typeof EMBEDDED_DATA !== "undefined") {
      let selectedSchools = [];
      if (scale <= 45 && EMBEDDED_DATA.schools45) {
        selectedSchools = EMBEDDED_DATA.schools45;
      } else if (scale <= 100 && EMBEDDED_DATA.schools100) {
        selectedSchools = EMBEDDED_DATA.schools100.slice(0, scale);
      } else {
        const full = EMBEDDED_DATA.fullSchools || EMBEDDED_DATA.demoSchools || [];
        // Sample balanced schools across the full database
        if (scale >= full.length) {
          selectedSchools = full;
        } else {
          // Sample proportionally across corridors
          const step = full.length / scale;
          selectedSchools = [];
          for (let i = 0; i < scale; i++) {
            selectedSchools.push(full[Math.floor(i * step)]);
          }
        }
      }
      DataManager.currentSchools = selectedSchools.map(s => ({ ...s }));
      DataManager.currentFleet = (EMBEDDED_DATA.fleet || []).map(v => ({ ...v }));
    } else {
      const filename = scale > 100 ? "vasanthapura_schools_530.csv" : "vasanthapura_demo_100.csv";
      try {
        const resp = await fetch(`/data/${filename}`);
        if (resp.ok) {
          const text = await resp.text();
          const parsed = DataManager.parseCSV(text);
          DataManager.currentSchools = parsed.slice(0, Math.min(scale, parsed.length)).map(s => ({ ...s }));
        }
      } catch (e) {
        console.warn("Failed fetching CSV, using memory state.", e);
      }
    }

    const schoolCount = DataManager.currentSchools.length;
    const estChildren = Math.round(schoolCount * 328.8);
    const badgeFile = document.getElementById("badge-active-file");
    if (badgeFile) {
      const span = badgeFile.querySelector("span");
      const label = `Active: data.xlsx (${schoolCount} Schools, ${estChildren.toLocaleString()} Children)`;
      if (span) span.textContent = label;
      else badgeFile.textContent = label;
    }

    this.updateSidebarSchoolSelector();
    this.runCurrentSimulation();
    ExcelManagerView.render();
  },

  initSidebarToggle() {
    const layout = document.querySelector(".app-layout");
    const btnCollapse = document.getElementById("btn-sidebar-collapse");
    const btnExpand = document.getElementById("btn-sidebar-expand");

    const toggleSidebar = (forceState = null) => {
      if (!layout) return;
      const isCurrentlyCollapsed = layout.classList.contains("sidebar-collapsed");
      const shouldCollapse = forceState !== null ? forceState : !isCurrentlyCollapsed;

      if (shouldCollapse) {
        layout.classList.add("sidebar-collapsed");
        localStorage.setItem("amruta_sidebar_collapsed", "1");
      } else {
        layout.classList.remove("sidebar-collapsed");
        localStorage.setItem("amruta_sidebar_collapsed", "0");
      }

      // Smoothly re-frame Leaflet map to fill newly available width
      setTimeout(() => {
        if (typeof MapView !== "undefined" && MapView.leafletMap) {
          MapView.leafletMap.invalidateSize();
        }
      }, 310);
    };

    if (btnCollapse) {
      btnCollapse.addEventListener("click", () => toggleSidebar(true));
    }

    if (btnExpand) {
      btnExpand.addEventListener("click", () => toggleSidebar(false));
    }

    // Keyboard shortcut: Ctrl + B or BracketLeft
    window.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "b" || e.code === "BracketLeft")) {
        e.preventDefault();
        toggleSidebar();
      }
    });

    // Restore saved state from previous session
    if (localStorage.getItem("amruta_sidebar_collapsed") === "1" && layout) {
      layout.classList.add("sidebar-collapsed");
      setTimeout(() => {
        if (typeof MapView !== "undefined" && MapView.leafletMap) {
          MapView.leafletMap.invalidateSize();
        }
      }, 350);
    }
  },

  bindSidebarControls() {
    // Engine selector
    const engineSelect = document.getElementById("sidebar-engine");
    if (engineSelect) {
      engineSelect.addEventListener("change", (e) => {
        this.currentModel = e.target.value;
        const badgeEngine = document.getElementById("badge-active-engine");
        if (badgeEngine) {
          let name = "Google OR-Tools";
          if (this.currentModel === "amruta") name = "Classical AMRUTA";
          else if (this.currentModel === "adhoc") name = "Pre-AMRUTA (Ad-Hoc)";
          const span = badgeEngine.querySelector("span");
          if (span) span.textContent = name;
          else badgeEngine.textContent = name;
        }
        this.runCurrentSimulation();
      });
    }

    // Helper to format minutes from 8:00 AM into 24h & 12h clock strings
    const formatTimeFromMins = (mins) => {
      const hours = 8 + Math.floor(mins / 60);
      const remMins = mins % 60;
      const timeStr24 = `${String(hours).padStart(2, '0')}:${String(remMins).padStart(2, '0')}`;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const dispHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
      const clockStr12 = `${dispHours}:${String(remMins).padStart(2, '0')} ${ampm}`;
      return { timeStr24, clockStr12 };
    };

    // 1. Vehicle Capacity Dual Control (Slider + Manual Input)
    const sliderCap = document.getElementById("slider-cap-limit");
    const inputCap = document.getElementById("input-cap-limit");
    const valCap = document.getElementById("val-cap-limit");
    if (sliderCap) {
      sliderCap.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value);
        if (inputCap) inputCap.value = val;
        if (valCap) valCap.textContent = val.toFixed(2);
        this.simParams.vehicle_capacity = val;
        this.debounceSimulation();
      });
    }
    if (inputCap) {
      const onCapManualChange = (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val) && val > 0) {
          if (sliderCap) sliderCap.value = Math.min(Math.max(val, 24), 420);
          if (valCap) valCap.textContent = val.toFixed(2);
          this.simParams.vehicle_capacity = val;
          this.debounceSimulation();
        }
      };
      inputCap.addEventListener("input", onCapManualChange);
      inputCap.addEventListener("change", onCapManualChange);
    }

    // 2. Fleet Vehicles k Dual Control (Slider + Manual Input)
    const sliderK = document.getElementById("slider-k-fleet");
    const inputK = document.getElementById("input-k-fleet");
    const valK = document.getElementById("val-k-fleet");
    if (sliderK) {
      sliderK.addEventListener("input", (e) => {
        const val = parseInt(e.target.value, 10);
        if (inputK) inputK.value = val;
        if (valK) valK.textContent = val;
        this.simParams.k_vehicles = val;
        this.debounceSimulation();
      });
    }
    if (inputK) {
      const onKManualChange = (e) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val) && val >= 1) {
          if (sliderK) sliderK.value = Math.min(Math.max(val, 5), 35);
          if (valK) valK.textContent = val;
          this.simParams.k_vehicles = val;
          this.debounceSimulation();
        }
      };
      inputK.addEventListener("input", onKManualChange);
      inputK.addEventListener("change", onKManualChange);
    }

    // 3. Delivery Speed Dual Control (Slider + Manual Input)
    const sliderSpeed = document.getElementById("slider-speed");
    const inputSpeed = document.getElementById("input-speed");
    const valSpeed = document.getElementById("val-speed");
    if (sliderSpeed) {
      sliderSpeed.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value);
        if (inputSpeed) inputSpeed.value = val;
        if (valSpeed) valSpeed.textContent = val.toFixed(2);
        this.simParams.delivery_speed = val;
        this.debounceSimulation();
      });
    }
    if (inputSpeed) {
      const onSpeedManualChange = (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val) && val > 0) {
          if (sliderSpeed) sliderSpeed.value = Math.min(Math.max(val, 15), 40);
          if (valSpeed) valSpeed.textContent = val.toFixed(2);
          this.simParams.delivery_speed = val;
          this.debounceSimulation();
        }
      };
      inputSpeed.addEventListener("input", onSpeedManualChange);
      inputSpeed.addEventListener("change", onSpeedManualChange);
    }

    // 4. Lunch Cutoff Dual Control (Slider + Manual Time Input)
    const sliderCutoff = document.getElementById("slider-cutoff");
    const inputCutoff = document.getElementById("input-cutoff");
    const valCutoffText = document.getElementById("val-cutoff-text");
    const valCutoff = document.getElementById("val-cutoff");
    if (sliderCutoff) {
      sliderCutoff.addEventListener("input", (e) => {
        const mins = parseInt(e.target.value, 10);
        this.simParams.cutoff_minutes = mins;
        const t = formatTimeFromMins(mins);
        if (inputCutoff) inputCutoff.value = t.timeStr24;
        if (valCutoffText) valCutoffText.textContent = t.clockStr12;
        if (valCutoff) valCutoff.textContent = t.clockStr12;
        this.debounceSimulation();
      });
    }
    if (inputCutoff) {
      const onCutoffManualChange = (e) => {
        if (!e.target.value) return;
        const parts = e.target.value.split(":");
        if (parts.length >= 2) {
          const h = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          if (!isNaN(h) && !isNaN(m)) {
            const mins = (h - 8) * 60 + m;
            if (mins >= 120 && mins <= 480) {
              this.simParams.cutoff_minutes = mins;
              if (sliderCutoff) sliderCutoff.value = Math.min(Math.max(mins, 240), 330);
              const t = formatTimeFromMins(mins);
              if (valCutoffText) valCutoffText.textContent = t.clockStr12;
              if (valCutoff) valCutoff.textContent = t.clockStr12;
              this.debounceSimulation();
            }
          }
        }
      };
      inputCutoff.addEventListener("input", onCutoffManualChange);
      inputCutoff.addEventListener("change", onCutoffManualChange);
    }

    // 5. Road Circuity Dual Control (Slider + Manual Input)
    const sliderCircuity = document.getElementById("slider-circuity");
    const inputCircuity = document.getElementById("input-circuity");
    const valCircuity = document.getElementById("val-circuity");
    if (sliderCircuity) {
      sliderCircuity.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value);
        if (inputCircuity) inputCircuity.value = val.toFixed(2);
        if (valCircuity) valCircuity.textContent = val.toFixed(2);
        this.simParams.circuity_factor = val;
        this.debounceSimulation();
      });
    }
    if (inputCircuity) {
      const onCircuityManualChange = (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val) && val >= 1.0) {
          if (sliderCircuity) sliderCircuity.value = Math.min(Math.max(val, 1.0), 1.8);
          if (valCircuity) valCircuity.textContent = val.toFixed(2);
          this.simParams.circuity_factor = val;
          this.debounceSimulation();
        }
      };
      inputCircuity.addEventListener("input", onCircuityManualChange);
      inputCircuity.addEventListener("change", onCircuityManualChange);
    }

    // 6. Diesel Stepper & Direct Typing Input
    const btnMinus = document.getElementById("btn-diesel-minus");
    const btnPlus = document.getElementById("btn-diesel-plus");
    const inputDiesel = document.getElementById("input-diesel");
    if (btnMinus && btnPlus && inputDiesel) {
      btnMinus.addEventListener("click", () => {
        let cur = parseFloat(inputDiesel.value) - 1.0;
        if (cur < 20) cur = 20;
        inputDiesel.value = cur.toFixed(2);
        this.simParams.diesel_price = cur;
        this.debounceSimulation();
      });
      btnPlus.addEventListener("click", () => {
        let cur = parseFloat(inputDiesel.value) + 1.0;
        inputDiesel.value = cur.toFixed(2);
        this.simParams.diesel_price = cur;
        this.debounceSimulation();
      });
      const onDieselChange = (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val) && val > 0) {
          this.simParams.diesel_price = val;
          this.debounceSimulation();
        }
      };
      inputDiesel.addEventListener("input", onDieselChange);
      inputDiesel.addEventListener("change", onDieselChange);
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
          if (e.target.checked) MapView.leafletMap.scrollWheelZoom.enable();
          else MapView.leafletMap.scrollWheelZoom.disable();
        }
      });
    }

    // Central Kitchen Depot Coordinates Controls
    const inputDepotLat = document.getElementById("input-depot-lat");
    const inputDepotLng = document.getElementById("input-depot-lng");
    const dispDepotLat = document.getElementById("display-depot-lat");
    const dispDepotLng = document.getElementById("display-depot-lng");

    if (inputDepotLat) {
      inputDepotLat.addEventListener("input", (e) => {
        const lat = parseFloat(e.target.value);
        if (!isNaN(lat)) {
          if (dispDepotLat) dispDepotLat.textContent = lat.toFixed(5);
          DataManager.setDepotCoordinates(lat, DataManager.depot.lng, "sidebar");
          this.debounceSimulation(50);
        }
      });
    }

    if (inputDepotLng) {
      inputDepotLng.addEventListener("input", (e) => {
        const lng = parseFloat(e.target.value);
        if (!isNaN(lng)) {
          if (dispDepotLng) dispDepotLng.textContent = lng.toFixed(5);
          DataManager.setDepotCoordinates(DataManager.depot.lat, lng, "sidebar");
          this.debounceSimulation(50);
        }
      });
    }

    const btnResetDepot = document.getElementById("btn-reset-depot");
    if (btnResetDepot) {
      btnResetDepot.addEventListener("click", () => {
        DataManager.setDepotCoordinates(12.88812, 77.54838);
        this.debounceSimulation(20);
      });
    }

    const btnHkHill = document.getElementById("btn-depot-preset-hkhill");
    if (btnHkHill) {
      btnHkHill.addEventListener("click", () => {
        DataManager.setDepotCoordinates(12.99040, 77.55180);
        this.debounceSimulation(20);
      });
    }

    // School Status & Holiday Override Controls
    const selectSchool = document.getElementById("select-sidebar-school");
    const btnToggleStatus = document.getElementById("btn-toggle-school-status");
    const btnZoomSchool = document.getElementById("btn-zoom-to-school");
    const btnHoliday5 = document.getElementById("btn-holiday-random5");
    const btnActivateAll = document.getElementById("btn-activate-all-schools");

    if (selectSchool) {
      selectSchool.addEventListener("change", () => {
        this.syncSchoolStatusDisplay();
      });
    }

    if (btnToggleStatus) {
      btnToggleStatus.addEventListener("click", () => {
        if (!selectSchool) return;
        const schoolId = parseInt(selectSchool.value, 10);
        const school = (DataManager.currentSchools || []).find(s => s.school_id === schoolId);
        if (!school) return;
        const st = (school.status || "active").toLowerCase();
        const isClosed = st === "closed" || st === "holiday";
        school.status = isClosed ? "Active" : "Holiday";
        this.updateSidebarSchoolSelector();
        this.runCurrentSimulation();
        if (typeof ExcelManagerView !== "undefined") {
          ExcelManagerView.renderGrid();
        }
      });
    }

    if (btnZoomSchool) {
      btnZoomSchool.addEventListener("click", () => {
        if (!selectSchool) return;
        const schoolId = parseInt(selectSchool.value, 10);
        if (this.activeTab !== "map") {
          const mapTabBtn = document.querySelector('.nav-tab-item[data-tab="map"]');
          if (mapTabBtn) mapTabBtn.click();
        }
        if (typeof MapView !== "undefined" && MapView.zoomToSchool) {
          MapView.zoomToSchool(schoolId);
        }
      });
    }

    if (btnHoliday5) {
      btnHoliday5.addEventListener("click", () => {
        const schools = DataManager.currentSchools || [];
        if (schools.length === 0) return;
        schools.forEach(s => { s.status = "Active"; });
        const shuffled = [...schools].sort(() => 0.5 - Math.random());
        for (let i = 0; i < Math.min(5, shuffled.length); i++) {
          shuffled[i].status = "Holiday";
        }
        this.updateSidebarSchoolSelector();
        this.runCurrentSimulation();
        if (typeof ExcelManagerView !== "undefined") {
          ExcelManagerView.renderGrid();
        }
      });
    }

    if (btnActivateAll) {
      btnActivateAll.addEventListener("click", () => {
        const schools = DataManager.currentSchools || [];
        schools.forEach(s => { s.status = "Active"; });
        this.updateSidebarSchoolSelector();
        this.runCurrentSimulation();
        if (typeof ExcelManagerView !== "undefined") {
          ExcelManagerView.renderGrid();
        }
      });
    }

    // Sidebar Excel Action Buttons
    const btnSync = document.getElementById("btn-sync-excel");
    if (btnSync) {
      btnSync.addEventListener("click", () => {
        alert("Synced data.xlsx successfully. Changes updated in model.");
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
    const allSchools = DataManager.currentSchools;
    const fleet = DataManager.currentFleet;
    if (!allSchools || allSchools.length === 0 || !fleet || fleet.length === 0) return;

    // Filter for Active schools only (Closed/Holiday schools are skipped by vehicle dispatch)
    const schools = allSchools.filter(s => {
      const st = (s.status || "active").toLowerCase();
      return st !== "closed" && st !== "holiday";
    });

    // Update active file badge count
    const badgeFile = document.getElementById("badge-active-file");
    if (badgeFile) {
      const activeCount = schools.length;
      const totalDemand = Math.round(schools.reduce((acc, s) => acc + (s.equivalent_demand || 0), 0));
      const estChildren = Math.round(totalDemand * 56);
      const span = badgeFile.querySelector("span");
      const label = `Active: data.xlsx (${activeCount} Schools, ${estChildren.toLocaleString()} Children)`;
      if (span) span.textContent = label;
      else badgeFile.textContent = label;
    }

    const options = {
      k_vehicles: this.simParams.k_vehicles,
      vehicle_capacity: this.simParams.vehicle_capacity,
      delivery_speed: this.simParams.delivery_speed,
      cutoff_minutes: this.simParams.cutoff_minutes,
      circuity_factor: this.simParams.circuity_factor,
      dieselPriceInr: this.simParams.diesel_price
    };

    // 1. Run Modern OR Solver (Google OR-Tools metaheuristic)
    const modernSol = ModernORSolver.solve(schools, fleet, options);
    this.results.modern = modernSol;

    // 2. Run Classical AMRUTA 3-Stage Heuristic
    const amrutaSol = AmrutaEngine.solve(schools, fleet, options);
    this.results.amruta = amrutaSol;

    // 3. Generate Historical Baseline (naively partitions into k routes)
    const kBase = Math.min(this.simParams.k_vehicles, schools.length);
    const baseRoutes = [];
    const chunkSize = Math.ceil(schools.length / kBase);
    for (let i = 0; i < kBase; i++) {
      const slice = schools.slice(i * chunkSize, (i + 1) * chunkSize);
      if (slice.length === 0) continue;
      const veh = fleet[i % fleet.length];
      const sheet = ModernORSolver.computeRouteSchedule(slice, veh, i + 1, {
        speedKmh: this.simParams.delivery_speed,
        cutoffMins: this.simParams.cutoff_minutes,
        circuityFactor: this.simParams.circuity_factor,
        dieselPrice: this.simParams.diesel_price,
        workingDays: 22
      });
      baseRoutes.push(sheet);
    }
    this.results.baseline = {
      model: "Pre-AMRUTA (Ad-Hoc Baseline)",
      kDeployed: baseRoutes.length,
      routes: baseRoutes,
      summary: ModernORSolver.evaluateSolution(baseRoutes, [], {
        dieselPriceInr: this.simParams.diesel_price,
        workingDaysPerMonth: 22,
        cutoffMins: this.simParams.cutoff_minutes
      })
    };

    // Active Model Resolution
    const activeSol = this.results[this.currentModel] || this.results.modern;
    MapView.updateRoutes(activeSol.routes, this.currentModel);

    // Update Top KPI Header Cards
    this.updateKPICards(activeSol.summary, activeSol.routes);

    // Update active subviews
    if (this.activeTab === "manifests") {
      TripSheetView.render(activeSol.routes);
    } else if (this.activeTab === "benchmarks") {
      ComparisonView.render("comparison-container", this.results);
    }
  },

  updateKPICards(summary, routes) {
    if (!summary) return;

    const elSchools = document.getElementById("kpi-schools");
    const elDemand = document.getElementById("kpi-demand-sub");
    const elFleet = document.getElementById("kpi-fleet");
    const elCap = document.getElementById("kpi-cap-sub");
    const elDeadline = document.getElementById("kpi-deadline");
    const elCost = document.getElementById("kpi-cost");
    const elCostSub = document.getElementById("kpi-cost-sub");
    const elImpact = document.getElementById("kpi-impact");

    const activeSchools = DataManager.currentSchools.filter(s => {
      const st = (s.status || "active").toLowerCase();
      return st !== "closed" && st !== "holiday";
    });
    const totalRequiredDemand = Math.round(activeSchools.reduce((acc, s) => acc + (s.equivalent_demand || 0), 0) * 10) / 10;
    const totalServedDemand = Math.round((routes || []).reduce((acc, r) => acc + (r.total_demand || 0), 0) * 10) / 10;
    const unservedCount = summary.unassignedSchoolsCount || 0;

    if (elSchools) {
      if (unservedCount > 0) {
        elSchools.innerHTML = `${summary.totalSchoolsServed || 0} <span class="kpi-unit-sub" style="color: #f87171;">/ ${activeSchools.length}</span>`;
      } else {
        elSchools.innerHTML = `${summary.totalSchoolsServed || 0} <span class="kpi-unit-sub">/ ${activeSchools.length}</span>`;
      }
    }

    if (elDemand) {
      const approxMeals = Math.round(totalServedDemand * 56);
      if (unservedCount > 0) {
        elDemand.innerHTML = `<span style="color: #f87171; font-weight: 600;">⚠ ${unservedCount} Unserved</span> • ${totalServedDemand} U`;
      } else {
        elDemand.innerHTML = `Demand: ${totalServedDemand} Units • ${approxMeals.toLocaleString()} Meals`;
      }
    }

    if (elFleet) {
      elFleet.innerHTML = `${summary.totalVehicles || 0} <span class="kpi-unit-sub">Vans Active</span>`;
    }
    if (elCap) {
      elCap.textContent = `Cap: ${this.simParams.vehicle_capacity} units/van`;
    }

    const totalRoutes = (routes || []).length;
    const onTimeRoutes = totalRoutes - (summary.lateRoutesCount || 0);
    const onTimePct = totalRoutes > 0 ? Math.round((onTimeRoutes / totalRoutes) * 100) : 100;

    if (elDeadline) {
      if (onTimePct === 100) {
        elDeadline.innerHTML = `100% <span class="kpi-status-chip chip-success">On-Time</span>`;
      } else {
        elDeadline.innerHTML = `${onTimePct}% <span class="kpi-status-chip chip-late">${summary.lateRoutesCount} Late</span>`;
      }
    }

    if (elCost) {
      const costFormatted = Math.round(summary.totalMonthlyCostInr || 0).toLocaleString('en-IN');
      elCost.innerHTML = `<span class="kpi-curr">₹</span>${costFormatted}`;
    }
    if (elCostSub) {
      elCostSub.innerHTML = `<span class="kpi-trend-down">↓ ${summary.costReductionPct || 0}%</span> vs Pre-AMRUTA Baseline`;
    }

    if (elImpact) {
      elImpact.innerHTML = `+${(summary.additionalChildrenFed || 0).toLocaleString('en-IN')}`;
    }
  },

  updateSidebarSchoolSelector() {
    const selectSchool = document.getElementById("select-sidebar-school");
    if (!selectSchool) return;

    const schools = DataManager.currentSchools || [];
    const prevVal = selectSchool.value;

    selectSchool.innerHTML = schools.map(s => {
      const st = (s.status || "active").toLowerCase();
      const isClosed = st === "closed" || st === "holiday";
      const statusTag = isClosed ? " [HOLIDAY]" : "";
      return `<option value="${s.school_id}">${s.school_name}${statusTag}</option>`;
    }).join("");

    if (prevVal && schools.some(s => String(s.school_id) === String(prevVal))) {
      selectSchool.value = prevVal;
    }

    this.syncSchoolStatusDisplay();
  },

  syncSchoolStatusDisplay() {
    const selectSchool = document.getElementById("select-sidebar-school");
    const statusDot = document.getElementById("school-status-dot");
    const statusText = document.getElementById("school-status-text");
    const btnToggle = document.getElementById("btn-toggle-school-status");

    if (!selectSchool || !statusDot || !statusText) return;
    const schoolId = parseInt(selectSchool.value, 10);
    const school = (DataManager.currentSchools || []).find(s => s.school_id === schoolId);
    if (!school) return;

    const st = (school.status || "active").toLowerCase();
    const isClosed = st === "closed" || st === "holiday";
    if (isClosed) {
      statusDot.style.background = "#f87171";
      statusText.textContent = "Status: Holiday";
      if (btnToggle) {
        btnToggle.style.borderColor = "#f87171";
        btnToggle.style.color = "#f87171";
      }
    } else {
      statusDot.style.background = "#34d399";
      statusText.textContent = "Status: Active";
      if (btnToggle) {
        btnToggle.style.borderColor = "var(--border-card)";
        btnToggle.style.color = "var(--text-white)";
      }
    }
  }
};

window.App = App;
window.addEventListener("DOMContentLoaded", () => App.init());
