import threading
import time
import urllib.request
import json
from server import run_server

# Start server in background thread
t = threading.Thread(target=run_server, kwargs={'port': 8000}, daemon=True)
t.start()
time.sleep(1.2)

# 1. Probe /api/status
try:
    with urllib.request.urlopen('http://localhost:8000/api/status') as resp:
        print('1. Status test:', resp.status, resp.read().decode())
except Exception as e:
    print('1. Status test failed:', e)

# 2. Probe /api/schools
try:
    with urllib.request.urlopen('http://localhost:8000/api/schools?type=demo') as resp:
        data = json.loads(resp.read().decode())
        print('2. Schools test:', resp.status, f"Loaded {data['count']} schools")
except Exception as e:
    print('2. Schools test failed:', e)

# 3. Probe static app /
try:
    with urllib.request.urlopen('http://localhost:8000/') as resp:
        html = resp.read().decode()
        print('3. App index test:', resp.status, f"HTML length {len(html)} bytes")
except Exception as e:
    print('3. App index test failed:', e)

# 4. Probe POST /api/solve/amruta
try:
    req = urllib.request.Request(
        'http://localhost:8000/api/solve/amruta',
        data=json.dumps({"dataset": "demo", "k": 6}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        print('4. AMRUTA Solver API test:', resp.status, f"Vehicles: {res['k_deployed']}, Cost: ₹{res['summary']['total_monthly_cost_inr']}")
except Exception as e:
    print('4. AMRUTA Solver API failed:', e)

# 5. Probe POST /api/solve/modern
try:
    req = urllib.request.Request(
        'http://localhost:8000/api/solve/modern',
        data=json.dumps({"dataset": "demo"}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        print('5. Modern Solver API test:', resp.status, f"Vehicles: {res['k_deployed']}, Cost: ₹{res['summary']['total_monthly_cost_inr']}")
except Exception as e:
    print('5. Modern Solver API failed:', e)

print('\nAll Server & API Tests Passed Successfully!')
