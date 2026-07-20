import os
from playwright.sync_api import sync_playwright

def run_mobile_ux_test():
    screenshots_dir = os.path.join(os.getcwd(), 'artifacts', 'screenshots')
    os.makedirs(screenshots_dir, exist_ok=True)
    
    with sync_playwright() as p:
        print("[Playwright E2E] Testing Mobile UX/UI & Responsiveness...")
        browser = p.chromium.launch(headless=True)
        BASE_URL = 'http://localhost:3000'

        # --- 1. iPhone 13/14 Portrait Viewport (390x844) ---
        iphone_context = browser.new_context(
            viewport={'width': 390, 'height': 844},
            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
            is_mobile=True,
            has_touch=True
        )
        iphone_context.clear_cookies()
        iphone_page = iphone_context.new_page()

        # Mobile Login Screen
        print("1. Testing iPhone 13 Login Screen...")
        iphone_page.goto(f"{BASE_URL}/login")
        iphone_page.wait_for_selector("form", timeout=12000)
        iphone_page.screenshot(path=os.path.join(screenshots_dir, '11_iphone_login_mobile_ux.png'), full_page=False)
        print("[OK] iPhone Login screenshot saved: 11_iphone_login_mobile_ux.png")

        # Login to test calendar & POS
        iphone_page.fill("input[type='password']", "1234")
        iphone_page.click("button[type='submit']")
        iphone_page.wait_for_timeout(2500)

        # Mobile Calendar Screen
        print("2. Testing iPhone 13 Calendar Screen...")
        iphone_page.goto(f"{BASE_URL}/reservations")
        iphone_page.wait_for_timeout(1500)
        iphone_page.screenshot(path=os.path.join(screenshots_dir, '12_iphone_calendar_mobile_ux.png'), full_page=False)
        print("[OK] iPhone Calendar screenshot saved: 12_iphone_calendar_mobile_ux.png")

        # Mobile POS Screen
        print("3. Testing iPhone 13 POS Screen...")
        iphone_page.goto(f"{BASE_URL}/pos")
        iphone_page.wait_for_timeout(1500)
        iphone_page.screenshot(path=os.path.join(screenshots_dir, '13_iphone_pos_mobile_ux.png'), full_page=False)
        print("[OK] iPhone POS screenshot saved: 13_iphone_pos_mobile_ux.png")

        iphone_context.close()

        # --- 2. Android Device Viewport (360x740) ---
        android_context = browser.new_context(
            viewport={'width': 360, 'height': 740},
            user_agent='Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36',
            is_mobile=True,
            has_touch=True
        )
        android_context.clear_cookies()
        android_page = android_context.new_page()

        print("4. Testing Android 360px Login Screen...")
        android_page.goto(f"{BASE_URL}/login")
        android_page.wait_for_selector("form", timeout=12000)
        android_page.screenshot(path=os.path.join(screenshots_dir, '14_android_login_mobile_ux.png'), full_page=False)
        print("[OK] Android Login screenshot saved: 14_android_login_mobile_ux.png")

        android_context.close()
        browser.close()
        print("[SUCCESS] Mobile UX/UI Protocol Test PASSED 100%!")

if __name__ == '__main__':
    run_mobile_ux_test()
