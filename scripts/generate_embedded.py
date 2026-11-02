import csv
import json
import os

with open('data/fleet_config.csv', 'r', encoding='utf-8') as f:
    fleet = list(csv.DictReader(f))
    for v in fleet:
        v['rack_bottom'] = int(v['rack_bottom'])
        v['rack_middle'] = int(v['rack_middle'])
        v['rack_top'] = int(v['rack_top'])
        v['mileage_kmpl'] = float(v['mileage_kmpl'])
        v['equivalent_capacity'] = int(v['equivalent_capacity'])
        v['maint_cost_monthly'] = float(v['maint_cost_monthly'])
        v['drivers'] = int(v['drivers'])
        v['supervisors'] = int(v['supervisors'])
        v['loaders'] = int(v['loaders'])
        v['driver_salary'] = float(v['driver_salary'])
        v['supervisor_salary'] = float(v['supervisor_salary'])
        v['loader_salary'] = float(v['loader_salary'])

with open('data/vasanthapura_demo_100.csv', 'r', encoding='utf-8') as f:
    demo_100_schools = list(csv.DictReader(f))
    for s in demo_100_schools:
        s['school_id'] = int(s['school_id'])
        s['latitude'] = float(s['latitude'])
        s['longitude'] = float(s['longitude'])
        s['rice_vessels'] = float(s['rice_vessels'])
        s['sambar_vessels'] = float(s['sambar_vessels'])
        s['curd_vessels'] = float(s['curd_vessels'])
        s['equivalent_demand'] = float(s['equivalent_demand'])
        s['student_headcount'] = int(s.get('student_headcount', int(round(s['equivalent_demand'] * 56.0))))
        s['corridor_id'] = int(s.get('corridor_id', 1))

with open('data/vasanthapura_demo_45.csv', 'r', encoding='utf-8') as f:
    demo_45_schools = list(csv.DictReader(f))
    for s in demo_45_schools:
        s['school_id'] = int(s['school_id'])
        s['latitude'] = float(s['latitude'])
        s['longitude'] = float(s['longitude'])
        s['rice_vessels'] = float(s['rice_vessels'])
        s['sambar_vessels'] = float(s['sambar_vessels'])
        s['curd_vessels'] = float(s['curd_vessels'])
        s['equivalent_demand'] = float(s['equivalent_demand'])
        s['student_headcount'] = int(s.get('student_headcount', int(round(s['equivalent_demand'] * 56.0))))
        s['corridor_id'] = int(s.get('corridor_id', 1))

with open('data/vasanthapura_schools_530.csv', 'r', encoding='utf-8') as f:
    full_schools = list(csv.DictReader(f))
    for s in full_schools:
        s['school_id'] = int(s['school_id'])
        s['latitude'] = float(s['latitude'])
        s['longitude'] = float(s['longitude'])
        s['rice_vessels'] = float(s['rice_vessels'])
        s['sambar_vessels'] = float(s['sambar_vessels'])
        s['curd_vessels'] = float(s['curd_vessels'])
        s['equivalent_demand'] = float(s['equivalent_demand'])
        s['student_headcount'] = int(s.get('student_headcount', int(round(s['equivalent_demand'] * 56.0))))
        s['corridor_id'] = int(s.get('corridor_id', 1))

with open('data/vasanthapura_benchmark_metrics.json', 'r', encoding='utf-8') as f:
    benchmark = json.load(f)

js_content = f"""/**
 * Embedded Offline Benchmark Data for Standalone Browser Execution
 * Authentic Bangalore South midday meal school network (Mahadevan et al. 2013)
 * Enables the web app to run 100% offline even when launched via file://
 */

const EMBEDDED_DATA = {{
  fleet: {json.dumps(fleet)},
  demoSchools: {json.dumps(demo_100_schools)},
  schools100: {json.dumps(demo_100_schools)},
  schools45: {json.dumps(demo_45_schools)},
  fullSchools: {json.dumps(full_schools)},
  benchmarks: {json.dumps(benchmark)}
}};

window.EMBEDDED_DATA = EMBEDDED_DATA;
"""

with open('app/js/models/embedded_data.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print(f"Generated embedded_data.js with {len(fleet)} fleet vehicles, {len(demo_100_schools)} primary 100-schools, and {len(full_schools)} full schools database.")
