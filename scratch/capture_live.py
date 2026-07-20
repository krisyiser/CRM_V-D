import os
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    page.goto('http://localhost:3000', wait_until='networkidle')
    page.screenshot(path=r'C:\Users\YERSI\.gemini\antigravity-ide\brain\8fe8ac51-fe01-4ff9-8018-3f30a1abb4aa\live_localhost.png', full_page=True)
    browser.close()
    print("Live screenshot captured!")
