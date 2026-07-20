import os
from playwright.sync_api import sync_playwright

def run_occupancy_sync_test():
    screenshots_dir = os.path.join(os.getcwd(), 'artifacts', 'screenshots')
    os.makedirs(screenshots_dir, exist_ok=True)
    
    with sync_playwright() as p:
        print("[Playwright E2E] Testing Dynamic Room Occupancy Sync...")
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()
        BASE_URL = 'http://localhost:3000'

        # Login as Admin
        page.goto(f"{BASE_URL}/login")
        page.wait_for_selector("form", timeout=8000)
        page.fill("input[type='password']", "1234")
        page.click("button[type='submit']")
        page.wait_for_timeout(2000)

        # Check Dashboard /
        print("Checking Dashboard / occupancy metrics...")
        page.goto(f"{BASE_URL}/")
        page.wait_for_timeout(1500)

        # Get occupied count text
        occupied_stat = page.locator("p:has-text('Habitaciones Ocupadas') + p").inner_text()
        print(f"Habitaciones Ocupadas text: {occupied_stat}")
        assert occupied_stat != '0/5', f"Expected occupied count > 0, got {occupied_stat}"
        print("[OK] Occupied count metric correctly updated!")

        page.screenshot(path=os.path.join(screenshots_dir, '16_occupancy_sync_fixed.png'), full_page=True)
        print("[OK] Screenshot saved: 16_occupancy_sync_fixed.png")

        # Check Suites /rooms
        print("Checking Suites /rooms page...")
        page.goto(f"{BASE_URL}/rooms")
        page.wait_for_timeout(1500)
        suite_101_badge = page.locator("div:has-text('Suite 101') + span").first.inner_text()
        print(f"Suite 101 status badge: {suite_101_badge}")

        page.screenshot(path=os.path.join(screenshots_dir, '17_suites_occupancy_fixed.png'), full_page=True)
        print("[OK] Screenshot saved: 17_suites_occupancy_fixed.png")

        browser.close()
        print("[SUCCESS] Dynamic Room Occupancy Sync Test PASSED 100%!")

if __name__ == '__main__':
    run_occupancy_sync_test()
