"""Prerender the site into static HTML for search engines.

The page content is assembled by assets/js from assets/js/i18n.js. Crawlers that
do not execute JavaScript would otherwise see empty sections, so this script
loads the page in headless Chromium, lets the scripts build the DOM, and writes
the result to index.html (English) and ar/index.html (Arabic). Run it after
editing content:

    python tools/prerender.py

Requires: pip install playwright && python -m playwright install chromium
It serves the project folder itself on a temporary port, so no server needs to
be running.
"""
import asyncio, http.server, os, re, socketserver, sys, threading, functools
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8799
SOURCE = os.path.join(ROOT, 'index.html')

PRELOADER = '''  <div id="preloader" aria-hidden="true">
    <canvas id="pre-canvas"></canvas>
    <img class="pre-logo" src="/assets/img/icon.png" alt="">
  </div>'''

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a, **k):
        pass

def serve():
    handler = functools.partial(QuietHandler, directory=ROOT)
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(('127.0.0.1', PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd

async def render(lang):
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        ctx = await browser.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce')
        page = await ctx.new_page()
        await page.goto(f'http://127.0.0.1:{PORT}/index.html?lang={lang}&prerender=1', wait_until='networkidle')
        await page.wait_for_timeout(1500)
        html = await page.evaluate('''() => {
          // Strip runtime-only inline styles so the static page starts clean.
          document.querySelectorAll('[data-reveal], .ch, .wl-card, .stack-item, #team-text, .hero-title, .hero-sub, .hero-cta, #hero-veil, #hero-solid, #hero-dim, .hero-rotor').forEach(el => el.removeAttribute('style'));
          document.querySelectorAll('.acc-panel').forEach(el => el.removeAttribute('style'));
          document.querySelectorAll('[data-cycle] span').forEach(el => el.removeAttribute('style'));
          document.documentElement.classList.remove('light');
          document.querySelector('#header').removeAttribute('style');
          document.querySelectorAll('#wl-cursor').forEach(el => el.remove());
          return '<!doctype html>\\n' + document.documentElement.outerHTML;
        }''')
        await browser.close()
        return html

def finalize(html, lang):
    # Put the preloader back (the runtime removes it once it has played).
    if 'id="preloader"' not in html:
        html = re.sub(r'<body[^>]*>', '<body>\n' + PRELOADER, html, count=1)
    # Static language attributes and SEO tags per language.
    if lang == 'en':
        html = html.replace('<html lang="ar" dir="rtl"', '<html lang="en" dir="ltr"', 1)
        html = re.sub(r'<title>.*?</title>', '<title>Consolidated for Auditing and Financial Consulting | Audit, Tax and Advisory in Amman, Jordan</title>', html, count=1)
    if lang == 'ar':
        html = html.replace('<html lang="en" dir="ltr"', '<html lang="ar" dir="rtl"', 1)
        html = html.replace('<link rel="canonical" href="https://www.consolidated.net/">', '<link rel="canonical" href="https://www.consolidated.net/ar/">')
        html = html.replace('<meta property="og:url" content="https://www.consolidated.net/">', '<meta property="og:url" content="https://www.consolidated.net/ar/">')
        html = html.replace('<meta property="og:locale" content="en_US">', '<meta property="og:locale" content="ar_JO">')
        html = html.replace('<meta property="og:locale:alternate" content="ar_JO">', '<meta property="og:locale:alternate" content="en_US">')
        html = re.sub(r'<title>.*?</title>', '<title>الموحدة لتدقيق الحسابات والاستشارات المالية | تدقيق وضرائب واستشارات في عمّان، الأردن</title>', html, count=1)
        html = re.sub(r'<meta name="description" content=".*?">', '<meta name="description" content="الموحدة لتدقيق الحسابات والاستشارات المالية: تدقيق خارجي وفق ISA وIFRS، تدقيق داخلي وفق COSO، استشارات ضريبية ومالية وتدريب مهني في عمّان، الأردن، منذ 2015.">', html, count=1)
        html = re.sub(r'<meta property="og:title" content=".*?">', '<meta property="og:title" content="الموحدة لتدقيق الحسابات والاستشارات المالية">', html, count=1)
        html = re.sub(r'<meta property="og:description" content=".*?">', '<meta property="og:description" content="ممارسة مهنية متخصصة تقدم التدقيق الخارجي والحوكمة الضريبية والمراجعات الجنائية والاستشارات المالية في الأردن ومنطقة الشرق الأوسط.">', html, count=1)
    return html

def main():
    # Prerender from a pristine source copy, not from an earlier prerender output, to keep diffs small.
    httpd = serve()
    try:
        en = finalize(asyncio.run(render('en')), 'en')
        ar = finalize(asyncio.run(render('ar')), 'ar')
    finally:
        httpd.shutdown()
    with open(SOURCE, 'w', encoding='utf-8', newline='\n') as f:
        f.write(en)
    os.makedirs(os.path.join(ROOT, 'ar'), exist_ok=True)
    with open(os.path.join(ROOT, 'ar', 'index.html'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(ar)
    print(f'index.html: {len(en):,} bytes\nar/index.html: {len(ar):,} bytes')

if __name__ == '__main__':
    main()
