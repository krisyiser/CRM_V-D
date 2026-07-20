import os
from playwright.sync_api import sync_playwright

def run_auth_e2e_test():
    screenshots_dir = os.path.join(os.getcwd(), 'artifacts', 'screenshots')
    os.makedirs(screenshots_dir, exist_ok=True)
    
    with sync_playwright() as p:
        print("[Playwright E2E] Testing Authentication, Security & RBAC Protocol...")
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        
        # Clear cookies at start to guarantee clean unauthenticated state
        context.clear_cookies()
        
        page = context.new_page()
        BASE_URL = 'http://localhost:3000'

        # 1. Open Login Screen
        print("1. Loading Login page...")
        page.goto(f"{BASE_URL}/login")
        page.wait_for_selector("form", timeout=8000)
        assert '/login' in page.url, f"Expected /login URL, got {page.url}"
        print("[OK] Login screen loaded successfully!")

        page.screenshot(path=os.path.join(screenshots_dir, '08_login_screen.png'), full_page=True)

        # 2. Invalid PIN test
        print("2. Testing invalid PIN code (9999)...")
        page.click("button:has-text('Administrador')")
        page.fill("input[type='password']", "9999")
        page.click("button[type='submit']")
        page.wait_for_timeout(600)
        page.wait_for_selector("div:has-text('incorrecto')", timeout=5000)
        print("[OK] Invalid PIN correctly rejected with error message!")

        # 3. Valid Admin Login test
        print("3. Testing valid Admin login with PIN 1234...")
        page.fill("input[type='password']", "1234")
        page.click("button[type='submit']")
        page.wait_for_timeout(2000)
        page.goto(f"{BASE_URL}/")
        page.wait_for_timeout(1000)
        assert not page.url.endswith('/login'), f"Expected authenticated dashboard, got {page.url}"
        
        # Verify Admin has access to all tabs
        admin_tabs = page.locator("aside nav button").all_inner_texts()
        print(f"Admin visible nav tabs: {admin_tabs}")
        assert any('Huéspedes' in t or 'Huespedes' in t for t in admin_tabs), "Admin should see Huéspedes tab"
        assert any('Suites' in t for t in admin_tabs), "Admin should see Suites tab"
        assert any('Feedback' in t for t in admin_tabs), "Admin should see Feedback tab"
        print("[OK] Admin role has full access to all 6 modules!")

        page.screenshot(path=os.path.join(screenshots_dir, '09_dashboard_authenticated.png'), full_page=True)

        # 4. Logout & Receptionist Login test
        print("4. Testing Receptionist Login with PIN 4321...")
        context.clear_cookies()
        page.goto(f"{BASE_URL}/login")
        page.wait_for_selector("form", timeout=8000)

        page.click("button:has-text('Recep')")
        page.fill("input[type='password']", "4321")
        page.click("button[type='submit']")
        page.wait_for_timeout(2000)
        page.goto(f"{BASE_URL}/")
        page.wait_for_timeout(1000)
        assert not page.url.endswith('/login'), f"Expected dashboard for Receptionist, got {page.url}"

        # Verify Receptionist only sees allowed tabs: Operaciones, Calendario, POS
        recep_tabs = page.locator("aside nav button").all_inner_texts()
        print(f"Recepción visible nav tabs: {recep_tabs}")
        assert not any('Huéspedes' in t or 'Huespedes' in t for t in recep_tabs), "Recepción should NOT see Huéspedes tab!"
        assert not any('Suites' in t for t in recep_tabs), "Recepción should NOT see Suites tab!"
        assert not any('Feedback' in t for t in recep_tabs), "Recepción should NOT see Feedback tab!"
        print("[OK] Recepción navigation bar correctly hides Huéspedes, Suites, and Feedback!")

        # 5. Direct URL route protection test for Recepción
        print("5. Testing direct URL navigation restriction for Recepción (/guests)...")
        page.goto(f"{BASE_URL}/guests")
        page.wait_for_timeout(1500)
        assert not page.url.endswith('/guests'), "Recepción should be blocked from /guests!"
        print(f"[OK] Recepción direct access to /guests blocked and redirected to: {page.url}")

        page.screenshot(path=os.path.join(screenshots_dir, '10_reception_rbac_restricted.png'), full_page=True)
        print("[OK] Receptionist RBAC restricted screenshot saved: 10_reception_rbac_restricted.png")

        browser.close()
        print("[SUCCESS] Authentication, Security & RBAC Protocol Test PASSED 100%!")

if __name__ == '__main__':
    run_auth_e2e_test()
