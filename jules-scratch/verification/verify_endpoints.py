from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()

    # Verify /prometheus endpoint
    with page.expect_download() as download_info:
        page.goto('http://localhost:3000/api/probe?type=prometheus')
    download = download_info.value
    download.save_as('jules-scratch/verification/prometheus.yml')

    # Verify /json endpoint
    with page.expect_download() as download_info:
        page.goto('http://localhost:3000/api/probe?type=json')
    download = download_info.value
    download.save_as('jules-scratch/verification/targets.json')

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
