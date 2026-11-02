/**
 * Interactive Map & Paths Visualizer
 * Supports:
 * - Leaflet OpenStreetMap vector tiles
 * - High-precision offline HTML5 Canvas vector map fallback
 * - Renders Route Fleet Manifest table underneath map (matching Screenshot 1)
 */

const MapView = {
  leafletMap: null,
  routeLayerGroup: null,
  markerLayerGroup: null,
  currentRoutes: [],
  activeModelName: "modern",

  // Curated 27-color palette for routes: high contrast, vibrant yet refined
  clusterColors: [
    "#ff4b4b", "#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6", "#f97316",
    "#06b6d4", "#84cc16", "#e11d48", "#6366f1", "#d97706", "#059669", "#2563eb", "#7c3aed",
    "#db2777", "#ea580c", "#0891b2", "#65a30d", "#be123c", "#4f46e5", "#b45309", "#047857",
    "#1d4ed8", "#6d28d9", "#9f1239"
  ],

  init(containerId = "map-container") {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (typeof L !== "undefined") {
      try {
        this.initLeaflet(containerId);
        return;
      } catch (e) {
        console.warn("Leaflet initialization failed, falling back to Canvas renderer.", e);
      }
    }
    this.initCanvasFallback(containerId);
  },

  initLeaflet(containerId) {
    const depot = DataManager.depot;
    this.leafletMap = L.map(containerId, {
      center: [depot.lat + 0.03, depot.lng + 0.02],
      zoom: 12,
      zoomControl: true,
      scrollWheelZoom: true
    });

    // 1. Esri World Street Map (100% Free, No API key needed, Never blocks localhost/file://, Fast CDN)
    const esriStreets = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, TomTom',
      maxZoom: 18
    });

    // 2. OpenStreetMap Humanitarian (HOT mirror - No 403 block, matching video screenshot)
    const osmHot = L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      subdomains: ['a', 'b'],
      maxZoom: 19
    });

    // 3. Esri Dark Canvas (Matches dark dashboard theme)
    const esriDark = L.layerGroup([
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", { maxZoom: 16 }),
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}", { maxZoom: 16 })
    ]);

    // 4. Esri World Imagery (Satellite)
    const esriSatellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 18
    });

    // Add default streets layer
    esriStreets.addTo(this.leafletMap);

    // Layer switcher control in top-right of map
    L.control.layers({
      "Streets (Esri)": esriStreets,
      "OpenStreetMap (HOT)": osmHot,
      "Dark Canvas": esriDark,
      "Satellite": esriSatellite
    }, null, { position: "topright" }).addTo(this.leafletMap);

    this.routeLayerGroup = L.layerGroup().addTo(this.leafletMap);
    this.markerLayerGroup = L.layerGroup().addTo(this.leafletMap);

    this.renderDepotMarker();
  },

  renderDepotMarker() {
    const depot = DataManager.depot;
    if (this.leafletMap) {
      const depotIcon = L.divIcon({
        className: "custom-depot-pin",
        html: `
          <div style="background:#ff4b4b; color:#ffffff; border:2px solid #ffffff; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 8px rgba(0,0,0,0.5); font-weight:bold; font-size:11px;">
            DEPOT
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      L.marker([depot.lat, depot.lng], { icon: depotIcon })
        .bindPopup(`
          <div style="font-family:sans-serif; padding:4px; color:#0f172a;">
            <strong style="font-size:13px;">${depot.name}</strong><br>
            <span style="font-size:11px; color:#475569;">Central Kitchen Hub (Depot 0)</span><br>
            <div style="margin-top:6px; font-size:11px; background:#f1f5f9; padding:4px 6px; border-radius:4px;">
              Dispatch start: <strong>08:00 AM</strong> | Lunch cutoff: <strong>12:30 PM</strong>
            </div>
          </div>
        `)
        .addTo(this.markerLayerGroup);
    }
  },

  updateRoutes(routes, modelName = "modern") {
    this.currentRoutes = routes || [];
    this.activeModelName = modelName;

    if (this.leafletMap) {
      this.renderLeafletRoutes();
    } else {
      this.renderCanvasRoutes();
    }

    // Populate Route Fleet Manifest Table underneath the map
    this.renderManifestTable();
  },

  renderLeafletRoutes() {
    this.routeLayerGroup.clearLayers();
    this.markerLayerGroup.clearLayers();
    this.renderDepotMarker();

    const depot = DataManager.depot;

    this.currentRoutes.forEach((route, idx) => {
      const color = this.clusterColors[idx % this.clusterColors.length];
      const stops = route.stops || [];
      if (stops.length < 2) return;

      const latlngs = stops.map(s => [s.latitude, s.longitude]);
      latlngs.push([depot.lat, depot.lng]);

      const poly = L.polyline(latlngs, {
        color: color,
        weight: 3.0,
        opacity: 0.9,
        dashArray: this.activeModelName === "baseline" ? "4, 6" : null
      }).addTo(this.routeLayerGroup);

      poly.bindTooltip(`
        <strong>Route #${route.cluster_id} (${route.vehicle_type})</strong><br>
        Distance: ${route.distance_km} km | Time: ${route.elapsed_time_min} mins<br>
        Schools: ${route.schools_count} | Demand: ${route.total_demand} units
      `, { sticky: true });

      // School circle markers
      stops.slice(1).forEach(stop => {
        const marker = L.circleMarker([stop.latitude, stop.longitude], {
          radius: 5,
          fillColor: color,
          color: "#ffffff",
          weight: 1.5,
          opacity: 1,
          fillOpacity: 0.95
        }).addTo(this.markerLayerGroup);

        marker.bindPopup(`
          <div style="font-family:sans-serif; min-width:200px; font-size:12px; color:#0f172a;">
            <strong>${stop.school_name}</strong><br>
            <span style="color:#64748b; font-size:11px;">Route #${route.cluster_id} · Stop #${stop.stop_seq}</span>
            <table style="width:100%; margin-top:4px; font-size:11px;">
              <tr><td style="color:#64748b;">Arrival:</td><td><strong>${stop.arrival_clock}</strong></td></tr>
              <tr><td style="color:#64748b;">Demand:</td><td><strong>${stop.demand}</strong> units</td></tr>
              <tr><td style="color:#64748b;">Distance:</td><td>${stop.distance_km} km</td></tr>
            </table>
          </div>
        `);
      });
    });
  },

  renderManifestTable() {
    const tbody = document.getElementById("map-manifest-tbody");
    if (!tbody) return;

    if (!this.currentRoutes || this.currentRoutes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:20px;">No active routes calculated.</td></tr>`;
      return;
    }

    const rowsHtml = this.currentRoutes.map((r, idx) => {
      const isLate = !r.is_within_time_window;
      const lastStop = r.stops && r.stops.length > 1 ? r.stops[r.stops.length - 1] : null;
      const lastETA = lastStop ? lastStop.arrival_clock : "10:30 AM";

      return `
        <tr>
          <td style="font-weight: 700; color: var(--text-white);">Route #${r.cluster_id}</td>
          <td>${r.vehicle_type || 'Max Pikup'}</td>
          <td style="font-family: var(--font-mono);">${r.schools_count}</td>
          <td style="font-family: var(--font-mono);">${r.total_demand} units</td>
          <td style="font-family: var(--font-mono);">${r.distance_km} km</td>
          <td style="font-family: var(--font-mono);">${Math.round(r.elapsed_time_min)} mins</td>
          <td style="font-family: var(--font-mono);">${lastETA}</td>
          <td>
            <span class="${isLate ? 'badge-late' : 'badge-ontime'}">
              ${isLate ? 'Late' : 'On-Time'}
            </span>
          </td>
        </tr>
      `;
    }).join("");

    tbody.innerHTML = rowsHtml;
  },

  initCanvasFallback(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
      <canvas id="offline-map-canvas" style="width:100%; height:100%; display:block; background:#111520;"></canvas>
    `;
    this.canvas = document.getElementById("offline-map-canvas");
    this.ctx = this.canvas.getContext("2d");

    const resize = () => {
      this.canvas.width = container.clientWidth * window.devicePixelRatio;
      this.canvas.height = container.clientHeight * window.devicePixelRatio;
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      this.renderCanvasRoutes();
    };
    window.addEventListener("resize", resize);
    setTimeout(resize, 50);
  },

  renderCanvasRoutes() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width / window.devicePixelRatio;
    const h = this.canvas.height / window.devicePixelRatio;
    ctx.clearRect(0, 0, w, h);

    const minLat = 12.80, maxLat = 12.98;
    const minLng = 77.48, maxLng = 77.68;
    const toX = (lng) => ((lng - minLng) / (maxLng - minLng)) * (w - 60) + 30;
    const toY = (lat) => h - (((lat - minLat) / (maxLat - minLat)) * (h - 60) + 30);

    // Subtle dark grid
    ctx.strokeStyle = "#1e2433";
    ctx.lineWidth = 0.8;
    for (let x = 30; x < w - 30; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x, h - 20);
      ctx.stroke();
    }
    for (let y = 30; y < h - 30; y += 50) {
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(w - 20, y);
      ctx.stroke();
    }

    const depot = DataManager.depot;
    const depotX = toX(depot.lng);
    const depotY = toY(depot.lat);

    this.currentRoutes.forEach((r, idx) => {
      const color = this.clusterColors[idx % this.clusterColors.length];
      const stops = r.stops || [];
      if (stops.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.2;
      ctx.moveTo(depotX, depotY);

      stops.slice(1).forEach(s => {
        ctx.lineTo(toX(s.longitude), toY(s.latitude));
      });
      ctx.lineTo(depotX, depotY);
      ctx.stroke();

      stops.slice(1).forEach(s => {
        const sx = toX(s.longitude);
        const sy = toY(s.latitude);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(sx, sy, 3.5, 0, 2 * Math.PI);
        ctx.fill();
      });
    });

    // Depot marker
    ctx.fillStyle = "#ff4b4b";
    ctx.beginPath();
    ctx.arc(depotX, depotY, 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
};

window.MapView = MapView;
