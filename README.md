# AMRUTA Decision Support System: Vasanthapura Midday Meal Routing

An interactive Operations Research dashboard for the Heterogeneous Fixed Fleet Vehicle Routing Problem with Time Windows (HFFVRPTW), based on the Akshaya Patra (TAPF) Vasanthapura kitchen case (Mahadevan et al., 2013).

---

## 1. Quick Start Guide

You can run the full demo in two ways. In the steps below, **the project folder** means wherever you cloned or extracted this repository.

### Step 0: Get the project

```bash
git clone https://github.com/garv-iitr/MS0-103.git
cd <cloned-folder-name>
```

Or download the ZIP from the repository page and extract it.

### Option A: One-Click Instant Launch (Recommended)

- **Windows:** double-click `start_app.bat` in the project folder.
- **Any OS:** open `app/index.html` in Chrome, Edge or Firefox.

**Zero external dependencies.** The dashboard is fully self-contained and preloaded with the Vasanthapura benchmark datasets. It runs 100% offline in any modern browser.

### Option B: With Python API Server

Requires Python 3 (no pip packages needed). Open PowerShell or a terminal in the project folder and run:

```bash
python server.py
```

Then visit: http://localhost:8000

---

## 2. Key Architecture & File Structure

```
<project-folder>/
├── app/                               # Decision Support System web interface
│   ├── index.html                     # Executive dashboard single-page application
│   ├── css/
│   │   └── styles.css                 # Clean, minimal OR Manager dark theme
│   └── js/
│       ├── algorithms/
│       │   ├── amruta_engine.js       # 3-stage heuristic (Modified K-Means, 2-Opt, SOM/TSP)
│       │   └── modern_solver.js       # Modern OR metaheuristic (Clarke-Wright + GLS + 2-Opt*)
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
├── data/                              # Local spreadsheet datasets & templates
│   ├── data.xlsx                      # Backup copy of active operational spreadsheet
│   ├── fleet_config.csv               # 35-vehicle heterogeneous fleet specification (Table 1b)
│   ├── fleet_config.xlsx              # Fleet template Excel workbook
│   ├── vasanthapura_benchmark_metrics.json  # Paper's published results (Tables 2, 3, 4)
│   ├── vasanthapura_demo_45.csv       # Fast 4-sector presentation dataset (117 schools)
│   ├── vasanthapura_demo_45.xlsx      # Demo template Excel workbook
│   ├── vasanthapura_schools_530.csv   # Complete 529-school benchmark demand & GPS coordinates
│   └── vasanthapura_schools_530.xlsx  # Complete 529-school Excel workbook
├── docs/                              # Course assignment, case paper & team presentation
│   ├── Group Assignment - Instructions for IJAA presentation.docx
│   ├── IJAA 13 VRP Akshaya Patra midday meal Genetic GA K-means.pdf
│   └── Rice Team PPT.pptx
├── scripts/                           # Data generator & Excel build utilities
│   ├── export_excel_data.py           # Pure-Python Excel workbook generator
│   ├── generate_datasets.py           # Synthetic benchmark dataset generator
│   └── generate_embedded.py           # Standalone offline JS bundle generator
├── .gitignore                         # Git configuration
├── data.xlsx                          # Manager's primary active operational spreadsheet
├── README.md                          # Project documentation
├── server.py                          # Zero-dependency Python HTTP & REST API server
├── solver_engine.py                   # Python implementation of AMRUTA & Modern solvers
└── start_app.bat                      # One-click desktop launcher
```

---

## 3. Operations Research Models Implemented

### Model 1: Classical AMRUTA 3-Stage Heuristic

A faithful implementation of Mahadevan et al. (2013) for the Heterogeneous Fixed Fleet Vehicle Routing Problem with Time Windows (HFFVRPTW).

**Stage 1: Modified K-Means Clustering**
- **Initial seeds:** the top *k* demand schools serve as cluster anchors.
- **Priority metric:** `P_i = Distance(i, Centroid) / Demand_i`
- **Two-phase packing:** the first phase packs clusters up to 80% capacity to leave reorganization headroom. The second phase packs remaining nodes up to 100%.

**Stage 2: Vehicle Assignment & 2-Opt Cluster Refinement**
- Greedy assignment of *k* vehicles with the lowest monthly operating cost.
- Split oversized clusters (> 150 capacity) and merge undersized clusters (< 25).
- 2-Opt boundary interchange, evaluating moves under capacity and the 60/40 travel-to-service time ratio constraint.

**Stage 3: Routing & Exact Time Window Schedule**
- Intra-cluster TSP sequencing using SOM / Nearest Neighbor + 2-Opt edge uncrossing.
- Clock arrival tracking, `y_j = y_i + s_i + t_ij`, ensuring arrival before the 12:30 PM lunch delivery cutoff.

### Model 2: Modern OR Solver (CVRPTW Metaheuristic)

A Google OR-Tools-style metaheuristic formulation for heterogeneous fleet capacitated routing.

- **Clarke-Wright savings initialization:** merges pairs of routes that maximize global distance savings, `s(i,j) = d(0,i) + d(0,j) - d(i,j)`.
- **Guided Local Search (GLS) & 2-Opt\*:** inter-route exchange that swaps tail segments across routes to eliminate intersecting paths.
- **Vehicle tight-fitting:** minimizes fleet capacity slack to lower vehicle fixed costs.

---

## 4. Web Application Features

### 4.1 Geospatial Map View
- Centered at the TAPF Central Kitchen Hub (Vasanthapura, 12.8881° N, 77.5484° E).
- **Interactive routing visualizer:** full Bangalore map tiles when online, and a high-performance Canvas vector engine when offline.
- **Crisscrossing comparison:** toggle between Pre-AMRUTA (ad-hoc), which shows the tangled overlapping routes from Figure 3, and AMRUTA-optimized petals from Figure 4.
- Filter by a specific vehicle cluster to inspect individual delivery corridors.
- Hover and click tooltips show school name, stop sequence, arrival clock time, container counts and unloading time.

### 4.2 Per-Driver Trip Sheet & Manifest (Driver Travel Aid)
A dedicated driver manifest matching Figure 5 of the paper.
- **Vehicle profile:** vehicle ID, type (Tata, Swaraj Mazda, Max Pikup), assigned driver and supervisor, deployed capacity, load, utilization %, total distance and duration.
- **Itinerary table:** stop sequence #, school name, GPS coordinates, containers delivered (Rice, Sambar, Curd), leg distance, travel time, unloading service time and scheduled arrival time.
- Export to Excel (.xlsx) or CSV in one click.
- **Print Driver Trip Sheet:** a clean print view with signature blocks, ready to hand to drivers before the 8:00 AM dispatch.

### 4.3 Model Comparison Matrix
A 4-column side-by-side executive decision matrix:
1. **Pre-AMRUTA baseline:** 35 vans, 1,400 km, > 5 hours, ₹16.9 lakhs/month
2. **Published AMRUTA benchmark:** 27 vans, 1,325 km, 246 min, ₹13.76 lakhs/month, 18.6% savings
3. **Live dynamic AMRUTA execution**
4. **Modern OR solver**

Metrics tracked: fleet deployed, total km, max elapsed delivery minutes, monthly operating cost (₹ and $), diesel savings (liters/month) and equivalent additional children fed.

### 4.4 Interactive OR Playground (Presentation Guide)
Designed for the team to present during the final evaluation.
- **Cost vs responsiveness trade-off curve:** an interactive graph plotting k = 20 to k = 35 solutions (reproducing Table 2). It shows why TAPF management chose k = 27 (4.1 hrs delivery) over k = 20 (5.1 hrs delivery, which violated the 12:30 PM cutoff).
- **Modified K-Means priority visualizer:** an interactive slider comparing standard Euclidean distance with AMRUTA's dist/d_i priority rule.
- **2-Opt interchange mechanics:** a before/after diagram showing how crisscrossing edges are uncrossed.
- **Live "What-If" stress lab:** test operational disruptions in real time, such as driver absenteeism, a monsoon traffic delay (0.8x) or a diesel price hike to ₹95/L.

### 4.5 Local Excel Data Management
- Download the pre-generated benchmark spreadsheets (`vasanthapura_schools_530.xlsx`, `fleet_config.xlsx`, `vasanthapura_demo_45.xlsx`).
- Upload modified custom Excel/CSV files to simulate new schools or kitchen fleet reallocations.

---

## 5. Notes for the Final Evaluation Presentation (Rice Team)

When presenting to the professor:

1. **Explain the scale.** 500 schools and 30 vehicles formulate into about 7.56 million binary variables (Appendix A). Exact mixed-integer programming solvers such as standard Branch-and-Bound cannot solve this within operational time windows, which is why a decomposition heuristic was necessary.
2. **Highlight the managerial decision.** The goal of OR for managers is not a single take-it-or-leave-it black-box answer, but a range of solutions (k = 20 to 35). This lets the regional logistics manager make daily trade-offs between operating cost and delivery punctuality.
3. **Connect OR to social impact.** The 18.6% cost savings at Vasanthapura (US$75,000/year) funded midday meals for 2,400 additional hungry schoolchildren. Scaled across TAPF's 19 kitchens nationally, that is US$1.96 million/year and 62,000 additional children fed.

---

## 6. Troubleshooting

- **`start_app.bat` does nothing or says the path is not found:** open `app/index.html` directly in a browser instead.
- **`python` is not recognized:** install Python 3 from python.org (tick "Add to PATH"), or try `python3 server.py` or `py server.py`.
- **Port 8000 already in use:** close the other program using it, or change the port number inside `server.py`.
- **Map shows no tiles:** you are offline. The Canvas fallback renders the routes without background map tiles, which is expected.
