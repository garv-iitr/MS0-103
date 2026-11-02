/**
 * Data Manager: Manages benchmark schools, fleet data, coordinates,
 * demand equivalence, and Excel/CSV import/export.
 */

const DataManager = {
  depot: {
    name: "TAPF Central Kitchen (Vasanthapura)",
    lat: 12.88812,
    lng: 77.54838,
    address: "Vasanthapura, Subramanyapura Post, South Bangalore, Karnataka 560061"
  },

  // State
  currentSchools: [],
  currentFleet: [],
  benchmarkMetrics: null,
  activeDatasetName: "demo_45", // "demo_45" or "full_530" or "custom"

  /**
   * Initializes data manager and preloads datasets
   */
  async init() {
    // Check if embedded offline data is available
    if (typeof EMBEDDED_DATA !== "undefined") {
      this.currentFleet = EMBEDDED_DATA.fleet || [];
      this.currentSchools = EMBEDDED_DATA.demoSchools || [];
      this.benchmarkMetrics = EMBEDDED_DATA.benchmarks || null;
      console.log("Initialized DataManager with embedded offline datasets.");
      return;
    }

    try {
      const benchResp = await fetch("/data/vasanthapura_benchmark_metrics.json").catch(() => null);
      if (benchResp && benchResp.ok) {
        this.benchmarkMetrics = await benchResp.json();
      }
    } catch (e) {
      console.warn("Could not load benchmark metrics file, using fallback.", e);
    }
  },

  /**
   * Updates Central Kitchen Depot coordinates live and syncs UI components
   */
  setDepotCoordinates(lat, lng, source = null) {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (isNaN(parsedLat) || isNaN(parsedLng)) return;

    this.depot.lat = Number(parsedLat.toFixed(6));
    this.depot.lng = Number(parsedLng.toFixed(6));

    // Update Header Badge
    const badgeDepot = document.getElementById("badge-depot");
    if (badgeDepot) {
      badgeDepot.textContent = `Depot: ${this.depot.name} (${this.depot.lat.toFixed(4)}, ${this.depot.lng.toFixed(4)})`;
    }

    // Update Sidebar controls if not the source
    if (source !== "sidebar") {
      const inputLat = document.getElementById("input-depot-lat");
      const inputLng = document.getElementById("input-depot-lng");
      const dispLat = document.getElementById("display-depot-lat");
      const dispLng = document.getElementById("display-depot-lng");
      if (inputLat) inputLat.value = this.depot.lat;
      if (inputLng) inputLng.value = this.depot.lng;
      if (dispLat) dispLat.textContent = this.depot.lat.toFixed(5);
      if (dispLng) dispLng.textContent = this.depot.lng.toFixed(5);
    }

    // Update Excel Row 0 if not the source
    if (source !== "excel") {
      const excelLat = document.getElementById("excel-depot-lat");
      const excelLng = document.getElementById("excel-depot-lng");
      if (excelLat) excelLat.value = this.depot.lat.toFixed(5);
      if (excelLng) excelLng.value = this.depot.lng.toFixed(5);
    }

    // Update Map Marker position if not the source
    if (source !== "map" && typeof MapView !== "undefined" && MapView.setDepotPosition) {
      MapView.setDepotPosition(this.depot.lat, this.depot.lng);
    }
  },

  /**
   * Calculates road-adjusted distance in km with 1.25x empirical factor
   */
  calculateDistance(lat1, lng1, lat2, lng2, correctionFactor = 1.25) {
    const dx = (lng2 - lng1) * 108.0;
    const dy = (lat2 - lat1) * 110.574;
    const euclidean = Math.sqrt(dx * dx + dy * dy);
    return Number((euclidean * correctionFactor).toFixed(2));
  },

  /**
   * Two speed band model:
   * Leg 1 (depot to first school): 32 km/h
   * Successive stops in cluster: 18 km/h
   */
  calculateTravelTime(distanceKm, isFirstLeg = false, speedFactor = 1.0) {
    const baseSpeed = isFirstLeg ? 32.0 : 18.0;
    const speedKmh = baseSpeed * speedFactor;
    return Number(((distanceKm / speedKmh) * 60.0).toFixed(2));
  },

  /**
   * School unloading service time:
   * Fixed base (3.5 min) + variable (0.35 min per container)
   */
  calculateServiceTime(rice, sambar, curd, fixedMin = 3.5, perContainerMin = 0.35) {
    const containers = (rice || 0) + (sambar || 0) + (curd || 0);
    return Number((fixedMin + containers * perContainerMin).toFixed(2));
  },

  /**
   * Equivalent demand unit conversion:
   * 1 vessel steamed rice = 2 vessels sambar = 4 vessels curd
   * Equivalent demand = Rice + 0.5 * Sambar + 0.25 * Curd
   */
  calculateEquivalentDemand(rice, sambar, curd) {
    return Number(((rice || 0) + (sambar || 0) * 0.5 + (curd || 0) * 0.25).toFixed(2));
  },

  /**
   * Parses CSV string into structured array
   */
  parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      // Handle commas inside quotes safely
      const match = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(",");
      const cleanCols = match.map(c => c.trim().replace(/^"|"$/g, ""));
      const obj = {};
      headers.forEach((h, idx) => {
        const val = cleanCols[idx];
        const num = Number(val);
        obj[h] = !isNaN(num) && val !== "" ? num : val;
      });
      rows.push(obj);
    }
    return rows;
  },

  /**
   * Generates CSV string from objects array
   */
  toCSV(headers, rows) {
    const headerLine = headers.join(",");
    const bodyLines = rows.map(r =>
      headers.map(h => {
        let val = r[h] !== undefined ? r[h] : "";
        if (typeof val === "string" && val.includes(",")) {
          val = `"${val}"`;
        }
        return val;
      }).join(",")
    );
    return [headerLine, ...bodyLines].join("\n");
  },

  /**
   * Exports data to a downloadable CSV/Excel-compatible file
   */
  downloadFile(content, fileName, mimeType = "text/csv;charset=utf-8;") {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

window.DataManager = DataManager;
