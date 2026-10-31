"""Build the company profile PDFs (English and Arabic) from profile/profile.html.

The template renders pages from the same content dictionary the website uses
(assets/js/i18n.js), so the profile always matches the approved website copy.

    python tools/build_profile.py          # the profile, English and Arabic
    python tools/build_profile.py themes   # the theme samples (profile/themes.html -> profile/themes/)

Outputs: profile/Consolidated-Company-Profile-EN.pdf and -AR.pdf
Requires: pip install playwright && python -m playwright install chromium
"""
import asyncio, functools, http.server, os, socketserver, sys, threading
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

async def render(lang, out, path='/profile/index.html'):
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 794, 'height': 1123})
        await page.goto(f"http://127.0.0.1:{PORT}{path}{'&' if '?' in path else '?'}lang={lang}&print=1", wait_until='networkidle')
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
        if sys.argv[1:] == ['themes']:
            os.makedirs(os.path.join(ROOT, 'profile', 'themes'), exist_ok=True)
            for t, name in [(1, 'Executive'), (2, 'Geometric'), (3, 'Editorial'), (4, 'Dark-Luxe'), (5, 'Ledger'), (6, 'Blueprint'), (7, 'Certificate'), (8, 'Broadsheet'), (9, 'Elements'), (10, 'Metro'), (11, 'Star-Atlas'), (12, 'Museum'), (13, 'Isometric-City'), (14, 'Expedition'), (15, 'Noir'), (16, 'Sand-Arch'), (17, 'Pop'), (18, 'Emerald-Deco'), (19, 'Aurora'), (20, 'Swiss-Red')]:
                out = os.path.join(ROOT, 'profile', 'themes', f'Theme-{t}-{name}.pdf')
                n = asyncio.run(render('en', out, f'/profile/themes.html?t={t}'))
                print(f'{out}: {n} pages, {os.path.getsize(out)/1024/1024:.1f} MB')
            return
        for lang in ['en', 'ar']:
            out = os.path.join(ROOT, 'profile', f'Consolidated-Company-Profile-{lang.upper()}.pdf')
            n = asyncio.run(render(lang, out))
            print(f'{out}: {n} pages, {os.path.getsize(out)/1024/1024:.1f} MB')
    finally:
        httpd.shutdown()

if __name__ == '__main__':
    main()
