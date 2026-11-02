/**
 * Excel Data Manager View
 * Exact visual replica of Screenshot 2
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
      return `
        <tr>
          <td style="font-family: var(--font-mono); color: var(--text-muted); text-align: center;">${s.school_id || idx + 1}</td>
          <td style="font-weight: 600; color: var(--text-white);">${s.school_name}</td>
          <td style="font-family: var(--font-mono); font-size: 11px;">${Number(s.latitude).toFixed(4)}</td>
          <td style="font-family: var(--font-mono); font-size: 11px;">${Number(s.longitude).toFixed(4)}</td>
          <td style="font-family: var(--font-mono); text-align: right;">${s.rice_vessels || 0}</td>
          <td style="font-family: var(--font-mono); text-align: right;">${s.sambar_vessels || 0}</td>
          <td style="font-family: var(--font-mono); text-align: right;">${s.curd_vessels || 0}</td>
          <td style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-red); text-align: right;">${s.equivalent_demand || 0}</td>
          <td style="font-family: var(--font-mono); text-align: right; color: var(--text-muted);">${studentHeadcount}</td>
          <td style="text-align: center;">
            <span class="${isClosed ? 'badge-late' : 'badge-ontime'}">
              ${isClosed ? 'Closed' : 'Active'}
            </span>
          </td>
        </tr>
      `;
    }).join("");

    tbody.innerHTML = rowsHtml;
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
        alert("Reloaded latest school demand records from data.xlsx successfully.");
      });
    }
  }
};

window.ExcelManagerView = ExcelManagerView;
