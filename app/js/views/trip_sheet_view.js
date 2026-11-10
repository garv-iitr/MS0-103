/**
 * Daily Vehicle Trip Sheets (Driver Manifest) View
 * Exact visual replica of Screenshot 3
 */

const TripSheetView = {
  currentRoutes: [],
  selectedRouteIndex: 0,

  render(routes, selectedIdx = 0) {
    this.currentRoutes = routes || [];
    this.selectedRouteIndex = selectedIdx < this.currentRoutes.length ? selectedIdx : 0;

    const selectEl = document.getElementById("select-manifest-route");
    const bannerEl = document.getElementById("manifest-vehicle-banner");
    const tbodyEl = document.getElementById("manifest-stops-tbody");

    if (!this.currentRoutes || this.currentRoutes.length === 0) {
      if (bannerEl) bannerEl.textContent = "No active routes available. Run simulation from sidebar.";
      if (tbodyEl) tbodyEl.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-muted);">No stops to display.</td></tr>`;
      return;
    }

    const route = this.currentRoutes[this.selectedRouteIndex];

    // Populate Dropdown
    if (selectEl) {
      selectEl.innerHTML = this.currentRoutes.map((r, idx) => `
        <option value="${idx}" ${idx === this.selectedRouteIndex ? 'selected' : ''}>
          Vehicle Route #${r.cluster_id} (${r.vehicle_type || 'Max Pikup'} - ${r.schools_count} schools)
        </option>
      `).join("");
    }

    // Populate Blue Banner
    if (bannerEl) {
      const totalMins = route.elapsed_time_min || 0;
      const returnHours = 8 + Math.floor(totalMins / 60);
      const returnMins = Math.floor(totalMins % 60);
      const ampm = returnHours >= 12 ? "PM" : "AM";
      const dispH = returnHours > 12 ? returnHours - 12 : (returnHours === 0 ? 12 : returnHours);
      const depotReturnClock = `${dispH}:${String(returnMins).padStart(2, "0")} ${ampm}`;
      bannerEl.textContent = `Vehicle: ${route.vehicle_type || 'Max Pikup'} | Schools: ${route.schools_count} | Total Distance: ${route.distance_km} km | Final Depot Return: ${depotReturnClock}`;
    }

    // Populate Stops Table (Stop #, School / Stop Name, Arrival Clock, Late Status)
    if (tbodyEl) {
      const stopsHtml = (route.stops || []).map(s => {
        const isDepot = s.stop_seq === 0;
        const cutoff = (typeof App !== "undefined" && App.simParams) ? App.simParams.cutoff_minutes : 270;
        const isLate = s.arrival_time_min > cutoff;
        return `
          <tr>
            <td style="font-family: var(--font-mono); font-weight: 700; color: var(--text-muted); text-align: center;">${s.stop_seq}</td>
            <td style="font-weight: ${isDepot ? '700' : '500'}; color: ${isDepot ? '#38bdf8' : 'var(--text-white)'};">
              ${s.school_name}
            </td>
            <td style="font-family: var(--font-mono); font-weight: 600; color: ${isLate ? '#f87171' : 'var(--text-main)'};">
              ${s.arrival_clock}
            </td>
            <td style="text-align: center;">
              <input type="checkbox" ${isLate ? 'checked' : ''} disabled style="accent-color: #ef4444; width: 15px; height: 15px; cursor: default;">
            </td>
          </tr>
        `;
      }).join("");

      tbodyEl.innerHTML = stopsHtml;
    }
  },

  bindEvents() {
    const selectEl = document.getElementById("select-manifest-route");
    if (selectEl) {
      selectEl.addEventListener("change", (e) => {
        this.selectedRouteIndex = Number(e.target.value);
        this.render(this.currentRoutes, this.selectedRouteIndex);
      });
    }

    const btnExcel = document.getElementById("btn-export-trip-excel");
    if (btnExcel) {
      btnExcel.addEventListener("click", () => this.exportCurrentRouteCSV());
    }

    const btnCsv = document.getElementById("btn-export-trip-csv");
    if (btnCsv) {
      btnCsv.addEventListener("click", () => this.exportCurrentRouteCSV());
    }

    const btnPrint = document.getElementById("btn-print-trip-slip");
    if (btnPrint) {
      btnPrint.addEventListener("click", () => window.print());
    }
  },

  exportCurrentRouteCSV() {
    if (!this.currentRoutes || this.currentRoutes.length === 0) return;
    const route = this.currentRoutes[this.selectedRouteIndex];
    const headers = ["Stop_Seq", "School_Name", "Arrival_Clock", "Demand", "Distance_Km", "Travel_Min", "Service_Min"];
    const rows = (route.stops || []).map(s => ({
      Stop_Seq: s.stop_seq,
      School_Name: s.school_name,
      Arrival_Clock: s.arrival_clock,
      Demand: s.demand,
      Distance_Km: s.distance_km,
      Travel_Min: s.travel_time_min,
      Service_Min: s.service_time_min
    }));

    const csvContent = DataManager.toCSV(headers, rows);
    DataManager.downloadFile(csvContent, `TripSheet_Route_${route.cluster_id}.csv`);
  }
};

window.TripSheetView = TripSheetView;
