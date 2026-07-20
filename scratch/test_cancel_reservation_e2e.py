import os
import json
import time
from playwright.sync_api import sync_playwright

def run_cancel_reservation_test():
    screenshots_dir = os.path.join(os.getcwd(), 'artifacts', 'screenshots')
    os.makedirs(screenshots_dir, exist_ok=True)
    BASE_URL = 'http://localhost:3000'

    test_ts = int(time.time())
    res_id = f"res_cancel_{test_ts}"
    guest_name = f"GuestCancel{test_ts}"

    with sync_playwright() as p:
        print("[Playwright E2E] Testing Reservation Cancellation Protocol...")
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})

        # 1. Login via API call with JSON Content-Type header
        print("1. Logging in via /api/auth/login...")
        login_res = context.request.post(
            f"{BASE_URL}/api/auth/login",
            data=json.dumps({'username': 'admin', 'code': '1234'}),
            headers={'Content-Type': 'application/json'}
        )
        print(f"Login API status: {login_res.status}, body: {login_res.text()}")

        assert login_res.status == 200, "Login failed"

        page = context.new_page()

        # 2. Create test reservation via in-browser fetch (inherits auth cookies)
        print(f"2. Creating fresh test reservation '{res_id}' for today...")
        page.goto(f"{BASE_URL}/")
        page.wait_for_timeout(1000)

        res_created = page.evaluate(f"""async () => {{
            const res = await fetch('/api/reservations', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify({{
                    id: '{res_id}',
                    room_id: '101',
                    guest_name: '{guest_name}',
                    check_in: '2026-07-20',
                    check_out: '2026-07-21',
                    dates: '2026-07-20 - 2026-07-21',
                    total_price: 2300,
                    status: 'Confirmed'
                }})
            }});
            return res.status;
        }}""")
        print(f"In-browser API Post status: {res_created}")
        assert res_created == 200, "Failed to create test reservation"

        # 3. Open /reservations calendar
        print("3. Opening /reservations calendar...")
        page.goto(f"{BASE_URL}/reservations")
        page.wait_for_timeout(2500)

        # Find and click the created test reservation card
        print(f"4. Finding reservation card for '{guest_name}'...")
        res_card = page.locator(f"text={guest_name}").first
        res_card.wait_for(timeout=10000)
        res_card.click()
        page.wait_for_timeout(800)

        # 5. Click Trash icon button to show confirmation overlay
        print("5. Clicking cancel button in detail modal...")
        page.click("button[title='Cancelar Reservación']")
        page.wait_for_timeout(500)

        # 6. Click 'Sí, Cancelar Reservación'
        print("6. Confirming cancellation...")
        page.click("button:has-text('Sí, Cancelar Reservación')")
        page.wait_for_timeout(2500)

        # 7. Re-fetch calendar to verify reservation is gone
        print("7. Verifying reservation is removed permanently from calendar view...")
        page.goto(f"{BASE_URL}/reservations")
        page.wait_for_timeout(2500)

        cancelled_cards = page.locator(f"text={guest_name}").count()
        assert cancelled_cards == 0, f"Cancelled reservation '{guest_name}' should no longer exist!"
        print("[OK] Cancelled reservation is 100% permanently removed and not re-imported!")

        page.screenshot(path=os.path.join(screenshots_dir, '18_reservation_cancelled_permanently.png'), full_page=True)
        print("[OK] Screenshot saved: 18_reservation_cancelled_permanently.png")

        browser.close()
        print("[SUCCESS] Reservation Cancellation Protocol Test PASSED 100%!")

if __name__ == '__main__':
    run_cancel_reservation_test()
