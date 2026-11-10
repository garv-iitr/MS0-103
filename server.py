"""
Zero-dependency HTTP and REST API Server for MSO-103 Case Study
Serves the web application and provides Python Operations Research solvers.
"""

import http.server
import socketserver
import urllib.parse
import json
import os
import csv
import io
import sys
from solver_engine import AmrutaHeuristicSolver, ModernORSolver

PORT = 8000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.join(BASE_DIR, "app")
DATA_DIR = os.path.join(BASE_DIR, "data")

def load_csv_data(filepath):
    if not os.path.exists(filepath):
        return []
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = []
        for r in reader:
            parsed = {}
            for k, v in r.items():
                try:
                    if '.' in v:
                        parsed[k] = float(v)
                    else:
                        parsed[k] = int(v)
                except ValueError:
                    parsed[k] = v
            rows.append(parsed)
        return rows

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Clean path and query
        parsed = urllib.parse.urlparse(path)
        clean_path = parsed.path

        if clean_path.startswith('/data/'):
            rel_path = clean_path[6:]
            return os.path.join(DATA_DIR, rel_path)
            
        if clean_path == '/data.xlsx' or clean_path.endswith('.xlsx'):
            rel_name = os.path.basename(clean_path)
            if os.path.exists(os.path.join(BASE_DIR, rel_name)):
                return os.path.join(BASE_DIR, rel_name)
            if os.path.exists(os.path.join(DATA_DIR, rel_name)):
                return os.path.join(DATA_DIR, rel_name)
        
        # Route everything else through app/
        if clean_path == '/' or clean_path == '':
            return os.path.join(APP_DIR, 'index.html')
            
        rel_path = clean_path.lstrip('/')
        return os.path.join(APP_DIR, rel_path)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # REST API Routes
        if path == "/api/status":
            self.send_json_response({"status": "running", "course": "MSO-103", "team": "Rice Team"})
            return

        elif path == "/api/schools":
            dataset_type = query.get("type", ["demo"])[0]
            filename = "vasanthapura_schools_530.csv" if dataset_type == "full" else "vasanthapura_demo_45.csv"
            filepath = os.path.join(DATA_DIR, filename)
            schools = load_csv_data(filepath)
            self.send_json_response({"type": dataset_type, "count": len(schools), "schools": schools})
            return

        elif path == "/api/fleet":
            filepath = os.path.join(DATA_DIR, "fleet_config.csv")
            fleet = load_csv_data(filepath)
            self.send_json_response({"count": len(fleet), "fleet": fleet})
            return

        elif path == "/api/benchmarks":
            filepath = os.path.join(DATA_DIR, "vasanthapura_benchmark_metrics.json")
            if os.path.exists(filepath):
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                self.send_json_response(data)
            else:
                self.send_json_response({"error": "Benchmark file not found"}, status=404)
            return

        # Serve static files
        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else "{}"
        
        try:
            params = json.loads(body)
        except Exception:
            params = {}

        if path == "/api/solve/amruta":
            schools_type = params.get("dataset", "demo")
            filename = "vasanthapura_schools_530.csv" if schools_type == "full" else "vasanthapura_demo_45.csv"
            schools = load_csv_data(os.path.join(DATA_DIR, filename))
            fleet = load_csv_data(os.path.join(DATA_DIR, "fleet_config.csv"))

            k = int(params.get("k", 10))
            cap = float(params.get("vehicle_capacity", 65.0))
            speed = float(params.get("delivery_speed", 24.0))
            cutoff = float(params.get("cutoff_minutes", 270.0))
            circuity = float(params.get("circuity_factor", 1.35))
            diesel = float(params.get("diesel_price", 45.0))

            solver = AmrutaHeuristicSolver(
                schools, fleet,
                k_vehicles=k, vehicle_capacity=cap,
                delivery_speed=speed, cutoff_minutes=cutoff,
                circuity_factor=circuity, diesel_price=diesel
            )
            result = solver.solve()
            self.send_json_response(result)
            return

        elif path == "/api/solve/modern":
            schools_type = params.get("dataset", "demo")
            filename = "vasanthapura_schools_530.csv" if schools_type == "full" else "vasanthapura_demo_45.csv"
            schools = load_csv_data(os.path.join(DATA_DIR, filename))
            fleet = load_csv_data(os.path.join(DATA_DIR, "fleet_config.csv"))

            k = int(params.get("k", 10))
            cap = float(params.get("vehicle_capacity", 65.0))
            speed = float(params.get("delivery_speed", 24.0))
            cutoff = float(params.get("cutoff_minutes", 270.0))
            circuity = float(params.get("circuity_factor", 1.35))
            diesel = float(params.get("diesel_price", 45.0))

            solver = ModernORSolver(
                schools, fleet,
                k_vehicles=k, vehicle_capacity=cap,
                delivery_speed=speed, cutoff_minutes=cutoff,
                circuity_factor=circuity, diesel_price=diesel
            )
            result = solver.solve()
            self.send_json_response(result)
            return

        self.send_json_response({"error": "Unknown POST route"}, status=404)

    def send_json_response(self, data, status=200):
        body = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

def run_server(port=PORT):
    # Try preferred port, if in use try next
    for p in [port, 8080, 8888, 9000]:
        try:
            with http.server.ThreadingHTTPServer(("", p), CustomHandler) as httpd:
                print(f"=== MSO-103 OR Decision Support Server Running ===")
                print(f"URL: http://localhost:{p}")
                print(f"Serving app from: {APP_DIR}")
                print(f"Serving data from: {DATA_DIR}")
                httpd.serve_forever()
        except OSError:
            print(f"Port {p} already in use, trying next...")

if __name__ == "__main__":
    run_server()
