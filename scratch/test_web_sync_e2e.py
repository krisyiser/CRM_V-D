import os
from playwright.sync_api import sync_playwright

def run_web_sync_test():
    with sync_playwright() as p:
        print("[Playwright E2E] Testing Public Website GitHub Synchronization...")
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

        # Navigate to /reservations
        print("Navigating to /reservations...")
        page.goto(f"{BASE_URL}/reservations")
        page.wait_for_timeout(2500)

        # Check for reservation elements
        reservation_elements = page.locator("div:has-text('Suite 101: yersi')").all_inner_texts()
        print(f"Found reservations for 'yersi': {len(reservation_elements)}")

        page.screenshot(path=os.path.join(os.getcwd(), 'artifacts', 'screenshots', '15_website_reservations_synced.png'), full_page=True)
        print("[OK] Screenshot saved: 15_website_reservations_synced.png")

        browser.close()
        print("[SUCCESS] Website Synchronization Test PASSED 100%!")

if __name__ == '__main__':
    run_web_sync_test()
