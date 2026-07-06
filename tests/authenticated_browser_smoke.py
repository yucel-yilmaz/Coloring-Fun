from playwright.sync_api import sync_playwright
import os

base_url = os.environ.get("BASE_URL", "http://127.0.0.1:3000")

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

    page.goto(f"{base_url}/create", wait_until="networkidle")
    assert page.get_by_role("heading", name="Sen seç, atölye çizsin.").is_visible()
    assert page.get_by_text("1. Çocuk profili").is_visible()
    assert page.get_by_text("2. Yapay zekân").is_visible()

    page.goto(f"{base_url}/admin", wait_until="networkidle")
    assert page.get_by_role("heading", name="Yönetim masası").is_visible()
    page.get_by_role("button", name="AI Skill’leri").click()
    assert page.get_by_role("button", name="Boyama Sayfası Üretici").is_visible()
    assert page.get_by_role("button", name="Boyanabilirlik Değerlendirici").is_visible()
    page.screenshot(path="/tmp/coloring-admin-local.png", full_page=True)

    actionable = [error for error in errors if "Failed to load resource" not in error]
    assert not actionable, actionable
    browser.close()
