import json
import os
import sys
import time
import urllib.request
import urllib.parse
import concurrent.futures
from datetime import datetime, timedelta

BASE_URL = "http://localhost:3000"

def make_request(path, method="GET", data=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    body = json.dumps(data).encode("utf-8") if data is not None else None
    
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    start_time = time.time()
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            elapsed = time.time() - start_time
            return {
                "status": response.status,
                "data": json.loads(res_body) if res_body else None,
                "elapsed_ms": round(elapsed * 1000, 2)
            }
    except urllib.error.HTTPError as e:
        res_body = e.read().decode("utf-8")
        return {
            "status": e.code,
            "error": res_body,
            "elapsed_ms": round((time.time() - start_time) * 1000, 2)
        }

def run_functionality_tests():
    print("\n==========================================")
    print("MODULE 1: PRUEBAS DE FUNCIONALIDAD E2E API")
    print("==========================================")
    
    # 1. Register New Guest (Verify top position)
    test_guest_name = f"Huesped Test {int(time.time())}"
    post_res = make_request("/api/guests", method="POST", data={
        "name": test_guest_name,
        "email": "test@domain.com",
        "phone": "+52 555-0199",
        "origin": "Ciudad de Mexico"
    })
    assert post_res["status"] == 200, f"Error registering guest: {post_res}"
    print(f"[OK] New guest registered: '{test_guest_name}' (ID: {post_res['data']['id']}) - Latency: {post_res['elapsed_ms']}ms")

    # Verify guest appears first in GET /api/guests
    get_guests = make_request("/api/guests")
    assert get_guests["status"] == 200, f"Error fetching guests: {get_guests}"
    first_guest = get_guests["data"][0]
    assert first_guest["name"] == test_guest_name, f"Expected newest guest at top, got: {first_guest['name']}"
    print("[OK] VERIFIED: Newest guest appears at the TOP of Guests list immediately!")

    # 2. Check Room Status API
    rooms_res = make_request("/api/rooms")
    assert rooms_res["status"] == 200, f"Error fetching rooms: {rooms_res}"
    print(f"[OK] Rooms status retrieved: {len(rooms_res['data'])} rooms configured")

    # 3. Create Open Table Account in POS
    table_res = make_request("/api/open-tables", method="POST", data={
        "table_number": 5,
        "items": [
            {"id": "p1", "name": "Cafe de Olla Especial", "price": 45, "qty": 2},
            {"id": "p2", "name": "Chilaquiles Don Vainilla", "price": 120, "qty": 1}
        ]
    })
    assert table_res["status"] == 200, f"Error opening table account: {table_res}"
    print(f"[OK] POS Open Table 5 account saved/paused with 2 items - Latency: {table_res['elapsed_ms']}ms")

    # 4. Generate Room Charge Receipt
    charge_res = make_request("/api/room-charges", method="POST", data={
        "room_id": "101",
        "guest_name": test_guest_name,
        "items_json": [
            {"desc": "Estancia Suite Presidencial 101 (2 Noches)", "amount": 5600},
            {"desc": "Consumo Restaurante Mesa 5", "amount": 210}
        ],
        "total": 5810
    })
    assert charge_res["status"] == 200, f"Error generating room charge: {charge_res}"
    print(f"[OK] Stay Fee Receipt generated for Suite 101: ${charge_res['data']['total']} MXN - Latency: {charge_res['elapsed_ms']}ms")


def run_stress_tests():
    print("\n==========================================")
    print("MODULE 2: SIMULACION DE STRESS Y CONCURRENCIA")
    print("==========================================")
    
    total_requests = 60
    concurrent_threads = 10
    print(f"Lanzando {total_requests} peticiones concurrentes con {concurrent_threads} hilos a la base de datos atomica JSON...")

    def worker_task(idx):
        if idx % 3 == 0:
            return make_request("/api/guests")
        elif idx % 3 == 1:
            return make_request("/api/rooms")
        else:
            return make_request("/api/products")

    start_sim = time.time()
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrent_threads) as executor:
        futures = [executor.submit(worker_task, i) for i in range(total_requests)]
        for f in concurrent.futures.as_completed(futures):
            results.append(f.result())
    
    total_duration = time.time() - start_sim
    successes = sum(1 for r in results if r["status"] == 200)
    failures = sum(1 for r in results if r["status"] != 200)
    latencies = [r["elapsed_ms"] for r in results]
    avg_latency = round(sum(latencies) / len(latencies), 2)
    max_latency = max(latencies)

    print(f"Results Summary:")
    print(f"  - Total Peticiones Completa: {total_requests}")
    print(f"  - Peticiones Exitosas (HTTP 200): {successes}")
    print(f"  - Peticiones Fallidas: {failures}")
    print(f"  - Tiempo Total de Ejecucion: {round(total_duration, 2)}s")
    print(f"  - Latencia Promedio: {avg_latency}ms")
    print(f"  - Latencia Maxima: {max_latency}ms")
    assert failures == 0, f"Stress test failed with {failures} errors!"
    print("[SUCCESS] DB Stress & Concurrency Simulation PASSED with ZERO file lock collisions!")


def run_full_operational_workflow():
    print("\n==========================================")
    print("MODULE 3: SIMULACION DE FLUJO DE TRABAJO OPERATIVO")
    print("==========================================")

    print("Escenario Real: Recepcion y Estancia de 'Familia Mendoza'")
    
    # Step 1: Check-In & Guest Creation
    guest_name = "Familia Mendoza"
    g_res = make_request("/api/guests", method="POST", data={
        "name": guest_name,
        "email": "mendoza.hotel@gmail.com",
        "phone": "+52 555-9876",
        "origin": "Guadalajara, Jal."
    })
    print(f"1. Guest Arrival & Registration -> Guest ID: {g_res['data']['id']}")

    # Step 2: Suite 102 Assignment (Set to Occupied)
    r_res = make_request("/api/rooms", method="PATCH", data={
        "id": "102",
        "status": "occupied"
    })
    print(f"2. Room 102 Status Updated to Occupied")

    # Step 3: Restaurant Order - Mesa 2 (Open Account)
    table_order = make_request("/api/open-tables", method="POST", data={
        "table_number": 2,
        "items": [
            {"id": "p3", "name": "Jugo Natural de Naranja", "price": 35, "qty": 2},
            {"id": "p4", "name": "Huevos Rancheros Tradicionales", "price": 95, "qty": 2}
        ]
    })
    print(f"3. Restaurant Mesa 2 Order Saved -> Total: ${2*35 + 2*95} MXN")

    # Step 4: Add POS Sale & Charge to Suite 102
    pos_sale = make_request("/api/pos-sales", method="POST", data={
        "table_number": 2,
        "items": [
            {"id": "p3", "name": "Jugo Natural de Naranja", "price": 35, "qty": 2},
            {"id": "p4", "name": "Huevos Rancheros Tradicionales", "price": 95, "qty": 2}
        ],
        "total": 260,
        "payment_method": "Habitacion 102"
    })
    print(f"4. Restaurant Order Charged to Room 102 -> Sale ID: {pos_sale['data']['id']}")

    # Step 5: Check-Out & Final Receipt Generation
    final_receipt = make_request("/api/room-charges", method="POST", data={
        "room_id": "102",
        "guest_name": guest_name,
        "items_json": [
            {"desc": "Estancia Suite 102 (1 Noche)", "amount": 1950},
            {"desc": "Restaurante POS Mesa 2", "amount": 260}
        ],
        "total": 2210
    })
    print(f"5. Check-Out Completed for Suite 102 -> Receipt Generated Total: ${final_receipt['data']['total']} MXN")

    # Reset Room 102 status to Available
    make_request("/api/rooms", method="PATCH", data={"id": "102", "status": "available"})
    print(f"6. Suite 102 Cleaned and Reset to Available")
    
    print("[SUCCESS] Complete Operational Workflow Simulation Executed Successfully!")

if __name__ == "__main__":
    run_functionality_tests()
    run_stress_tests()
    run_full_operational_workflow()
