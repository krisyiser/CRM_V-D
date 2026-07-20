from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()
    page.goto('http://localhost:3000/login')
    page.click("button:has-text('Admin')")
    page.fill("input[type='password']", "1234")
    page.keyboard.press("Enter")
    page.wait_for_timeout(2000)
    page.goto('http://localhost:3000/reservations')
    page.wait_for_timeout(2000)
    print("Full page text sample:", page.inner_text("body")[:800])
    browser.close()
