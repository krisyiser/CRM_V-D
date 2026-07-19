import sys
try:
    import playwright
    print("Playwright Python IS INSTALLED")
except ImportError:
    print("Playwright Python NOT INSTALLED")
