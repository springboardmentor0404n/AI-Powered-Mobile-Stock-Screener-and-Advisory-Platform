from playwright.sync_api import sync_playwright

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    page = browser.new_page()
    msgs = []
    def on_console(msg):
        msgs.append(f"{msg.type}: {msg.text}")
    page.on('console', on_console)
    page.goto('http://127.0.0.1:3000/watchlist', timeout=15000)
    page.wait_for_timeout(2000)
    print('\n'.join(msgs))
    page.screenshot(path='watchlist_screenshot.png', full_page=True)
    browser.close()
