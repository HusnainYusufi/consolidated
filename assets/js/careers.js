/* Careers page: language handling, header behaviour and the application form with CV upload. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const html = document.documentElement;
  const CFG = Object.assign({ whatsapp: '962796650500', formEndpoint: '', formAccessKey: '', careersAccessKey: '', careersEmail: 'emulazem@caudit.net', careersMaxFileMb: 5 }, window.SITE_CONFIG || {});
  const PRERENDER = new URLSearchParams(location.search).has('prerender');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

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

  function applyText() {
    html.lang = lang; html.dir = lang === 'ar' ? 'rtl' : 'ltr';
    $$('[data-i18n]').forEach((el) => { const v = get(dict, el.dataset.i18n); if (typeof v === 'string') el.innerHTML = v; });
    $$('[data-i18n="brand.name"]').forEach((el) => el.textContent = lang === 'ar' ? 'الموحدة' : 'CONSOLIDATED');
    $$('[data-i18n="brand.tag"]').forEach((el) => el.textContent = lang === 'ar' ? 'لتدقيق الحسابات والاستشارات المالية' : 'Auditing and Financial Consulting');
    if (!PRERENDER) document.title = lang === 'ar' ? 'الوظائف | انضم إلى فريق الموحدة لتدقيق الحسابات والاستشارات المالية' : 'Careers | Join Consolidated for Auditing and Financial Consulting in Amman';
    const home = lang === 'ar' ? '/ar/' : '/';
    $$('[data-home-link]').forEach((a) => a.href = home);
    $$('[data-home-anchor]').forEach((a) => a.href = home + '#' + a.dataset.homeAnchor);
    $$('[data-careers-link]').forEach((a) => a.href = lang === 'ar' ? '/ar/careers/' : '/careers/');
    $$('[data-wa]').forEach((a) => a.href = 'https://wa.me/' + CFG.whatsapp + '?text=' + encodeURIComponent(dict.consult.waText));
    const c = dict.careers;
    $('#roles').innerHTML = c.roles.map((r, i) => `<article class="role-card" data-role="${i}" tabindex="0"><h3>${esc(r.title)}</h3><p>${esc(r.text)}</p><small>${esc(r.tag)}</small></article>`).join('');
    $('#apply-position').innerHTML = c.roles.map((r) => `<option value="${esc(r.title)}">${esc(r.title)}</option>`).join('');
    $('#apply-experience').innerHTML = c.experienceOptions.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join('');
    $$('.role-card').forEach((card) => {
      const pick = () => { $('#apply-position').value = c.roles[+card.dataset.role].title; $('#apply-form').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
      card.addEventListener('click', pick);
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    });
  }

  function setLang(next) {
    lang = next; dict = I18N[lang];
    try { localStorage.setItem('cf-lang', lang); } catch (e) {}
    applyText();
    if (location.protocol !== 'file:' && !location.search.includes('lang=')) {
      const target = lang === 'ar' ? '/ar/careers/' : '/careers/';
      if (location.pathname !== target) history.replaceState(null, '', target);
    }
  }
  ['lang-toggle', 'lang-toggle-m'].forEach((id) => { const b = document.getElementById(id); if (b) b.addEventListener('click', () => { closeMenu(); setLang(lang === 'en' ? 'ar' : 'en'); }); });

  /* Header hide on scroll, mobile menu, gradient spotlight */
  const header = $('#header'); let last = 0;
  window.addEventListener('scroll', () => { const y = window.scrollY; if (y > last + 6 && y > 140) header.style.top = '-6rem'; else if (y < last - 6) header.style.top = ''; last = y; }, { passive: true });
  const menuBtn = $('#menu-btn'), menu = $('#mobile-menu');
  function closeMenu() { menu.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; }
  menuBtn.addEventListener('click', () => { const open = !menu.classList.contains('open'); menu.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', String(open)); document.body.style.overflow = open ? 'hidden' : ''; });
  document.addEventListener('pointermove', (e) => { const el = e.target.closest('.gradient-border-card'); if (!el) return; const r = el.getBoundingClientRect(); el.style.setProperty('--mouse-x', (e.clientX - r.left) + 'px'); el.style.setProperty('--mouse-y', (e.clientY - r.top) + 'px'); });

  /* Application form */
  function initForm() {
    const form = $('#apply-form'), status = $('#apply-status'), submit = $('#apply-submit');
    const cv = $('#apply-cv'), drop = $('#file-drop'), fileName = $('#file-name');
    const MAX = (CFG.careersMaxFileMb || 5) * 1024 * 1024;
    const okTypes = /\.(pdf|docx?)$/i;
    const setStatus = (msg, cls) => { status.textContent = msg; status.className = 'form-status ' + (cls || ''); };
    const showFile = () => {
      const f = cv.files && cv.files[0];
      drop.classList.toggle('has-file', !!f);
      fileName.textContent = f ? `${f.name} · ${(f.size / 1024 / 1024).toFixed(2)} MB` : '';
      if (f && f.size > MAX) setStatus(dict.careers.tooBig.replace('{mb}', CFG.careersMaxFileMb || 5), 'err');
      else if (f && !okTypes.test(f.name)) setStatus(dict.careers.badType, 'err');
      else setStatus('', '');
    };
    cv.addEventListener('change', showFile);
    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('drag'); }));
    drop.addEventListener('drop', (e) => { if (e.dataTransfer.files.length) { cv.files = e.dataTransfer.files; showFile(); } });

    const fields = ['name', 'email', 'phone', 'position', 'experience', 'link', 'message'];
    const read = () => Object.fromEntries(fields.map((k) => [k, (form.elements[k].value || '').trim()]));
    const validate = (d) => {
      let ok = true;
      const f = cv.files && cv.files[0];
      [['name', !!d.name], ['email', /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)], ['phone', d.phone.replace(/\D/g, '').length >= 7], ['message', !!d.message]].forEach(([k, v]) => {
        form.elements[k].closest('.field').classList.toggle('invalid', !v); if (!v) ok = false;
      });
      if (!form.elements.consent.checked) ok = false;
      if (!f) ok = false;
      if (!ok) { setStatus(dict.careers.invalid, 'err'); return false; }
      if (f.size > MAX) { setStatus(dict.careers.tooBig.replace('{mb}', CFG.careersMaxFileMb || 5), 'err'); return false; }
      if (!okTypes.test(f.name)) { setStatus(dict.careers.badType, 'err'); return false; }
      return true;
    };
    const compose = (d) => {
      const L = dict.careers.labels;
      const lines = [L.name + ': ' + d.name, L.email + ': ' + d.email, L.phone + ': ' + d.phone, L.position + ': ' + d.position, L.experience + ': ' + d.experience];
      if (d.link) lines.push(L.link + ': ' + d.link);
      lines.push('', L.message + ':', d.message);
      return lines.join('\n');
    };
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = read(); if (!validate(d)) return;
      if (form.elements.botcheck.value) return;
      const key = CFG.careersAccessKey || CFG.formAccessKey;
      const subject = dict.careers.subject + ': ' + d.position + ' - ' + d.name;
      if (CFG.formEndpoint && key) {
        submit.disabled = true; setStatus(dict.careers.sending, '');
        try {
          const fd = new FormData();
          fd.append('access_key', key); fd.append('subject', subject); fd.append('from_name', 'Consolidated careers'); fd.append('replyto', d.email); fd.append('language', lang);
          Object.entries(d).forEach(([k, v]) => fd.append(k, v));
          fd.append('attachment', cv.files[0], cv.files[0].name);
          const res = await fetch(CFG.formEndpoint, { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
          const json = await res.json().catch(() => ({}));
          if (res.ok && json.success !== false) { setStatus(dict.careers.ok, 'ok'); form.reset(); showFile(); }
          else throw new Error(json.message || res.statusText);
        } catch (err) { setStatus(dict.careers.err.replace('{email}', CFG.careersEmail), 'err'); }
        submit.disabled = false;
        return;
      }
      // No relay key: open the candidate's email client; the CV must be attached there (mailto cannot carry files).
      location.href = 'mailto:' + CFG.careersEmail + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(compose(d));
      setStatus(dict.careers.okMail, 'ok');
    });
    fields.forEach((k) => form.elements[k].addEventListener('input', () => form.elements[k].closest('.field').classList.remove('invalid')));
  }

  applyText();
  initForm();
})();
