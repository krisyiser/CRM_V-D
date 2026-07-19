import zipfile
import json
import datetime
import xml.etree.ElementTree as ET

def excel_date_to_iso(serial_str):
    try:
        val = float(serial_str)
        # Excel epoch starts 1899-12-30
        dt = datetime.datetime(1899, 12, 30) + datetime.timedelta(days=val)
        return dt.strftime('%Y-%m-%d')
    except Exception:
        return '2026-04-01'

room_map = {
    'MOROS Y CRISTIANOS': '101',
    'EL VOLADOR': '102',
    'GUAGUA': '103',
    'GUAGUAS': '103',
    'NEGRITOS': '104',
    'SANTIAGUEROS': '105'
}

z = zipfile.ZipFile('public/RESRV.xlsx')
shared_strings = [e.text for e in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')]
sheet = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))

rows = []
for r in sheet.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
    row_vals = []
    for c in r.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
        val_elem = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
        val = val_elem.text if val_elem is not None else ''
        if c.attrib.get('t') == 's' and val != '':
            val = shared_strings[int(val)]
        row_vals.append(val)
    rows.append(row_vals)

reservations = []
guests = []
current_month = "MARZO"

for row in rows[1:]:
    if not row or len(row) < 2:
        continue

    first_val = str(row[0]).strip()

    if first_val in ['MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO']:
        current_month = first_val
        row = row[1:]
        if not row:
            continue

    if not first_val.replace('.', '', 1).isdigit():
        if len(row) > 1 and str(row[0]).strip() == '' and str(row[1]).strip().replace('.', '', 1).isdigit():
            row = row[1:]
        else:
            continue

    date_val = str(row[0]).strip()
    if not date_val.replace('.', '', 1).isdigit():
        continue

    room_raw = str(row[1]).strip().upper() if len(row) > 1 else ''
    if room_raw not in room_map:
        continue

    room_id = room_map[room_raw]
    check_in = excel_date_to_iso(date_val)
    
    # Noches = col 3 if digit, else 1
    nights = 1
    if len(row) > 3 and str(row[3]).isdigit():
        n_val = int(row[3])
        if 1 <= n_val <= 30:
            nights = n_val
    elif len(row) > 2 and str(row[2]).isdigit():
        n_val = int(row[2])
        if 1 <= n_val <= 30:
            nights = n_val

    dt_in = datetime.datetime.strptime(check_in, '%Y-%m-%d')
    dt_out = dt_in + datetime.timedelta(days=nights)
    check_out = dt_out.strftime('%Y-%m-%d')

    # Total price
    total_price = 0.0
    for col in row:
        if str(col).replace('.', '', 1).isdigit() and float(col) >= 500:
            total_price = float(col)

    payment_method = 'TRANSFERENCIA'
    for col in row:
        if str(col).upper() in ['TRANSFERENCIA', 'TARJETA', 'EFECTIVO']:
            payment_method = str(col).upper()

    notes_parts = []
    for col in row:
        if str(col).upper() in ['AIRBNB', 'BOOKING', 'DIRECTO']:
            notes_parts.append(f"Origen: {col}")

    guest_name = f"Huésped {room_raw.title()} ({check_in})"
    
    res_id = f"res_hist_{len(reservations) + 1}"
    guest_id = f"g_hist_{len(guests) + 1}"

    guest_entry = {
        "id": guest_id,
        "name": guest_name,
        "email": None,
        "phone": None,
        "id_number": "Histórico Excel",
        "origin": "RESRV.xlsx",
        "created_at": f"{check_in}T12:00:00.000Z"
    }
    guests.append(guest_entry)

    res_entry = {
        "id": res_id,
        "room_id": room_id,
        "guest_id": guest_id,
        "guest_name": guest_name,
        "check_in": check_in,
        "check_out": check_out,
        "dates": f"{check_in} - {check_out}",
        "total_price": total_price,
        "notes": f"Historial anterior RESRV.xlsx | Mes: {current_month} | Pago: {payment_method} {' '.join(notes_parts)}",
        "payment_status": "paid",
        "status": "Confirmed",
        "external_id": "RESRV.xlsx",
        "created_at": f"{check_in}T12:00:00.000Z"
    }
    reservations.append(res_entry)

print(f"Refined import: {len(reservations)} historical reservations and {len(guests)} guests.")

with open('data/reservations.json', 'w', encoding='utf-8') as f:
    json.dump(reservations, f, indent=2, ensure_ascii=False)

with open('data/guests.json', 'w', encoding='utf-8') as f:
    json.dump(guests, f, indent=2, ensure_ascii=False)
