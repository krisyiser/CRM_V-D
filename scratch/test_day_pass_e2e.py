import urllib.request
import json
import base64
import time

BASE_URL = 'http://localhost:3000'
token = base64.b64encode(json.dumps({'id':'u_admin','name':'Admin','role':'Administrador'}).encode('utf-8')).decode('utf-8')
cookie_header = {'Cookie': f'vd_session_token={token}'}

test_ts = int(time.time())
guest_name = f"GuestDayPass_{test_ts}"

print("[E2E Test] Testing Independent Day Pass Registration Protocol...")

# 1. Register Guest
print("1. Registering guest in database...")
guest_req = urllib.request.Request(
    f"{BASE_URL}/api/guests",
    data=json.dumps({
        "name": guest_name,
        "email": f"daypass_{test_ts}@example.com",
        "phone": "5551234567",
        "origin": "Day Pass Test",
        "id_number": "N/A"
    }).encode('utf-8'),
    headers={**cookie_header, 'Content-Type': 'application/json'}
)
guest_res = urllib.request.urlopen(guest_req)
guest_data = json.loads(guest_res.read().decode('utf-8'))
print(f"[OK] Guest registered with ID: {guest_data.get('id')}")
assert guest_data.get('name') == guest_name, "Guest name mismatch"

# 2. Register Day Pass POS Sale
print("2. Registering Day Pass POS Sale...")
items = [{
    "id": "daypass",
    "name": "Day Pass (con comida)",
    "price": 150,
    "quantity": 2
}]
total_price = 2 * 150 # 300
sale_notes = f"Day Pass para {guest_name} &mdash; Cantidad: 2 (con comida). Procedencia: Day Pass Test"

sale_req = urllib.request.Request(
    f"{BASE_URL}/api/pos-sales",
    data=json.dumps({
        "items_json": json.dumps(items),
        "total": total_price,
        "payment_method": "Efectivo",
        "notes": sale_notes
    }).encode('utf-8'),
    headers={**cookie_header, 'Content-Type': 'application/json'}
)
sale_res = urllib.request.urlopen(sale_req)
sale_data = json.loads(sale_res.read().decode('utf-8'))
print(f"[OK] POS Sale registered with ID: {sale_data.get('id')}")
assert sale_data.get('total') == total_price, "Sale total mismatch"

# 3. Retrieve POS Sales and verify
print("3. Verifying sale exists in POS history...")
history_req = urllib.request.Request(
    f"{BASE_URL}/api/pos-sales",
    headers=cookie_header
)
history_res = urllib.request.urlopen(history_req)
history_data = json.loads(history_res.read().decode('utf-8'))

found = [s for s in history_data if s.get('id') == sale_data.get('id')]
print(f"Found matches: {len(found)}")
assert len(found) == 1, "Day Pass sale not found in POS history"
assert guest_name in found[0].get('notes', ''), "Guest name not found in sale notes"

print("[SUCCESS] Day Pass Registration Protocol Test PASSED 100%!")
