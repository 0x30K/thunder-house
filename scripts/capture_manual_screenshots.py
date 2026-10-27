#!/usr/bin/env python3
"""
Thunder House ENT - Automated Manual Screenshot Capture Engine
Uses Playwright and local HTTP server to capture high-definition,
pixel-perfect full views and zoomed UI components for the Staff Operations Manual.
"""

import os
import time
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(WORKSPACE_DIR, "manual", "assets", "screenshots")
PORT = 8765

os.makedirs(OUTPUT_DIR, exist_ok=True)

class WorkspaceHTTPHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WORKSPACE_DIR, **kwargs)
    def log_message(self, format, *args):
        pass # suppress server logs

def start_server():
    server = HTTPServer(("127.0.0.1", PORT), WorkspaceHTTPHandler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    return server

def capture_all():
    print(f"Starting HTTP server on port {PORT}...")
    server = start_server()
    time.sleep(1)

    print("Launching Chromium for screenshot capture...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 920},
            device_scale_factor=1.5
        )
        page = context.new_page()

        shots = [
            # 1. Public Site & Intake
            {
                "url": f"http://127.0.0.1:{PORT}/index.html",
                "file": "public_homepage_hero.png",
                "wait_selector": "h1",
                "clip": {"x": 0, "y": 0, "width": 1440, "height": 850}
            },
            {
                "url": f"http://127.0.0.1:{PORT}/index.html",
                "file": "public_pricing_calculator.png",
                "selector": "#estimator, .calculator-card, [id*='calc']",
                "fallback_clip": {"x": 120, "y": 1400, "width": 1200, "height": 780}
            },
            {
                "url": f"http://127.0.0.1:{PORT}/intake.html",
                "file": "public_intake_form.png",
                "wait_selector": "form, .intake-card",
                "clip": {"x": 160, "y": 0, "width": 1120, "height": 880}
            },
            # 2. Client Portal & Contracts
            {
                "url": f"http://127.0.0.1:{PORT}/portal.html",
                "file": "client_portal_hub.png",
                "clip": {"x": 0, "y": 0, "width": 1440, "height": 880}
            },
            {
                "url": f"http://127.0.0.1:{PORT}/contract.html",
                "file": "client_contract_esign.png",
                "clip": {"x": 160, "y": 0, "width": 1120, "height": 880}
            },
            {
                "url": f"http://127.0.0.1:{PORT}/invoice.html",
                "file": "client_invoice_square.png",
                "clip": {"x": 160, "y": 0, "width": 1120, "height": 880}
            },
            {
                "url": f"http://127.0.0.1:{PORT}/requests.html",
                "file": "client_guest_requests.png",
                "clip": {"x": 300, "y": 0, "width": 840, "height": 880}
            },
            # 3. Admin Command Dashboard
            {
                "url": f"http://127.0.0.1:{PORT}/admin/today.html",
                "file": "admin_today_command.png",
                "wait_ms": 2500,
                "clip": {"x": 0, "y": 0, "width": 1440, "height": 880}
            },
            {
                "url": f"http://127.0.0.1:{PORT}/admin/today.html",
                "file": "admin_today_fresh_drops.png",
                "selector": "#fresh-drops-widget-card",
                "wait_ms": 2000
            },
            # 4. Thunder Wire
            {
                "url": f"http://127.0.0.1:{PORT}/admin/wire.html",
                "file": "admin_wire_feed.png",
                "wait_ms": 2000,
                "clip": {"x": 0, "y": 0, "width": 1440, "height": 880}
            },
            {
                "url": f"http://127.0.0.1:{PORT}/wire-overlay.html",
                "file": "wire_obs_overlay.png",
                "clip": {"x": 0, "y": 0, "width": 1440, "height": 880}
            },
            # 5. Leads & Pipeline
            {
                "url": f"http://127.0.0.1:{PORT}/admin/leads.html",
                "file": "admin_leads_kanban.png",
                "wait_ms": 2000,
                "clip": {"x": 0, "y": 0, "width": 1440, "height": 880}
            },
            # 6. Billing & Quotes
            {
                "url": f"http://127.0.0.1:{PORT}/admin/invoices.html",
                "file": "admin_invoices_billing.png",
                "wait_ms": 2000,
                "clip": {"x": 0, "y": 0, "width": 1440, "height": 880}
            },
            # 7. Contracts
            {
                "url": f"http://127.0.0.1:{PORT}/admin/contracts.html",
                "file": "admin_contracts_vault.png",
                "wait_ms": 2000,
                "clip": {"x": 0, "y": 0, "width": 1440, "height": 880}
            },
            # 8. Calendar
            {
                "url": f"http://127.0.0.1:{PORT}/admin/calendar.html",
                "file": "admin_calendar_master.png",
                "wait_ms": 2000,
                "clip": {"x": 0, "y": 0, "width": 1440, "height": 880}
            },
            # 9. Gigs Run of Show
            {
                "url": f"http://127.0.0.1:{PORT}/admin/gigs.html",
                "file": "admin_gigs_timeline.png",
                "wait_ms": 2000,
                "clip": {"x": 0, "y": 0, "width": 1440, "height": 880}
            },
            # 10. Equipment Fleet & Scanner
            {
                "url": f"http://127.0.0.1:{PORT}/admin/gear.html",
                "file": "admin_gear_fleet.png",
                "wait_ms": 2000,
                "clip": {"x": 0, "y": 0, "width": 1440, "height": 880}
            },
            {
                "url": f"http://127.0.0.1:{PORT}/admin/gear-scanner.html",
                "file": "admin_gear_scanner.png",
                "clip": {"x": 300, "y": 0, "width": 840, "height": 880}
            },
            # 11. Thunder Crate & Music
            {
                "url": f"http://127.0.0.1:{PORT}/admin/music.html",
                "file": "admin_music_crate.png",
                "wait_ms": 2000,
                "clip": {"x": 0, "y": 0, "width": 1440, "height": 880}
            },
            # 12. Consultations & CRM
            {
                "url": f"http://127.0.0.1:{PORT}/admin/consultations.html",
                "file": "admin_consultations_suite.png",
                "wait_ms": 2000,
                "clip": {"x": 0, "y": 0, "width": 1440, "height": 880}
            },
            {
                "url": f"http://127.0.0.1:{PORT}/admin/clients.html",
                "file": "admin_clients_crm.png",
                "wait_ms": 2000,
                "clip": {"x": 0, "y": 0, "width": 1440, "height": 880}
            },
            # 13. Automation Station
            {
                "url": f"http://127.0.0.1:{PORT}/admin/automations.html",
                "file": "admin_automations_station.png",
                "wait_ms": 2500,
                "clip": {"x": 0, "y": 0, "width": 1440, "height": 880}
            },
            # 14. Settings Hub
            {
                "url": f"http://127.0.0.1:{PORT}/admin/settings.html",
                "file": "admin_settings_hub.png",
                "wait_ms": 2000,
                "clip": {"x": 0, "y": 0, "width": 1440, "height": 880}
            }
        ]

        for s in shots:
            dest = os.path.join(OUTPUT_DIR, s["file"])
            print(f"Capturing: {s['file']} from {s['url']}...")
            try:
                page.goto(s["url"], timeout=15000, wait_until="domcontentloaded")
                if s.get("wait_ms"):
                    page.wait_for_timeout(s["wait_ms"])
                else:
                    page.wait_for_timeout(1000)

                # If element selector specified
                if s.get("selector"):
                    try:
                        el = page.wait_for_selector(s["selector"], timeout=2000)
                        if el:
                            el.screenshot(path=dest)
                            print(f" -> Saved element screenshot to {dest}")
                            continue
                    except Exception:
                        pass # fallback to clip or full view

                # Clip or fallback
                if s.get("clip"):
                    page.screenshot(path=dest, clip=s["clip"])
                elif s.get("fallback_clip"):
                    page.screenshot(path=dest, clip=s["fallback_clip"])
                else:
                    page.screenshot(path=dest, full_page=False)

                print(f" -> Saved to {dest}")
            except Exception as e:
                print(f" -> Warning capturing {s['file']}: {e}")

        browser.close()

    # Sync to build/manual/assets/screenshots
    build_dest = os.path.join(WORKSPACE_DIR, "build", "manual", "assets", "screenshots")
    os.makedirs(build_dest, exist_ok=True)
    for fname in os.listdir(OUTPUT_DIR):
        src = os.path.join(OUTPUT_DIR, fname)
        if os.path.isfile(src):
            with open(src, "rb") as rf:
                with open(os.path.join(build_dest, fname), "wb") as wf:
                    wf.write(rf.read())

    print("Screenshot capture complete! Synced to manual and build directories.")

if __name__ == "__main__":
    capture_all()
