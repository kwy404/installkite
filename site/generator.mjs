// The online generator page, a paper cutting mat: drop a logo, type a name,
// preview the icon on every home screen and under every mask, download a zip
// with the manifest and all icons. Everything runs in the browser
// (generator.js).
import { SITE } from './layout.mjs';
import { icon, scene } from './ui.mjs';

export function generatorBody(ctx) {
  return `<div class="page-head">
  <div class="wrap page-head-in">
    <div>
      <nav class="crumbs" aria-label="Breadcrumb"><ol class="breadcrumbs"><li><a href="./">installkite</a></li><li><span aria-current="page">Generator</span></li></ol></nav>
      <p class="tag-kicker"><span class="tag-hole"></span>The cutting mat</p>
      <h1>PWA manifest and icon generator</h1>
      <p class="lead">Drop your logo, name your app and download a zip with <code>manifest.webmanifest</code>, every icon size, maskable icons, <code>apple-touch-icon.png</code>, <code>favicon.ico</code> and the head tags. It all happens in your browser: the image never leaves your device.</p>
    </div>
    ${scene('cutting-mat', { cls: 'scene head-art', eager: true })}
  </div>
</div>

<section class="gen" v-data>
  <div class="mat">
  <div class="wrap gen-grid">
    <form class="gen-form paper-card" @submit.prevent aria-label="App details">
      <span class="tape tape-l" aria-hidden="true"></span><span class="tape tape-r" aria-hidden="true"></span>
      <p class="card-title hand">1. Your logo and details</p>
      <div class="drop" id="gen-drop" :class="{ 'is-over': G.over, 'has-image': G.ready }">
        <input type="file" id="gen-file" accept="image/png,image/svg+xml,image/jpeg,image/webp" class="sr-only">
        <label for="gen-file" class="drop-in">
          <span class="drop-preview"><canvas id="gen-src" width="96" height="96" aria-hidden="true"></canvas></span>
          <span class="drop-text"><b v-text="G.ready ? G.fileName : 'Drop your logo here'"></b><small>PNG or SVG, square, 512 pixels or larger. Or paste an image.</small></span>
          <span class="btn btn-outline btn-sm">${icon('upload')}Choose image</span>
        </label>
        <p class="drop-warn" v-show="G.warn" v-text="G.warn" role="status"></p>
      </div>
      <button type="button" class="btn btn-ghost btn-sm sample-btn" @click="sample()">${icon('sparkle')}Try it with Skye</button>

      <div class="field"><label class="label" for="g-name">App name</label><input id="g-name" class="input" v-model="G.name" maxlength="60" autocomplete="off"><p class="hint">Shown on the install dialog and the splash screen.</p></div>
      <div class="field"><label class="label" for="g-short">Home screen label</label><input id="g-short" class="input" v-model="G.shortName" maxlength="30" autocomplete="off"><p class="hint" :class="{ 'is-long': G.shortName.length > 12 }"><span v-text="G.shortName.length"></span> of 12 characters before launchers cut it off.</p></div>
      <div class="field"><label class="label" for="g-desc">Description</label><input id="g-desc" class="input" v-model="G.description" maxlength="160" autocomplete="off"></div>
      <div class="field-row">
        <div class="field"><label class="label" for="g-theme">Theme color</label><span class="color-pair"><input type="color" id="g-theme" class="color-input" v-model="G.theme"><input class="input input-sm" v-model="G.theme" aria-label="Theme color hex" spellcheck="false"></span></div>
        <div class="field"><label class="label" for="g-bg">Background</label><span class="color-pair"><input type="color" id="g-bg" class="color-input" v-model="G.bg"><input class="input input-sm" v-model="G.bg" aria-label="Background color hex" spellcheck="false"></span></div>
      </div>
      <div class="field"><span class="label" id="g-display-label">Display</span>
        <div class="segmented segmented-sm segmented-block" role="radiogroup" aria-labelledby="g-display-label">
          <label class="segmented-item"><input type="radio" name="g-display" value="standalone" v-model="G.display"> standalone</label>
          <label class="segmented-item"><input type="radio" name="g-display" value="fullscreen" v-model="G.display"> fullscreen</label>
          <label class="segmented-item"><input type="radio" name="g-display" value="minimal-ui" v-model="G.display"> minimal-ui</label>
        </div>
      </div>
      <div class="field-row">
        <div class="field"><label class="label" for="g-start">start_url</label><input id="g-start" class="input input-sm" v-model="G.startUrl" spellcheck="false"></div>
        <div class="field"><label class="label" for="g-base">Icon folder</label><input id="g-base" class="input input-sm" v-model="G.dir" spellcheck="false"></div>
      </div>
      <div class="field"><label class="label" for="g-pad">Maskable padding <small v-text="G.autoPad ? '(auto: safe zone)' : Math.round(G.pad * 100) + '% artwork size'"></small></label>
        <input type="range" id="g-pad" class="range range-sm" min="40" max="100" step="1" :value="Math.round(G.pad * 100)" @input="setPad($event)">
        <button type="button" class="link link-primary text-sm" v-show="!G.autoPad" @click="G.autoPad = true">Back to automatic</button>
      </div>
      <div class="gen-download">
        <button type="button" class="btn btn-primary btn-lg" id="gen-zip" @click="downloadZip()" :disabled="!G.ready || G.busy">${icon('zip')}<span v-text="G.busy ? 'Building the zip...' : 'Download zip'"></span></button>
        <p class="hint" v-text="G.ready ? G.summary : 'Add an image to enable the download.'"></p>
      </div>
    </form>

    <div class="gen-previews">
      <section class="pv paper-card" aria-labelledby="pv-home">
        <h2 id="pv-home">On the home screen</h2>
        <div class="pv-screens">
          <figure class="pv-phone pv-android"><div class="pv-wall"><div class="pv-row"><span class="pv-ghost"></span><span class="pv-app"><canvas id="pv-android" width="144" height="144"></canvas><small v-text="G.shortName || 'App'"></small></span><span class="pv-ghost"></span><span class="pv-ghost"></span></div></div><figcaption>Android, maskable icon in a circle</figcaption></figure>
          <figure class="pv-phone pv-ios"><div class="pv-wall"><div class="pv-row"><span class="pv-ghost sq"></span><span class="pv-app"><canvas id="pv-ios" width="144" height="144"></canvas><small v-text="G.shortName || 'App'"></small></span><span class="pv-ghost sq"></span><span class="pv-ghost sq"></span></div></div><figcaption>iOS, apple-touch-icon</figcaption></figure>
          <figure class="pv-desk"><div class="pv-win"><div class="pv-winbar"><canvas id="pv-fav" width="32" height="32"></canvas><span v-text="G.name || 'App'"></span></div><div class="pv-winbody"></div></div><figcaption>Desktop app window and tab, favicon</figcaption></figure>
        </div>
      </section>

      <section class="pv paper-card" aria-labelledby="pv-mask">
        <div class="pv-head"><h2 id="pv-mask">Maskable icon</h2><label class="air-switch"><input type="checkbox" class="toggle toggle-sm" role="switch" v-model="G.zone"><span>Show safe zone</span></label></div>
        <div class="mask-row">
          <figure><span class="mask-box m-circle"><canvas class="mask-cv" width="160" height="160"></canvas><i class="zone" v-show="G.zone"></i></span><figcaption>Circle</figcaption></figure>
          <figure><span class="mask-box m-squircle"><canvas class="mask-cv" width="160" height="160"></canvas><i class="zone" v-show="G.zone"></i></span><figcaption>Squircle</figcaption></figure>
          <figure><span class="mask-box m-rounded"><canvas class="mask-cv" width="160" height="160"></canvas><i class="zone" v-show="G.zone"></i></span><figcaption>Rounded square</figcaption></figure>
          <figure><span class="mask-box m-drop"><canvas class="mask-cv" width="160" height="160"></canvas><i class="zone" v-show="G.zone"></i></span><figcaption>Teardrop</figcaption></figure>
          <figure><span class="mask-box m-none"><canvas class="mask-cv" width="160" height="160"></canvas><i class="zone" v-show="G.zone"></i></span><figcaption>No mask</figcaption></figure>
        </div>
        <p class="hint">The dashed circle is the safe zone: 80% of the icon. installkite measures your artwork and scales it so its farthest visible pixel stays inside.</p>
      </section>

      <section class="pv paper-card" aria-labelledby="pv-splash">
        <h2 id="pv-splash">Splash screen</h2>
        <div class="splash-row">
          <div class="splash" :style="{ background: G.bg }"><canvas id="pv-splash-ic" width="192" height="192"></canvas><b :style="{ color: G.splashInk }" v-text="G.name || 'App'"></b></div>
          <div class="splash-note"><p>Android builds the splash screen from <code>background_color</code>, the largest icon and <code>name</code>. The title bar and status bar take <code>theme_color</code>.</p><div class="theme-bar" :style="{ background: G.theme, color: G.themeInk }"><span>9:41</span><span v-text="G.shortName || 'App'"></span></div></div>
        </div>
      </section>

      <section class="pv paper-card" aria-labelledby="pv-files">
        <h2 id="pv-files">What is in the zip</h2>
        <div class="tabs tabs-boxed tabs-sm out-tabs" role="tablist">
          <input type="radio" name="out-tabs" class="tab" aria-label="manifest.webmanifest" checked>
          <div class="tab-content" role="tabpanel"><figure class="frame frame-editor"><div class="frame-bar"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="frame-tab">${ctx.fileIcon('json')}<span>manifest.webmanifest</span></span><button type="button" class="frame-copy" v-copy-from="#gen-manifest" aria-label="Copy the manifest">${icon('copy')}<span>Copy</span></button></div><pre class="gen-code" tabindex="0"><code id="gen-manifest"></code></pre></figure></div>
          <input type="radio" name="out-tabs" class="tab" aria-label="Head tags">
          <div class="tab-content" role="tabpanel"><figure class="frame frame-editor"><div class="frame-bar"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="frame-tab">${ctx.fileIcon('html')}<span>head.html</span></span><button type="button" class="frame-copy" v-copy-from="#gen-head" aria-label="Copy the head tags">${icon('copy')}<span>Copy</span></button></div><pre class="gen-code" tabindex="0"><code id="gen-head"></code></pre></figure></div>
          <input type="radio" name="out-tabs" class="tab" aria-label="Files">
          <div class="tab-content" role="tabpanel"><ul class="zip-list" id="gen-files"><li class="hint">Add an image to see the files.</li></ul></div>
        </div>
      </section>
    </div>
  </div>
  </div>
</section>

<section class="band band-kraft">
  <div class="wrap two">
    <div>
      <p class="kicker">${icon('terminal')}Prefer the command line?</p>
      <h2>The same icons, plus a service worker</h2>
      <p class="lead">The generator gives you the manifest and icons. <code>npx installkite init</code> also writes the service worker with an offline page, injects the head tags into every page and checks the result with doctor.</p>
      <a href="docs.html" class="btn btn-outline">${icon('book')}Read the docs</a>
    </div>
    ${ctx.frames.icons}
  </div>
</section>`;
}

export function generatorJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: 'installkite PWA manifest and icon generator',
        url: `${SITE}generator.html`,
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Any (runs in the browser)',
        browserRequirements: 'Requires JavaScript and the canvas API',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        author: { '@type': 'Person', name: 'Alexandre Kohler', url: 'https://github.com/kwy404' },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'installkite', item: SITE },
          { '@type': 'ListItem', position: 2, name: 'Generator', item: `${SITE}generator.html` },
        ],
      },
    ],
  };
}
