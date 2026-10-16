// installkite Node API. The CLI is built on these functions; use them to
// script your own pipeline or to generate files from a build tool.
export { VERSION } from './version.js';

export { decodePng, encodePng, readPngSize, isPng, createImage, crc32, type RGBAImage } from './core/png.js';
export { resize, composite, flatten, contentBounds, contentRadius, cornerColor, dominantColor, isOpaque } from './core/image.js';
export { rasterizeSvg, svgSize, parsePath, parseTransform, type RasterizeOptions, type RasterizeResult } from './core/svg.js';
export { encodeIco, readIcoSizes } from './core/ico.js';
export { parseColor, toHex, contrast, luminance } from './core/color.js';
export {
  ICON_SIZES,
  MASKABLE_SIZES,
  FAVICON_SIZES,
  APPLE_TOUCH_SIZE,
  SAFE_ZONE_RADIUS,
  loadIconSource,
  renderSource,
  analyzeSource,
  generateIcons,
  maskableScale,
  maskablePadding,
  inSafeZone,
  placeholderScreenshot,
  type IconFile,
  type IconOptions,
  type IconSource,
} from './core/icons.js';
export { monogramSvg, initials } from './core/monogram.js';
export {
  generateManifest,
  manifestIcons,
  manifestScreenshots,
  shortNameFrom,
  stringifyManifest,
  DISPLAY_MODES,
  type WebAppManifest,
  type ManifestOptions,
  type ManifestIcon,
  type ManifestShortcut,
  type ManifestScreenshot,
  type Display,
} from './core/manifest.js';
export { headTags, injectHead, removeHead, hasBlock, relativePrefix, MARK_START, MARK_END, type HeadOptions, type InjectResult } from './core/inject.js';
export { diffLines, unifiedDiff } from './core/diff.js';
export { buildPrecache, precacheVersion, revisionOf, pathToUrl, DEFAULT_INCLUDE, DEFAULT_EXCLUDE, type PrecacheEntry, type PrecacheOptions } from './core/precache.js';
export { generateServiceWorker, readSwSettings, swSettings, type ServiceWorkerOptions } from './core/sw.js';
export { createRouter, classify, pageCandidates, isExcluded, cacheNames, DEFAULT_SW_CONFIG, type SwConfig, type SwEnv, type Router, type Route } from './sw/router.js';
export { generateOfflinePage, type OfflinePageOptions } from './core/offline.js';
export { scanSite, readPageMeta, detectFramework, detectBase, normalizeBase, type ScanResult, type Framework, type Host } from './core/scan.js';
export { readConfig, validateConfig, stringifyConfig, CONFIG_FILE, type InstallkiteConfig } from './core/config.js';
export { planInit, planBuild, planIcons, applyPlan, expandHtml, CDN_RUNTIME, type InitAnswers, type InitPlan, type PlannedFile, type BuildResult } from './core/project.js';
export { runDoctor, doctorLocal, doctorRemote, localLoader, remoteLoader, findServiceWorker, withinScope, normalizeSiteUrl, type Check, type DoctorReport, type Loader, type Resource, type Status } from './core/doctor.js';
export { run } from './cli/main.js';
