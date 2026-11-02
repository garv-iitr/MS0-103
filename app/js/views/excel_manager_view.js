/**
 * Excel Data Manager View
 * Fully interactive spreadsheet with inline cell editing and live simulation re-trigger
 */

const ExcelManagerView = {
  currentScale: 100,
  filterMode: "all",

  render() {
    this.updateStatusBar();
    this.renderGrid();
  },

  updateStatusBar() {
    const banner = document.getElementById("excel-status-banner");
    if (!banner) return;

    const count = DataManager.currentSchools.length;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    banner.textContent = `Connected File: data.xlsx | Last Synced: ${timeStr} | Total Schools: ${count}`;
  },

  isHoliday(s) {
    if (!s) return false;
    const st = (s.status || "active").toLowerCase();
    return st === "closed" || st === "holiday";
  },

  updateFilterCounts() {
    const schools = DataManager.currentSchools || [];
    const total = schools.length;
    const holidays = schools.filter(s => this.isHoliday(s)).length;
    const active = total - holidays;

    const elAll = document.getElementById("excel-count-all");
    const elActive = document.getElementById("excel-count-active");
    const elHoliday = document.getElementById("excel-count-holiday");
    if (elAll) elAll.textContent = total;
    if (elActive) elActive.textContent = active;
    if (elHoliday) elHoliday.textContent = holidays;
  },

  renderGrid() {
    const tbody = document.getElementById("excel-grid-tbody");
    if (!tbody) return;

    const schools = DataManager.currentSchools || [];
    let displayed = schools;

    if (this.filterMode === "active") {
      displayed = schools.filter(s => !this.isHoliday(s));
    } else if (this.filterMode === "closed") {
      displayed = schools.filter(s => this.isHoliday(s));
    }

    this.updateFilterCounts();

    const depot = DataManager.depot;
    const depotRowHtml = `
      <tr class="excel-depot-row" style="background: rgba(255, 75, 75, 0.12); border-left: 3px solid var(--accent-red);">
        <td style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-red); text-align: center;">0</td>
        <td>
          <strong style="color: #ffffff;">${depot.name}</strong>
          <span style="font-size: 11px; color: #94a3b8; display: block;">Central Cooking & Dispatch Hub</span>
        </td>
        <td style="text-align: center;">
          <span class="pill-badge pill-badge-teal" style="font-size: 11px; padding: 3px 8px;">DEPOT HUB</span>
        </td>
        <td style="text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--accent-red);">0.00</td>
        <td style="text-align: right; color: var(--text-dim);">-</td>
        <td style="text-align: right; color: var(--text-dim);">-</td>
        <td style="text-align: right; color: var(--text-dim);">-</td>
        <td style="text-align: right; color: var(--text-dim);">-</td>
        <td>
          <input type="number" step="0.0001" id="excel-depot-lat" class="excel-inline-input" value="${Number(depot.lat).toFixed(5)}" style="width: 82px; font-weight: bold; color: var(--accent-red);">
        </td>
        <td>
          <input type="number" step="0.0001" id="excel-depot-lng" class="excel-inline-input" value="${Number(depot.lng).toFixed(5)}" style="width: 82px; font-weight: bold; color: var(--accent-red);">
        </td>
      </tr>
    `;

    const rowsHtml = displayed.map((s, idx) => {
      const isHol = this.isHoliday(s);
      const studentHeadcount = s.student_headcount || Math.round((s.equivalent_demand || 10) * 56);
      const actualIdx = schools.findIndex(item => item.school_id === s.school_id);

      return `
        <tr data-school-idx="${actualIdx}" class="${isHol ? 'row-school-holiday' : ''}">
          <td style="font-family: var(--font-mono); color: var(--text-muted); text-align: center;">${s.school_id || idx + 1}</td>
          <td>
            <input type="text" class="excel-inline-input text-school-name" value="${s.school_name}" style="width: 100%; min-width: 175px;">
          </td>
          <td style="text-align: center;">
            <select class="excel-inline-input select-status ${isHol ? 'status-holiday' : 'status-active'}" style="width: 112px; font-size: 12px; font-weight: 700; border-radius: 4px; padding: 4px 6px; cursor: pointer; text-align: center;" title="Click to toggle between Active and Holiday for this school">
              <option value="Active" ${!isHol ? 'selected' : ''}>🟢 Active</option>
              <option value="Holiday" ${isHol ? 'selected' : ''}>🔴 Holiday</option>
            </select>
          </td>
          <td class="cell-eq-demand" style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-red); text-align: right;">
            ${Number(s.equivalent_demand || 0).toFixed(2)}
          </td>
          <td>
            <input type="number" step="0.5" min="0" class="excel-inline-input num-rice" value="${s.rice_vessels || 0}" style="width: 52px; text-align: right;">
          </td>
          <td>
            <input type="number" step="0.5" min="0" class="excel-inline-input num-sambar" value="${s.sambar_vessels || 0}" style="width: 52px; text-align: right;">
          </td>
          <td>
            <input type="number" step="0.25" min="0" class="excel-inline-input num-curd" value="${s.curd_vessels || 0}" style="width: 52px; text-align: right;">
          </td>
          <td class="cell-headcount" style="font-family: var(--font-mono); text-align: right; color: var(--text-muted);">
            ${studentHeadcount}
          </td>
          <td>
            <input type="number" step="0.0001" class="excel-inline-input num-lat" value="${Number(s.latitude).toFixed(4)}" style="width: 78px;">
          </td>
          <td>
            <input type="number" step="0.0001" class="excel-inline-input num-lng" value="${Number(s.longitude).toFixed(4)}" style="width: 78px;">
          </td>
        </tr>
      `;
    }).join("");

    tbody.innerHTML = depotRowHtml + rowsHtml;
    this.bindCellInputEvents();
  },

  bindCellInputEvents() {
    const tbody = document.getElementById("excel-grid-tbody");
    if (!tbody) return;

    // Depot live coordinate editing
    const excelDepotLat = document.getElementById("excel-depot-lat");
    const excelDepotLng = document.getElementById("excel-depot-lng");
    if (excelDepotLat) {
      excelDepotLat.addEventListener("input", (e) => {
        const lat = parseFloat(e.target.value);
        if (!isNaN(lat)) {
          DataManager.setDepotCoordinates(lat, DataManager.depot.lng, "excel");
          App.debounceSimulation(50);
        }
      });
    }
    if (excelDepotLng) {
      excelDepotLng.addEventListener("input", (e) => {
        const lng = parseFloat(e.target.value);
        if (!isNaN(lng)) {
          DataManager.setDepotCoordinates(DataManager.depot.lat, lng, "excel");
          App.debounceSimulation(50);
        }
      });
    }

    // Listen for live school cell changes
    tbody.querySelectorAll("tr[data-school-idx]").forEach(row => {
      const actualIdx = parseInt(row.getAttribute("data-school-idx"), 10);
      const school = DataManager.currentSchools[actualIdx];
      if (!school) return;

      const inputName = row.querySelector(".text-school-name");
      const inputLat = row.querySelector(".num-lat");
      const inputLng = row.querySelector(".num-lng");
      const inputRice = row.querySelector(".num-rice");
      const inputSambar = row.querySelector(".num-sambar");
      const inputCurd = row.querySelector(".num-curd");
      const cellEq = row.querySelector(".cell-eq-demand");
      const cellHeadcount = row.querySelector(".cell-headcount");
      const selectStatus = row.querySelector(".select-status");

      const updateDemand = () => {
        const r = parseFloat(inputRice.value) || 0;
        const s = parseFloat(inputSambar.value) || 0;
        const c = parseFloat(inputCurd.value) || 0;
        const eq = Number((r + 0.5 * s + 0.25 * c).toFixed(2));
        const headcount = Math.round(eq * 56);
        
        school.school_name = inputName.value;
        school.rice_vessels = r;
        school.sambar_vessels = s;
        school.curd_vessels = c;
        school.equivalent_demand = eq;
        school.student_headcount = headcount;
        if (cellEq) cellEq.textContent = eq.toFixed(2);
        if (cellHeadcount) cellHeadcount.textContent = headcount;

        // Live debounced recalculation
        App.debounceSimulation(30);
      };

      if (inputLat) {
        inputLat.addEventListener("input", () => {
          const lat = parseFloat(inputLat.value);
          if (!isNaN(lat)) {
            school.latitude = lat;
            App.debounceSimulation(60);
          }
        });
      }

      if (inputLng) {
        inputLng.addEventListener("input", () => {
          const lng = parseFloat(inputLng.value);
          if (!isNaN(lng)) {
            school.longitude = lng;
            App.debounceSimulation(60);
          }
        });
      }

      if (selectStatus) {
        selectStatus.addEventListener("change", (e) => {
          const val = e.target.value;
          school.status = val;
          const isNowHoliday = ExcelManagerView.isHoliday(school);

          if (isNowHoliday) {
            selectStatus.classList.remove("status-active");
            selectStatus.classList.add("status-holiday");
            row.classList.add("row-school-holiday");
          } else {
            selectStatus.classList.remove("status-holiday");
            selectStatus.classList.add("status-active");
            row.classList.remove("row-school-holiday");
          }

          ExcelManagerView.updateFilterCounts();
          if (typeof App !== "undefined" && App.updateSidebarSchoolSelector) {
            App.updateSidebarSchoolSelector();
          }
          App.debounceSimulation(20);
        });
      }

      if (inputName) {
        inputName.addEventListener("input", () => {
          school.school_name = inputName.value;
        });
        inputName.addEventListener("change", updateDemand);
      }

      if (inputRice) inputRice.addEventListener("input", updateDemand);
      if (inputSambar) inputSambar.addEventListener("input", updateDemand);
      if (inputCurd) inputCurd.addEventListener("input", updateDemand);
    });
  },

  bindEvents() {
    // Template scale buttons
    const scaleBtns = document.querySelectorAll(".btn-scale-template");
    scaleBtns.forEach(btn => {
      btn.addEventListener("click", async (e) => {
        scaleBtns.forEach(b => b.classList.remove("active"));
        e.currentTarget.classList.add("active");
        const scale = Number(e.currentTarget.getAttribute("data-scale"));
        this.currentScale = scale;
        await App.switchDatasetByScale(scale);
        this.render();
      });
    });

    // Display View Radio Filters
    const radios = document.querySelectorAll('input[name="display-view"]');
    radios.forEach(r => {
      r.addEventListener("change", (e) => {
        this.filterMode = e.target.value;
        this.renderGrid();
      });
    });

    // Action buttons
    const btnOpen = document.getElementById("btn-excel-open-direct");
    if (btnOpen) {
      btnOpen.addEventListener("click", () => {
        window.location.href = "/data.xlsx";
      });
    }

    const btnReload = document.getElementById("btn-excel-reload-direct");
    if (btnReload) {
      btnReload.addEventListener("click", () => {
        this.updateStatusBar();
        this.renderGrid();
        App.runCurrentSimulation();
      });
    }

    // Excel Toolbar Quick Holiday & Active Batch Controls
    const btnRandHol = document.getElementById("btn-excel-random-holiday");
    if (btnRandHol) {
      btnRandHol.addEventListener("click", () => {
        const schools = DataManager.currentSchools || [];
        schools.forEach(s => { s.status = "Active"; });
        const shuffled = [...schools].sort(() => 0.5 - Math.random());
        for (let i = 0; i < Math.min(5, shuffled.length); i++) {
          shuffled[i].status = "Holiday";
        }
        this.renderGrid();
        if (typeof App !== "undefined" && App.updateSidebarSchoolSelector) {
          App.updateSidebarSchoolSelector();
        }
        App.runCurrentSimulation();
      });
    }

    const btnSetAllActive = document.getElementById("btn-excel-set-all-active");
    if (btnSetAllActive) {
      btnSetAllActive.addEventListener("click", () => {
        const schools = DataManager.currentSchools || [];
        schools.forEach(s => { s.status = "Active"; });
        this.renderGrid();
        if (typeof App !== "undefined" && App.updateSidebarSchoolSelector) {
          App.updateSidebarSchoolSelector();
        }
        App.runCurrentSimulation();
      });
    }

    const btnExportCSV = document.getElementById("btn-excel-export-csv");
    if (btnExportCSV) {
      btnExportCSV.addEventListener("click", () => {
        const schools = DataManager.currentSchools || [];
        const headers = ["school_id", "school_name", "latitude", "longitude", "rice_vessels", "sambar_vessels", "curd_vessels", "equivalent_demand", "student_headcount", "cluster_zone", "status"];
        const csv = DataManager.toCSV(headers, schools);
        DataManager.downloadFile(csv, `data_${schools.length}_schools.csv`);
      });
    }
  }
};

window.ExcelManagerView = ExcelManagerView;
