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
PAGES = [
    # (source file, en output, ar output, url path)
    ('index.html', 'index.html', os.path.join('ar', 'index.html'), 'index.html'),
    (os.path.join('careers', 'index.html'), os.path.join('careers', 'index.html'), os.path.join('ar', 'careers', 'index.html'), 'careers/index.html'),
]
AR_TITLES = {
    'index.html': ('الموحدة لتدقيق الحسابات والاستشارات المالية | تدقيق وضرائب واستشارات في عمّان، الأردن',
                   'الموحدة لتدقيق الحسابات والاستشارات المالية: تدقيق خارجي وفق ISA وIFRS، تدقيق داخلي وفق COSO، استشارات ضريبية ومالية وتدريب مهني في عمّان، الأردن، منذ 2015.'),
    'careers/index.html': ('الوظائف | انضم إلى فريق الموحدة لتدقيق الحسابات والاستشارات المالية',
                           'قدّم طلبك للانضمام إلى الموحدة في عمّان: مدققون خارجيون، محاسبون ومتخصصون في الضرائب ومتدربون. ارفع سيرتك الذاتية عبر نموذج التقديم.'),
}

PRELOADER = '''  <div id="preloader" aria-hidden="true">
    <canvas id="pre-canvas"></canvas>
    <img class="pre-logo" src="/assets/img/icon.png" alt="">
  </div>'''

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a, **k):
        pass

def serve():
    handler = functools.partial(QuietHandler, directory=ROOT)
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    httpd = socketserver.ThreadingTCPServer(('127.0.0.1', PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd

async def render(lang, path='index.html'):
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        ctx = await browser.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce')
        page = await ctx.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.goto(f'http://127.0.0.1:{PORT}/{path}?lang={lang}&prerender=1', wait_until='networkidle')
        await page.wait_for_timeout(1500)
        # If a script failed to load, the page keeps the previous static content; never write that out.
        ok = await page.evaluate(f"() => typeof I18N !== 'undefined' && document.documentElement.lang === '{lang}'")
        if errors:
            raise RuntimeError(f'{path} ({lang}) threw a script error, so it was not written: {errors[0]}')
        if not ok:
            raise RuntimeError(f'{path} ({lang}) did not render; scripts failed to load')
        html = await page.evaluate('''() => {
          // Strip runtime-only inline styles so the static page starts clean.
          document.querySelectorAll('[data-reveal], .ch, .wl-card, .stack-item, #team-text, .hero-title, .hero-sub, .hero-cta, #hero, #hero-veil, #hero-solid, #hero-dim, .hero-rotor').forEach(el => el.removeAttribute('style'));
          document.querySelectorAll('.acc-panel').forEach(el => el.removeAttribute('style'));
          document.querySelectorAll('[data-cycle] span').forEach(el => el.removeAttribute('style'));
          document.documentElement.classList.remove('light');
          const hd = document.querySelector('#header'); if (hd) hd.removeAttribute('style');
          document.querySelectorAll('#wl-cursor').forEach(el => el.remove());
          return '<!doctype html>\\n' + document.documentElement.outerHTML;
        }''')
        await browser.close()
        return html

def finalize(html, lang, path='index.html'):
    # Put the preloader back (the runtime removes it once it has played).
    if path == 'index.html' and 'id="preloader"' not in html:
        html = re.sub(r'<body[^>]*>', '<body>\n' + PRELOADER, html, count=1)
    # Static language attributes and SEO tags per language.
    if lang == 'en':
        html = html.replace('<html lang="ar" dir="rtl"', '<html lang="en" dir="ltr"', 1)
        if path == 'index.html':
            html = re.sub(r'<title>.*?</title>', '<title>Consolidated for Auditing and Financial Consulting | Audit, Tax and Advisory in Amman, Jordan</title>', html, count=1)
    if lang == 'ar':
        html = html.replace('<html lang="en" dir="ltr"', '<html lang="ar" dir="rtl"', 1)
        html = re.sub(r'<link rel="canonical" href="https://www.caudit.net/([^"]*)">', r'<link rel="canonical" href="https://www.caudit.net/ar/\1">', html, count=1)
        html = re.sub(r'<meta property="og:url" content="https://www.caudit.net/([^"]*)">', r'<meta property="og:url" content="https://www.caudit.net/ar/\1">', html, count=1)
        html = html.replace('<meta property="og:locale" content="en_US">', '<meta property="og:locale" content="ar_JO">')
        html = html.replace('<meta property="og:locale:alternate" content="ar_JO">', '<meta property="og:locale:alternate" content="en_US">')
        title, desc = AR_TITLES[path]
        html = re.sub(r'<title>.*?</title>', '<title>' + title + '</title>', html, count=1)
        html = re.sub(r'<meta name="description" content=".*?">', '<meta name="description" content="' + desc + '">', html, count=1)
        html = re.sub(r'<meta property="og:title" content=".*?">', '<meta property="og:title" content="' + title.split(' | ')[0] + '">', html, count=1)
        html = re.sub(r'<meta property="og:description" content=".*?">', '<meta property="og:description" content="' + desc + '">', html, count=1)
    return html

def main():
    httpd = serve()
    try:
        for src, out_en, out_ar, path in PAGES:
            en = finalize(asyncio.run(render('en', path)), 'en', path)
            ar = finalize(asyncio.run(render('ar', path)), 'ar', path)
            os.makedirs(os.path.dirname(os.path.join(ROOT, out_ar)), exist_ok=True)
            with open(os.path.join(ROOT, out_en), 'w', encoding='utf-8', newline='\n') as f:
                f.write(en)
            with open(os.path.join(ROOT, out_ar), 'w', encoding='utf-8', newline='\n') as f:
                f.write(ar)
            print(f'{out_en}: {len(en):,} bytes\n{out_ar}: {len(ar):,} bytes')
    finally:
        httpd.shutdown()

if __name__ == '__main__':
    main()
