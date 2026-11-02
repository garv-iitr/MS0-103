/**
 * Algorithmic Benchmarks View
 * Pure dark mode, zero emojis, comparing:
 * 1. Historical Pre-AMRUTA Baseline (Table 4)
 * 2. Published AMRUTA Benchmark (Table 4)
 * 3. Live Active Model Run
 * 4. Google OR-Tools Metaheuristic
 */

const ComparisonView = {
  render(containerId, results) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const amrutaLive = results.amruta || null;
    const modernLive = results.modern || null;

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <div style="background: var(--bg-card); border: 1px solid var(--border-card); border-radius: 6px; padding: 18px 22px;">
          <h2 style="font-size: 16px; font-weight: 700; color: var(--text-white); margin-bottom: 4px;">
            Comparative OR Performance Matrix (Vasanthapura Pilot Benchmark)
          </h2>
          <p style="font-size: 12px; color: var(--text-muted); margin: 0;">
            Evaluates the mathematical and operational trade-offs across Fleet Size (k), Total Traveled Distance, Elapsed Hours, Operating Cost, and On-Time Lunch Delivery.
          </p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px;">
          <!-- Col 1: Pre-AMRUTA Baseline -->
          <div style="background: var(--bg-card); border: 1px solid var(--border-card); border-top: 3px solid #64748b; border-radius: 6px; padding: 16px;">
            <div style="font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Historical Planning</div>
            <h3 style="font-size: 14px; font-weight: 700; color: var(--text-white); margin: 4px 0 2px;">Pre-AMRUTA (Ad-Hoc)</h3>
            <div style="font-size: 11px; color: var(--text-dim); margin-bottom: 14px;">Manual route extensions (Figure 3)</div>

            <div style="display: flex; flex-direction: column; gap: 10px; font-size: 12px;">
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #232938; padding-bottom: 6px;">
                <span style="color: var(--text-muted);">Fleet Deployed:</span>
                <span style="font-weight: 700; color: var(--text-white); font-family: var(--font-mono);">35 vans</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #232938; padding-bottom: 6px;">
                <span style="color: var(--text-muted);">Total Distance:</span>
                <span style="font-weight: 700; color: var(--text-white); font-family: var(--font-mono);">1,400.0 km</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #232938; padding-bottom: 6px;">
                <span style="color: var(--text-muted);">Delivery Duration:</span>
                <span style="font-weight: 700; color: #f87171; font-family: var(--font-mono);">> 300 mins (>5 hrs)</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #232938; padding-bottom: 6px;">
                <span style="color: var(--text-muted);">Monthly Cost:</span>
                <span style="font-weight: 700; color: var(--text-white); font-family: var(--font-mono);">INR 1,690,900</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #232938; padding-bottom: 6px;">
                <span style="color: var(--text-muted);">Cost Reduction:</span>
                <span style="color: var(--text-muted); font-family: var(--font-mono);">0.0% (Baseline)</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Children Added:</span>
                <span style="color: var(--text-dim); font-family: var(--font-mono);">0</span>
              </div>
            </div>
          </div>

          <!-- Col 2: Published AMRUTA Benchmark -->
          <div style="background: var(--bg-card); border: 1px solid var(--border-card); border-top: 3px solid #10b981; border-radius: 6px; padding: 16px;">
            <div style="font-size: 10px; font-weight: 700; color: #10b981; text-transform: uppercase;">Published Benchmark</div>
            <h3 style="font-size: 14px; font-weight: 700; color: var(--text-white); margin: 4px 0 2px;">AMRUTA (k = 27)</h3>
            <div style="font-size: 11px; color: var(--text-dim); margin-bottom: 14px;">Interfaces 2013 Published (Table 4)</div>

            <div style="display: flex; flex-direction: column; gap: 10px; font-size: 12px;">
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #232938; padding-bottom: 6px;">
                <span style="color: var(--text-muted);">Fleet Deployed:</span>
                <span style="font-weight: 700; color: #34d399; font-family: var(--font-mono);">27 vans (-22.9%)</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #232938; padding-bottom: 6px;">
                <span style="color: var(--text-muted);">Total Distance:</span>
                <span style="font-weight: 700; color: var(--text-white); font-family: var(--font-mono);">1,325.1 km (-5.3%)</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #232938; padding-bottom: 6px;">
                <span style="color: var(--text-muted);">Delivery Duration:</span>
                <span style="font-weight: 700; color: #34d399; font-family: var(--font-mono);">246.7 mins (4.1 hrs)</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #232938; padding-bottom: 6px;">
                <span style="color: var(--text-muted);">Monthly Cost:</span>
                <span style="font-weight: 700; color: #34d399; font-family: var(--font-mono);">INR 1,376,167</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #232938; padding-bottom: 6px;">
                <span style="color: var(--text-muted);">Cost Reduction:</span>
                <span style="font-weight: 700; color: #34d399; font-family: var(--font-mono);">18.61% ($75k/yr)</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Children Added:</span>
                <span style="font-weight: 700; color: #34d399; font-family: var(--font-mono);">+2,400</span>
              </div>
            </div>
          </div>

          <!-- Col 3: Live AMRUTA Run -->
          <div style="background: var(--bg-card); border: 1px solid var(--border-card); border-top: 3px solid #ff4b4b; border-radius: 6px; padding: 16px;">
            <div style="font-size: 10px; font-weight: 700; color: #ff4b4b; text-transform: uppercase;">Dynamic Execution</div>
            <h3 style="font-size: 14px; font-weight: 700; color: var(--text-white); margin: 4px 0 2px;">Classical AMRUTA</h3>
            <div style="font-size: 11px; color: var(--text-dim); margin-bottom: 14px;">3-Stage Heuristic on Current Fleet</div>

            ${amrutaLive ? `
              <div style="display: flex; flex-direction: column; gap: 10px; font-size: 12px;">
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #232938; padding-bottom: 6px;">
                  <span style="color: var(--text-muted);">Fleet Deployed:</span>
                  <span style="font-weight: 700; color: var(--text-white); font-family: var(--font-mono);">${amrutaLive.summary.totalVehicles} vans</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #232938; padding-bottom: 6px;">
                  <span style="color: var(--text-muted);">Total Distance:</span>
                  <span style="font-weight: 700; color: var(--text-white); font-family: var(--font-mono);">${amrutaLive.summary.totalDistanceKm} km</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #232938; padding-bottom: 6px;">
                  <span style="color: var(--text-muted);">Delivery Duration:</span>
                  <span style="font-weight: 700; color: ${amrutaLive.summary.maxElapsedMinutes <= 270 ? '#34d399' : '#f87171'}; font-family: var(--font-mono);">
                    ${amrutaLive.summary.maxElapsedMinutes} mins
                  </span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #232938; padding-bottom: 6px;">
                  <span style="color: var(--text-muted);">Monthly Cost:</span>
                  <span style="font-weight: 700; color: var(--text-white); font-family: var(--font-mono);">INR ${Math.round(amrutaLive.summary.totalMonthlyCostInr).toLocaleString()}</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #232938; padding-bottom: 6px;">
                  <span style="color: var(--text-muted);">Cost Reduction:</span>
                  <span style="font-weight: 700; color: #34d399; font-family: var(--font-mono);">${amrutaLive.summary.costReductionPct}%</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--text-muted);">Children Added:</span>
                  <span style="font-weight: 700; color: #34d399; font-family: var(--font-mono);">+${amrutaLive.summary.additionalChildrenFed.toLocaleString()}</span>
                </div>
              </div>
            ` : `<div style="color: var(--text-muted); text-align: center; padding: 20px;">Ready to run</div>`}
          </div>

          <!-- Col 4: Modern OR-Tools Solver -->
          <div style="background: var(--bg-card); border: 1px solid var(--border-card); border-top: 3px solid #3b82f6; border-radius: 6px; padding: 16px;">
            <div style="font-size: 10px; font-weight: 700; color: #3b82f6; text-transform: uppercase;">Modern Metaheuristic</div>
            <h3 style="font-size: 14px; font-weight: 700; color: var(--text-white); margin: 4px 0 2px;">Google OR-Tools</h3>
            <div style="font-size: 11px; color: var(--text-dim); margin-bottom: 14px;">Clarke-Wright + GLS + 2-Opt*</div>

            ${modernLive ? `
              <div style="display: flex; flex-direction: column; gap: 10px; font-size: 12px;">
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #232938; padding-bottom: 6px;">
                  <span style="color: var(--text-muted);">Fleet Deployed:</span>
                  <span style="font-weight: 700; color: var(--text-white); font-family: var(--font-mono);">${modernLive.summary.totalVehicles} vans</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #232938; padding-bottom: 6px;">
                  <span style="color: var(--text-muted);">Total Distance:</span>
                  <span style="font-weight: 700; color: var(--text-white); font-family: var(--font-mono);">${modernLive.summary.totalDistanceKm} km</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #232938; padding-bottom: 6px;">
                  <span style="color: var(--text-muted);">Delivery Duration:</span>
                  <span style="font-weight: 700; color: ${modernLive.summary.maxElapsedMinutes <= 270 ? '#34d399' : '#f87171'}; font-family: var(--font-mono);">
                    ${modernLive.summary.maxElapsedMinutes} mins
                  </span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #232938; padding-bottom: 6px;">
                  <span style="color: var(--text-muted);">Monthly Cost:</span>
                  <span style="font-weight: 700; color: var(--text-white); font-family: var(--font-mono);">INR ${Math.round(modernLive.summary.totalMonthlyCostInr).toLocaleString()}</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #232938; padding-bottom: 6px;">
                  <span style="color: var(--text-muted);">Cost Reduction:</span>
                  <span style="font-weight: 700; color: #34d399; font-family: var(--font-mono);">${modernLive.summary.costReductionPct}%</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--text-muted);">Children Added:</span>
                  <span style="font-weight: 700; color: #34d399; font-family: var(--font-mono);">+${modernLive.summary.additionalChildrenFed.toLocaleString()}</span>
                </div>
              </div>
            ` : `<div style="color: var(--text-muted); text-align: center; padding: 20px;">Ready to run</div>`}
          </div>
        </div>

        <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid #334155; border-radius: 6px; padding: 14px 18px; font-size: 12px; color: #cbd5e1; line-height: 1.6;">
          <strong style="color: var(--text-white);">Managerial Takeaway:</strong>
          Modern global solvers pack capacity tightly into fewer vehicles (higher utilization), reducing vehicle fixed costs. However, AMRUTA's 3-stage heuristic balances sector compactness with route duration, ensuring strict compliance with the 12:30 PM delivery cutoff.
        </div>
      </div>
    `;
  }
};

window.ComparisonView = ComparisonView;
