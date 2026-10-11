/* ------------------------------------------------------------------
   Consolidated — site behaviour (mirrors the creativeans.com motion
   system): particle preloader, Lenis smooth scroll, GSAP ScrollTrigger,
   cycling hero word, scroll managed dark/light theme, character
   reveal, portfolio marquees with clip reveal, floating value cards
   with flashlight cursor, accordion, team stack carousel, i18n.
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
    initReveals(); initCharReveal(); initCycle(); initCounters();
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

  /* ---------- Renderers ---------- */
  function renderFeatured() {
    const t = $('#featured-track');
    t.style.setProperty('--dur', '38s');
    t.innerHTML = dup(dict.hero.certs.map(([k, v]) => `<span class="cert-mark">${esc(k)}<small>${esc(v)}</small></span>`).join(''));
    $('.cycle-reserve').textContent = dict.hero.words.slice().sort((a, b) => b.length - a.length)[0];
  }

  function renderSectors() {
    const cards = dict.sectors.cards.map((c) => `
      <a class="pcard ${c.wide ? 'wide' : ''}" href="#clients" style="--tint:${c.tint}">
        <img src="/assets/img/${c.img}.jpg" alt="" loading="lazy">
        <span class="pcard-tint"></span>
        <span class="pcard-reveal"><span class="pcard-body">
          <h3>${esc(c.title)}${arrow}</h3>
          <span class="tags">${c.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</span>
        </span></span>
      </a>`);
    const a = cards.filter((_, i) => i % 2 === 0).join(''), b = cards.filter((_, i) => i % 2 === 1).join('');
    $('#portfolio-rows').innerHTML = `
      <div class="marquee"><div class="marquee-track" style="--dur:44s">${dup(a)}</div></div>
      <div class="marquee"><div class="marquee-track right" style="--dur:50s">${dup(b)}</div></div>`;
  }

  function renderStats() {
    $('#stats').innerHTML = dict.stats.map((s) => `
      <div class="stat" data-reveal data-reveal-y="56">
        <b>${s.text ? `<span class="stat-text">${esc(s.text)}</span>` : `<span data-count="${s.n}" data-plain="${s.plain ? 1 : 0}">${s.plain ? s.n : 0}</span>`}${s.suffix ? `<small>${s.suffix}</small>` : ''}</b>
        <span>${esc(s.label)}</span>
      </div>`).join('');
    $('#intro-points').innerHTML = dict.intro.points.map((p) => `
      <div class="ipoint" data-reveal><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></div>`).join('');
  }

  // Floating value cards: positions mirror the reference's card layout.
  const wlLayout = [
    { x: '12%', y: '8%', rot: -8, delay: 0, dur: 6.2 },
    { x: '70%', y: '6%', rot: 7, delay: .6, dur: 5.6 },
    { x: '8%', y: '58%', rot: 6, delay: 1, dur: 5.8 },
    { x: '72%', y: '56%', rot: -10, delay: 1.4, dur: 6.6 }
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
  const rowColors = ['#9a443a', '#d15f3f', '#896d49', '#d4b287', '#b8943c', '#48a13f'];
  function renderServices() {
    const host = $('#services-accordion');
    host.innerHTML = dict.services.items.map((s, i) => `
      <div class="acc-item" style="--row:${rowColors[i % rowColors.length]}">
        <button class="acc-btn" type="button" aria-expanded="false">
          <span class="acc-title">${esc(s.title)}</span>
          <span class="acc-icon">${minusIcon}</span>
        </button>
        <div class="acc-panel"><div class="acc-body">
          <div class="acc-text">
            <span class="acc-num">${i + 1}</span>
            <h3 class="acc-big">${esc(s.title)}</h3>
            ${s.badges ? `<div class="badges">${s.badges.map((b) => `<span>${esc(b)}</span>`).join('')}</div>` : ''}
            <div class="acc-prose">${s.text.map((p) => `<p>${esc(p)}</p>`).join('')}${s.list ? `<ul>${s.list.map((li) => Array.isArray(li) ? `<li><strong>${esc(li[0])}</strong><span>${esc(li[1])}</span></li>` : `<li>${esc(li)}</li>`).join('')}</ul>` : ''}</div>
            ${btn(dict.services.discuss, '#consult')}
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
    const sectors = dict.clients.sectors;
    // Look up a featured client's sector (for colour and label) and build a monogram.
    const findSector = (name) => {
      for (const s of sectors) for (const [g, items] of s.groups) if (items.some((n) => n.split(' (')[0] === name.split(' (')[0])) return { sector: s, group: g };
      return { sector: sectors[0], group: '' };
    };
    const mono = (name) => {
      const stop = /^(al|the|for|and|co|of|&|-|international|company)$/i;
      const words = name.replace(/\(.*?\)/g, '').replace(/[-–]/g, ' ').split(/\s+/).filter((w) => w && !stop.test(w));
      return (words.slice(0, 2).map((w) => w[0]).join('') || name.slice(0, 2)).toUpperCase();
    };
    const slug = (name) => name.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    $('#trust-grid').innerHTML = dict.clients.featured.map((n, i) => {
      const { sector, group } = findSector(n);
      const file = (dict.clients.logos || {})[n] || `${slug(I18N.en.clients.featured[i] || n)}.png`;
      return `<div class="trust-tile gradient-border-card" data-reveal style="--c:${sector.color}">
        <div class="trust-inner">
          <span class="trust-badge"><img src="/assets/img/clients/${file}" alt="" loading="lazy" onerror="this.parentNode.classList.add('no-logo'); this.remove()"><b>${esc(mono(I18N.en.clients.featured[i] || n))}</b></span>
          <span class="trust-name">${esc(n)}</span>
          <span class="trust-group">${esc(group)}</span>
        </div></div>`;
    }).join('');
    $('#sector-legend').innerHTML = sectors.map((s) => `<span style="--c:${s.color}"><i></i>${esc(s.name)} · ${s.groups.reduce((n, g) => n + g[1].length, 0)}</span>`).join('');
    const cards = [];
    sectors.forEach((s) => s.groups.forEach(([group, items]) => items.forEach((n) => cards.push(`<span class="client-card" style="--c:${s.color}"><i></i><span><b>${esc(group)}</b>${esc(n)}</span></span>`))));
    const rows = [[], [], []];
    cards.forEach((c, i) => rows[i % 3].push(c));
    $('#client-rows').innerHTML = rows.map((r, i) => `<div class="marquee"><div class="marquee-track ${i === 1 ? 'right' : ''}" style="--dur:${80 + i * 14}s">${dup(r.join(''))}</div></div>`).join('');
  }

  function renderExpect() {
    const t = $('#expect-track');
    t.style.setProperty('--dur', '30s');
    t.innerHTML = dup(dict.expect.cards.map((c) => `
      <article class="ecard"><div class="ecard-img"><img src="/assets/img/${c.img}.jpg" alt="" loading="lazy"></div><div class="ecard-body"><p>${esc(c.text)}</p></div></article>`).join(''));
  }

  function renderFooter() {
    $('#footer-cols').innerHTML = dict.footer.cols.map((c) => `
      <div class="footer-col"><h3>${esc(c.title)}</h3><ul>${c.links.map(([label, href, ltr]) => {
        const v = ltr ? `<span dir="ltr">${esc(label)}</span>` : esc(label);
        return `<li>${href ? `<a href="${href}" ${href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${v}</a>` : v}</li>`;
      }).join('')}</ul></div>`).join('');
  }

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

  function renderAll() {
    renderFeatured(); renderSectors(); renderStats(); renderValues(); renderServices(); renderTeam(); renderLeaders(); renderClients(); renderExpect(); renderInquiry(); renderFooter();
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
    const words = dict.hero.words;
    const isAr = lang === 'ar';
    let idx = 0;
    const build = (word) => {
      host.innerHTML = '';
      const units = isAr ? [word] : Array.from(word);
      return units.map((u) => { const s = document.createElement('span'); s.textContent = u === ' ' ? ' ' : u; host.appendChild(s); return s; });
    };
    const show = () => {
      const spans = build(words[idx]);
      if (hasGsap && !reduced) { gsap.set(spans, { yPercent: 118 }); gsap.to(spans, { yPercent: 0, duration: 1.05, stagger: .045, ease: 'expo.out' }); }
      cycleTimer = setTimeout(hide, 3200);
    };
    const hide = () => {
      const spans = $$('span', host);
      if (hasGsap && !reduced) gsap.to(spans, { yPercent: -118, duration: .9, stagger: .045, ease: 'expo.in', onComplete: () => { idx = (idx + 1) % words.length; show(); } });
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
  let revealTweens = [];
  function initReveals() {
    revealTweens.forEach((t) => { t.scrollTrigger && t.scrollTrigger.kill(); t.kill(); });
    revealTweens = [];
    const els = $$('[data-reveal]');
    if (!hasGsap || reduced) { els.forEach((el) => { el.style.opacity = 1; el.style.transform = 'none'; }); return; }
    els.forEach((el) => {
      revealTweens.push(gsap.fromTo(el, { opacity: 0, y: +(el.dataset.revealY || 20) }, {
        opacity: 1, y: 0, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      }));
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

  /* ---------- Counters ---------- */
  let counterTriggers = [];
  function initCounters() {
    counterTriggers.forEach((t) => t.kill());
    counterTriggers = [];
    $$('[data-count]').forEach((el) => {
      const target = +el.dataset.count;
      if (el.dataset.plain === '1' || !hasGsap || reduced) { el.textContent = target; return; }
      const o = { v: 0 };
      counterTriggers.push(ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => gsap.to(o, { v: target, duration: 1.6, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(o.v); } }) }));
    });
  }

  /* ---------- Scroll managed background: dark hero → light intro → dark accordion ---------- */
  function initTheme() {
    if (!hasGsap) return;
    const veil = $('#hero-veil'), solid = $('#hero-solid'), rotor = $('.hero-rotor'), dim = $('#hero-dim');
    gsap.to(dim, { opacity: 1, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: SCRUB } });
    const apply = (p) => {
      // p: 0 = dark hero look, 1 = light cream look
      const m = gsap.utils.clamp(0, 1, (p - .06) / .94);
      gsap.set(veil, { opacity: 1 - m });
      gsap.set(solid, { opacity: m });
      if (rotor) gsap.set(rotor, { opacity: m <= .25 ? 1 : m >= .72 ? 0 : 1 - (m - .25) / .47 });
      html.classList.toggle('light', m > .42);
    };
    if (reduced) { apply(0); return; }
    const intro = $('#about'), wl = $('#values'), solHead = $('.sol-head'), acc = $('#services-accordion'), teamSec = $('#team');
    // dark hero → light intro
    ScrollTrigger.create({ trigger: intro, start: 'top 60%', end: 'top 5%', scrub: SCRUB, invalidateOnRefresh: true, onUpdate: (st) => apply(st.progress) });
    // light intro → dark wonderland
    const sectorsSec = $('#sectors') || wl;
    ScrollTrigger.create({ trigger: sectorsSec, start: 'top 70%', end: 'top 25%', scrub: SCRUB, invalidateOnRefresh: true, onUpdate: (st) => apply(1 - st.progress) });
    // dark wonderland → light services heading (the accordion rows carry their own colours)
    ScrollTrigger.create({ trigger: solHead, start: 'top 80%', end: 'top 30%', scrub: SCRUB, invalidateOnRefresh: true, onUpdate: (st) => apply(st.progress) });
    // light accordion → dark team and everything after
    ScrollTrigger.create({ trigger: acc, start: 'bottom 75%', endTrigger: teamSec, end: 'top 65%', scrub: SCRUB, invalidateOnRefresh: true, onUpdate: (st) => apply(1 - st.progress) });
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

  /* ---------- Wonderland: floating cards, group tilt, custom cursor, flip ---------- */
  function initWonderland() {
    const section = $('#values'), group = $('#wl-group');
    // The section has a 3D perspective, which would make a fixed cursor position relative to it, so the cursor
    // lives directly under body. It is created here if the markup does not carry it (prerendered pages strip it).
    let cursor = $('#wl-cursor');
    if (!cursor) {
      cursor = document.createElement('div'); cursor.id = 'wl-cursor'; cursor.className = 'wl-cursor'; cursor.setAttribute('aria-hidden', 'true');
      cursor.innerHTML = '<span class="wl-glow"></span><img src="/assets/img/icon.png" alt="">';
    }
    if (cursor.parentNode !== document.body) document.body.appendChild(cursor);
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
      c.addEventListener('click', flip);
      c.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
    });
    if (!fine || reduced || !hasGsap) return;
    const rx = gsap.quickTo(group, 'rotationX', { duration: .6, ease: 'power3.out' });
    const ry = gsap.quickTo(group, 'rotationY', { duration: .6, ease: 'power3.out' });
    gsap.set(cursor, { xPercent: -50, yPercent: -50 });
    const cx = gsap.quickTo(cursor, 'x', { duration: .12, ease: 'power3.out' });
    const cy = gsap.quickTo(cursor, 'y', { duration: .12, ease: 'power3.out' });
    section.addEventListener('pointerenter', () => { section.classList.add('cursor-active'); gsap.to(cursor, { opacity: 1, duration: .25 }); });
    section.addEventListener('pointerleave', () => { section.classList.remove('cursor-active'); gsap.to(cursor, { opacity: 0, duration: .25 }); rx(0); ry(0); });
    section.addEventListener('pointermove', (e) => {
      const r = section.getBoundingClientRect();
      ry(5 * ((e.clientX - r.left) / r.width * 2 - 1));
      rx(-(4 * ((e.clientY - r.top) / r.height * 2 - 1)));
      cx(e.clientX); cy(e.clientY);
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
