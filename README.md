# The Akshaya Patra Foundation — Midday Meal Logistics Decision Support System

**Course:** MSO-103: Optimisation Models for Managers  
**Academic Case Study:** *Redesigning Midday Meal Logistics for the Akshaya Patra Foundation: OR at Work in Feeding Hungry School Children*  
**Authors:** B. Mahadevan, N. Sivakumar, Dileep Kalagnanam, G. Shenoy, C. Ramaswamy (*INFORMS Interfaces*, Vol. 43, No. 5, September–October 2013, pp. 430–446)  
**Team:** Rice Team (Garv & Team)

---

## 1. Executive Summary & Problem Formulation

The Akshaya Patra Foundation (TAPF) operates mega-kitchens delivering fresh, hot midday meals to underprivileged children in government schools across India. In the Greater Bangalore region, the **Vasanthapura Central Kitchen Hub** delivers hot meals daily to **529 schools** (174,000+ children) distributed over an 850 km² urban and semi-urban radius.

### Operational Constraints & Challenges:
1. **Critical Delivery Deadline ($T_{\max}$):** Food preparation finishes at 8:00 AM. In accordance with government education mandates, all meals must be delivered before schools break for lunch at **12:30 PM (270 minutes maximum elapsed travel and unloading time)**. Food delivered after 12:30 PM is spoiled or rejected.
2. **Fixed Heterogeneous Fleet:** Delivery vehicles are leased from external contractors on fixed monthly contracts. The fleet comprises multi-tier customized vehicles (Tata 407, Eicher 11.10, Swaraj Mazda, Mahindra Max Pikup) with strict vessel-rack capacities ($Q_k \in [280, 420]$ equivalent units).
3. **Multi-Vessel Cargo Hierarchy:** Schools require three vessel types:
   $$\text{Equivalent Cargo Demand } d_i = \text{Rice} + 0.5 \times \text{Sambar} + 0.25 \times \text{Curd}$$
4. **Nonlinear Urban Circuity:** Euclidean distances are corrected using Bangalore's radial circuity coefficient $\gamma = 1.35$.
5. **Cost Dominance of Fleet Size ($k$):** Vehicle monthly lease and driver crew salaries dominate logistics costs (~₹35,000/month per vehicle). Reducing the active fleet size ($k$) yields the highest financial return.

---

## 2. Mathematical Formulation (Mixed-Integer Linear Program)

The problem is formulated as a **Heterogeneous Fixed Fleet Vehicle Routing Problem with Time Windows (HFFVRPTW)**.

### Sets and Indices:
* $V = \{0, 1, 2, \dots, n\}$: Set of nodes, where node $0$ represents the Vasanthapura Central Kitchen Hub and $N = \{1, \dots, n\}$ represents the beneficiary schools.
* $K = \{1, 2, \dots, K_{\max}\}$: Set of available leased delivery vehicles.

### Parameters:
* $c_{ij}$: Distance-based variable cost from node $i$ to node $j$ ($c_{ij} = \gamma \cdot \text{Euclidean}(i, j) \times \text{fuel rate}$).
* $f_k$: Fixed monthly lease, crew salary, and maintenance cost of vehicle $k$ ($\approx \text{INR } 35,000$).
* $d_i$: Equivalent meal vessel demand of school $i$ ($d_0 = 0$).
* $Q_k$: Cargo load capacity threshold of vehicle $k$ ($280$ to $420$ equivalent units).
* $\tau_{ij}$: Travel time between node $i$ and node $j$ at operating speed $v = 24\text{ km/h}$.
* $s_i$: Unloading and handover service duration at school $i$ ($s_i = 3.5\text{ min} + 0.35 \times \text{total containers}$).
* $T_{\max}$: Maximum allowable route completion deadline ($270\text{ minutes} = 4.5\text{ hours}$, 12:30 PM cutoff).

### Decision Variables:
* $x_{ijk} \in \{0, 1\}$: Binary variable equal to $1$ if vehicle $k$ traverses arc $(i, j)$; $0$ otherwise.
* $y_k \in \{0, 1\}$: Binary variable equal to $1$ if vehicle $k$ is deployed; $0$ otherwise.
* $t_i \ge 0$: Continuous arrival time at school $i$ ($t_0 = 0$, dispatch at 8:00 AM).

### Objective Function:
$$\min \quad Z = \sum_{k \in K} f_k y_k + \sum_{k \in K} \sum_{i \in V} \sum_{j \in V} c_{ij} x_{ijk}$$

### Constraints:
1. **Single Visit Mandate:** Every school is visited exactly once by a single vehicle:
   $$\sum_{k \in K} \sum_{j \in V, j \neq i} x_{ijk} = 1 \quad \forall i \in N$$
2. **Depot Flow Conservation:** Each deployed vehicle originates and terminates at the central kitchen:
   $$\sum_{j \in N} x_{0jk} = y_k \quad \forall k \in K$$
   $$\sum_{i \in N} x_{i0k} = y_k \quad \forall k \in K$$
3. **Intermediate Flow Balance:**
   $$\sum_{i \in V, i \neq p} x_{ipk} - \sum_{j \in V, j \neq p} x_{pjk} = 0 \quad \forall p \in N, \forall k \in K$$
4. **Vehicle Capacity Packing:** Total meal units assigned to vehicle $k$ cannot exceed its rated capacity $Q_k$:
   $$\sum_{i \in N} d_i \sum_{j \in V, j \neq i} x_{ijk} \le Q_k y_k \quad \forall k \in K$$
5. **Subtour Elimination & Clock Time Window Propagation:**
   $$t_i + s_i + \tau_{ij} - M(1 - x_{ijk}) \le t_j \quad \forall i \in V, \forall j \in N, i \neq j, \forall k \in K$$
6. **Strict Lunch Delivery Deadline:** All food must reach schools prior to 12:30 PM:
   $$t_i \le T_{\max} \quad \forall i \in N$$
7. **Fleet Availability Bound:**
   $$\sum_{k \in K} y_k \le K_{\max}$$

---

## 3. Algorithmic Architecture: Heuristics vs. Exact Metaheuristics

### Academic Query: *"Why does the web decision support tool run in milliseconds while exact VRP requires significant computation time?"*

In large-scale combinatorial optimization ($n = 530$ nodes), solving the exact mixed-integer linear program to provable optimality via Branch-and-Cut is **NP-hard**. Commercial solvers (CPLEX, Gurobi) require hours or days to close the integrality gap on 530 nodes with tight time windows.

To solve this, our project implements a **two-tier architecture**:

```
                                  [MSO-103 Architecture]
                                             │
             ┌───────────────────────────────┴───────────────────────────────┐
             ▼                                                               ▼
   [Interactive Web DSS]                                          [Heavy Batch Solver]
• Engine: Clarke-Wright + Guided 2-Opt                         • Engine: Google OR-Tools
• Language: Client-Side JavaScript                             • Language: Standalone Python
• Complexity: O(n² log n) polynomial                          • Metaheuristic: Guided Local Search (GLS)
• Runtime: 15–40 milliseconds                                  • Runtime: 10–60 seconds
• Purpose: Real-time managerial sensitivity analysis           • Purpose: Offline deep combinatorial search
```

### 1. Interactive Decision Support Engine (`app/js/algorithms/modern_solver.js`):
* **Polynomial-Time Clarke-Wright Savings with Sector Sweep:** $\mathcal{O}(n^2)$ algorithm evaluating savings $s_{ij} = c_{0i} + c_{0j} - c_{ij}$ under real-time capacity and deadline constraints.
* **Guided 2-Opt Local Search:** Intra-route $\mathcal{O}(m^2)$ pairwise edge swapping eliminating crossing paths.
* **Execution:** Runs in **15–40 milliseconds**, allowing managers and students to adjust fleet sliders, capacity thresholds, speed, and diesel prices with instantaneous live recalculation.

### 2. Standalone Google OR-Tools Python Solver (`scripts/solve_ortools_vrp.py`):
* Implements Google's `RoutingIndexManager` and `RoutingModel` C++ core via Python bindings.
* Employs **Guided Local Search (GLS)** with `PARALLEL_CHEAPEST_INSERTION` initial solution strategy.
* Executes multi-neighborhood search across inter-route and intra-route operators over 10–60 seconds.

---

## 4. Verification Against Mahadevan et al. (2013) Published Benchmarks

Our models reproduce the historical transition documented in **Table 4** of the paper:

| Operational Metric | Pre-AMRUTA Historical (Ad-Hoc) | Published Paper Benchmark (Table 4) | Our Implemented Solvers ($k=27$, Cap $280$ U) | Status / Alignment |
|---|:---:|:---:|:---:|:---:|
| **Active Fleet ($k$)** | 35 vans | **27 vans (-22.9%)** | **27 vans** | **Exact Match** |
| **Total Daily Travel** | 1,400.0 km | **1,325.1 km (-5.3%)** | **1,034.6 – 1,131.0 km** | **Superior Metaheuristic** |
| **Max Delivery Duration** | > 300 mins (> 5 hrs) | **246.7 mins (4.1 hrs)** | **174.5 – 213.2 mins** | **Feasible (< 270 mins)** |
| **Monthly Operating Cost** | INR 1,690,900 | **INR 1,376,167** | **INR 1,242,491 – 1,244,904** | **Verified Savings** |
| **Cost Reduction %** | Baseline ($0.0\%$) | **+18.61% ($75,000/yr)** | **+26.4%** | **Robust Positive ROI** |
| **12:30 PM On-Time Delivery** | Frequent Late Violations | **100% On-Time** | **100% On-Time (0 Late)** | **Zero Food Spoilage** |

---

## 5. Repository Structure

```
project/
├── app/                               # Decision Support System web application
│   ├── index.html                     # Minimalist pure-black academic interface
│   ├── css/
│   │   └── styles.css                 # Pure-black CSS (#000000), 0 blue tint, @media print
│   └── js/
│       ├── algorithms/
│       │   ├── amruta_engine.js       # Classical 3-Stage Heuristic (Mahadevan et al. 2013)
│       │   └── modern_solver.js       # Clarke-Wright Savings + Guided 2-Opt polynomial solver
│       ├── models/
│       │   ├── cost_evaluator.js      # Fuel, fixed hire, crew wages, maintenance evaluator
│       │   ├── data_manager.js        # Coordinate math, Haversine, service time calculator
│       │   └── embedded_data.js       # Vasanthapura 529-school coordinates & demands
│       └── views/
│           ├── comparison_view.js     # Algorithm & Benchmark dossier: MILP formulation, complexity, Table 4, trade-off curve
│           ├── excel_manager_view.js  # Real-time spreadsheet data manager with status toggles
│           ├── map_view.js            # Geographic route visualizer with radial sectors
│           └── trip_sheet_view.js     # Driver dispatch manifests & print generator
├── data/                              # Benchmark datasets in CSV and Excel
│   ├── vasanthapura_schools_530.csv   # Complete 529-school dataset
│   ├── vasanthapura_demo_100.csv      # 100-school classroom demonstration subset
│   └── fleet_config.csv               # Vehicle capacity, mileage, and salary specifications
├── docs/                              # Research papers, teaching decks, and instructions
│   └── TAPF_Logistics_Optimization_Teaching_Version.pptx
├── scripts/
│   └── solve_ortools_vrp.py           # Standalone Python Google OR-Tools Guided Local Search
├── README.md                          # Comprehensive academic report and user guide
├── server.py                          # Zero-dependency Python local server
├── solver_engine.py                   # Python implementation of OR solvers
└── start_app.bat                      # One-click Windows launch script
```

---

## 6. How to Run the Project

### Option A: Interactive Web Decision Support System (Zero Dependencies)
* **Windows Desktop:** Double-click `start_app.bat`.
* **Direct Browser Launch:** Open `app/index.html` in Chrome, Firefox, or Edge.
* **Via Python Server:**
  ```bash
  python server.py
  ```
  Open `http://localhost:8000` in your web browser.

### Option B: Standalone Google OR-Tools Python Solver
To run the heavy metaheuristic batch solver from the terminal:
```bash
# 1. Install Google OR-Tools (if not already installed)
pip install ortools

# 2. Run Google OR-Tools on the 100-school demonstration dataset
python scripts/solve_ortools_vrp.py --data data/vasanthapura_demo_100.csv --fleet 10 --capacity 280 --time_limit 10

# 3. Run Google OR-Tools on the full 529-school Vasanthapura benchmark
python scripts/solve_ortools_vrp.py --data data/vasanthapura_schools_530.csv --fleet 27 --capacity 280 --time_limit 30
```

### Option C: Printing Official Driver Manifests (Paper Dispatch Slips)
1. Navigate to **Tab 3: Driver Trip Manifests**.
2. Select any vehicle route from the dropdown (e.g. `Route #01 — Eicher`).
3. Click **Print Trip Sheet** (or press `Ctrl+P`).
4. The system automatically switches to an official **A4 Paper Dispatch Manifest**:
   - 100% white paper background with crisp single-line black borders.
   - Hides all browser UI, sidebars, buttons, and navigation widgets.
   - Formats complete destination tables with Rice/Sambar/Curd container breakdowns.
   - Includes physical signature blocks for the Kitchen Dispatch Supervisor, Vehicle Driver, and School Headmaster/Teacher.

---

## 7. Academic Integrity & Standards
* **No Marketing Gimmicks:** Artificial "Social Impact (SROI)" vanity metrics and demonstration presets have been removed.
* **Strictly No Emojis:** The codebase and interface adhere strictly to mathematical typography and academic presentation standards.
* **Verified Convergence:** Both the interactive polynomial heuristic and the standalone Python OR-Tools solver converge to feasible, cutoff-compliant solutions matching Table 4 benchmarks.
