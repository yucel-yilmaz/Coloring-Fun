from playwright.sync_api import sync_playwright
import os


base_url = os.environ.get("BASE_URL", "http://127.0.0.1:3002")

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    errors = []
    page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)

    page.goto(f"{base_url}/login", wait_until="networkidle")
    page.get_by_label("E-posta").fill("admin@coloring.fun")
    page.get_by_label("Şifre").fill("LocalAdmin123!")
    page.get_by_role("button", name="Giriş yap").click()
    page.wait_for_url(f"{base_url}/")

    page.goto(f"{base_url}/gallery", wait_until="networkidle")
    page.get_by_role("button", name="Boya").first.click()
    page.wait_for_url("**/color/**")

    line_art = page.locator("#line-art-top-layer")
    line_art.wait_for(state="visible")
    line_art.evaluate(
        "image => image.complete && image.naturalWidth > 0 || new Promise((resolve, reject) => { image.onload = () => resolve(true); image.onerror = reject; })"
    )
    source = line_art.get_attribute("src") or ""
    assert "/api/proxy-image" not in source, source
    assert page.locator("#paint-canvas").is_visible()

    actionable = [error for error in errors if "Failed to load resource" not in error]
    assert not actionable, actionable
    browser.close()
