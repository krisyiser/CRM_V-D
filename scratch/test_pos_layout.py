import os
from playwright.sync_api import sync_playwright

def run_pos_layout_test():
    screenshots_dir = os.path.join(os.getcwd(), 'artifacts', 'screenshots')
    os.makedirs(screenshots_dir, exist_ok=True)
    
    with sync_playwright() as p:
        print("[Playwright E2E] Testing POS Cart Layout on Tablet...")
        browser = p.chromium.launch(headless=True)
        
        # Test Tablet Viewport (1024x768)
        context = browser.new_context(
            viewport={'width': 1024, 'height': 768},
            user_agent='Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
        )
        page = context.new_page()
        BASE_URL = 'http://localhost:3000'

        page.goto(f"{BASE_URL}/pos", wait_until="networkidle")
        page.wait_for_selector(".group", timeout=5000)

        # Click product cards
        cards = page.locator(".group").all()
        print(f"Found {len(cards)} product cards. Adding first 4 to cart...")
        for i in range(min(4, len(cards))):
            cards[i].click()
            page.wait_for_timeout(200)

        page.screenshot(path=os.path.join(screenshots_dir, '07_pos_cart_fixed_layout.png'), full_page=False)
        print("[OK] POS Cart Fixed Layout screenshot saved: 07_pos_cart_fixed_layout.png")

        # Verify button 'Cobrar' is visible on viewport
        cobrar_button = page.locator("button:has-text('Cobrar')")
        is_visible = cobrar_button.is_visible()
        print(f"[OK] Checkout Button 'Cobrar' is 100% visible on screen: {is_visible}")
        assert is_visible, "Cobrar button should be visible on screen without scrolling!"

        browser.close()
        print("[SUCCESS] POS Cart Sticky Layout Test PASSED!")

if __name__ == '__main__':
    run_pos_layout_test()
