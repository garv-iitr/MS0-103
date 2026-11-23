/**
 * Algorithm and Benchmark View (Consolidated Academic Dossier)
 * Course: MSO-103: Optimisation Models for Managers
 * Case: Redesigning Midday Meal Logistics for The Akshaya Patra Foundation (INFORMS Interfaces 2013)
 * 
 * Sections:
 * 1. Formal Mathematical Formulation (HFFVRPTW MILP Model)
 * 2. Algorithmic Breakdown & Computational Complexity Analysis
 * 3. Comparative Operations Research Performance Benchmark Matrix (Table 4)
 * 4. Managerial Trade-Off Curve (Cost vs Responsiveness, Table 2)
 * 5. Algorithmic Mechanics & Sensitivity Stress Lab (Priority Logic, 2-Opt, Stress Tests)
 */

const ComparisonView = {
  render(containerId = "comparison-container", results = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const res = results || (typeof App !== "undefined" ? App.results : {}) || {};
    const amrutaLive = res.amruta || null;
    const modernLive = res.modern || null;

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 24px; padding-bottom: 40px; color: #e2e8f0;">

        <!-- Header & Quick Jump Bar -->
        <div style="background: var(--bg-card); border: 1px solid var(--border-card); border-radius: 6px; padding: 18px 22px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
          <div>
            <h2 style="font-size: 16px; font-weight: 700; color: #ffffff; margin: 0 0 4px 0; letter-spacing: -0.2px;">
              Operations Research Methodology & Comparative Benchmarks
            </h2>
            <p style="font-size: 12px; color: var(--text-muted); margin: 0; line-height: 1.4;">
              Heterogeneous Fixed Fleet Vehicle Routing with Time Windows (HFFVRPTW) — INFORMS Interfaces 2013 Table 4 Verification
            </p>
          </div>
          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <button id="btn-bench-reset-optimum" class="btn-dark-secondary" style="border-color: #22c55e; color: #22c55e; font-size: 12px; padding: 7px 14px; font-weight: 600; cursor: pointer;" title="Reset simulation parameters to Table 4 Global Optimum (k=27)">
              Reset to Table 4 Optimum (k = 27)
            </button>
          </div>
        </div>

        <!-- Sticky Quick Navigation Pills -->
        <div style="display: flex; gap: 8px; flex-wrap: wrap; border-bottom: 1px solid #1f1f1f; padding-bottom: 10px;">
          <a href="#sec-math-formulation" class="btn-dark-secondary" style="font-size: 11.5px; padding: 5px 11px; text-decoration: none;">1. Mathematical Formulation</a>
          <a href="#sec-algo-breakdown" class="btn-dark-secondary" style="font-size: 11.5px; padding: 5px 11px; text-decoration: none;">2. Algorithmic Breakdown</a>
          <a href="#sec-benchmark-matrix" class="btn-dark-secondary" style="font-size: 11.5px; padding: 5px 11px; text-decoration: none;">3. Performance Benchmark Matrix</a>
          <a href="#sec-tradeoff-curve" class="btn-dark-secondary" style="font-size: 11.5px; padding: 5px 11px; text-decoration: none;">4. Managerial Trade-Off Curve</a>
          <a href="#sec-stress-lab" class="btn-dark-secondary" style="font-size: 11.5px; padding: 5px 11px; text-decoration: none;">5. Algorithmic Mechanics & Stress Lab</a>
        </div>

        <!-- =========================================================================
             SECTION 1: MATHEMATICAL FORMULATION (HFFVRPTW MILP)
             ========================================================================= -->
        <section id="sec-math-formulation" style="background: var(--bg-card); border: 1px solid var(--border-card); border-radius: 6px; padding: 22px; display: flex; flex-direction: column; gap: 18px;">
          <div style="border-bottom: 1px solid #1f1f1f; padding-bottom: 12px;">
            <div style="font-size: 10.5px; font-weight: 700; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.8px;">Section 1 &bull; Rigorous Formulation</div>
            <h3 style="font-size: 15px; font-weight: 700; color: #ffffff; margin: 4px 0 2px 0;">
              Heterogeneous Fixed Fleet Vehicle Routing Problem with Time Windows (HFFVRPTW)
            </h3>
            <p style="font-size: 12px; color: var(--text-muted); margin: 0; line-height: 1.5;">
              The midday meal logistics problem is formulated as a mixed-integer linear program (MILP) on a directed complete graph G = (V, A), where V = {0} &cup; C represents the kitchen depot (0) and n beneficiary schools C = {1, ..., n}.
            </p>
          </div>

          <!-- Parameters & Sets Grid -->
          <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px;">
            <div style="background: #0a0a0a; border: 1px solid #1f1f1f; border-radius: 5px; padding: 14px; font-size: 12px;">
              <div style="font-weight: 700; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase; font-size: 10.5px;">Sets &amp; Indices</div>
              <ul style="margin: 0; padding-left: 18px; line-height: 1.7; color: #d1d5db;">
                <li><code style="color: #60a5fa; font-family: var(--font-mono);">V = {0} &cup; C</code> : Node set (Depot 0 at Vasanthapura: 12.88812&deg;N, 77.54838&deg;E; schools C = {1, ..., n})</li>
                <li><code style="color: #60a5fa; font-family: var(--font-mono);">K = {1, ..., k}</code> : Heterogeneous fleet of available vehicles (Eicher 280 U, Tata 407 120 U)</li>
                <li><code style="color: #60a5fa; font-family: var(--font-mono);">A = {(i, j) : i, j &isin; V, i &ne; j}</code> : Directed road network arc set</li>
              </ul>
            </div>

            <div style="background: #0a0a0a; border: 1px solid #1f1f1f; border-radius: 5px; padding: 14px; font-size: 12px;">
              <div style="font-weight: 700; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase; font-size: 10.5px;">Operational Parameters</div>
              <ul style="margin: 0; padding-left: 18px; line-height: 1.7; color: #d1d5db;">
                <li><code style="color: #34d399; font-family: var(--font-mono);">q_i</code> : Meal cargo demand of school i in standardized vessel units (q_0 = 0)</li>
                <li><code style="color: #34d399; font-family: var(--font-mono);">d_ij = &gamma; &bull; Haversine(i, j)</code> : Road distance (km) calibrated with circuity factor &gamma; = 1.35</li>
                <li><code style="color: #34d399; font-family: var(--font-mono);">&tau;_ij = (d_ij / v) &bull; 60</code> : Transit duration in minutes at speed v = 24 km/h</li>
                <li><code style="color: #34d399; font-family: var(--font-mono);">s_i = 10 min</code> : Drop-off service and vessel unloading duration at each school</li>
                <li><code style="color: #34d399; font-family: var(--font-mono);">T_max = 270 min</code> : Strict lunch bell delivery cutoff time (12:30 PM from 08:00 AM dispatch)</li>
              </ul>
            </div>
          </div>

          <!-- Objective Function Box -->
          <div style="background: #0d0d0d; border: 1px solid #262626; border-left: 3px solid #3b82f6; border-radius: 5px; padding: 14px 18px;">
            <div style="font-weight: 700; color: #ffffff; font-size: 13px; margin-bottom: 6px;">Objective Function: Minimize Total Monthly Operating Cost</div>
            <div style="font-family: var(--font-mono); font-size: 13px; color: #60a5fa; background: #000000; padding: 10px 14px; border-radius: 4px; border: 1px solid #1f1f1f; overflow-x: auto; margin-bottom: 8px;">
              min Z = &sum;<sub>k &isin; K</sub> F_k &bull; z_k + &sum;<sub>k &isin; K</sub> &sum;<sub>i &isin; V</sub> &sum;<sub>j &isin; V</sub> c_var &bull; d_ij &bull; x_ijk
            </div>
            <div style="font-size: 11.5px; color: var(--text-muted); line-height: 1.5;">
              Where <code style="color: #94a3b8;">F_k &approx; &inr;35,000/month</code> is the fixed amortized monthly capital/leasing cost per vehicle, and <code style="color: #94a3b8;">c_var &approx; &inr;12.50/km</code> is the variable diesel expenditure (calibrated at &inr;45-60/L diesel and 3.6-4.5 km/L fuel efficiency).
            </div>
          </div>

          <!-- 5 Core Mathematical Constraints -->
          <div>
            <div style="font-weight: 700; color: #ffffff; font-size: 13px; margin-bottom: 10px;">The Five Essential Operations Research Constraints</div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              
              <!-- Constraint 1 -->
              <div style="background: #0a0a0a; border: 1px solid #1f1f1f; border-radius: 5px; padding: 12px 16px; font-size: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
                  <strong style="color: #ffffff;">1. Single-Visit Guarantee</strong>
                  <span style="font-family: var(--font-mono); color: #34d399; font-weight: 700;">&sum;<sub>k &isin; K</sub> y_ik = 1 &nbsp;&forall; i &isin; C</span>
                </div>
                <div style="color: var(--text-muted); font-size: 11.5px;">
                  Each beneficiary school is assigned to exactly one vehicle route to prevent duplicate drop-offs or split vessel shipments.
                </div>
              </div>

              <!-- Constraint 2 -->
              <div style="background: #0a0a0a; border: 1px solid #1f1f1f; border-radius: 5px; padding: 12px 16px; font-size: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
                  <strong style="color: #ffffff;">2. Depot Flow Conservation</strong>
                  <span style="font-family: var(--font-mono); color: #34d399; font-weight: 700;">&sum;<sub>j &isin; C</sub> x_0jk = z_k, &nbsp; &sum;<sub>i &isin; C</sub> x_i0k = z_k &nbsp;&forall; k &isin; K</span>
                </div>
                <div style="color: var(--text-muted); font-size: 11.5px;">
                  Every active vehicle departs from the central kitchen depot (Vasanthapura Hub) and completes its closed circuit by returning to the hub. Flow balance holds at every intermediate school node: <code style="color: #94a3b8;">&sum;<sub>i</sub> x_ipk - &sum;<sub>j</sub> x_pjk = 0 &forall; p &isin; C</code>.
                </div>
              </div>

              <!-- Constraint 3 -->
              <div style="background: #0a0a0a; border: 1px solid #1f1f1f; border-radius: 5px; padding: 12px 16px; font-size: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
                  <strong style="color: #ffffff;">3. Vehicle Capacity Limits</strong>
                  <span style="font-family: var(--font-mono); color: #34d399; font-weight: 700;">&sum;<sub>i &isin; C</sub> q_i &bull; y_ik &le; Q_k &bull; z_k &nbsp;&forall; k &isin; K</span>
                </div>
                <div style="color: var(--text-muted); font-size: 11.5px;">
                  The aggregate vessel demand of all schools assigned to vehicle k cannot exceed its physical payload ceiling (280 standardized meal units for Eicher 11.10; 120 units for Tata 407).
                </div>
              </div>

              <!-- Constraint 4 -->
              <div style="background: #0a0a0a; border: 1px solid #1f1f1f; border-radius: 5px; padding: 12px 16px; font-size: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
                  <strong style="color: #ffffff;">4. Subtour Elimination &amp; Dynamic Arrival Time Propagation (MTZ / Cordeau)</strong>
                  <span style="font-family: var(--font-mono); color: #34d399; font-weight: 700;">t_i + s_i + &tau;_ij - M(1 - x_ijk) &le; t_j &nbsp;&forall; i, j &isin; C, i &ne; j, &forall; k</span>
                </div>
                <div style="color: var(--text-muted); font-size: 11.5px;">
                  Miller-Tucker-Zemlin formulation with scalar big-M &ge; T_max. Precludes disconnected cyclic subtours disconnected from the depot, while enforcing chronological arrival timestamp progression along each vehicle route.
                </div>
              </div>

              <!-- Constraint 5 -->
              <div style="background: #0a0a0a; border: 1px solid #1f1f1f; border-radius: 5px; padding: 12px 16px; font-size: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
                  <strong style="color: #ffffff;">5. Strict Lunch Bell Cutoff (Time Window Feasibility)</strong>
                  <span style="font-family: var(--font-mono); color: #ef4444; font-weight: 700;">t_i &le; T_max = 270 min (12:30 PM) &nbsp;&forall; i &isin; C</span>
                </div>
                <div style="color: var(--text-muted); font-size: 11.5px;">
                  Food safety and child nutrition requirement: all vehicles departing at 08:00 AM must complete their final school delivery before the 12:30 PM lunch break bell rings. Any arrival past 270 minutes is considered infeasible.
                </div>
              </div>

            </div>
          </div>
        </section>

        <!-- =========================================================================
             SECTION 2: ALGORITHMIC BREAKDOWN & COMPUTATIONAL COMPLEXITY
             ========================================================================= -->
        <section id="sec-algo-breakdown" style="background: var(--bg-card); border: 1px solid var(--border-card); border-radius: 6px; padding: 22px; display: flex; flex-direction: column; gap: 18px;">
          <div style="border-bottom: 1px solid #1f1f1f; padding-bottom: 12px;">
            <div style="font-size: 10.5px; font-weight: 700; color: #10b981; text-transform: uppercase; letter-spacing: 0.8px;">Section 2 &bull; Algorithmic Architecture</div>
            <h3 style="font-size: 15px; font-weight: 700; color: #ffffff; margin: 4px 0 2px 0;">
              Why Are We Using Heuristics and Why Are They Real-Time Fast?
            </h3>
            <p style="font-size: 12px; color: var(--text-muted); margin: 0; line-height: 1.5;">
              A frequent query in operations management reviews is how real-time decision support systems achieve instant recalculations when exact combinatorial optimization is notoriously slow. Below is the formal complexity breakdown.
            </p>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px;">
            
            <!-- Solver 1: Exact MILP -->
            <div style="background: #0a0a0a; border: 1px solid #1f1f1f; border-top: 3px solid #6b7280; border-radius: 5px; padding: 14px; font-size: 12px;">
              <div style="font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase;">Exact Optimization</div>
              <h4 style="font-size: 13.5px; font-weight: 700; color: #ffffff; margin: 4px 0 6px 0;">MILP / Branch-and-Cut</h4>
              <div style="font-size: 11px; color: #ef4444; font-family: var(--font-mono); margin-bottom: 10px;">Complexity: NP-Hard &bull; &mathcal;O(n!)</div>
              <p style="font-size: 11.5px; color: var(--text-muted); line-height: 1.5; margin: 0 0 8px 0;">
                For n = 530 schools and k = 27 vehicles, the combinatorial permutation space is approximately 10<sup>1,100</sup>. Solvers like CPLEX/Gurobi require hours or days to converge to proven optimality, making interactive manager simulation impossible.
              </p>
              <div style="background: #111111; padding: 6px 10px; border-radius: 4px; font-size: 11px; color: #94a3b8;">
                Typical Runtime: <strong>Hours &ndash; Days</strong>
              </div>
            </div>

            <!-- Solver 2: Classical AMRUTA 3-Stage -->
            <div style="background: #0a0a0a; border: 1px solid #1f1f1f; border-top: 3px solid #ef4444; border-radius: 5px; padding: 14px; font-size: 12px;">
              <div style="font-size: 10px; font-weight: 700; color: #ef4444; text-transform: uppercase;">Published Classical Heuristic</div>
              <h4 style="font-size: 13.5px; font-weight: 700; color: #ffffff; margin: 4px 0 6px 0;">AMRUTA 3-Stage Heuristic</h4>
              <div style="font-size: 11px; color: #34d399; font-family: var(--font-mono); margin-bottom: 10px;">Complexity: &mathcal;O(n<sup>2</sup> log n)</div>
              <p style="font-size: 11.5px; color: var(--text-muted); line-height: 1.5; margin: 0 0 8px 0;">
                Mahadevan et al. (2013) decomposed the intractable problem: (1) Polar sector sweep &theta;<sub>i</sub> = atan2(y<sub>i</sub> - y<sub>0</sub>, x<sub>i</sub> - x<sub>0</sub>), (2) Modified K-Means with priority ratio P<sub>i</sub> = d<sub>0i</sub> / q<sub>i</sub>, and (3) Clarke-Wright merges with 2-Opt local search.
              </p>
              <div style="background: #111111; padding: 6px 10px; border-radius: 4px; font-size: 11px; color: #34d399;">
                Typical Runtime: <strong>18 &ndash; 35 ms</strong>
              </div>
            </div>

            <!-- Solver 3: Modern Web Metaheuristic -->
            <div style="background: #0a0a0a; border: 1px solid #1f1f1f; border-top: 3px solid #3b82f6; border-radius: 5px; padding: 14px; font-size: 12px;">
              <div style="font-size: 10px; font-weight: 700; color: #3b82f6; text-transform: uppercase;">Interactive DSS Engine</div>
              <h4 style="font-size: 13.5px; font-weight: 700; color: #ffffff; margin: 4px 0 6px 0;">Clarke-Wright + Guided 2-Opt</h4>
              <div style="font-size: 11px; color: #60a5fa; font-family: var(--font-mono); margin-bottom: 10px;">Complexity: &mathcal;O(n<sup>2</sup>)</div>
              <p style="font-size: 11.5px; color: var(--text-muted); line-height: 1.5; margin: 0 0 8px 0;">
                Calculates savings S<sub>ij</sub> = d<sub>i0</sub> + d<sub>0j</sub> - d<sub>ij</sub>, enforces workload balancing ceilings max_stops = &lceil;n/k&rceil; + 4 to ensure balanced fleet utilization, propagates time window constraints dynamically, and executes open-tour 2-Opt uncrossing.
              </p>
              <div style="background: #111111; padding: 6px 10px; border-radius: 4px; font-size: 11px; color: #60a5fa;">
                Typical Runtime: <strong>15 &ndash; 40 ms</strong> (Interactive Sliders)
              </div>
            </div>

          </div>

          <!-- Deep-Search Script Reference Note -->
          <div style="background: #0d0d0d; border: 1px solid #222222; border-radius: 5px; padding: 12px 16px; font-size: 12px; color: var(--text-muted); line-height: 1.5;">
            <strong style="color: #ffffff;">Batch Metaheuristic Script (Google OR-Tools):</strong>
            For deep overnight batch route planning, a Python script utilizing Google OR-Tools with Guided Local Search (GLS) is provided in <code style="color: #34d399; font-family: var(--font-mono);">project/scripts/solve_ortools_vrp.py</code>. It explores thousands of neighborhood solutions over 10 to 60 seconds of CPU search time, verifying identical mathematical constraints.
          </div>
        </section>

        <!-- =========================================================================
             SECTION 3: COMPARATIVE OR PERFORMANCE BENCHMARK MATRIX
             ========================================================================= -->
        <section id="sec-benchmark-matrix" style="background: var(--bg-card); border: 1px solid var(--border-card); border-radius: 6px; padding: 22px; display: flex; flex-direction: column; gap: 18px;">
          <div style="border-bottom: 1px solid #1f1f1f; padding-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 10px;">
            <div>
              <div style="font-size: 10.5px; font-weight: 700; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.8px;">Section 3 &bull; INFORMS Interfaces Table 4 Benchmark</div>
              <h3 style="font-size: 15px; font-weight: 700; color: #ffffff; margin: 4px 0 2px 0;">
                Four-Column Operations Research Benchmark Matrix
              </h3>
              <p style="font-size: 12px; color: var(--text-muted); margin: 0;">
                Direct verification of historical planning vs published optimum vs live dynamic algorithms.
              </p>
            </div>
            <div style="font-size: 11.5px; color: var(--text-muted); font-family: var(--font-mono);">
              Benchmark Base: 530 Schools &bull; Vasanthapura Hub
            </div>
          </div>

          <div class="benchmark-matrix-grid">
            
            <!-- Col 1: Pre-AMRUTA Baseline -->
            <div style="background: #0a0a0a; border: 1px solid #1f1f1f; border-top: 3px solid #555555; border-radius: 6px; padding: 16px;">
              <div style="font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Historical Planning</div>
              <h4 style="font-size: 14px; font-weight: 700; color: var(--text-white); margin: 4px 0 2px;">Pre-AMRUTA (Ad-Hoc)</h4>
              <div style="font-size: 11px; color: var(--text-dim); margin-bottom: 14px;">Manual route extensions (Figure 3)</div>

              <div style="display: flex; flex-direction: column; gap: 10px; font-size: 12px;">
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1a1a1a; padding-bottom: 6px;">
                  <span style="color: var(--text-muted);">Fleet Deployed:</span>
                  <span style="font-weight: 700; color: var(--text-white); font-family: var(--font-mono);">35 vans</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1a1a1a; padding-bottom: 6px;">
                  <span style="color: var(--text-muted);">Total Distance:</span>
                  <span style="font-weight: 700; color: var(--text-white); font-family: var(--font-mono);">1,400.0 km</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1a1a1a; padding-bottom: 6px;">
                  <span style="color: var(--text-muted);">Delivery Duration:</span>
                  <span style="font-weight: 700; color: #ef4444; font-family: var(--font-mono);">> 300 mins (>5 hrs)</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1a1a1a; padding-bottom: 6px;">
                  <span style="color: var(--text-muted);">Monthly Cost:</span>
                  <span style="font-weight: 700; color: var(--text-white); font-family: var(--font-mono);">&inr; 16,90,900</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1a1a1a; padding-bottom: 6px;">
                  <span style="color: var(--text-muted);">Cost Reduction:</span>
                  <span style="color: var(--text-muted); font-family: var(--font-mono);">0.0% (Baseline)</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--text-muted);">Delivery Compliance:</span>
                  <span style="font-weight: 700; color: #ef4444; font-family: var(--font-mono);">Chronic Delays</span>
                </div>
              </div>
            </div>

            <!-- Col 2: Published Table 4 Optimum -->
            <div style="background: #0a0a0a; border: 1px solid #1f1f1f; border-top: 3px solid #22c55e; border-radius: 6px; padding: 16px;">
              <div style="font-size: 10px; font-weight: 700; color: #22c55e; text-transform: uppercase;">Published Benchmark</div>
              <h4 style="font-size: 14px; font-weight: 700; color: var(--text-white); margin: 4px 0 2px;">AMRUTA (k = 27)</h4>
              <div style="font-size: 11px; color: var(--text-dim); margin-bottom: 14px;">Interfaces 2013 Published (Table 4)</div>

              <div style="display: flex; flex-direction: column; gap: 10px; font-size: 12px;">
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1a1a1a; padding-bottom: 6px;">
                  <span style="color: var(--text-muted);">Fleet Deployed:</span>
                  <span style="font-weight: 700; color: #22c55e; font-family: var(--font-mono);">27 vans (-22.9%)</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1a1a1a; padding-bottom: 6px;">
                  <span style="color: var(--text-muted);">Total Distance:</span>
                  <span style="font-weight: 700; color: #22c55e; font-family: var(--font-mono);">1,325.1 km (-5.3%)</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1a1a1a; padding-bottom: 6px;">
                  <span style="color: var(--text-muted);">Delivery Duration:</span>
                  <span style="font-weight: 700; color: #22c55e; font-family: var(--font-mono);">246.7 mins (4.1 hrs)</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1a1a1a; padding-bottom: 6px;">
                  <span style="color: var(--text-muted);">Monthly Cost:</span>
                  <span style="font-weight: 700; color: #22c55e; font-family: var(--font-mono);">&inr; 13,76,167</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1a1a1a; padding-bottom: 6px;">
                  <span style="color: var(--text-muted);">Cost Reduction:</span>
                  <span style="font-weight: 700; color: #22c55e; font-family: var(--font-mono);">18.61% ($75k/yr)</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--text-muted);">Delivery Compliance:</span>
                  <span style="font-weight: 700; color: #22c55e; font-family: var(--font-mono);">100% On-Time</span>
                </div>
              </div>
            </div>

            <!-- Col 3: Classical AMRUTA Heuristic Live -->
            <div style="background: #0a0a0a; border: 1px solid #1f1f1f; border-top: 3px solid #ef4444; border-radius: 6px; padding: 16px;">
              <div style="font-size: 10px; font-weight: 700; color: #ef4444; text-transform: uppercase;">Classical Live</div>
              <h4 style="font-size: 14px; font-weight: 700; color: var(--text-white); margin: 4px 0 2px;">AMRUTA 3-Stage</h4>
              <div style="font-size: 11px; color: var(--text-dim); margin-bottom: 14px;">Sector Sweep + Savings + 2-Opt</div>

              ${amrutaLive ? `
                <div style="display: flex; flex-direction: column; gap: 10px; font-size: 12px;">
                  <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1a1a1a; padding-bottom: 6px;">
                    <span style="color: var(--text-muted);">Fleet Deployed:</span>
                    <span style="font-weight: 700; color: var(--text-white); font-family: var(--font-mono);">${amrutaLive.summary.totalVehicles} vans</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1a1a1a; padding-bottom: 6px;">
                    <span style="color: var(--text-muted);">Total Distance:</span>
                    <span style="font-weight: 700; color: var(--text-white); font-family: var(--font-mono);">${amrutaLive.summary.totalDistanceKm} km</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1a1a1a; padding-bottom: 6px;">
                    <span style="color: var(--text-muted);">Delivery Duration:</span>
                    <span style="font-weight: 700; color: ${amrutaLive.summary.maxElapsedMinutes <= 270 ? '#22c55e' : '#ef4444'}; font-family: var(--font-mono);">
                      ${amrutaLive.summary.maxElapsedMinutes} mins
                    </span>
                  </div>
                  <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1a1a1a; padding-bottom: 6px;">
                    <span style="color: var(--text-muted);">Monthly Cost:</span>
                    <span style="font-weight: 700; color: var(--text-white); font-family: var(--font-mono);">&inr; ${Math.round(amrutaLive.summary.totalMonthlyCostInr).toLocaleString()}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1a1a1a; padding-bottom: 6px;">
                    <span style="color: var(--text-muted);">Cost Reduction:</span>
                    <span style="font-weight: 700; color: ${amrutaLive.summary.costReductionPct >= 0 ? '#22c55e' : '#ef4444'}; font-family: var(--font-mono);">${amrutaLive.summary.costReductionPct >= 0 ? '+' : ''}${amrutaLive.summary.costReductionPct}%</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-muted);">Delivery Compliance:</span>
                    <span style="font-weight: 700; color: ${amrutaLive.summary.lateRoutesCount === 0 ? '#22c55e' : '#ef4444'}; font-family: var(--font-mono);">${amrutaLive.summary.lateRoutesCount === 0 ? '100% On-Time' : `${amrutaLive.summary.lateRoutesCount} Late Routes`}</span>
                  </div>
                </div>
              ` : `<div style="color: var(--text-muted); text-align: center; padding: 20px;">Ready to run</div>`}
            </div>

            <!-- Col 4: Modern Polynomial Heuristic -->
            <div style="background: #0a0a0a; border: 1px solid #1f1f1f; border-top: 3px solid #3b82f6; border-radius: 6px; padding: 16px;">
              <div style="font-size: 10px; font-weight: 700; color: #3b82f6; text-transform: uppercase;">Modern Polynomial Live</div>
              <h4 style="font-size: 14px; font-weight: 700; color: var(--text-white); margin: 4px 0 2px;">Clarke-Wright + 2-Opt</h4>
              <div style="font-size: 11px; color: var(--text-dim); margin-bottom: 14px;">Workload Balanced Savings</div>

              ${modernLive ? `
                <div style="display: flex; flex-direction: column; gap: 10px; font-size: 12px;">
                  <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1a1a1a; padding-bottom: 6px;">
                    <span style="color: var(--text-muted);">Fleet Deployed:</span>
                    <span style="font-weight: 700; color: var(--text-white); font-family: var(--font-mono);">${modernLive.summary.totalVehicles} vans</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1a1a1a; padding-bottom: 6px;">
                    <span style="color: var(--text-muted);">Total Distance:</span>
                    <span style="font-weight: 700; color: var(--text-white); font-family: var(--font-mono);">${modernLive.summary.totalDistanceKm} km</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1a1a1a; padding-bottom: 6px;">
                    <span style="color: var(--text-muted);">Delivery Duration:</span>
                    <span style="font-weight: 700; color: ${modernLive.summary.maxElapsedMinutes <= 270 ? '#22c55e' : '#ef4444'}; font-family: var(--font-mono);">
                      ${modernLive.summary.maxElapsedMinutes} mins
                    </span>
                  </div>
                  <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1a1a1a; padding-bottom: 6px;">
                    <span style="color: var(--text-muted);">Monthly Cost:</span>
                    <span style="font-weight: 700; color: var(--text-white); font-family: var(--font-mono);">&inr; ${Math.round(modernLive.summary.totalMonthlyCostInr).toLocaleString()}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1a1a1a; padding-bottom: 6px;">
                    <span style="color: var(--text-muted);">Cost Reduction:</span>
                    <span style="font-weight: 700; color: ${modernLive.summary.costReductionPct >= 0 ? '#22c55e' : '#ef4444'}; font-family: var(--font-mono);">${modernLive.summary.costReductionPct >= 0 ? '+' : ''}${modernLive.summary.costReductionPct}%</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-muted);">Delivery Compliance:</span>
                    <span style="font-weight: 700; color: ${modernLive.summary.lateRoutesCount === 0 ? '#22c55e' : '#ef4444'}; font-family: var(--font-mono);">${modernLive.summary.lateRoutesCount === 0 ? '100% On-Time' : `${modernLive.summary.lateRoutesCount} Late Routes`}</span>
                  </div>
                </div>
              ` : `<div style="color: var(--text-muted); text-align: center; padding: 20px;">Ready to run</div>`}
            </div>

          </div>
        </section>

        <!-- =========================================================================
             SECTION 4: MANAGERIAL TRADE-OFF CURVE (INFORMS TABLE 2 & 4)
             ========================================================================= -->
        <section id="sec-tradeoff-curve" style="background: var(--bg-card); border: 1px solid var(--border-card); border-radius: 6px; padding: 22px; display: flex; flex-direction: column; gap: 18px;">
          <div style="border-bottom: 1px solid #1f1f1f; padding-bottom: 12px;">
            <div style="font-size: 10.5px; font-weight: 700; color: #a855f7; text-transform: uppercase; letter-spacing: 0.8px;">Section 4 &bull; Managerial Trade-Off Analysis</div>
            <h3 style="font-size: 15px; font-weight: 700; color: #ffffff; margin: 4px 0 2px 0;">
              Cost vs Responsiveness Trade-Off Curve (INFORMS Table 2)
            </h3>
            <p style="font-size: 12px; color: var(--text-muted); margin: 0; line-height: 1.5;">
              In operations management, minimizing mathematical cost alone often produces unacceptable service delay. Reducing the fleet from 27 to 20 vans saves &inr;269,000 monthly, but increases duration from 4.1 hours to 5.1 hours (305.7 min)&mdash;violating the mandatory 12:30 PM cutoff.
            </p>
          </div>

          <!-- Pure Dark SVG Chart -->
          <div style="background: #0a0a0a; border: 1px solid #1f1f1f; border-radius: 6px; padding: 18px;">
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
              <div><span style="display:inline-block; width:10px; height:10px; background:#10b981; margin-right:5px; border-radius:2px;"></span> Monthly Operating Cost (&inr; Lakhs)</div>
              <div><span style="display:inline-block; width:10px; height:10px; background:#f59e0b; margin-right:5px; border-radius:2px;"></span> Longest Delivery Route Duration (Minutes)</div>
              <div><span style="display:inline-block; width:10px; height:10px; background:#ef4444; margin-right:5px; border-radius:2px;"></span> 12:30 PM Lunch Cutoff (270 min)</div>
            </div>

            <svg viewBox="0 0 700 240" style="width: 100%; height: 220px; overflow: visible;">
              <!-- Gridlines -->
              <line x1="50" y1="20" x2="660" y2="20" stroke="#1f1f1f" stroke-width="1"/>
              <line x1="50" y1="70" x2="660" y2="70" stroke="#1f1f1f" stroke-width="1"/>
              <line x1="50" y1="120" x2="660" y2="120" stroke="#1f1f1f" stroke-width="1"/>
              <line x1="50" y1="170" x2="660" y2="170" stroke="#1f1f1f" stroke-width="1"/>

              <!-- 270 min cutoff line -->
              <line x1="50" y1="95" x2="660" y2="95" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,4"/>
              <text x="665" y="99" fill="#ef4444" font-size="10" font-weight="bold">270m Cutoff</text>

              <!-- Cost curve -->
              <path d="M 50,180 Q 300,130 660,30" fill="none" stroke="#10b981" stroke-width="2.5"/>
              <!-- Time curve -->
              <path d="M 50,30 Q 200,80 400,130 L 660,133" fill="none" stroke="#f59e0b" stroke-width="2.5"/>

              <!-- Highlight Preferred k=27 -->
              <circle cx="400" cy="100" r="6" fill="#22c55e" stroke="#ffffff" stroke-width="2"/>
              <text x="360" y="80" fill="#ffffff" font-weight="bold" font-size="11">Selected: k = 27</text>
              <text x="360" y="66" fill="#94a3b8" font-size="10">&inr; 13.76L &bull; 246.7 min</text>

              <!-- Highlight Infeasible k=20 -->
              <circle cx="50" cy="180" r="4" fill="#10b981"/>
              <circle cx="50" cy="30" r="4" fill="#f59e0b"/>
              <text x="55" y="24" fill="#ef4444" font-weight="bold" font-size="10">k = 20 (305.7m > Cutoff: Late)</text>

              <!-- X Axis Labels -->
              <text x="50" y="200" font-size="10" fill="#64748b" text-anchor="middle">k=20</text>
              <text x="170" y="200" font-size="10" fill="#64748b" text-anchor="middle">k=22</text>
              <text x="290" y="200" font-size="10" fill="#64748b" text-anchor="middle">k=25</text>
              <text x="400" y="200" font-size="10" fill="#22c55e" font-weight="bold" text-anchor="middle">k=27 (Optimum)</text>
              <text x="530" y="200" font-size="10" fill="#64748b" text-anchor="middle">k=30</text>
              <text x="660" y="200" font-size="10" fill="#64748b" text-anchor="middle">k=35 (Baseline)</text>
              <text x="355" y="222" font-size="11" fill="#94a3b8" font-weight="bold" text-anchor="middle">Deployed Fleet Size (k vehicles)</text>
            </svg>
          </div>

          <!-- Table 2 Reference Matrix -->
          <div class="manifest-table-wrapper">
            <table class="dark-table">
              <thead>
                <tr>
                  <th style="width: 100px;">Vehicles (k)</th>
                  <th style="width: 150px;">Monthly Cost (&inr;)</th>
                  <th style="width: 150px;">Delivery Duration</th>
                  <th>Managerial Feasibility Assessment</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="font-family: var(--font-mono);">20 vans</td>
                  <td style="font-family: var(--font-mono);">&inr; 11.07 Lakhs</td>
                  <td style="font-family: var(--font-mono); color: #ef4444; font-weight: 700;">305.7 mins (5.1 hrs)</td>
                  <td style="color: #ef4444;">Infeasible &bull; Severe Cutoff Violation (Past 1:00 PM)</td>
                </tr>
                <tr>
                  <td style="font-family: var(--font-mono);">22 vans</td>
                  <td style="font-family: var(--font-mono);">&inr; 12.02 Lakhs</td>
                  <td style="font-family: var(--font-mono); color: #ef4444;">294.0 mins (4.9 hrs)</td>
                  <td style="color: #ef4444;">Infeasible &bull; Late Deliveries</td>
                </tr>
                <tr>
                  <td style="font-family: var(--font-mono);">25 vans</td>
                  <td style="font-family: var(--font-mono);">&inr; 12.85 Lakhs</td>
                  <td style="font-family: var(--font-mono); color: #f59e0b;">268.3 mins (4.5 hrs)</td>
                  <td style="color: #f59e0b;">Marginally Feasible &bull; Zero Buffer for Traffic</td>
                </tr>
                <tr style="background: rgba(34, 197, 94, 0.08); font-weight: bold; border-left: 3px solid #22c55e;">
                  <td style="font-family: var(--font-mono); color: #22c55e;">27 vans</td>
                  <td style="font-family: var(--font-mono); color: #22c55e;">&inr; 13.76 Lakhs</td>
                  <td style="font-family: var(--font-mono); color: #22c55e;">246.7 mins (4.1 hrs)</td>
                  <td style="color: #22c55e;">Table 4 Published Optimum &bull; 100% On-Time (12:06 PM) &bull; -18.6% Cost</td>
                </tr>
                <tr>
                  <td style="font-family: var(--font-mono);">30 vans</td>
                  <td style="font-family: var(--font-mono);">&inr; 15.21 Lakhs</td>
                  <td style="font-family: var(--font-mono); color: #34d399;">245.0 mins (4.1 hrs)</td>
                  <td style="color: var(--text-muted);">Diminishing Returns &bull; Fixed Capital Inefficiency</td>
                </tr>
                <tr>
                  <td style="font-family: var(--font-mono);">35 vans</td>
                  <td style="font-family: var(--font-mono);">&inr; 16.91 Lakhs</td>
                  <td style="font-family: var(--font-mono); color: #ef4444;">> 300 mins</td>
                  <td style="color: #ef4444;">Pre-AMRUTA Baseline &bull; Bloated Fleet + Unoptimized Routes</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- =========================================================================
             SECTION 5: ALGORITHMIC MECHANICS & SENSITIVITY STRESS LAB
             ========================================================================= -->
        <section id="sec-stress-lab" style="background: var(--bg-card); border: 1px solid var(--border-card); border-radius: 6px; padding: 22px; display: flex; flex-direction: column; gap: 20px;">
          <div style="border-bottom: 1px solid #1f1f1f; padding-bottom: 12px;">
            <div style="font-size: 10.5px; font-weight: 700; color: #ec4899; text-transform: uppercase; letter-spacing: 0.8px;">Section 5 &bull; Mechanics &amp; Sensitivity Lab</div>
            <h3 style="font-size: 15px; font-weight: 700; color: #ffffff; margin: 4px 0 2px 0;">
              Modified K-Means, 2-Opt Edge Uncrossing &amp; Real-Time Stress Tests
            </h3>
            <p style="font-size: 12px; color: var(--text-muted); margin: 0; line-height: 1.5;">
              Visual breakdown of heuristic mechanics and one-click sensitivity scenarios for executive stress testing.
            </p>
          </div>

          <!-- 2-Opt Uncrossing Diagram & K-Means Priority Grid -->
          <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px;">
            
            <!-- 2-Opt Visualization -->
            <div style="background: #0a0a0a; border: 1px solid #1f1f1f; border-radius: 6px; padding: 16px;">
              <div style="font-weight: 700; color: #ffffff; font-size: 13px; margin-bottom: 8px;">2-Opt Edge Uncrossing Mechanics</div>
              <p style="font-size: 11.5px; color: var(--text-muted); line-height: 1.5; margin: 0 0 12px 0;">
                By the Triangle Inequality (d_AC + d_BD > d_AB + d_CD), intersecting tour paths can always be uncrossed to strictly reduce overall distance (&Delta; > 0).
              </p>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; text-align: center;">
                <div style="background: #111111; border: 1px solid #222222; border-radius: 4px; padding: 10px;">
                  <div style="font-size: 10.5px; color: #ef4444; font-weight: 700; margin-bottom: 6px;">Before: Crossing Edges (AC + BD)</div>
                  <svg viewBox="0 0 160 80" style="width: 100%; height: 65px;">
                    <circle cx="20" cy="15" r="4" fill="#3b82f6"/>
                    <circle cx="140" cy="65" r="4" fill="#3b82f6"/>
                    <circle cx="20" cy="65" r="4" fill="#10b981"/>
                    <circle cx="140" cy="15" r="4" fill="#10b981"/>
                    <line x1="20" y1="15" x2="140" y2="65" stroke="#ef4444" stroke-width="2"/>
                    <line x1="20" y1="65" x2="140" y2="15" stroke="#ef4444" stroke-width="2"/>
                  </svg>
                  <div style="font-size: 10.5px; color: #ef4444; font-family: var(--font-mono);">Cost: 28.4 km</div>
                </div>

                <div style="background: #111111; border: 1px solid #222222; border-radius: 4px; padding: 10px;">
                  <div style="font-size: 10.5px; color: #34d399; font-weight: 700; margin-bottom: 6px;">After 2-Opt: Parallel (AB + CD)</div>
                  <svg viewBox="0 0 160 80" style="width: 100%; height: 65px;">
                    <circle cx="20" cy="15" r="4" fill="#3b82f6"/>
                    <circle cx="140" cy="15" r="4" fill="#3b82f6"/>
                    <circle cx="20" cy="65" r="4" fill="#10b981"/>
                    <circle cx="140" cy="65" r="4" fill="#10b981"/>
                    <line x1="20" y1="15" x2="140" y2="15" stroke="#34d399" stroke-width="2"/>
                    <line x1="20" y1="65" x2="140" y2="65" stroke="#34d399" stroke-width="2"/>
                  </svg>
                  <div style="font-size: 10.5px; color: #34d399; font-family: var(--font-mono); font-weight: 700;">Cost: 19.8 km (-30.2%)</div>
                </div>
              </div>
            </div>

            <!-- Modified K-Means Priority Ratio -->
            <div style="background: #0a0a0a; border: 1px solid #1f1f1f; border-radius: 6px; padding: 16px;">
              <div style="font-weight: 700; color: #ffffff; font-size: 13px; margin-bottom: 8px;">Modified K-Means Priority Rule</div>
              <p style="font-size: 11.5px; color: var(--text-muted); line-height: 1.5; margin: 0 0 10px 0;">
                Standard clustering clumps high-demand schools together, exhausting capacity prematurely. AMRUTA computes priority ratio:
              </p>
              <div style="background: #111111; border: 1px solid #222222; padding: 8px 12px; border-radius: 4px; font-family: var(--font-mono); color: #34d399; font-weight: 700; font-size: 12px; margin-bottom: 10px;">
                P_i = Distance(Depot, School_i) / Demand_i
              </div>
              <p style="font-size: 11.5px; color: var(--text-muted); line-height: 1.5; margin: 0;">
                Distant schools with small demand receive higher priority and are seeded first. Neighboring smaller schools pack neatly into residual vehicle capacity, preventing high-cost isolated single-stop runs at the city periphery.
              </p>
            </div>

          </div>

          <!-- One-Click Sensitivity Stress Test Scenarios -->
          <div style="background: #0a0a0a; border: 1px solid #1f1f1f; border-radius: 6px; padding: 16px;">
            <div style="font-weight: 700; color: #ffffff; font-size: 13px; margin-bottom: 4px;">One-Click Sensitivity Scenarios (What-If Stress Testing)</div>
            <p style="font-size: 11.5px; color: var(--text-muted); margin: 0 0 14px 0;">
              Click any scenario to immediately inject operational shocks into the live simulation model:
            </p>

            <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px;">
              <button id="scenario-btn-optimum" class="btn-dark-secondary" style="font-size: 11.5px; padding: 8px 10px; border-color: #22c55e; color: #22c55e; text-align: left;">
                <div style="font-weight: 700;">Table 4 Optimum</div>
                <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">k=27, 24 km/h, 12:30 PM</div>
              </button>

              <button id="scenario-btn-monsoon" class="btn-dark-secondary" style="font-size: 11.5px; padding: 8px 10px; border-color: #ef4444; color: #f87171; text-align: left;">
                <div style="font-weight: 700;">Monsoon Traffic Jam</div>
                <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">v = 18 km/h congestion</div>
              </button>

              <button id="scenario-btn-fuel" class="btn-dark-secondary" style="font-size: 11.5px; padding: 8px 10px; border-color: #f59e0b; color: #fbbf24; text-align: left;">
                <div style="font-weight: 700;">Diesel Price Shock</div>
                <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">Diesel = &inr;60.00 / Liter</div>
              </button>

              <button id="scenario-btn-deadline" class="btn-dark-secondary" style="font-size: 11.5px; padding: 8px 10px; border-color: #3b82f6; color: #93c5fd; text-align: left;">
                <div style="font-weight: 700;">Strict Early Deadline</div>
                <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">Cutoff = 12:00 PM (240 min)</div>
              </button>
            </div>

            <!-- Dynamic Live Evaluation Box -->
            <div id="stress-eval-banner" style="margin-top: 14px; background: #111111; border: 1px solid #222222; border-radius: 5px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
              <span id="stress-eval-text" style="font-size: 12px; color: var(--text-muted);">
                Parameters active: k=${App && App.simParams ? App.simParams.k_vehicles : 27} vans &bull; Speed: ${App && App.simParams ? App.simParams.delivery_speed : 24} km/h &bull; Cutoff: ${App && App.simParams ? App.simParams.cutoff_minutes : 270} min &bull; Diesel: &inr;${App && App.simParams ? App.simParams.diesel_price : 45}/L
              </span>
              <span style="font-size: 11.5px; font-weight: 700; color: #22c55e;" id="stress-eval-status">
                Simulating Live State
              </span>
            </div>
          </div>

        </section>

      </div>
    `;

    // Bind Event Listeners
    this.bindEvents();
  },

  bindEvents() {
    // 1. Reset to Table 4 Optimum Button
    const btnReset = document.getElementById("btn-bench-reset-optimum");
    if (btnReset) {
      btnReset.addEventListener("click", () => {
        if (typeof App !== "undefined" && App.simParams) {
          App.simParams.k_vehicles = 27;
          App.simParams.vehicle_capacity = 280.0;
          App.simParams.delivery_speed = 24.0;
          App.simParams.cutoff_minutes = 270.0;
          App.simParams.diesel_price = 45.00;
          App.simParams.circuity_factor = 1.35;
          App.syncControlsToState();
          App.runCurrentSimulation();
          this.updateStressBanner("Table 4 Global Optimum applied (k=27, 24 km/h, 12:30 PM cutoff).", "#22c55e");
        }
      });
    }

    // 2. Scenario Button: Optimum
    const btnScenOptimum = document.getElementById("scenario-btn-optimum");
    if (btnScenOptimum) {
      btnScenOptimum.addEventListener("click", () => {
        if (btnReset) btnReset.click();
      });
    }

    // 3. Scenario Button: Monsoon Traffic
    const btnScenMonsoon = document.getElementById("scenario-btn-monsoon");
    if (btnScenMonsoon) {
      btnScenMonsoon.addEventListener("click", () => {
        if (typeof App !== "undefined" && App.simParams) {
          App.simParams.delivery_speed = 18.0;
          App.syncControlsToState();
          App.runCurrentSimulation();
          this.updateStressBanner("Monsoon traffic injected: Speed reduced to 18 km/h. Checking cutoff feasibility...", "#f87171");
        }
      });
    }

    // 4. Scenario Button: Fuel Price Surge
    const btnScenFuel = document.getElementById("scenario-btn-fuel");
    if (btnScenFuel) {
      btnScenFuel.addEventListener("click", () => {
        if (typeof App !== "undefined" && App.simParams) {
          App.simParams.diesel_price = 60.00;
          App.syncControlsToState();
          App.runCurrentSimulation();
          this.updateStressBanner("Diesel price shock injected (&inr;60.00/L). Evaluating variable transit cost impact...", "#fbbf24");
        }
      });
    }

    // 5. Scenario Button: Strict Deadline
    const btnScenDeadline = document.getElementById("scenario-btn-deadline");
    if (btnScenDeadline) {
      btnScenDeadline.addEventListener("click", () => {
        if (typeof App !== "undefined" && App.simParams) {
          App.simParams.cutoff_minutes = 240.0; // 12:00 PM
          App.syncControlsToState();
          App.runCurrentSimulation();
          this.updateStressBanner("Strict deadline applied: 12:00 PM (240 min). Checking late routes...", "#93c5fd");
        }
      });
    }
  },

  updateStressBanner(message, statusColor = "#22c55e") {
    const banner = document.getElementById("stress-eval-text");
    const status = document.getElementById("stress-eval-status");
    if (banner) banner.textContent = message;
    if (status) {
      status.style.color = statusColor;
      status.textContent = "Simulation Updated";
    }
  }
};

window.ComparisonView = ComparisonView;
