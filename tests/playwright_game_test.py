from pathlib import Path
import sys
import tempfile
from playwright.sync_api import sync_playwright


ARTIFACT = Path(tempfile.gettempdir()) / "an-phong-13-qa.png"
sys.stdout.reconfigure(encoding="utf-8")


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 960}, device_scale_factor=1)
    console_errors = []
    page_errors = []
    page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
    page.on("pageerror", lambda error: page_errors.append(str(error)))

    page.goto("http://localhost:3000", wait_until="networkidle")
    assert page.title() == "Ấn Phong 13 — Horror Tracing Challenge"
    page.get_by_role("button", name="BẮT ĐẦU PHONG ẤN").click()
    page.get_by_text("ẤN CHÚ 01").wait_for()

    canvas = page.locator("canvas")
    box = canvas.bounding_box()
    assert box is not None
    scale_x = box["width"] / 640
    scale_y = box["height"] / 640
    eye = [
        (125, 320), (180, 258), (252, 222), (320, 214), (388, 222), (460, 258),
        (515, 320), (460, 382), (388, 418), (320, 426), (252, 418), (180, 382), (125, 320),
    ]
    start_x = box["x"] + eye[0][0] * scale_x
    start_y = box["y"] + eye[0][1] * scale_y
    page.mouse.move(start_x, start_y)
    page.mouse.down()
    for x, y in eye[1:]:
        page.mouse.move(box["x"] + x * scale_x, box["y"] + y * scale_y, steps=12)
    page.mouse.up()

    page.get_by_text("KẾT QUẢ ẤN 01").wait_for()
    result_text = page.locator(".result-card").inner_text()
    assert "CHÍNH XÁC" in result_text
    page.get_by_role("button", name="ẤN CHÚ TIẾP THEO").click()
    page.get_by_text("ẤN CHÚ 02").wait_for()
    page.screenshot(path=str(ARTIFACT), full_page=True)

    assert not page_errors, page_errors
    assert not console_errors, console_errors
    print(result_text.replace("\n", " | "))
    print(f"Screenshot: {ARTIFACT}")
    browser.close()
