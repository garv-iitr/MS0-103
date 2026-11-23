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

    const summaryStripEl = document.getElementById("manifest-fleet-summary-strip");
    const labelRouteEl = document.getElementById("label-manifest-route");
    const selectEl = document.getElementById("select-manifest-route");
    const bannerEl = document.getElementById("manifest-vehicle-banner");
    const tbodyEl = document.getElementById("manifest-stops-tbody");

    if (!this.currentRoutes || this.currentRoutes.length === 0) {
      if (summaryStripEl) summaryStripEl.innerHTML = "";
      if (bannerEl) bannerEl.textContent = "No active routes available. Run simulation from sidebar.";
      if (tbodyEl) tbodyEl.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-muted);">No stops to display.</td></tr>`;
      return;
    }

    const totalDeployed = this.currentRoutes.length;
    const totalSchoolsServiced = this.currentRoutes.reduce((acc, r) => acc + (r.schools_count || 0), 0);
    const activeSchools = (DataManager.currentSchools || []).filter(s => {
      const st = (s.status || "active").toLowerCase();
      return st !== "closed" && st !== "holiday";
    });
    const totalActive = activeSchools.length;
    const unservedCount = Math.max(0, totalActive - totalSchoolsServiced);
    const totalDemandCarried = this.currentRoutes.reduce((acc, r) => acc + (r.total_demand || 0), 0).toFixed(1);

    // Populate Manifest Fleet Summary Strip
    if (summaryStripEl) {
      summaryStripEl.innerHTML = `
        <div class="manifest-stat-card">
          <span class="stat-label">Fleet Deployed</span>
          <span class="stat-value" style="color: #38bdf8;">${totalDeployed} Vehicle Routes</span>
        </div>
        <div class="manifest-stat-card">
          <span class="stat-label">Schools Serviced</span>
          <span class="stat-value" style="color: #34d399;">${totalSchoolsServiced} / ${totalActive} Schools</span>
        </div>
        <div class="manifest-stat-card">
          <span class="stat-label">Unserved Residuals</span>
          <span class="stat-value" style="color: ${unservedCount > 0 ? '#f87171' : '#34d399'};">
            ${unservedCount > 0 ? `${unservedCount} (Cutoff / Cap Limit)` : `0 (100% Fulfilled)`}
          </span>
        </div>
        <div class="manifest-stat-card">
          <span class="stat-label">Total Cargo Dispatched</span>
          <span class="stat-value" style="color: #fbbf24;">${totalDemandCarried} Units</span>
        </div>
      `;
    }

    if (labelRouteEl) {
      labelRouteEl.innerHTML = `Select Vehicle Route <span style="font-weight: 400; color: var(--text-muted); font-size: 13px;">(Route ${this.selectedRouteIndex + 1} of ${totalDeployed} — scroll list to view Routes #21 to #${totalDeployed})</span>:`;
    }

    const route = this.currentRoutes[this.selectedRouteIndex];

    // Populate Dropdown
    if (selectEl) {
      selectEl.innerHTML = this.currentRoutes.map((r, idx) => {
        const isSparse = r.schools_count <= 2;
        const sparseBadge = isSparse ? " [Sparse Sector]" : "";
        const utilStr = r.capacity_utilization_pct !== undefined ? `${r.capacity_utilization_pct}%` : `${Math.round((r.total_demand / (r.vehicle_capacity || 65)) * 100)}%`;
        return `
          <option value="${idx}" ${idx === this.selectedRouteIndex ? 'selected' : ''}>
            Route #${r.cluster_id}: ${r.vehicle_type || 'Max Pikup'} (${r.schools_count} stop${r.schools_count === 1 ? '' : 's'} | Demand: ${r.total_demand} / ${r.vehicle_capacity || 65} U | ${utilStr} cap)${sparseBadge}
          </option>
        `;
      }).join("");
    }

    // Populate Blue Banner
    if (bannerEl) {
      const lastStop = route.stops && route.stops.length > 0 ? route.stops[route.stops.length - 1] : null;
      const finalReturn = lastStop ? lastStop.arrival_clock : "11:00 AM";
      const isSparse = route.schools_count <= 2;
      const sparseNote = isSparse
        ? ` &bull; <span style="color: #fde68a;">[Sparse Sector Note: Dedicated to remote/isolated school to guarantee delivery before 12:30 PM cutoff]</span>`
        : "";
      bannerEl.innerHTML = `Vehicle: <strong>${route.vehicle_type || 'Max Pikup'}</strong> (${route.vehicle_id || 'V-01'}) &bull; Stops: <strong>${route.schools_count}</strong> &bull; Demand: <strong>${route.total_demand} / ${route.vehicle_capacity || 65} U</strong> &bull; Distance: <strong>${route.distance_km} km</strong> &bull; Depot Return: <strong>${finalReturn}</strong>${sparseNote}`;
    }

    // Populate Stops Table (Stop #, School / Stop Name, Arrival Clock, Late Status)
    if (tbodyEl) {
      const stopsHtml = (route.stops || []).map(s => {
        const isDepot = s.stop_seq === 0;
        const isLate = s.arrival_time_min > 270;
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

    // Populate Official Dedicated Paper Print Manifest
    this.renderPrintManifest(route);
  },

  renderPrintManifest(route) {
    const printEl = document.getElementById("printable-driver-manifest");
    if (!printEl || !route) return;

    const todayDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
    const lastStop = route.stops && route.stops.length > 0 ? route.stops[route.stops.length - 1] : null;
    const finalReturn = lastStop ? lastStop.arrival_clock : "11:00 AM";
    const totalMeals = Math.round((route.total_demand || 0) * 56);

    const stopsRowsHtml = (route.stops || []).map(s => {
      const isDepot = s.stop_seq === 0;
      if (isDepot) {
        return `
          <tr style="background: #f8fafc;">
            <td style="text-align: center; font-weight: bold;">0</td>
            <td><strong>${s.school_name}</strong> (Central Cooking & Dispatch Hub)</td>
            <td style="text-align: center;"><strong>08:00 AM</strong> (Departure)</td>
            <td style="text-align: center;">-</td>
            <td style="text-align: center;">-</td>
            <td style="text-align: center;">-</td>
            <td style="text-align: center;"><strong>0.0 U</strong></td>
            <td style="font-size: 8pt; color: #555; text-align: center;">DISPATCH CHECKPOINT</td>
          </tr>
        `;
      }
      return `
        <tr>
          <td style="text-align: center; font-weight: bold;">${s.stop_seq}</td>
          <td>${s.school_name}</td>
          <td style="text-align: center; font-weight: 600;">${s.arrival_clock}</td>
          <td style="text-align: center;">${s.rice_vessels !== undefined ? s.rice_vessels : '-'}</td>
          <td style="text-align: center;">${s.sambar_vessels !== undefined ? s.sambar_vessels : '-'}</td>
          <td style="text-align: center;">${s.curd_vessels !== undefined ? s.curd_vessels : '-'}</td>
          <td style="text-align: center; font-weight: 600;">${s.demand} U</td>
          <td style="height: 28px; border-bottom: 1px dotted #999;"></td>
        </tr>
      `;
    }).join("");

    printEl.innerHTML = `
      <div class="print-manifest-page">
        <div class="print-header">
          <div class="print-org-name">THE AKSHAYA PATRA FOUNDATION</div>
          <div class="print-sub-header">Central Kitchen Dispatch Hub: Vasanthapura, South Bangalore | Midday Meal Logistics (MSO-103)</div>
          <div class="print-doc-title">DAILY VEHICLE DISPATCH MANIFEST & DRIVER TRIP SHEET</div>
        </div>

        <div class="print-meta-grid">
          <div class="print-meta-item"><strong>Date of Dispatch:</strong> ${todayDate}</div>
          <div class="print-meta-item"><strong>Route ID:</strong> Route #${route.cluster_id}</div>
          <div class="print-meta-item"><strong>Assigned Vehicle:</strong> ${route.vehicle_type || 'Tata 407'} (${route.vehicle_id || 'V-01'})</div>
          <div class="print-meta-item"><strong>Vehicle Capacity:</strong> ${route.vehicle_capacity || 280} Units</div>
          <div class="print-meta-item"><strong>Assigned Driver:</strong> ____________________________________</div>
          <div class="print-meta-item"><strong>Driver Contact:</strong> ________________________</div>
          <div class="print-meta-item"><strong>Depot Departure:</strong> 08:00 AM (Scheduled)</div>
          <div class="print-meta-item"><strong>Depot Return (Est):</strong> ${finalReturn}</div>
          <div class="print-meta-item"><strong>Assigned Schools:</strong> ${route.schools_count} Destinations</div>
          <div class="print-meta-item"><strong>Total Cargo Load:</strong> ${route.total_demand} Units (~${totalMeals.toLocaleString()} Meals)</div>
          <div class="print-meta-item"><strong>Total Route Distance:</strong> ${route.distance_km} km</div>
          <div class="print-meta-item"><strong>Delivery Deadline:</strong> 12:30 PM (Strict Mandate)</div>
        </div>

        <table class="print-manifest-table">
          <thead>
            <tr>
              <th style="width: 5%;">Stop</th>
              <th style="width: 32%;">School / Destination Name</th>
              <th style="width: 11%;">Scheduled Arrival</th>
              <th style="width: 7%;">Rice</th>
              <th style="width: 7%;">Sambar</th>
              <th style="width: 7%;">Curd</th>
              <th style="width: 9%;">Total Load</th>
              <th style="width: 22%;">School Head / Teacher Signature</th>
            </tr>
          </thead>
          <tbody>
            ${stopsRowsHtml}
          </tbody>
        </table>

        <div class="print-summary-footer">
          <div class="print-sign-box">
            <div class="print-sign-title">Kitchen Dispatch Supervisor</div>
            <div class="print-sign-line">Sign: __________________________</div>
            <div class="print-sign-meta">Seal & Temperature Checked</div>
          </div>
          <div class="print-sign-box">
            <div class="print-sign-title">Assigned Vehicle Driver</div>
            <div class="print-sign-line">Sign: __________________________</div>
            <div class="print-sign-meta">Odometer (Out): _________ km</div>
          </div>
          <div class="print-sign-box">
            <div class="print-sign-title">Depot Return Security Check</div>
            <div class="print-sign-line">Sign: __________________________</div>
            <div class="print-sign-meta">Empty Vessels Returned: [  ] Yes</div>
          </div>
        </div>
      </div>
    `;
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
