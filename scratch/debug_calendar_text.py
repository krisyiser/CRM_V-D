import json
import base64
from playwright.sync_api import sync_playwright

session_payload = {
    'id': 'u_admin',
    'name': 'Administrador Principal',
    'email': 'admin@vainillaydescanso.com',
    'username': 'admin',
    'role': 'Administrador',
    'initials': 'AD',
    'loggedInAt': '2026-07-20T00:00:00.000Z'
}
token = base64.b64encode(json.dumps(session_payload).encode('utf-8')).decode('utf-8')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context()
    context.add_cookies([{
        'name': 'vd_session_token',
        'value': token,
        'domain': 'localhost',
        'path': '/'
    }])
    page = context.new_page()
    page.goto('http://localhost:3000/reservations')
    page.wait_for_timeout(3000)
    print("Browser date string:", page.evaluate("new Date().toISOString()"))
    print("Header month text:", page.locator("h2").inner_text())
    print("All inner text of page:\n", page.locator("main").inner_text())
    browser.close()
