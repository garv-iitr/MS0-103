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

  renderGrid() {
    const tbody = document.getElementById("excel-grid-tbody");
    if (!tbody) return;

    const schools = DataManager.currentSchools || [];
    let displayed = schools;

    if (this.filterMode === "active") {
      displayed = schools.filter((_, idx) => idx % 10 !== 0);
    } else if (this.filterMode === "closed") {
      displayed = schools.filter((_, idx) => idx % 10 === 0);
    }

    const rowsHtml = displayed.map((s, idx) => {
      const isClosed = idx % 10 === 0 && this.filterMode === "all";
      const studentHeadcount = Math.round((s.equivalent_demand || 10) * 32);
      const actualIdx = schools.findIndex(item => item.school_id === s.school_id);

      return `
        <tr data-school-idx="${actualIdx}">
          <td style="font-family: var(--font-mono); color: var(--text-muted); text-align: center;">${s.school_id || idx + 1}</td>
          <td>
            <input type="text" class="excel-inline-input text-school-name" value="${s.school_name}" style="width: 100%; min-width: 180px;">
          </td>
          <td style="font-family: var(--font-mono); font-size: 11px;">${Number(s.latitude).toFixed(4)}</td>
          <td style="font-family: var(--font-mono); font-size: 11px;">${Number(s.longitude).toFixed(4)}</td>
          <td>
            <input type="number" step="0.5" min="0" class="excel-inline-input num-rice" value="${s.rice_vessels || 0}" style="width: 55px; text-align: right;">
          </td>
          <td>
            <input type="number" step="0.5" min="0" class="excel-inline-input num-sambar" value="${s.sambar_vessels || 0}" style="width: 55px; text-align: right;">
          </td>
          <td>
            <input type="number" step="0.25" min="0" class="excel-inline-input num-curd" value="${s.curd_vessels || 0}" style="width: 55px; text-align: right;">
          </td>
          <td class="cell-eq-demand" style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-red); text-align: right;">
            ${Number(s.equivalent_demand || 0).toFixed(2)}
          </td>
          <td style="font-family: var(--font-mono); text-align: right; color: var(--text-muted);">
            ${studentHeadcount}
          </td>
          <td style="text-align: center;">
            <select class="excel-inline-input select-status" style="width: 75px; font-size: 11px;">
              <option value="active" ${!isClosed ? 'selected' : ''}>Active</option>
              <option value="closed" ${isClosed ? 'selected' : ''}>Closed</option>
            </select>
          </td>
        </tr>
      `;
    }).join("");

    tbody.innerHTML = rowsHtml;
    this.bindCellInputEvents();
  },

  bindCellInputEvents() {
    const tbody = document.getElementById("excel-grid-tbody");
    if (!tbody) return;

    // Listen for live cell changes
    tbody.querySelectorAll("tr").forEach(row => {
      const actualIdx = parseInt(row.getAttribute("data-school-idx"), 10);
      const school = DataManager.currentSchools[actualIdx];
      if (!school) return;

      const inputName = row.querySelector(".text-school-name");
      const inputRice = row.querySelector(".num-rice");
      const inputSambar = row.querySelector(".num-sambar");
      const inputCurd = row.querySelector(".num-curd");
      const cellEq = row.querySelector(".cell-eq-demand");

      const updateDemand = () => {
        const r = parseFloat(inputRice.value) || 0;
        const s = parseFloat(inputSambar.value) || 0;
        const c = parseFloat(inputCurd.value) || 0;
        const eq = Number((r + 0.5 * s + 0.25 * c).toFixed(2));
        
        school.school_name = inputName.value;
        school.rice_vessels = r;
        school.sambar_vessels = s;
        school.curd_vessels = c;
        school.equivalent_demand = eq;
        cellEq.textContent = eq.toFixed(2);

        // Live debounced recalculation
        App.debounceSimulation();
      };

      inputName.addEventListener("change", updateDemand);
      inputRice.addEventListener("input", updateDemand);
      inputSambar.addEventListener("input", updateDemand);
      inputCurd.addEventListener("input", updateDemand);
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
  }
};

window.ExcelManagerView = ExcelManagerView;
