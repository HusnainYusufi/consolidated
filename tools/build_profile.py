"""Build the company profile PDFs (English and Arabic) from profile/profile.html.

The template renders pages from the same content dictionary the website uses
(assets/js/i18n.js), so the profile always matches the approved website copy.

    python tools/build_profile.py

Outputs: profile/Consolidated-Company-Profile-EN.pdf and -AR.pdf
Requires: pip install playwright && python -m playwright install chromium
"""
import asyncio, functools, http.server, os, socketserver, threading
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8798

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a, **k):
        pass

def serve():
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    httpd = socketserver.ThreadingTCPServer(('127.0.0.1', PORT), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd

async def render(lang, out):
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 794, 'height': 1123})
        await page.goto(f'http://127.0.0.1:{PORT}/profile/profile.html?lang={lang}', wait_until='networkidle')
        await page.wait_for_function('window.__profileReady === true')
        await page.evaluate('document.fonts.ready')
        # Make sure every image has loaded (retry any that failed) before printing.
        for _ in range(3):
            broken = await page.evaluate("""async () => {
              const imgs = [...document.images];
              await Promise.all(imgs.map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = r; })));
              const bad = imgs.filter(i => !i.naturalWidth);
              bad.forEach(i => { const s = i.src; i.src = ''; i.src = s; });
              return bad.length;
            }""")
            if not broken:
                break
            await page.wait_for_timeout(1500)
        await page.wait_for_timeout(800)
        n = await page.evaluate("document.querySelectorAll('.page').length")
        await page.pdf(path=out, width='210mm', height='297mm', print_background=True, prefer_css_page_size=True, margin={'top': '0', 'right': '0', 'bottom': '0', 'left': '0'})
        await browser.close()
        return n

def main():
    httpd = serve()
    try:
        for lang in ['en', 'ar']:
            out = os.path.join(ROOT, 'profile', f'Consolidated-Company-Profile-{lang.upper()}.pdf')
            n = asyncio.run(render(lang, out))
            print(f'{out}: {n} pages, {os.path.getsize(out)/1024/1024:.1f} MB')
    finally:
        httpd.shutdown()

if __name__ == '__main__':
    main()
