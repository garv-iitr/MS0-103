/**
 * Playground & Algorithm Lab View
 * 100% Dark Theme, strictly zero emojis
 * 1. Cost vs Responsiveness Curve (Table 2 & 4)
 * 2. Modified K-Means Priority Rule (P_i = dist / demand)
 * 3. 2-Opt Edge Interchange Simulation
 * 4. Live What-If Scenario Stress Lab
 */

const PlaygroundView = {
  activeTab: "tradeoff",

  render(containerId = "playground-container") {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <!-- Sub-tabs bar -->
        <div style="display: flex; gap: 12px; border-bottom: 1px solid var(--border-card); padding-bottom: 2px;">
          <button class="nav-tab-item ${this.activeTab === 'tradeoff' ? 'active' : ''}" data-subtab="tradeoff">
            Cost vs Responsiveness Curve
          </button>
          <button class="nav-tab-item ${this.activeTab === 'priority' ? 'active' : ''}" data-subtab="priority">
            Modified K-Means Priority Logic
          </button>
          <button class="nav-tab-item ${this.activeTab === 'twoopt' ? 'active' : ''}" data-subtab="twoopt">
            2-Opt Edge Interchange
          </button>
          <button class="nav-tab-item ${this.activeTab === 'whatif' ? 'active' : ''}" data-subtab="whatif">
            Live What-If Stress Lab
          </button>
        </div>

        <!-- Content Area -->
        <div id="subtab-content-area"></div>
      </div>
    `;

    this.renderSubTabContent();
    this.bindEvents(containerId);
  },

  bindEvents(containerId) {
    const tabBtns = document.querySelectorAll("#playground-container .nav-tab-item");
    tabBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        this.activeTab = e.currentTarget.getAttribute("data-subtab");
        this.render(containerId);
      });
    });
  },

  renderSubTabContent() {
    const content = document.getElementById("subtab-content-area");
    if (!content) return;

    if (this.activeTab === "tradeoff") {
      this.renderTradeoffTab(content);
    } else if (this.activeTab === "priority") {
      this.renderPriorityTab(content);
    } else if (this.activeTab === "twoopt") {
      this.renderTwoOptTab(content);
    } else if (this.activeTab === "whatif") {
      this.renderWhatIfTab(content);
    }
  },

  renderTradeoffTab(container) {
    const table2Data = [
      { k: 20, costLakhs: 11.07, timeMin: 305.7, label: "Minimal Cost (Violates Cutoff: 5.1 hrs)" },
      { k: 22, costLakhs: 12.02, timeMin: 294.0, label: "High Delay" },
      { k: 25, costLakhs: 12.85, timeMin: 268.3, label: "Marginally Feasible" },
      { k: 26, costLakhs: 13.38, timeMin: 261.8, label: "Feasible" },
      { k: 27, costLakhs: 13.76, timeMin: 246.7, label: "Preferred Sweet Spot (4.1 hrs, 18.6% Savings)" },
      { k: 28, costLakhs: 14.28, timeMin: 245.3, label: "Diminishing Returns" },
      { k: 30, costLakhs: 15.21, timeMin: 245.0, label: "Diminishing Returns" },
      { k: 35, costLakhs: 17.39, timeMin: 244.4, label: "Pre-AMRUTA Fleet Size" }
    ];

    container.innerHTML = `
      <div style="background: var(--bg-card); border: 1px solid var(--border-card); border-radius: 6px; padding: 20px; display: flex; flex-direction: column; gap: 20px;">
        <div>
          <h3 style="font-size: 15px; font-weight: 700; color: var(--text-white); margin-bottom: 4px;">
            The Managerial Trade-Off Curve (INFORMS Table 2 & 4)
          </h3>
          <p style="font-size: 12px; color: var(--text-muted); margin: 0; line-height: 1.5;">
            In operations management, minimizing mathematical cost alone often produces unacceptable service delay.
            Reducing fleet from 27 to 20 vans saves INR 269,000 monthly, but increases duration from 4.1 hours to 5.1 hours—causing schools to miss lunch.
          </p>
        </div>

        <!-- Dark SVG Interactive Chart -->
        <div style="background: #111520; border: 1px solid #232938; border-radius: 6px; padding: 16px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-bottom: 10px;">
            <div><span style="display:inline-block; width:10px; height:10px; background:#10b981; margin-right:4px; border-radius:2px;"></span> Monthly Cost (INR Lakhs)</div>
            <div><span style="display:inline-block; width:10px; height:10px; background:#f59e0b; margin-right:4px; border-radius:2px;"></span> Delivery Elapsed Time (Minutes)</div>
            <div><span style="display:inline-block; width:10px; height:10px; background:#ef4444; margin-right:4px; border-radius:2px;"></span> 12:30 PM Cutoff (270 min)</div>
          </div>

          <svg viewBox="0 0 700 240" style="width: 100%; height: 220px; overflow: visible;">
            <!-- Gridlines -->
            <line x1="50" y1="20" x2="660" y2="20" stroke="#1c2333" stroke-width="1"/>
            <line x1="50" y1="70" x2="660" y2="70" stroke="#1c2333" stroke-width="1"/>
            <line x1="50" y1="120" x2="660" y2="120" stroke="#1c2333" stroke-width="1"/>
            <line x1="50" y1="170" x2="660" y2="170" stroke="#1c2333" stroke-width="1"/>

            <!-- 270 min cutoff line -->
            <line x1="50" y1="95" x2="660" y2="95" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,4"/>
            <text x="665" y="99" fill="#ef4444" font-size="10" font-weight="bold">270m Cutoff</text>

            <!-- Cost curve -->
            <path d="M 50,180 Q 300,130 660,30" fill="none" stroke="#10b981" stroke-width="2.5"/>
            <!-- Time curve -->
            <path d="M 50,30 Q 200,80 400,130 L 660,133" fill="none" stroke="#f59e0b" stroke-width="2.5"/>

            <!-- Highlight Preferred k=27 -->
            <circle cx="400" cy="100" r="6" fill="#ff4b4b" stroke="#ffffff" stroke-width="2"/>
            <text x="360" y="80" fill="#ffffff" font-weight="bold" font-size="11">Selected: k = 27</text>
            <text x="360" y="66" fill="#94a3b8" font-size="10">INR 13.76L · 246.7 min</text>

            <!-- Highlight Minimal k=20 -->
            <circle cx="50" cy="180" r="4" fill="#10b981"/>
            <circle cx="50" cy="30" r="4" fill="#f59e0b"/>
            <text x="55" y="24" fill="#ef4444" font-weight="bold" font-size="10">k = 20 (305m > Cutoff)</text>

            <!-- X Axis Labels -->
            <text x="50" y="200" font-size="10" fill="#64748b" text-anchor="middle">k=20</text>
            <text x="170" y="200" font-size="10" fill="#64748b" text-anchor="middle">k=22</text>
            <text x="290" y="200" font-size="10" fill="#64748b" text-anchor="middle">k=25</text>
            <text x="400" y="200" font-size="10" fill="#ffffff" font-weight="bold" text-anchor="middle">k=27</text>
            <text x="530" y="200" font-size="10" fill="#64748b" text-anchor="middle">k=30</text>
            <text x="660" y="200" font-size="10" fill="#64748b" text-anchor="middle">k=35</text>
            <text x="355" y="222" font-size="11" fill="#94a3b8" font-weight="bold" text-anchor="middle">Deployed Fleet Size (k vehicles)</text>
          </svg>
        </div>

        <!-- Table 2 Reference Strip -->
        <div class="manifest-table-wrapper">
          <table class="dark-table">
            <thead>
              <tr>
                <th>Vehicles (k)</th>
                <th>Monthly Cost (INR)</th>
                <th>Elapsed Duration</th>
                <th>Managerial Assessment</th>
              </tr>
            </thead>
            <tbody>
              ${table2Data.map(d => `
                <tr style="${d.k === 27 ? 'background-color: rgba(255, 75, 75, 0.08); font-weight: bold;' : ''}">
                  <td style="font-family: var(--font-mono);">${d.k}</td>
                  <td style="font-family: var(--font-mono);">${d.costLakhs} Lakhs</td>
                  <td style="font-family: var(--font-mono); color: ${d.timeMin > 270 ? '#f87171' : '#34d399'};">${d.timeMin} mins</td>
                  <td>${d.label}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderPriorityTab(container) {
    container.innerHTML = `
      <div style="background: var(--bg-card); border: 1px solid var(--border-card); border-radius: 6px; padding: 20px; display: flex; flex-direction: column; gap: 20px;">
        <div>
          <h3 style="font-size: 15px; font-weight: 700; color: var(--text-white); margin-bottom: 4px;">
            Stage 1: Modified K-Means Priority Metric
          </h3>
          <p style="font-size: 12px; color: var(--text-muted); margin: 0; line-height: 1.5;">
            Standard K-Means clusters purely by Euclidean distance, grouping neighboring high-demand schools together and blowing up vehicle capacity.
            AMRUTA modifies this by calculating priority as the ratio of distance to demand.
          </p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px;">
          <div style="background: #111520; border: 1px solid var(--border-card); border-radius: 6px; padding: 14px; font-size: 12px;">
            <div style="font-weight: 700; color: #94a3b8; margin-bottom: 8px;">Standard K-Means (Distance Only)</div>
            <div style="background: #181d2a; padding: 10px; border-radius: 4px; font-family: var(--font-mono); color: var(--text-main); margin-bottom: 8px;">
              Metric = Distance(School, Centroid)
            </div>
            <div style="color: var(--text-dim); font-size: 11px;">
              Clumps large demand points together, exhausting vehicle capacity early and leaving isolated schools unserviceable.
            </div>
          </div>

          <div style="background: rgba(16, 185, 129, 0.06); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px; padding: 14px; font-size: 12px;">
            <div style="font-weight: 700; color: #34d399; margin-bottom: 8px;">AMRUTA Priority Metric</div>
            <div style="background: #181d2a; border: 1px solid rgba(16, 185, 129, 0.4); padding: 10px; border-radius: 4px; font-family: var(--font-mono); color: #34d399; font-weight: 700; margin-bottom: 8px;">
              P_i = Distance(School, Centroid) / Demand_i
            </div>
            <div style="color: #a7f3d0; font-size: 11px;">
              Top k demand points become initial seeds. Smaller demand points with lower P_i pack neatly into residual vehicle capacity.
            </div>
          </div>
        </div>

        <div style="background: #111520; border: 1px solid var(--border-card); border-radius: 6px; padding: 16px;">
          <div style="font-size: 12px; font-weight: 700; color: var(--text-white); margin-bottom: 12px;">Interactive Metric Calculator (Manual & Slider Controls)</div>
          <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; align-items: center;">
            <div>
              <div class="control-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span class="control-label">Distance to Centroid</span>
                <div class="control-input-pill" style="background: #161c2b; border: 1px solid var(--border-card); border-radius: 4px; padding: 2px 6px; display: inline-flex; align-items: center; gap: 3px;">
                  <input type="number" id="sim-d-num" min="0.5" max="30" step="0.5" value="6" class="control-num-input" style="width: 44px; text-align: right; background: transparent; border: none; color: #ff4b4b; font-family: var(--font-mono); font-weight: 700; font-size: 12px; outline: none;">
                  <span class="control-unit-badge" style="font-size: 11px; color: var(--text-muted);">km</span>
                </div>
              </div>
              <div id="sim-d-val" style="display: none;">6.00 km</div>
              <input type="range" id="sim-d-input" min="1" max="25" value="6" step="0.5" class="range-slider">
              <div class="slider-limits-hint">
                <span>1 km</span>
                <span>25 km</span>
              </div>
            </div>
            <div>
              <div class="control-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span class="control-label">School Demand</span>
                <div class="control-input-pill" style="background: #161c2b; border: 1px solid var(--border-card); border-radius: 4px; padding: 2px 6px; display: inline-flex; align-items: center; gap: 3px;">
                  <input type="number" id="sim-q-num" min="1" max="50" step="1" value="15" class="control-num-input" style="width: 44px; text-align: right; background: transparent; border: none; color: #ff4b4b; font-family: var(--font-mono); font-weight: 700; font-size: 12px; outline: none;">
                  <span class="control-unit-badge" style="font-size: 11px; color: var(--text-muted);">units</span>
                </div>
              </div>
              <div id="sim-q-val" style="display: none;">15.00 units</div>
              <input type="range" id="sim-q-input" min="1" max="40" value="15" step="1" class="range-slider">
              <div class="slider-limits-hint">
                <span>1 unit</span>
                <span>40 units</span>
              </div>
            </div>
            <div style="background: #161c2b; border: 1px solid var(--border-card); border-radius: 6px; padding: 12px; text-align: center;">
              <span style="font-size: 11px; color: var(--text-muted); display: block;">Computed Priority (P_i)</span>
              <div id="sim-res-val" style="font-size: 20px; font-weight: 700; color: #34d399; font-family: var(--font-mono);">0.40</div>
              <span style="font-size: 10px; color: var(--text-dim);">(Lower ratio = Assigned earlier)</span>
            </div>
          </div>
        </div>
      </div>
    `;

    const dIn = document.getElementById("sim-d-input");
    const dNum = document.getElementById("sim-d-num");
    const qIn = document.getElementById("sim-q-input");
    const qNum = document.getElementById("sim-q-num");
    const dVal = document.getElementById("sim-d-val");
    const qVal = document.getElementById("sim-q-val");
    const resVal = document.getElementById("sim-res-val");

    const update = (source) => {
      let d = dIn ? parseFloat(dIn.value) : 6.0;
      let q = qIn ? parseFloat(qIn.value) : 15.0;

      if (source === "dNum" && dNum) {
        const val = parseFloat(dNum.value);
        if (!isNaN(val) && val > 0) {
          d = val;
          if (dIn) dIn.value = Math.min(Math.max(val, 1), 25);
        }
      } else if (source === "dIn" && dIn && dNum) {
        dNum.value = d;
      }

      if (source === "qNum" && qNum) {
        const val = parseFloat(qNum.value);
        if (!isNaN(val) && val > 0) {
          q = val;
          if (qIn) qIn.value = Math.min(Math.max(val, 1), 40);
        }
      } else if (source === "qIn" && qIn && qNum) {
        qNum.value = q;
      }

      if (dVal) dVal.textContent = `${d.toFixed(2)} km`;
      if (qVal) qVal.textContent = `${q.toFixed(2)} units`;
      if (resVal) resVal.textContent = q > 0 ? (d / q).toFixed(2) : "0.00";
    };

    if (dIn) dIn.addEventListener("input", () => update("dIn"));
    if (dNum) {
      dNum.addEventListener("input", () => update("dNum"));
      dNum.addEventListener("change", () => update("dNum"));
    }
    if (qIn) qIn.addEventListener("input", () => update("qIn"));
    if (qNum) {
      qNum.addEventListener("input", () => update("qNum"));
      qNum.addEventListener("change", () => update("qNum"));
    }
  },

  renderTwoOptTab(container) {
    container.innerHTML = `
      <div style="background: var(--bg-card); border: 1px solid var(--border-card); border-radius: 6px; padding: 20px; display: flex; flex-direction: column; gap: 20px;">
        <div>
          <h3 style="font-size: 15px; font-weight: 700; color: var(--text-white); margin-bottom: 4px;">
            Stage 2: 2-Opt Boundary Node Interchange
          </h3>
          <p style="font-size: 12px; color: var(--text-muted); margin: 0; line-height: 1.5;">
            Nodes on the boundary of adjacent clusters are systematically evaluated for interchange. A swap is accepted only if vehicle capacity and travel time budgets are preserved.
          </p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; text-align: center;">
          <div style="background: #111520; border: 1px solid var(--border-card); border-radius: 6px; padding: 16px;">
            <div style="font-weight: 700; color: #f87171; font-size: 12px; margin-bottom: 12px;">Before: Crisscrossing Boundary Edges</div>
            <svg viewBox="0 0 200 100" style="width: 100%; height: 90px;">
              <circle cx="20" cy="20" r="5" fill="#3b82f6"/>
              <circle cx="180" cy="80" r="5" fill="#3b82f6"/>
              <circle cx="20" cy="80" r="5" fill="#10b981"/>
              <circle cx="180" cy="20" r="5" fill="#10b981"/>
              <line x1="20" y1="20" x2="180" y2="80" stroke="#ef4444" stroke-width="2"/>
              <line x1="20" y1="80" x2="180" y2="20" stroke="#ef4444" stroke-width="2"/>
            </svg>
            <div style="font-size: 11px; color: var(--text-dim); margin-top: 6px; font-family: var(--font-mono);">
              Total Distance: 28.4 km
            </div>
          </div>

          <div style="background: #111520; border: 1px solid var(--border-card); border-radius: 6px; padding: 16px;">
            <div style="font-weight: 700; color: #34d399; font-size: 12px; margin-bottom: 12px;">After 2-Opt: Parallel Uncrossed Arcs</div>
            <svg viewBox="0 0 200 100" style="width: 100%; height: 90px;">
              <circle cx="20" cy="20" r="5" fill="#3b82f6"/>
              <circle cx="180" cy="20" r="5" fill="#3b82f6"/>
              <circle cx="20" cy="80" r="5" fill="#10b981"/>
              <circle cx="180" cy="80" r="5" fill="#10b981"/>
              <line x1="20" y1="20" x2="180" y2="20" stroke="#10b981" stroke-width="2"/>
              <line x1="20" y1="80" x2="180" y2="80" stroke="#10b981" stroke-width="2"/>
            </svg>
            <div style="font-size: 11px; color: #34d399; margin-top: 6px; font-family: var(--font-mono); font-weight: 700;">
              Total Distance: 19.8 km (-30.2%)
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderWhatIfTab(container) {
    container.innerHTML = `
      <div style="background: var(--bg-card); border: 1px solid var(--border-card); border-radius: 6px; padding: 20px; display: flex; flex-direction: column; gap: 20px;">
        <div>
          <h3 style="font-size: 15px; font-weight: 700; color: var(--text-white); margin-bottom: 4px;">
            Executive What-If Stress Testing
          </h3>
          <p style="font-size: 12px; color: var(--text-muted); margin: 0; line-height: 1.5;">
            Simulate operational disruptions such as driver absenteeism, monsoon road traffic, or diesel price fluctuations.
          </p>
        </div>

        <div style="display: flex; justify-content: flex-end;">
          <button id="btn-run-stress-test" class="btn-dark-secondary" style="border-color: var(--accent-red); color: var(--accent-red);">
            Run Real-Time Stress Test
          </button>
        </div>

        <div id="stress-test-results-box" style="background: #111520; border: 1px solid var(--border-card); border-radius: 6px; padding: 16px; font-size: 12px;">
          <div style="text-align: center; color: var(--text-muted);">
            Adjust simulation parameters in the left sidebar and click "Run Real-Time Stress Test".
          </div>
        </div>
      </div>
    `;

    const btnRun = document.getElementById("btn-run-stress-test");
    btnRun.addEventListener("click", () => {
      const activeRes = App.results[App.currentModel] || App.results.modern;
      if (!activeRes) return;

      const s = activeRes.summary;
      const isLate = s.maxElapsedMinutes > 270;

      const resultsBox = document.getElementById("stress-test-results-box");
      resultsBox.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-card); padding-bottom: 8px;">
            <span style="font-weight: 700; color: var(--text-white);">Simulation Evaluation Result</span>
            <span class="${isLate ? 'badge-late' : 'badge-ontime'}">
              ${isLate ? `${s.lateRoutesCount} Routes Exceed Deadline` : '100% On-Time Delivery Feasible'}
            </span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; text-align: center;">
            <div style="background: #181d2a; padding: 10px; border-radius: 4px;">
              <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase;">Total Monthly Cost</div>
              <div style="font-size: 14px; font-weight: 700; color: var(--text-white); font-family: var(--font-mono); margin-top: 2px;">
                INR ${Math.round(s.totalMonthlyCostInr).toLocaleString()}
              </div>
            </div>
            <div style="background: #181d2a; padding: 10px; border-radius: 4px;">
              <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase;">Max Delivery Time</div>
              <div style="font-size: 14px; font-weight: 700; color: ${isLate ? '#f87171' : '#34d399'}; font-family: var(--font-mono); margin-top: 2px;">
                ${s.maxElapsedMinutes} mins
              </div>
            </div>
            <div style="background: #181d2a; padding: 10px; border-radius: 4px;">
              <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase;">Cost Reduction</div>
              <div style="font-size: 14px; font-weight: 700; color: #34d399; font-family: var(--font-mono); margin-top: 2px;">
                ${s.costReductionPct}%
              </div>
            </div>
            <div style="background: #181d2a; padding: 10px; border-radius: 4px;">
              <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase;">Children Added</div>
              <div style="font-size: 14px; font-weight: 700; color: #34d399; font-family: var(--font-mono); margin-top: 2px;">
                +${s.additionalChildrenFed.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      `;
    });
  }
};

window.PlaygroundView = PlaygroundView;
