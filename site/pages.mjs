// Guide pages, the guides index and the 404 page.
import { GUIDES, SITE, esc } from './layout.mjs';
import { artTile, icon } from './ui.mjs';

export const UPDATED = '2026-10-13';
const UPDATED_LABEL = 'October 13, 2026';

export const TOPICS = { install: 'Install', basics: 'Basics', offline: 'Offline', hosting: 'Hosting' };

function crumbs(items) {
  const lis = items.map(([label, href], i) => (i === items.length - 1 ? `<li><span aria-current="page">${label}</span></li>` : `<li><a href="${href}">${label}</a></li>`)).join('');
  return `<nav class="crumbs" aria-label="Breadcrumb"><ol class="breadcrumbs">${lis}</ol></nav>`;
}

/** Renders one guide from its source: meta and body html. */
export function guideBody(guide, all) {
  const { meta } = guide;
  const g = GUIDES.find((x) => x.slug === meta.slug);
  const sections = [...guide.body.matchAll(/<section id="([^"]+)"><h2>([\s\S]*?)<\/h2>/g)].map((m) => [m[1], m[2]]);
  const body = guide.body.replace(/<section id="([^"]+)"><h2>([\s\S]*?)<\/h2>/g, (_, id, h) => `<section id="${id}" class="chapter"><h2><a href="#${id}" class="anchor" aria-hidden="true" tabindex="-1">#</a>${h}</h2>`);
  const toc = [...sections, ['faq', 'Questions'], ['related', 'Keep reading']].map(([id, h]) => `<li><a href="#${id}">${h.replace(/<[^>]+>/g, '')}</a></li>`).join('');
  const faq = meta.faq
    .map((f, i) => `<details class="collapse" name="gfaq"${i === 0 ? ' open' : ''}><summary class="collapse-title">${f.q}</summary><div class="collapse-content"><p>${f.a}</p></div></details>`)
    .join('');
  const related = meta.related
    .map((slug) => {
      const r = all.find((x) => x.meta.slug === slug);
      const rg = GUIDES.find((x) => x.slug === slug);
      return `<a href="${slug}.html" class="guide-tile">${artTile(rg.icon, 'art-ic guide-tile-ic')}<span><b>${esc(r.meta.h1)}</b><small>${esc(r.meta.description)}</small></span></a>`;
    })
    .join('');
  return `<div class="read-progress" aria-hidden="true"></div>
<div class="guide-top">
  <div class="sky" aria-hidden="true"><span class="cloud c1"></span><span class="cloud c3"></span><span class="stars"></span></div>
  <div class="wrap">
    ${crumbs([['installkite', './'], ['Guides', 'guides.html'], [meta.crumb, '']])}
    <header class="guide-head">
      <div>
        <p class="kicker">${icon('book')}${TOPICS[g.topic]} guide</p>
        <h1>${esc(meta.h1)}</h1>
        <p class="lead">${meta.lead}</p>
        <p class="byline"><span>By <a href="https://github.com/kwy404" rel="author">Alexandre Kohler</a></span><span>Updated <time datetime="${UPDATED}">${UPDATED_LABEL}</time></span><span>${meta.readTime}</span></p>
      </div>
      ${artTile(g.icon, 'art-ic guide-hero-ic')}
    </header>
  </div>
</div>
<div class="wrap read">
  <aside class="read-toc" aria-labelledby="toc-title"><p class="side-title" id="toc-title">In this guide</p><ol>${toc}</ol></aside>
  <article class="read-main prose-ik">
${body}
    <section id="faq" class="chapter"><h2><a href="#faq" class="anchor" aria-hidden="true" tabindex="-1">#</a>Questions</h2><div class="accordion collapse-plus">${faq}</div></section>
    <aside class="guide-cta" aria-label="Get started">
      <img src="assets/mascot.svg" width="104" height="104" alt="" loading="lazy">
      <div><h2>Let Skye do the setup</h2><p>Manifest, every icon size, service worker, offline page and head tags, in one command. Free and open source.</p>
      <div class="cmd-box"><code id="cta-cmd">npx installkite init</code><button type="button" class="copy-btn" v-copy-from="#cta-cmd" aria-label="Copy the command">${icon('copy')}Copy</button></div></div>
    </aside>
    <section id="related" class="chapter"><h2><a href="#related" class="anchor" aria-hidden="true" tabindex="-1">#</a>Keep reading</h2><div class="guide-grid two-col">${related}</div></section>
  </article>
</div>`;
}

/** JSON-LD for a guide: TechArticle, FAQPage and BreadcrumbList. */
export function guideJsonLd(meta) {
  const url = `${SITE}${meta.slug}.html`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TechArticle',
        headline: meta.h1,
        description: meta.description,
        url,
        mainEntityOfPage: url,
        image: `${SITE}og.png`,
        datePublished: UPDATED,
        dateModified: UPDATED,
        inLanguage: 'en',
        proficiencyLevel: 'Beginner',
        author: { '@type': 'Person', name: 'Alexandre Kohler', url: 'https://github.com/kwy404', sameAs: ['https://github.com/kwy404', 'https://www.linkedin.com/in/alexandre-silva-173687256/'] },
        publisher: { '@type': 'Person', name: 'Alexandre Kohler', url: 'https://github.com/kwy404' },
        about: { '@type': 'SoftwareApplication', name: 'installkite', url: SITE, applicationCategory: 'DeveloperApplication', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } },
      },
      {
        '@type': 'FAQPage',
        mainEntity: meta.faq.map((f) => ({ '@type': 'Question', name: f.q.replace(/<[^>]+>/g, ''), acceptedAnswer: { '@type': 'Answer', text: f.a.replace(/<[^>]+>/g, '') } })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'installkite', item: SITE },
          { '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE}guides.html` },
          { '@type': 'ListItem', position: 3, name: meta.crumb, item: url },
        ],
      },
    ],
  };
}

/** The guides index: a home screen of guides, grouped by topic. */
export function indexBody(guides) {
  const groups = Object.entries(TOPICS)
    .map(([key, label]) => {
      const items = GUIDES.filter((g) => g.topic === key)
        .map((g) => {
          const m = guides.find((x) => x.meta.slug === g.slug).meta;
          return `<a href="${g.slug}.html" class="guide-tile">${artTile(g.icon, 'art-ic guide-tile-ic')}<span><b>${esc(m.h1)}</b><small>${esc(m.description)}</small><em>${m.readTime}</em></span></a>`;
        })
        .join('');
      return items ? `<section class="guide-group" aria-labelledby="t-${key}"><h2 id="t-${key}">${label}</h2><div class="guide-grid">${items}</div></section>` : '';
    })
    .join('');
  return `<div class="guide-top">
  <div class="sky" aria-hidden="true"><span class="cloud c1"></span><span class="cloud c2"></span><span class="stars"></span></div>
  <div class="wrap">
    ${crumbs([['installkite', './'], ['Guides', '']])}
    <h1>Guides to installable, offline websites</h1>
    <p class="lead">From the manifest and icon sizes to service workers, iOS and GitHub Pages. Each guide explains the rule, shows the code, and how installkite handles it.</p>
  </div>
</div>
<div class="wrap guides-page">${groups}</div>`;
}

export function indexJsonLd(guides) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: 'installkite guides',
        url: `${SITE}guides.html`,
        hasPart: guides.map((g) => ({ '@type': 'TechArticle', headline: g.meta.h1, url: `${SITE}${g.meta.slug}.html` })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'installkite', item: SITE },
          { '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE}guides.html` },
        ],
      },
    ],
  };
}

export function notFoundBody() {
  return `<section class="nf">
  <div class="sky" aria-hidden="true"><span class="cloud c1"></span><span class="cloud c2"></span><span class="cloud c3"></span><span class="stars"></span></div>
  <div class="wrap nf-in">
    <img src="assets/mascot.svg" width="220" height="220" alt="Skye the kite, drifting" class="nf-kite">
    <div>
      <p class="kicker">${icon('wifi-off')}Error 404</p>
      <h1>Skye drifted off course</h1>
      <p class="lead">This page is not on the map. The wind may have moved it, or the link has a typo.</p>
      <div class="hero-cta"><a href="./" class="btn btn-primary">${icon('arrow')}Back home</a><a href="guides.html" class="btn btn-outline">${icon('book')}Browse the guides</a><button type="button" class="btn btn-ghost" data-search-open>${icon('search')}Search</button></div>
    </div>
  </div>
</section>`;
}
