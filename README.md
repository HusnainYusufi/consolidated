# Consolidated for Auditing and Tax Consultation — Website

Bilingual (English / Arabic, RTL) single-page website for Consolidated for Auditing and Tax Consultation, Amman, Jordan.

The layout, palette and motion system mirror creativeans.com: particle preloader, fixed rotating mark behind the hero, cycling hero word, gradient-border nav pill, two-row portfolio marquee with circular clip reveal, scroll managed dark → cream → dark theme, character reveal copy, floating value cards with a custom cursor, earth-tone services accordion, team stack carousel, client grid and marquees, "You can expect" card marquee, footer and consultation card.

## Run locally

It is a static site with no build step. Asset paths are absolute (`/assets/...`), so serve the folder from its root rather than opening the file directly:

```bash
npx serve .
```

Then open http://localhost:3000. Arabic lives at `/ar/`. The language toggle in the header switches live, updates the URL and remembers the choice.

## Structure

```
index.html            page markup (section containers, data-i18n keys)
assets/css/style.css  design tokens, layout, motion
assets/js/i18n.js     all copy in both languages (edit text here)
assets/js/main.js     preloader, smooth scroll, animations, language switch
assets/img/           logos (light and dark variants), photos from the profile PDF
```

## Editing content

Everything visible is in `assets/js/i18n.js` under `en` and `ar`. Lists (services, values, clients, team, contact) are rendered from those arrays, so adding an item is adding an array entry.

Team photos: only the founder's photo was in the profile PDF. Other members use initials until photos are added. To add one, drop `assets/img/<name>.jpg` and set `photo: '<name>'` on that person in both languages.

## Libraries (CDN)

- GSAP 3 + ScrollTrigger (scroll animations)
- Lenis (smooth scrolling)
- Google Fonts: Instrument Serif + Roboto (English, matching the reference's serif italic + Roboto pairing), Amiri + IBM Plex Sans Arabic (Arabic)

## Client logos

The "Clients That Trust Us" section shows logos only (no client names), in a grid plus two marquee rows. The files live in `assets/img/clients/` and are listed in `en.clients.logoFiles` in `assets/js/i18n.js`. To add a logo, drop the image in that folder and add its filename to the list; to remove one, delete it from the list. The raw originals the client supplied stay in the untracked `Clients Logos/` folder. Logos render in greyscale and turn to colour on hover.

## Inquiry form

The form at `#inquiry` has two delivery paths:

- **Email**: submissions post to a form relay (Web3Forms by default, free). Create an access key at https://web3forms.com with the inbox that should receive inquiries and paste it into `formAccessKey` in `assets/js/config.js`. Until a key is set, the "Send Inquiry" button opens the visitor's email client with the message pre-filled, addressed to `inquiryEmail`.
- **WhatsApp**: "Send via WhatsApp" opens a chat with the number in `whatsapp` (config.js) and the form contents as the message. No API or account is needed.

Every submission carries the visitor's name, company, email, phone, chosen service and message, so the firm always has both an email address and a WhatsApp number to reply to. A honeypot field blocks simple bots.

## Careers page

`careers/index.html` (Arabic: `ar/careers/index.html`) lists open roles and an application form with CV upload (PDF, DOC or DOCX, up to 5 MB). Roles, perks and labels live under `careers` in `assets/js/i18n.js`. Clicking a role card pre-selects it in the form.

Delivery works like the inquiry form: with a relay access key in `assets/js/config.js` (`careersAccessKey`, or `formAccessKey` as fallback) the application and the attached CV are emailed to the firm. File attachments require a relay plan that allows uploads (Web3Forms Pro, or any endpoint that accepts multipart form data with an `attachment` field). Without a key, the candidate's email client opens with the details pre-filled and they are asked to attach the CV themselves.

## SEO

- `index.html`, `careers/index.html` and their Arabic versions under `ar/` are **prerendered static HTML**, so search engines see the full content without running JavaScript. After editing `assets/js/i18n.js` or `index.html`, regenerate them:

  ```bash
  pip install playwright && python -m playwright install chromium   # once
  python tools/prerender.py
  ```

- Per-language `<title>`, meta description, canonical, `hreflang` (en, ar, x-default), Open Graph and Twitter cards, `og-image.png` (1200 x 630).
- JSON-LD structured data: `AccountingService` / `LocalBusiness` with address, phones, founding date, services, and `Person` entries for both partners.
- `sitemap.xml`, `robots.txt`, `site.webmanifest`, favicon and app icons.
- Replace `https://www.caudit.net` throughout (`index.html` head, `sitemap.xml`, `robots.txt`, `config.js`) if the final domain differs. After launch, submit the sitemap in Google Search Console.

## Company profile (PDF)

`profile/index.html` lays out (and, opened in a browser at /profile/, plays as an animated scroll version) the company profile from the same content dictionary as the website, so it always matches the approved copy. Build the English and Arabic PDFs with:

```bash
python tools/build_profile.py
```

Outputs `profile/Consolidated-Company-Profile-EN.pdf` and `-AR.pdf` (A4 portrait brochure, 27 pages in four chapters). Edit copy in `assets/js/i18n.js`, then rebuild. Icons come from the bundled Lucide set in `profile/vendor/`, toned photography from `profile/img/`, and the back-cover QR code (`profile/qr-website.svg`) points to www.caudit.net.
