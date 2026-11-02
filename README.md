# MSO-103: Optimisation Models for Managers
## Akshaya Patra Midday Meal Logistics Decision Support System (AMRUTA vs Modern OR Solver)
**Team**: Rice Team (Garv & Team of 3)  
**Reference Paper**: *Redesigning Midday Meal Logistics for the Akshaya Patra Foundation: OR at Work in Feeding Hungry School Children* (Mahadevan, Sivakumar, Dinesh Kumar, Ganeshram — *INFORMS Interfaces*, 2013)  
**Case Study Kitchen**: Vasanthapura Central Kitchen, South Bangalore (530 schools, ~111,000 children, 35 delivery vans)

---

## 1. Quick Start Guide
You can launch the complete working demo in two ways:

### Option A: One-Click Instant Launch (Recommended)
Double-click `start_app.bat` in this folder, or simply double-click:
```
E:\MS0-103\app\index.html
```
> **Zero External Dependencies Required**: The dashboard is fully self-contained and preloaded with the authentic Vasanthapura benchmark datasets. It runs 100% offline in any modern browser (Chrome, Edge, Firefox).

### Option B: With Python API Server
Open PowerShell / Terminal in `E:\MS0-103` and run:
```bash
python server.py
```
Then visit: `http://localhost:8000`

---

## 2. Key Architecture & File Structure

```
E:\MS0-103/
├── app/                               # Decision Support System Web Interface
│   ├── index.html                     # Executive Dashboard Single Page Application
│   ├── css/
│   │   └── styles.css                 # Clean, minimal OR Manager dark theme
│   └── js/
│       ├── algorithms/
│       │   ├── amruta_engine.js       # 3-Stage Heuristic (Modified K-Means, 2-Opt, SOM/TSP)
│       │   └── modern_solver.js       # Modern OR Metaheuristic (Clarke-Wright + GLS + 2-Opt*)
│       ├── models/
│       │   ├── cost_evaluator.js      # Monthly fuel, maintenance, crew wages, savings metrics
│       │   ├── data_manager.js        # Coordinate math, travel/service times, Excel parser
│       │   └── embedded_data.js       # Offline preloaded benchmark datasets
│       └── views/
│           ├── comparison_view.js     # Side-by-side 4-column decision matrix
│           ├── excel_manager_view.js  # Spreadsheet operations management view
│           ├── map_view.js            # Geospatial route visualizer (Leaflet + Canvas fallback)
│           ├── playground_view.js     # Interactive code presentation & What-If stress lab
│           └── trip_sheet_view.js     # Per-driver manifests with Excel export & print slips
├── data/                              # Local Spreadsheet Datasets & Templates
│   ├── data.xlsx                      # Backup copy of active operational spreadsheet
│   ├── fleet_config.csv               # 35-vehicle heterogeneous fleet specification (Table 1b)
│   ├── fleet_config.xlsx              # Fleet template Excel workbook
│   ├── vasanthapura_benchmark_metrics.json # Paper's published results (Tables 2, 3, 4)
│   ├── vasanthapura_demo_45.csv       # Fast 4-sector presentation dataset (117 schools)
│   ├── vasanthapura_demo_45.xlsx      # Demo template Excel workbook
│   ├── vasanthapura_schools_530.csv   # Complete 529-school benchmark demand & GPS coordinates
│   └── vasanthapura_schools_530.xlsx  # Complete 529-school Excel workbook
├── docs/                              # Course Assignment, Case Paper & Team Presentation
│   ├── Group Assignment - Instructions for IJAA presentation.docx
│   ├── IJAA 13 VRP Akshaya Patra midday meal Genetic GA K-means.pdf
│   └── Rice Team PPT.pptx
├── scripts/                           # Data generator & Excel build utilities
│   ├── export_excel_data.py           # Pure-Python Excel workbook generator
│   ├── generate_datasets.py           # Synthetic benchmark dataset generator
│   └── generate_embedded.py           # Standalone offline JS bundle generator
├── .gitignore                         # Clean git configuration
├── data.xlsx                          # Manager's primary active operational spreadsheet
├── README.md                          # Comprehensive project documentation
├── server.py                          # Zero-dependency Python HTTP & REST API server
├── solver_engine.py                   # Python implementation of AMRUTA & Modern Solvers
└── start_app.bat                      # One-click desktop launcher
```

---

## 3. Operations Research Models Implemented

### Model 1: Classical AMRUTA 3-Stage Heuristic
Faithful implementation of Mahadevan et al. (2013) designed for the Heterogeneous Fixed Fleet Vehicle Routing Problem with Time Windows (HFFVRPTW):
1. **Stage 1 (Modified K-Means Clustering)**:
   - Initial Seeds: Top $k$ demand schools serve as cluster anchors.
   - Priority Metric: $P_i = \frac{\text{Distance}(i, \text{Centroid})}{\text{Demand}_i}$.
   - Two-phase packing: First packs up to 80% capacity to leave reorganization headroom; second phase packs remaining nodes to 100%.
2. **Stage 2 (Vehicle Assignment & 2-Opt Cluster Refinement)**:
   - Greedy assignment of $k$ vehicles with lowest monthly operating cost.
   - Split oversized clusters ($>150\%$ capacity); merge undersized clusters ($<25\%$).
   - 2-Opt boundary interchange evaluating moves under capacity and 60/40 travel-to-service time ratio constraints.
3. **Stage 3 (Routing & Exact Time Window Schedule)**:
   - Intra-cluster TSP sequencing using SOM / Nearest Neighbor + 2-Opt edge uncrossing.
   - Clock arrival tracking ($y_j = y_i + s_i + t_{ij}$) ensuring arrival before the 12:30 PM lunch delivery cutoff.

### Model 2: Modern OR Solver (CVRPTW Metaheuristic)
- Google OR-Tools style metaheuristic formulation for heterogeneous fleet capacitated routing.
- **Clarke-Wright Savings Initialization**: Merges pairs of routes maximizing global distance savings $s(i,j) = d(0,i) + d(0,j) - d(i,j)$.
- **Guided Local Search (GLS) & 2-Opt***: Inter-route exchange swapping tail segments across routes to eliminate intersecting paths.
- **Vehicle Tight-Fitting**: Minimizes fleet capacity slack to lower vehicle fixed costs.

---

## 4. Web Application Features

### 1. 🗺️ Geospatial Map View
- Centered at TAPF Central Kitchen Hub (**Vasanthapura**, `12.8881° N, 77.5484° E`).
- **Interactive Routing Visualizer**: Supports full Bangalore map tiles (when online) and a high-performance Canvas vector engine (when offline).
- **Crisscrossing Comparison**: Toggle between **Pre-AMRUTA (Ad-Hoc)** to see the tangled overlapping routes from Figure 3 vs **AMRUTA Optimized Petals** from Figure 4.
- Filter by specific vehicle cluster to inspect individual delivery corridors.
- Hover & click tooltips showing school name, stop sequence, arrival clock time, container counts, and unloading time.

### 2. 📋 Per-Driver Trip Sheet & Manifest (Driver Travel Aid)
- Dedicated driver manifest matching **Figure 5** of the paper.
- Vehicle Profile: Vehicle ID, Type (Tata, Swaraj Mazda, Max Pikup), Assigned Driver & Supervisor, Deployed Capacity, Load, Utilization %, Total Distance, and Duration.
- Itinerary Table: Stop sequence #, school name, GPS coordinates, containers delivered (Rice, Sambar, Curd), leg distance, travel time, unloading service time, and scheduled arrival time.
- **Export to Excel (.xlsx)** and **Export CSV** in one click.
- **Print Driver Trip Sheet**: Formatted clean print view ready to physically hand to drivers before 8:00 AM dispatch with signature blocks.

### 3. 📊 Model Comparison Matrix
- 4-column side-by-side executive decision matrix:
  1. Pre-AMRUTA Baseline (35 vans, 1,400 km, >5 hours, ₹16.9 Lakhs/mo)
  2. Published AMRUTA Benchmark (27 vans, 1,325 km, 246 min, ₹13.76 Lakhs/mo, 18.6% savings)
  3. Live Dynamic AMRUTA Execution
  4. Modern OR Solver
- Metrics tracked: Fleet deployed, total km, max elapsed delivery minutes, monthly operating cost (₹ and $), diesel savings (liters/mo), and equivalent additional children fed.

### 4. 🧪 Interactive OR Playground (Presentation Guide)
Designed specifically for Garv and his team to present during the final evaluation:
- **Cost vs Responsiveness Trade-off Curve**: Interactive graph plotting $k=20$ to $k=35$ solutions (reproducing Table 2). Demonstrates why TAPF management chose $k=27$ (4.1 hrs delivery) over $k=20$ (5.1 hrs delivery, which violated the 12:30 PM cutoff).
- **Modified K-Means Priority Visualizer**: Interactive slider comparing standard Euclidean distance vs AMRUTA's $\frac{\text{dist}}{d_i}$ priority rule.
- **2-Opt Interchange Mechanics**: Visual before/after diagram showing how crisscrossing edges are uncrossed.
- **Live "What-If" Stress Lab**: Test operational disruptions in real time (e.g., driver absenteeism, monsoon traffic delay 0.8x, diesel price hike to ₹95/L).

### 5. 📁 Local Excel Data Management
- Download pre-generated benchmark spreadsheets (`vasanthapura_schools_530.xlsx`, `fleet_config.xlsx`, `vasanthapura_demo_45.xlsx`).
- Upload modified custom Excel/CSV files to simulate new schools or kitchen fleet reallocations.

---

## 5. Notes for Final Evaluation Presentation (Rice Team)
When presenting to the professor:
1. **Explain the Scale**: 500 schools and 30 vehicles formulate into **7.56 million binary variables** (Appendix A). Exact mixed-integer programming solvers (like standard Branch-and-Bound) cannot solve this within operational time windows, which is why a decomposition heuristic was necessary.
2. **Highlight the Managerial Decision**: The goal of OR for managers is not to deliver a single "take-it-or-leave-it" black-box answer, but a **range of solutions** ($k = 20$ to $35$). This empowers the regional logistics manager to perform daily trade-offs between operating cost and delivery punctuality.
3. **Connect OR to Social Impact**: The 18.6% cost savings realized at Vasanthapura (US$ 75,000/year) funded midday meals for **2,400 additional hungry schoolchildren**. When scaled across TAPF's 19 kitchens nationally, it translates to **US$ 1.96 million/year** and feeding **62,000 additional children**.
