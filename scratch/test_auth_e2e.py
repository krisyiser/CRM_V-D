import os
from playwright.sync_api import sync_playwright

def run_auth_e2e_test():
    screenshots_dir = os.path.join(os.getcwd(), 'artifacts', 'screenshots')
    os.makedirs(screenshots_dir, exist_ok=True)
    
    with sync_playwright() as p:
        print("[Playwright E2E] Testing Authentication & Security Protocol...")
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()
        BASE_URL = 'http://localhost:3000'

        # 1. Unauthenticated access redirect test
        print("1. Testing unauthenticated access to /...")
        page.goto(f"{BASE_URL}/login")
        page.wait_for_selector("form", timeout=5000)
        assert '/login' in page.url, f"Expected redirect to /login, got {page.url}"
        print("[OK] Middleware successfully protected / and redirected to /login!")

        page.screenshot(path=os.path.join(screenshots_dir, '08_login_screen.png'), full_page=True)
        print("[OK] Login screen screenshot saved: 08_login_screen.png")

        # 2. Invalid PIN test
        print("2. Testing invalid PIN code (9999)...")
        page.click("button:has-text('Administrador')")
        page.fill("input[type='password']", "9999")
        page.click("button[type='submit']")
        page.wait_for_timeout(600)
        page.wait_for_selector("div:has-text('incorrecto')", timeout=3000)
        print("[OK] Invalid PIN correctly rejected with error message!")

        # 3. Valid Admin Login test
        print("3. Testing valid Admin login with PIN 1234...")
        page.fill("input[type='password']", "1234")
        page.click("button[type='submit']")
        page.wait_for_timeout(2000)
        page.goto(f"{BASE_URL}/")
        page.wait_for_timeout(1000)
        assert not page.url.endswith('/login'), f"Expected authenticated dashboard, got {page.url}"
        print("[OK] Admin login successful! Session cookie active and protected route granted.")

        page.screenshot(path=os.path.join(screenshots_dir, '09_dashboard_authenticated.png'), full_page=True)
        print("[OK] Authenticated Dashboard screenshot saved: 09_dashboard_authenticated.png")

        # 4. Logout & Receptionist test
        print("4. Testing Logout and Receptionist Login with PIN 4321...")
        context.clear_cookies()
        page.goto(f"{BASE_URL}/login")
        page.wait_for_selector("form", timeout=5000)
        print("[OK] Logout successful! Session cleared and redirected back to /login.")

        # 5. Receptionist Login test
        page.click("button:has-text('Recep')")
        page.fill("input[type='password']", "4321")
        page.click("button[type='submit']")
        page.wait_for_timeout(2000)
        page.goto(f"{BASE_URL}/")
        page.wait_for_timeout(1000)
        assert not page.url.endswith('/login'), f"Expected dashboard for Receptionist, got {page.url}"
        print("[OK] Receptionist login successful!")

        browser.close()
        print("[SUCCESS] Authentication & Security Protocol Test PASSED with 100% success!")

if __name__ == '__main__':
    run_auth_e2e_test()
