/* ------------------------------------------------------------------
   Consolidated — site behaviour (mirrors the creativeans.com motion
   system): particle preloader, Lenis smooth scroll, GSAP ScrollTrigger,
   cycling hero word, scroll managed dark/light theme, character
   reveal, portfolio marquees with clip reveal, floating value cards
   with group tilt, accordion, team stack carousel, i18n.
   ------------------------------------------------------------------ */
(function () {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const html = document.documentElement;
  const SCRUB = coarse ? true : .45;
  const CFG = Object.assign({ domain: '', whatsapp: '962796650500', formEndpoint: '', formAccessKey: '', inquiryEmail: 'emulazem@caudit.net' }, window.SITE_CONFIG || {});
  const WA = 'https://wa.me/' + CFG.whatsapp;
  const PRERENDER = new URLSearchParams(location.search).has('prerender');

  /* ---------- Smooth scroll (Lenis: duration 1.6, lerp .1) ---------- */
  let lenis = null;
  if (!reduced && typeof Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.6, lerp: 0.1, smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1 });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    closeMenu();
    if (lenis) lenis.scrollTo(target, { offset: -40, duration: 1.4 });
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  });

  /* ---------- Email links: also copy the address ----------
     mailto: only works when the visitor has an email app set up; with webmail nothing happens. So every email link
     also copies the address and says so, and the visitor can paste it into whatever email they use. */
  let toastTimer = null;
  function toast(msg) {
    let t = $('#site-toast');
    if (!t) { t = document.createElement('div'); t.id = 'site-toast'; t.className = 'site-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 4500);
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="mailto:"]'); if (!a) return;
    const email = decodeURIComponent(a.getAttribute('href').slice(7).split('?')[0]);
    const done = () => toast(dict.footer.copied.replace('{email}', email));
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(email).then(done, done); else done();
  });

  /* ---------- Language ---------- */
  function getLang() {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'ar' || q === 'en') return q;
    if (/^\/ar(\/|$)/.test(location.pathname)) return 'ar';
    if (PRERENDER) return 'en';
    try { const s = localStorage.getItem('cf-lang'); if (s === 'ar' || s === 'en') return s; } catch (e) {}
    return 'en';
  }
  let lang = getLang();
  let dict = I18N[lang];
  const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

  function applyText() {
    $$('[data-i18n]').forEach((el) => {
      const v = get(dict, el.dataset.i18n);
      if (typeof v === 'string') el.innerHTML = v;
    });
    if (!PRERENDER) document.title = lang === 'ar'
      ? 'الموحدة لتدقيق الحسابات والاستشارات المالية | تدقيق وضرائب واستشارات في عمّان، الأردن'
      : 'Consolidated for Auditing and Financial Consulting | Audit, Tax and Advisory in Amman, Jordan';
    $$('[data-i18n="brand.name"]').forEach((el) => el.textContent = lang === 'ar' ? 'الموحدة' : 'CONSOLIDATED');
    $$('[data-i18n="brand.tag"]').forEach((el) => el.textContent = lang === 'ar' ? 'لتدقيق الحسابات والاستشارات المالية' : 'Auditing and Financial Consulting');
    const wa = encodeURIComponent(dict.consult.waText);
    $$('[data-wa]').forEach((a) => { a.href = WA + '?text=' + wa; });
    $$('[data-careers-link]').forEach((a) => { a.href = lang === 'ar' ? '/ar/careers/' : '/careers/'; });
    $$('a[href^="mailto:"]').forEach((a) => { if (!a.closest('.leader-contact, .footer-col')) a.href = 'mailto:' + CFG.inquiryEmail; });
  }

  function setLang(next, first) {
    lang = next; dict = I18N[lang];
    html.lang = lang; html.dir = lang === 'ar' ? 'rtl' : 'ltr';
    try { localStorage.setItem('cf-lang', lang); } catch (e) {}
    applyText();
    renderAll();
    initReveals(); initCharReveal(); initCycle(); initStats();
    if (!first) setLangUrl();
    if (!first && hasGsap) requestAnimationFrame(() => ScrollTrigger.refresh());
  }
  ['lang-toggle', 'lang-toggle-m'].forEach((id) => { const b = document.getElementById(id); if (b) b.addEventListener('click', () => { closeMenu(); setLang(lang === 'en' ? 'ar' : 'en'); }); });
  function setLangUrl() {
    // Keep the URL in sync with the language so shared links and crawlers land on the right version.
    if (location.protocol === 'file:' || location.search.includes('lang=')) return;
    const onAr = /^\/ar(\/|$)/.test(location.pathname);
    if (lang === 'ar' && !onAr) history.replaceState(null, '', '/ar/' + location.hash);
    if (lang === 'en' && onAr) history.replaceState(null, '', '/' + location.hash);
  }

  /* ---------- Shared bits ---------- */
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>';
  const btn = (label, href, cls = '', attrs = '') => `<a class="btn ${cls}" href="${href}" ${attrs}><span class="btn-label">${esc(label)}</span><span class="btn-icon"><i class="btn-dot"></i>${arrow}</span></a>`;
  const dup = (h) => h + h;
  const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('');

  // The hero word after "Delivering" cycles through the service names, so it always matches the services list.
  const heroWords = () => dict.services.items.map((s) => s.title);

  /* ---------- Renderers ---------- */
  function renderFeatured() {
    // Every phrase sits invisibly in the same cell, so the line is always as tall as the longest one.
    $('.cycle-reserve').innerHTML = heroWords().map((w) => `<span>${esc(w)}</span>`).join('');
  }

  function renderSectors() {
    const cards = dict.sectors.cards.map((c) => `
      <a class="pcard ${c.wide ? 'wide' : ''}" href="#clients">
        <img src="/assets/img/${c.img}.jpg" alt="" loading="lazy">
        <span class="pcard-shade"><span class="pcard-body"><h3>${esc(c.title)}${arrow}</h3></span></span>
      </a>`);
    const a = cards.filter((_, i) => i % 2 === 0).join(''), b = cards.filter((_, i) => i % 2 === 1).join('');
    $('#portfolio-rows').innerHTML = `
      <div class="marquee"><div class="marquee-track" style="--dur:44s">${dup(a)}</div></div>
      <div class="marquee"><div class="marquee-track right" style="--dur:50s">${dup(b)}</div></div>`;
  }

  // Stat icons: large, slim Lucide line icons standing on their own above each caption (no frame).
  // Each stroke has pathLength=1 and the .sd class so CSS can draw it in when the stat enters the viewport.
  const statIcons = {
    founded: '<path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/>',
    years: '<path d="M12 16v5"/><path d="M16 14v7"/><path d="M20 10v11"/><path d="m22 3-8.646 8.646a.5.5 0 0 1-.708 0L9.354 8.354a.5.5 0 0 0-.707 0L2 15"/><path d="M4 18v3"/><path d="M8 14v7"/>',
    clients: '<path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/>',
    location: '<path d="M18 8c0 3.613-3.869 7.429-5.393 8.795a1 1 0 0 1-1.214 0C9.87 15.429 6 11.613 6 8a6 6 0 0 1 12 0"/><circle cx="12" cy="8" r="2"/><path d="M8.714 14h-3.71a1 1 0 0 0-.948.683l-2.004 6A1 1 0 0 0 3 22h18a1 1 0 0 0 .948-1.316l-2-6a1 1 0 0 0-.949-.684h-3.712"/>'
  };
  const statIcon = (key) => statIcons[key] ? `<div class="stat-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24">${statIcons[key].replace(/<(path|circle|rect)\b/g, '<$1 pathLength="1" class="sd"')}</svg></div>` : '';

  // One shared gradient for the stat icons' strokes (userSpaceOnUse so straight lines still get colour).
  if (!document.getElementById('stat-grad-defs')) document.body.insertAdjacentHTML('beforeend',
    '<svg id="stat-grad-defs" width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="stat-grad" gradientUnits="userSpaceOnUse" x1="2" y1="2" x2="22" y2="22"><stop offset="0" stop-color="#27fcf2"/><stop offset=".5" stop-color="#3064d0"/><stop offset="1" stop-color="#8739d5"/></linearGradient></defs></svg>');
  function renderStats() {
    $('#stats').innerHTML = dict.stats.map((s) => `
      <div class="stat" data-reveal data-reveal-y="56">
        ${statIcon(s.icon)}
        <span>${esc(s.caption || s.label)}</span>
      </div>`).join('');
  }

  // Floating value cards: positions mirror the reference's card layout.
  // Right-hand cards are placed by their right edge (calc with the card width) so larger cards never run off-screen.
  const wlLayout = [
    { x: '2%', y: '1%', rot: -7, delay: 0, dur: 6.2 },
    { x: 'calc(98% - var(--wl-w))', y: '1%', rot: 7, delay: .6, dur: 5.6 },
    { x: '8%', y: '35%', rot: 5, delay: 1, dur: 5.8 },
    { x: 'calc(92% - var(--wl-w))', y: '35%', rot: -6, delay: 1.4, dur: 6.6 },
    { x: '2%', y: '68%', rot: 8, delay: .3, dur: 6.0 },
    { x: 'calc(98% - var(--wl-w))', y: '68%', rot: -8, delay: 1.8, dur: 5.4 }
  ];
  function renderValues() {
    $('#wl-group').innerHTML = dict.values.cards.map((c, i) => {
      const L = wlLayout[i % wlLayout.length];
      return `<div class="wl-card" style="left:${L.x};top:${L.y};--rot:${L.rot}deg" data-rot="${L.rot}" data-delay="${L.delay}" data-dur="${L.dur}" tabindex="0" role="button" aria-pressed="false" aria-label="${esc(c.title)}">
        <div class="wl-card-inner">
          <div class="wl-face"><img src="/assets/img/${c.img}.jpg" alt=""><h3>${esc(c.title)}</h3></div>
          <div class="wl-face back"><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p></div>
        </div></div>`;
    }).join('');
    initWonderland();
  }

  const minusIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"><path d="M5 12h14"/><path class="v" d="M12 5v14"/></svg>';
  // Service icons, in service order: Lucide line icons (ISC licence), the same set the company profile uses.
  const svcIcons = [
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>', // shield-check
    '<rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/>', // calculator
    '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M14 8H8"/><path d="M16 12H8"/><path d="M13 16H8"/>', // receipt-text
    '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/><path d="m16 16-1.9-1.9"/>', // scan-search
    '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>', // trending-up
    '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>', // building-2
    '<path d="M12 12h.01"/><path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M22 13a18.15 18.15 0 0 1-20 0"/><rect width="20" height="14" x="2" y="6" rx="2"/>', // briefcase-business
    '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>', // graduation-cap
    '<path d="M12 17v4"/><path d="m15.2 4.9-.9-.4"/><path d="m15.2 7.1-.9.4"/><path d="m16.9 3.2-.4-.9"/><path d="m16.9 8.8-.4.9"/><path d="m19.5 2.3-.4.9"/><path d="m19.5 9.7-.4-.9"/><path d="m21.7 4.5-.9.4"/><path d="m21.7 7.5-.9-.4"/><path d="M22 13v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><path d="M8 21h8"/><circle cx="18" cy="6" r="3"/>' // monitor-cog
  ];
  const svcIcon = (i) => `<svg viewBox="0 0 24 24" aria-hidden="true">${svcIcons[i] || ''}</svg>`;
  // Service rows step from the site's near-black to its light grey; the light rows switch to dark text (.acc-light).
  const rowColors = ['#141414', '#222222', '#313131', '#424242', '#555554', '#a2a2a0', '#b9b9b7', '#cfcfcd', '#e6e6e4'];
  const lightRowFrom = 5;
  function renderServices() {
    const host = $('#services-accordion');
    const S = dict.services;
    host.innerHTML = S.items.map((s, i) => `
      <div class="acc-item${i % rowColors.length >= lightRowFrom ? ' acc-light' : ''}" style="--row:${rowColors[i % rowColors.length]}">
        <button class="acc-btn" type="button" aria-expanded="false">
          <span class="acc-title"><span class="acc-ico">${svcIcon(i)}</span>${esc(s.title)}</span>
          <span class="acc-icon">${minusIcon}</span>
        </button>
        <div class="acc-panel"><div class="acc-body">
          <div class="acc-text">
            <span class="acc-num">${svcIcon(i)}</span>
            <h3 class="acc-big">${esc(s.title)}</h3>
            ${s.tagline ? `<p class="acc-tagline">${esc(s.tagline)}</p>` : ''}
            <div class="acc-prose">
              <h4 class="acc-h4">${esc(S.overviewTitle || '')}</h4>
              ${s.text.map((p) => `<p>${esc(p)}</p>`).join('')}
              ${s.list ? `<h4 class="acc-h4">${esc(s.listTitle || '')}</h4><ul class="acc-list">${s.list.map((li) => `<li>${esc(li)}</li>`).join('')}</ul>` : ''}
            </div>
            ${btn(S.discuss, '#consult')}
          </div>
          <div class="acc-img"><img src="/assets/img/${s.img}.jpg" alt="" loading="lazy"></div>
        </div></div>
      </div>`).join('');
    initAccordion(host);
  }

  function renderTeam() {
    $('#team-stack').innerHTML = dict.team.people.map((p, i) => `
      <button type="button" class="stack-item" data-i="${i}" aria-label="${esc(p.name)}">${p.photo ? `<img src="/assets/img/${p.photo}.jpg" alt="">` : `<b>${esc(initials(p.name))}</b>`}</button>`).join('');
    initStack();
  }

  function renderClients() {
    const logos = I18N.en.clients.logoFiles || [];
    const tile = (f) => `<div class="logo-tile" data-reveal><img src="/assets/img/clients/${f}" alt="" loading="lazy" decoding="async"></div>`;
    $('#trust-grid').innerHTML = logos.map(tile).join('');
    const legend = $('#sector-legend'); if (legend) legend.remove();
  }

  function renderExpect() {
    const t = $('#expect-track');
    t.style.setProperty('--dur', '30s');
    t.innerHTML = dup(dict.expect.cards.map((c) => `
      <article class="ecard"><div class="ecard-img"><img src="/assets/img/${c.img}.jpg" alt="" loading="lazy"></div><div class="ecard-body"><p>${esc(c.text)}</p></div></article>`).join(''));
  }

  // Footer: services with their own icons (each opens that service), firm links, contact rows with icons.
  const footIcons = {
    pin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
    map: '<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    firm: '<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>',
    team: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    partners: '<path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/>',
    careers: '<path d="M12 12h.01"/><path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M22 13a18.15 18.15 0 0 1-20 0"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>'
  };
  const footIcon = (body) => `<span class="foot-ico"><svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg></span>`;
  function renderFooter() {
    $('#footer-cols').innerHTML = dict.footer.cols.map((c) => {
      let items;
      if (c.services) {
        items = c.services.map((i) => `<li><a href="#services" data-svc="${i}">${footIcon(svcIcons[i])}<span>${esc(dict.services.items[i].title)}</span></a></li>`).join('')
          + `<li class="foot-all"><a href="#services">${esc(c.all)}${arrow}</a></li>`;
      } else {
        items = c.links.map(([label, href, ltr, icon]) => {
          const v = `${icon ? footIcon(footIcons[icon]) : ''}${ltr ? `<span dir="ltr">${esc(label)}</span>` : `<span>${esc(label)}</span>`}`;
          return `<li class="${icon ? 'foot-contact' : 'foot-link'}">${href ? `<a href="${href}" ${href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${v}</a>` : `<div>${v}</div>`}</li>`;
        }).join('');
      }
      return `<div class="footer-col"><h3>${esc(c.title)}</h3><ul>${items}</ul></div>`;
    }).join('');
  }
  // A footer service link opens that service in the list (the anchor handler above does the scrolling).
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-svc]'); if (!a) return;
    const item = $$('.acc-item')[+a.dataset.svc];
    if (item && !item.classList.contains('open')) item.querySelector('.acc-btn').click();
  });

  function renderLeaders() {
    $('#leaders-grid').innerHTML = dict.leaders.people.map((p) => `
      <article class="gradient-border-card leader-card" data-reveal>
        <div class="leader-inner">
          <figure class="leader-photo">
            <img src="/assets/img/${p.photo}.jpg" alt="${esc(p.name)}" loading="lazy">
            <figcaption><strong>${esc(p.name)}</strong><span>${esc(p.role)}</span>${p.certs.length ? `<div class="cert-row">${p.certs.map((c) => `<span>${esc(c)}</span>`).join('')}</div>` : ''}<em>${esc(p.degree)}</em></figcaption>
          </figure>
          <div class="leader-text">
            ${p.bio.map((b) => `<p>${esc(b)}</p>`).join('')}
            <ul class="leader-contact">${p.contact.map((c) => {
              const v = c.ltr ? `<span dir="ltr">${esc(c.value)}</span>` : esc(c.value);
              return `<li><small>${esc(c.label)}</small>${c.href ? `<a href="${c.href}" ${c.href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${v}</a>` : v}</li>`;
            }).join('')}</ul>
          </div>
        </div>
      </article>`).join('');
  }

  // Office map: Google's keyless embed, labelled in the page language.
  function renderMap() {
    const f = $('#visit-map'); if (!f) return;
    const src = 'https://maps.google.com/maps?q=31.941254,35.849426&z=17&hl=' + lang + '&output=embed';
    if (f.getAttribute('src') !== src) f.setAttribute('src', src);
    f.title = dict.map.frame;
  }

  // Consultation card caption mirrors the founder's Leadership card: name, role, credentials, degree.
  function renderConsult() {
    const cap = $('#consult-caption'), p = dict.leaders.people[0]; if (!cap || !p) return;
    cap.innerHTML = `<strong>${esc(p.name)}</strong><span>${esc(p.role)}</span>${p.certs.length ? `<div class="cert-row">${p.certs.map((c) => `<span>${esc(c)}</span>`).join('')}</div>` : ''}<em>${esc(p.degree)}</em>`;
  }

  function renderInquiry() {
    const q = dict.inquiry;
    $('#inquiry-points').innerHTML = q.points.map((p) => `<li>${esc(p)}</li>`).join('');
    $('#inquiry-service').innerHTML = q.serviceOptions.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join('');
  }

  function initInquiry() {
    const form = $('#inquiry-form');
    if (!form) return;
    const status = $('#inquiry-status'), submit = $('#inquiry-submit'), waBtn = $('#inquiry-wa');
    const fields = ['name', 'company', 'email', 'phone', 'service', 'message'];
    const read = () => Object.fromEntries(fields.map((k) => [k, (form.elements[k].value || '').trim()]));
    const setStatus = (msg, cls) => { status.textContent = msg; status.className = 'form-status ' + (cls || ''); };
    const validate = (d) => {
      let ok = true;
      [['name', !!d.name], ['email', /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)], ['phone', d.phone.replace(/\D/g, '').length >= 7], ['message', !!d.message]].forEach(([k, v]) => {
        form.elements[k].closest('.field').classList.toggle('invalid', !v); if (!v) ok = false;
      });
      if (!ok) setStatus(dict.inquiry.invalid, 'err');
      return ok;
    };
    const compose = (d) => {
      const L = dict.inquiry.labels;
      const lines = [dict.inquiry.waIntro, '', L.name + ': ' + d.name];
      if (d.company) lines.push(L.company + ': ' + d.company);
      lines.push(L.email + ': ' + d.email, L.phone + ': ' + d.phone, L.service + ': ' + d.service, '', L.message + ':', d.message);
      return lines.join('\n');
    };
    waBtn.addEventListener('click', () => {
      const d = read(); if (!validate(d)) return;
      window.open(WA + '?text=' + encodeURIComponent(compose(d)), '_blank', 'noopener');
      setStatus('', '');
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = read(); if (!validate(d)) return;
      if (form.elements.botcheck.value) return; // honeypot
      const subject = (lang === 'ar' ? 'استفسار جديد من الموقع' : 'New website inquiry') + ': ' + d.name + (d.company ? ' - ' + d.company : '');
      if (CFG.formEndpoint && CFG.formAccessKey) {
        submit.disabled = true; setStatus(dict.inquiry.sending, '');
        try {
          const res = await fetch(CFG.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(Object.assign({ access_key: CFG.formAccessKey, subject, from_name: 'Consolidated website', replyto: d.email, language: lang }, d, { botcheck: '' })) });
          const json = await res.json().catch(() => ({}));
          if (res.ok && json.success !== false) { setStatus(dict.inquiry.ok, 'ok'); form.reset(); renderInquiry(); }
          else throw new Error(json.message || res.statusText);
        } catch (err) { setStatus(dict.inquiry.err, 'err'); }
        submit.disabled = false;
        return;
      }
      // No relay key configured: open the visitor's email client with everything pre-filled.
      location.href = 'mailto:' + CFG.inquiryEmail + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(compose(d));
      setStatus(dict.inquiry.okMail, 'ok');
    });
    fields.forEach((k) => form.elements[k].addEventListener('input', () => form.elements[k].closest('.field').classList.remove('invalid')));
  }

  // Why choose us: expanding cards. Each shows its number and title; a click grows it open to reveal the text.
  // One card is open at a time and the first starts open, so visitors see that the cards open.
  function renderWhy() {
    const host = $('#why-grid'); if (!host || !dict.why) return;
    host.innerHTML = dict.why.items.map((it, i) => `
      <article class="why-card gradient-border-card ${i === 0 ? 'open' : ''}" data-reveal>
        <div class="why-inner">
          <button class="why-toggle" type="button" aria-expanded="${i === 0}" aria-controls="why-p${i}">
            <span class="why-num">${String(i + 1).padStart(2, '0')}</span><h3>${esc(it.title)}</h3><span class="why-plus">${minusIcon}</span>
          </button>
          <div class="why-panel" id="why-p${i}"><div><p>${esc(it.text)}</p></div></div>
        </div>
      </article>`).join('');
    const cards = $$('.why-card', host);
    let refresh = null;
    const settle = () => { clearTimeout(refresh); refresh = setTimeout(() => hasGsap && ScrollTrigger.refresh(), 650); };
    cards.forEach((card) => card.querySelector('.why-toggle').addEventListener('click', () => {
      const opening = !card.classList.contains('open');
      cards.forEach((c) => { const on = opening && c === card; c.classList.toggle('open', on); c.querySelector('.why-toggle').setAttribute('aria-expanded', String(on)); });
      playHover(); settle();
    }));
  }

  function renderAll() {
    renderFeatured(); renderSectors(); renderStats(); renderValues(); renderWhy(); renderServices(); renderTeam(); renderLeaders(); renderClients(); renderConsult(); renderExpect(); renderInquiry(); renderMap(); renderFooter();
  }

  /* ---------- Accordion (one open at a time, height tween) ---------- */
  function initAccordion(host) {
    const items = $$('.acc-item', host);
    const tween = (panel, h) => (hasGsap && !reduced)
      ? gsap.to(panel, { height: h, duration: .55, ease: 'power3.inOut', onComplete: () => ScrollTrigger.refresh() })
      : (panel.style.height = typeof h === 'number' ? h + 'px' : h);
    const open = (it) => { it.classList.add('open'); it.querySelector('.acc-btn').setAttribute('aria-expanded', 'true'); tween(it.querySelector('.acc-panel'), 'auto'); };
    const close = (it) => { it.classList.remove('open'); it.querySelector('.acc-btn').setAttribute('aria-expanded', 'false'); tween(it.querySelector('.acc-panel'), 0); };
    items.forEach((it) => it.querySelector('.acc-btn').addEventListener('click', () => {
      const isOpen = it.classList.contains('open');
      items.forEach((o) => o !== it && o.classList.contains('open') && close(o));
      isOpen ? close(it) : open(it);
      playHover();
    }));
    items.forEach((it) => it.addEventListener('pointerenter', playHover));
    if (items[0]) open(items[0]);
  }

  /* ---------- Hover sound (opt-in via the bottom-right button) ---------- */
  let soundOn = false, actx = null;
  const soundBtn = $('#sound-btn');
  soundBtn.addEventListener('click', () => { soundOn = !soundOn; soundBtn.setAttribute('aria-pressed', String(soundOn)); if (soundOn) playHover(); });
  function playHover() {
    if (!soundOn) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(880, actx.currentTime); o.frequency.exponentialRampToValueAtTime(1320, actx.currentTime + .08);
      g.gain.setValueAtTime(.0001, actx.currentTime); g.gain.exponentialRampToValueAtTime(.08, actx.currentTime + .02); g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + .18);
      o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + .2);
    } catch (e) {}
  }

  /* ---------- Hero word cycle (letters slide 118%, stagger .045, ease [.16,1,.3,1]) ---------- */
  let cycleTimer = null;
  function initCycle() {
    const host = $('[data-cycle]');
    if (!host) return;
    clearTimeout(cycleTimer);
    const words = heroWords();
    const isAr = lang === 'ar';
    let idx = 0, spans = [];
    // Letters are grouped per word so a long phrase wraps between words, never inside one.
    const build = (word) => {
      host.innerHTML = '';
      if (isAr) { const s = document.createElement('span'); s.textContent = word; host.appendChild(s); return [s]; }
      const out = [];
      word.split(' ').forEach((w) => {
        const g = document.createElement('span'); g.className = 'cycle-w'; host.appendChild(g);
        Array.from(w).forEach((u) => { const s = document.createElement('span'); s.textContent = u; g.appendChild(s); out.push(s); });
      });
      return out;
    };
    const show = () => {
      spans = build(words[idx]);
      if (hasGsap && !reduced) { gsap.set(spans, { yPercent: 118 }); gsap.to(spans, { yPercent: 0, duration: 1.05, stagger: .03, ease: 'expo.out' }); }
      cycleTimer = setTimeout(hide, 3200);
    };
    const hide = () => {
      if (hasGsap && !reduced) gsap.to(spans, { yPercent: -118, duration: .9, stagger: .03, ease: 'expo.in', onComplete: () => { idx = (idx + 1) % words.length; show(); } });
      else { idx = (idx + 1) % words.length; show(); }
    };
    show();
  }

  /* ---------- Gradient border spotlight follows the mouse ---------- */
  document.addEventListener('pointermove', (e) => {
    const el = e.target.closest('.gradient-border-card');
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mouse-x', (e.clientX - r.left) + 'px');
    el.style.setProperty('--mouse-y', (e.clientY - r.top) + 'px');
  });

  /* ---------- Reveal on scroll (fade + rise 20px) ---------- */
  let revealTweens = [], rowTriggers = [];
  function initReveals() {
    revealTweens.forEach((t) => { t.scrollTrigger && t.scrollTrigger.kill(); t.kill(); });
    revealTweens = [];
    rowTriggers.forEach((t) => t.kill());
    rowTriggers = [];
    const els = $$('[data-reveal]');
    if (!hasGsap || reduced) { els.forEach((el) => { el.style.opacity = 1; el.style.transform = 'none'; }); return; }
    els.forEach((el) => {
      revealTweens.push(gsap.fromTo(el, { opacity: 0, y: +(el.dataset.revealY || 20) }, {
        opacity: 1, y: 0, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      }));
    });
    // Service rows fade and rise in; rows that enter together come in one after another, top to bottom.
    const rows = $$('.acc-item');
    gsap.set(rows, { opacity: 0, y: 40 });
    rowTriggers = ScrollTrigger.batch(rows, {
      start: 'top 92%', once: true,
      onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: .8, ease: 'power3.out', stagger: .09, overwrite: true })
    });
  }

  /* ---------- Character reveal (opacity .32 → 1, scrubbed) ---------- */
  let charTriggers = [];
  function initCharReveal() {
    charTriggers.forEach((t) => t.kill());
    charTriggers = [];
    $$('.reveal-text').forEach((el) => {
      const text = el.textContent;
      el.innerHTML = '';
      const frag = document.createDocumentFragment();
      const parts = lang === 'ar' ? text.split(/(\s+)/) : Array.from(text);
      const spans = [];
      parts.forEach((p) => {
        if (!p) return;
        const s = document.createElement('span'); s.className = 'ch'; s.textContent = p; frag.appendChild(s); spans.push(s);
      });
      el.appendChild(frag);
      if (!hasGsap || reduced) { spans.forEach((s) => s.dataset.on = '1'); return; }
      const set = (p) => { const n = Math.round(p * spans.length); spans.forEach((s, i) => s.dataset.on = i < n ? '1' : '0'); };
      set(0);
      charTriggers.push(ScrollTrigger.create({ trigger: el, start: 'top 85%', end: 'top 25%', scrub: SCRUB, invalidateOnRefresh: true, onUpdate: (st) => set(st.progress) }));
    });
  }

  /* ---------- Stat icons draw in when each stat enters the viewport ---------- */
  let statTriggers = [];
  function initStats() {
    statTriggers.forEach((t) => t.kill());
    statTriggers = [];
    $$('.stat').forEach((el) => {
      if (!hasGsap || reduced) { el.classList.add('is-in'); return; }
      statTriggers.push(ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => el.classList.add('is-in') }));
    });
  }

  /* ---------- Scroll managed background: one dark look for the whole page ----------
     The hero's colourful glow stays behind everything; it dims (but never disappears) as the hero scrolls away,
     so About and the sections after it read as the same page rather than a separate light site. */
  function initTheme() {
    if (!hasGsap || reduced) return;
    gsap.to('#hero-dim', { opacity: 1, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: SCRUB } });
    // Hero content fades out as the user scrolls away.
    gsap.to('.hero-title, .hero-sub, .hero-cta', { yPercent: -8, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '45% top', end: 'bottom top', scrub: true } });
  }

  /* ---------- Header hides on scroll down, returns on scroll up ---------- */
  function initHeader() {
    const header = $('#header');
    let last = 0;
    const onScroll = (y) => {
      if (y > last + 6 && y > 140) header.style.top = '-6rem';
      else if (y < last - 6) header.style.top = '';
      last = y;
    };
    if (lenis) lenis.on('scroll', (e) => onScroll(e.scroll));
    else window.addEventListener('scroll', () => onScroll(window.scrollY), { passive: true });
  }

  /* ---------- Mobile menu ---------- */
  const menuBtn = $('#menu-btn'), menu = $('#mobile-menu');
  function closeMenu() { menu.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); if (lenis) lenis.start(); }
  menuBtn.addEventListener('click', () => {
    const open = !menu.classList.contains('open');
    menu.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    if (lenis) open ? lenis.stop() : lenis.start();
  });

  /* ---------- Wonderland: floating cards, group tilt, flip ---------- */
  function initWonderland() {
    const section = $('#values'), group = $('#wl-group');
    const cards = $$('.wl-card', group);
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    // Idle float: each card wobbles around its base rotation on its own delay.
    cards.forEach((c) => {
      const r = +c.dataset.rot;
      if (hasGsap && !reduced) {
        gsap.set(c, { rotation: r });
        gsap.to(c, { keyframes: [{ rotation: r + 2 }, { rotation: r - 2 }, { rotation: r + 1 }, { rotation: r }], duration: +c.dataset.dur, repeat: -1, ease: 'sine.inOut', delay: +c.dataset.delay });
      } else c.style.transform = `rotate(${r}deg)`;
      const flip = () => { c.classList.toggle('flipped'); c.setAttribute('aria-pressed', String(c.classList.contains('flipped'))); };
      // Mouse devices turn the card over on hover (CSS); touch devices flip it with a tap.
      if (!fine) c.addEventListener('click', flip);
      c.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
    });
    if (!fine || reduced || !hasGsap) return;
    const rx = gsap.quickTo(group, 'rotationX', { duration: .6, ease: 'power3.out' });
    const ry = gsap.quickTo(group, 'rotationY', { duration: .6, ease: 'power3.out' });
    section.addEventListener('pointerleave', () => { rx(0); ry(0); });
    section.addEventListener('pointermove', (e) => {
      const r = section.getBoundingClientRect();
      ry(5 * ((e.clientX - r.left) / r.width * 2 - 1));
      rx(-(4 * ((e.clientY - r.top) / r.height * 2 - 1)));
    });
  }

  /* ---------- Team stack (vertical on desktop, horizontal on mobile, auto 3s) ---------- */
  let stackTimer = null;
  function initStack() {
    clearInterval(stackTimer);
    const items = $$('.stack-item');
    const people = dict.team.people;
    const textHost = $('#team-text');
    let cur = 0, paused = false;
    const mobile = () => window.innerWidth < 768;
    const layout = (animate = true) => {
      const n = items.length;
      items.forEach((el, i) => {
        let d = i - cur;
        if (d < -Math.floor(n / 2)) d += n;
        if (d > Math.floor(n / 2)) d -= n;
        let x = 0, y = 0, s = 1, o = 1, z = 10;
        if (mobile()) {
          if (d === -1) { x = -110; s = .7; o = .6; z = 5; } else if (d === 1) { x = 110; s = .7; o = .6; z = 5; } else if (d !== 0) { x = d > 0 ? 200 : -200; s = .5; o = 0; z = 0; }
        } else {
          if (d === -1) { y = -195; s = .65; z = 5; } else if (d === 1) { y = 195; s = .65; z = 5; } else if (d !== 0) { y = d > 0 ? 300 : -300; s = .5; o = 0; z = 0; }
        }
        el.style.zIndex = z; el.style.cursor = d === 0 ? 'default' : 'pointer';
        if (hasGsap && animate && !reduced) gsap.to(el, { x, y, scale: s, opacity: o, duration: .9, ease: 'elastic.out(1, .78)', overwrite: true });
        else gsap ? gsap.set(el, { x, y, scale: s, opacity: o }) : (el.style.transform = `translate(${x}px,${y}px) scale(${s})`);
      });
      const p = people[cur];
      const h = `<h3>${esc(p.line)}</h3><div class="stack-meta"><strong>${esc(p.name)}</strong><span>${esc(p.role)}</span></div>`;
      if (hasGsap && animate && !reduced) gsap.to(textHost, { opacity: 0, y: -10, duration: .2, onComplete: () => { textHost.innerHTML = h; gsap.fromTo(textHost, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .45, ease: 'power2.out' }); } });
      else textHost.innerHTML = h;
    };
    const go = (i) => { cur = (i + items.length) % items.length; layout(); };
    items.forEach((el) => el.addEventListener('click', () => go(+el.dataset.i)));
    $('#team-prev').onclick = () => go(cur - 1);
    $('#team-next').onclick = () => go(cur + 1);
    const wrap = $('.stack-wrap');
    wrap.addEventListener('pointerenter', () => paused = true);
    wrap.addEventListener('pointerleave', () => paused = false);
    wrap.addEventListener('focusin', () => paused = true);
    wrap.addEventListener('focusout', () => paused = false);
    layout(false);
    if (!reduced) stackTimer = setInterval(() => { if (!paused) go(cur + 1); }, 3000);
    window.addEventListener('resize', () => layout(false));
  }

  /* ---------- Preloader: particles stream in and assemble into the mark ---------- */
  function runPreloader() {
    const el = $('#preloader');
    const finish = () => {
      if (el && el.parentNode) el.remove();
      document.body.style.overflow = '';
      if (lenis) lenis.start();
      if (hasGsap) ScrollTrigger.refresh();
      window.dispatchEvent(new CustomEvent('home-preloader-complete'));
    };
    let seen = false;
    try { seen = sessionStorage.getItem('cf-seen') === '1'; sessionStorage.setItem('cf-seen', '1'); } catch (e) {}
    if (!el || reduced || seen || !hasGsap || PRERENDER) { finish(); return; }
    document.body.style.overflow = 'hidden';
    if (lenis) lenis.stop();

    const canvas = $('#pre-canvas'), ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth, H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.scale(dpr, dpr);
    const logo = $('.pre-logo');
    const img = new Image(); img.src = '/assets/img/icon.png';
    // Reference preloader palette: navy, aqua, purple, cream.
    const palette = ['#000f98', '#4ae4e0', '#7e2bc6', '#ffe6b2', '#4ae4e0', '#ffe6b2'];

    const start = () => {
      const size = Math.min(W * .38, H * .44, 380);
      const ow = Math.round(size), oh = Math.round(size * img.height / img.width);
      const off = document.createElement('canvas'); off.width = ow; off.height = oh;
      const octx = off.getContext('2d'); octx.drawImage(img, 0, 0, ow, oh);
      const data = octx.getImageData(0, 0, ow, oh).data;
      const cx = W / 2, cy = H / 2, step = Math.max(2, Math.round(ow / 150));
      const pts = [];
      for (let y = 0; y < oh; y += step) for (let x = 0; x < ow; x += step) if (data[(y * ow + x) * 4 + 3] > 90) pts.push({ x: cx - ow / 2 + x, y: cy - oh / 2 + y });
      const parts = pts.map((p, i) => {
        const a = (i / pts.length) * Math.PI * 4 + Math.random() * .4;
        return { tx: p.x, ty: p.y, sx: cx + Math.cos(a) * W * (.35 + Math.random() * .3), sy: cy + Math.sin(a * 1.6) * H * (.25 + Math.random() * .25),
          r: .8 + Math.random() * 1.6, delay: Math.random() * .4, phase: Math.random() * Math.PI * 2, color: palette[(Math.random() * palette.length) | 0] };
      });
      const state = { p: 0, fade: 1 };
      const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 3));
      const draw = () => {
        ctx.clearRect(0, 0, W, H);
        const now = performance.now();
        for (const p of parts) {
          const t = ease((state.p - p.delay) / (1 - p.delay));
          const drift = (1 - t) * 10;
          const x = p.sx + (p.tx - p.sx) * t + Math.sin(now * .002 + p.phase) * drift;
          const y = p.sy + (p.ty - p.sy) * t + Math.cos(now * .0017 + p.phase) * drift;
          ctx.globalAlpha = state.fade * (.25 + .75 * t);
          ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(x, y, p.r, 0, Math.PI * 2); ctx.fill();
        }
      };
      gsap.set(logo, { width: ow, opacity: 0, scale: 1 });
      const tl = gsap.timeline({ onUpdate: draw, onComplete: finish });
      tl.timeScale(1.5);
      tl.to(state, { p: 1, duration: 2.9, ease: 'none' })
        .to(state, { fade: 0, duration: .5, ease: 'power1.in' }, '-=0.4')
        .to(logo, { opacity: 1, duration: .6, ease: 'power2.inOut' }, '<0.2')
        .addLabel('handoff', '+=0.06')
        .to(logo, { scale: 2.6, duration: .82, ease: 'power2.inOut' }, 'handoff')
        .to(logo, { opacity: 0, duration: .28, ease: 'power2.out' }, 'handoff+=0.08')
        .to(el, { opacity: 0, duration: .5, ease: 'power2.out' }, 'handoff+=0.3');
    };
    img.decode ? img.decode().then(start).catch(finish) : (img.onload = start, img.onerror = finish);
  }

  /* ---------- Boot ---------- */
  setLang(lang, true);
  initTheme(); initHeader(); initInquiry();
  runPreloader();
  window.addEventListener('load', () => { if (hasGsap) ScrollTrigger.refresh(); });
})();
