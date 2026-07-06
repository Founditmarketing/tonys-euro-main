// Generates /services/<slug>/index.html for each service from services-content.json.
// Run: node gen-services.mjs
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

const ORIGIN = 'https://tonyseuro.com';
const PHONE = '(318) 445-6007';
const TEL = 'tel:3184456007';

const REG = {
  'computer-diagnostics': { code: 'DIAG', name: 'Computer Diagnostics' },
  'fluid-service': { code: 'FLUID', name: 'Factory-Spec Fluid Service' },
  'brakes-suspension': { code: 'BRK', name: 'Brake & Suspension' },
  'engine-repair': { code: 'ENG', name: 'Engine Repair' },
  'classic-exotic-care': { code: 'CLSC', name: 'Classic & Exotic Care' },
  'inspection-warranty': { code: 'INSP', name: 'Inspection & Warranty' },
};

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const PHONE_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C9.6 21 3 14.4 3 6c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.4 0 .8-.3 1l-2.2 2.2z"/></svg>';

const HEADER = `<header>
  <a href="/" class="brand" aria-label="Tony's European Auto Service, home"><img class="logo" src="/assets/logo-sm.png" alt="Tony's European Auto Service" width="416" height="120"></a>
  <nav>
    <a href="/#services" class="nl">All Services</a>
    <a href="/#gallery" class="nl">The Bay</a>
    <a href="/#concierge" class="nl">Diagnose</a>
    <a href="/#reviews" class="nl">Reviews</a>
    <a href="/#book" class="nl">Visit</a>
    <a href="${TEL}" class="btn solid">Call ${PHONE}</a>
    <a href="${TEL}" class="call-mini" aria-label="Call Tony's at ${PHONE}">${PHONE_SVG}Call</a>
  </nav>
</header>`;

const FOOTER = `<footer>
  <div class="wrap">
    <div class="foot-grid">
      <div class="col">
        <a href="/" class="brand" aria-label="Tony's European Auto Service, home"><img class="logo" src="/assets/logo-sm.png" alt="Tony's European Auto Service" width="416" height="120" loading="lazy" decoding="async" style="height:48px"></a>
        <p>Central Louisiana's European specialist. Independent, family-owned, and trusted for three decades.</p>
        <a href="${TEL}" class="foot-phone">${PHONE}</a>
        <p class="foot-meta">3800 McKeithen Drive, Alexandria, LA 71303<br>Monday to Friday, 7 AM to 4 PM</p>
      </div>
      <div class="foot-col">
        <p class="foot-col-h">Services</p>
        <a href="/services/computer-diagnostics/">Computer Diagnostics</a>
        <a href="/services/fluid-service/">Fluid Service</a>
        <a href="/services/brakes-suspension/">Brake &amp; Suspension</a>
        <a href="/services/engine-repair/">Engine Repair</a>
        <a href="/services/classic-exotic-care/">Classic &amp; Exotic Care</a>
        <a href="/services/inspection-warranty/">Inspection &amp; Warranty</a>
      </div>
      <div class="foot-nav">
        <p class="foot-col-h">Explore</p>
        <a href="/#why">Why Tony's</a><a href="/#services">Service</a><a href="/#gallery">The Bay</a><a href="/#concierge">Diagnose</a><a href="/#reviews">Reputation</a><a href="/#about">The Family</a><a href="/#book">Visit</a>
      </div>
    </div>
    <div class="foot-base">
      <span>© 2026 Tony's European Auto Service · Alexandria, LA</span>
      <span>BMW · Mercedes-Benz · Porsche · Audi · Land Rover · Jaguar · Maserati</span>
    </div>
  </div>
</footer>`;

function page(c) {
  const reg = REG[c.slug];
  const url = `${ORIGIN}/services/${c.slug}/`;
  const related = c.relatedSlugs.filter((s) => REG[s] && s !== c.slug).slice(0, 2);

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: reg.name,
    serviceType: reg.name,
    description: c.metaDescription,
    url,
    areaServed: { '@type': 'AdministrativeArea', name: 'Central Louisiana' },
    provider: {
      '@type': 'AutoRepair',
      name: "Tony's European Auto Service",
      telephone: '+1-318-445-6007',
      address: { '@type': 'PostalAddress', streetAddress: '3800 McKeithen Drive', addressLocality: 'Alexandria', addressRegion: 'LA', postalCode: '71303', addressCountry: 'US' },
      url: ORIGIN + '/',
    },
  };
  const crumbs = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: ORIGIN + '/' },
      { '@type': 'ListItem', position: 2, name: 'Services', item: ORIGIN + '/#services' },
      { '@type': 'ListItem', position: 3, name: reg.name, item: url },
    ],
  };
  const faqLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: c.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  const intro = c.intro.map((p) => `<p class="lead">${esc(p)}</p>`).join('\n        ');
  const incl = c.included.map((i) => `<div class="incl"><h3>${esc(i.title)}</h3><p>${esc(i.detail)}</p></div>`).join('\n          ');
  const signs = c.signals.map((s) => `<li>${esc(s)}</li>`).join('\n          ');
  const steps = c.process.map((s) => `<div class="step"><h3>${esc(s.step)}</h3><p>${esc(s.detail)}</p></div>`).join('\n          ');
  const faqs = c.faqs.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n        ');
  const rel = related.map((s) => `<a class="rel" href="/services/${s}/"><div class="c">${esc(REG[s].code)}</div><h3>${esc(REG[s].name)}</h3><div class="go">View service &rarr;</div></a>`).join('\n          ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${esc(c.metaTitle)}</title>
<meta name="description" content="${esc(c.metaDescription)}">
<link rel="canonical" href="${url}">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png">
<link rel="icon" type="image/png" sizes="64x64" href="/assets/favicon-64.png">
<meta name="theme-color" content="#0A0A0B">
<link rel="manifest" href="/site.webmanifest">
<link rel="apple-touch-icon" href="/assets/icon-192.png">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(c.metaTitle)}">
<meta property="og:description" content="${esc(c.metaDescription)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${ORIGIN}/assets/hero-maserati.jpg">
<meta property="og:site_name" content="Tony's European Auto Service">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(c.metaTitle)}">
<meta name="twitter:description" content="${esc(c.metaDescription)}">
<meta name="twitter:image" content="${ORIGIN}/assets/hero-maserati.jpg">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<script type="application/ld+json">${JSON.stringify(crumbs)}</script>
<script type="application/ld+json">${JSON.stringify(faqLd)}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,144,600;0,144,700;1,144,500;1,144,600&family=Saira+Condensed:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site-v2.css">
</head>
<body>
${HEADER}
<main>
  <div class="wrap" style="padding-top:104px">
    <nav class="crumb" aria-label="Breadcrumb"><a href="/">Home</a><span class="sep">/</span><a href="/#services">Services</a><span class="sep">/</span><span aria-current="page">${esc(reg.name)}</span></nav>
  </div>

  <section class="sv-hero">
    <div class="wrap">
      <div class="sv-code">${esc(reg.code)} · European Service</div>
      <h1>${esc(c.h1)}</h1>
      <p class="tagline">${esc(c.tagline)}</p>
      <div class="sv-cta-row">
        <a href="${TEL}" class="btn solid">Call ${PHONE}</a>
        <a href="/#services" class="btn ghost">All services</a>
      </div>
      <div class="sv-proof"><span>Family-owned since 1995</span><span class="d"></span><span>Independent European specialist</span><span class="d"></span><span>Alexandria, LA</span></div>
    </div>
  </section>

  <section class="sec">
    <div class="wrap">
        ${intro}
    </div>
  </section>

  <section class="sec">
    <div class="wrap">
      <div class="sec-head"><span class="eyebrow">What's included</span></div>
      <div class="incl-grid">
          ${incl}
      </div>
    </div>
  </section>

  <section class="sec">
    <div class="wrap">
      <div class="sec-head"><h2>Signs it's time to come in</h2></div>
      <ul class="signs">
          ${signs}
      </ul>
    </div>
  </section>

  <section class="sec">
    <div class="wrap why-eu">
      <div class="badge">Dealer-level capability. <b>Local-shop honesty.</b></div>
      <p class="lead">${esc(c.whyEuropean)}</p>
    </div>
  </section>

  <section class="sec">
    <div class="wrap">
      <div class="sec-head"><h2>How it works</h2></div>
      <div class="steps">
          ${steps}
      </div>
    </div>
  </section>

  <section class="sec faq">
    <div class="wrap">
      <div class="sec-head"><h2>Common questions</h2></div>
        ${faqs}
    </div>
  </section>

  <section class="sec">
    <div class="wrap">
      <div class="sec-head"><span class="eyebrow">Related services</span></div>
      <div class="rel-grid">
          ${rel}
      </div>
    </div>
  </section>

  <section class="sv-band">
    <div class="wrap">
      <div class="inner">
        <div>
          <h2>Talk to a real European specialist.</h2>
          <p>Describe what your car is doing and we'll tell you what we'd look at first. No phone trees.</p>
        </div>
        <a href="${TEL}" class="btn solid">Call ${PHONE}</a>
      </div>
    </div>
  </section>
</main>
${FOOTER}
</body>
</html>
`;
}

const data = JSON.parse(readFileSync(new URL('./services-content.json', import.meta.url)));
const list = data.services || data;
let n = 0;
for (const c of list) {
  if (!REG[c.slug]) { console.error('UNKNOWN slug:', c.slug); continue; }
  const dir = new URL(`./services/${c.slug}/`, import.meta.url);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL('index.html', dir), page(c));
  n++;
  console.log('wrote services/' + c.slug + '/index.html');
}
console.log('generated', n, 'pages');
