import os
import sys
import time
from playwright.sync_api import sync_playwright

def run_e2e_audit():
    screenshots_dir = os.path.join(os.getcwd(), 'artifacts', 'screenshots')
    os.makedirs(screenshots_dir, exist_ok=True)
    
    console_logs = []
    errors = []
    
    with sync_playwright() as p:
        print("[Playwright E2E] Launching Headless Chromium...")
        browser = p.chromium.launch(headless=True)
        
        # Test Tablet Viewport
        context = browser.new_context(
            viewport={'width': 1024, 'height': 768},
            user_agent='Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
        )
        page = context.new_page()

        # Listen to console & error events
        page.on("console", lambda msg: console_logs.append(f"[{msg.type.upper()}] {msg.text}"))
        page.on("pageerror", lambda err: errors.append(f"[PAGE ERROR] {str(err)}"))

        BASE_URL = 'http://localhost:3000'

        # 1. Test Dashboard Page
        print("\n--- 1. Auditing Dashboard Page (/) ---")
        page.goto(f"{BASE_URL}/", wait_until="networkidle")
        page.wait_for_selector("body", timeout=5000)
        
        dash_title = page.title()
        print(f"Page Title: {dash_title}")
        page.screenshot(path=os.path.join(screenshots_dir, '01_dashboard.png'), full_page=True)
        print("[OK] Dashboard screenshot saved: 01_dashboard.png")

        # 2. Test POS Restaurant Page (/pos)
        print("\n--- 2. Auditing Restaurant POS (/pos) ---")
        page.goto(f"{BASE_URL}/pos", wait_until="networkidle")
        page.wait_for_selector("body", timeout=5000)
        
        # Switch to Table Grid Tab
        page.click("button:has-text('Mapa de Mesas')")
        page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(screenshots_dir, '02_pos_table_grid.png'), full_page=True)
        print("[OK] POS Table Grid screenshot saved: 02_pos_table_grid.png")

        # Select Mesa 3 and switch back to Menu
        page.click("button:has-text('Mesa 3')")
        page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(screenshots_dir, '03_pos_menu_active_table.png'), full_page=True)
        print("[OK] POS Menu with Active Table screenshot saved: 03_pos_menu_active_table.png")

        # 3. Test Guests Page (/guests)
        print("\n--- 3. Auditing Guests Page (/guests) ---")
        page.goto(f"{BASE_URL}/guests", wait_until="networkidle")
        page.wait_for_selector("body", timeout=5000)
        page.screenshot(path=os.path.join(screenshots_dir, '04_guests_page.png'), full_page=True)
        print("[OK] Guests page screenshot saved: 04_guests_page.png")

        # 4. Test Suites Page (/rooms)
        print("\n--- 4. Auditing Suites Page (/rooms) ---")
        page.goto(f"{BASE_URL}/rooms", wait_until="networkidle")
        page.wait_for_selector("body", timeout=5000)
        page.screenshot(path=os.path.join(screenshots_dir, '05_rooms_page.png'), full_page=True)
        print("[OK] Suites page screenshot saved: 05_rooms_page.png")

        # 5. Test Reservations Calendar Page (/reservations)
        print("\n--- 5. Auditing Reservations Page (/reservations) ---")
        page.goto(f"{BASE_URL}/reservations", wait_until="networkidle")
        page.wait_for_selector("body", timeout=5000)
        page.screenshot(path=os.path.join(screenshots_dir, '06_reservations_page.png'), full_page=True)
        print("[OK] Reservations page screenshot saved: 06_reservations_page.png")

        browser.close()

        print("\n--- AUDIT RESULTS SUMMARY ---")
        print(f"Total Page Errors: {len(errors)}")
        for err in errors:
            print(f"  [ERROR] {err}")

        print(f"Total Console Logs Captured: {len(console_logs)}")
        if len(errors) == 0:
            print("[SUCCESS] WebApp E2E Audit Completed Successfully with 0 Page Errors!")

if __name__ == '__main__':
    run_e2e_audit()
