from playwright.sync_api import sync_playwright
import os

base_url = os.environ.get("BASE_URL", "http://127.0.0.1:3000")

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    console_errors = []
    page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)

    page.goto(base_url, wait_until="networkidle")
    assert page.get_by_role("heading", name="Bir Arkadaş Seç ve Boya!").is_visible()
    assert page.get_by_role("link", name="Yeni sayfa üret").is_visible()
    page.screenshot(path="/tmp/coloring-home.png", full_page=True)

    page.get_by_role("link", name="Yeni sayfa üret").click()
    page.wait_for_url("**/login")
    assert page.get_by_role("heading", name="Atölyene gir").is_visible()

    page.goto(base_url, wait_until="networkidle")
    page.locator("#animal-card-local-albatros-basit").click()
    page.wait_for_url("**/color/**")
    page.locator("#paint-canvas").wait_for(state="visible")
    desktop_box = page.locator("#coloring-stage-container").bounding_box()
    assert desktop_box and desktop_box["height"] > 200 and desktop_box["width"] > 300

    page.set_viewport_size({"width": 390, "height": 844})
    page.wait_for_timeout(300)
    mobile_box = page.locator("#coloring-stage-container").bounding_box()
    assert mobile_box and mobile_box["width"] <= 390 and mobile_box["height"] > 200
    page.screenshot(path="/tmp/coloring-mobile.png", full_page=True)

    ignored = ("Failed to load resource",)
    actionable_errors = [error for error in console_errors if not any(item in error for item in ignored)]
    assert not actionable_errors, actionable_errors
    browser.close()
