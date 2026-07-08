/**
 * Server-side HTML renderer for WordPress-backed routes.
 *
 * v0 contract: WordPress HTML is preserved (sanitized, contained under
 * .wp-bridge-content) and wrapped in a clean, fast, semantic Portal document
 * with the route's earned SEO — title, description, canonical, OG, Twitter,
 * robots — applied exactly. Zero client JS required to read the page.
 */
import { sanitizeWordPressHtml } from "./sanitize.js";
import { WP_CONTENT_CSS } from "./wp-content-css.js";
function escapeHtml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
function escapeAttr(value) {
    return escapeHtml(value);
}
/**
 * Canonical policy: the WordPress origin is the backend; the Portal origin is
 * the public site. When publicOrigin is set, same-host canonicals/og URLs are
 * re-rooted onto it (path preserved exactly — authority continuity).
 */
function rerootUrl(url, publicOrigin) {
    if (!publicOrigin || !url)
        return url;
    try {
        const parsed = new URL(url);
        const target = new URL(publicOrigin);
        parsed.protocol = target.protocol;
        parsed.host = target.host;
        return parsed.toString();
    }
    catch {
        return url;
    }
}
function metaTags(route, options) {
    const seo = route.seo;
    const canonical = rerootUrl(seo.canonical, options.publicOrigin);
    const lines = [];
    lines.push(`<title>${escapeHtml(seo.title)}</title>`);
    if (seo.description) {
        lines.push(`<meta name="description" content="${escapeAttr(seo.description)}">`);
    }
    if (canonical) {
        lines.push(`<link rel="canonical" href="${escapeAttr(canonical)}">`);
    }
    if (seo.robots.length > 0) {
        lines.push(`<meta name="robots" content="${escapeAttr(seo.robots.join(", "))}">`);
    }
    const og = seo.og;
    lines.push(`<meta property="og:type" content="${route.type === "post" ? "article" : "website"}">`);
    if (og.title)
        lines.push(`<meta property="og:title" content="${escapeAttr(og.title)}">`);
    if (og.description)
        lines.push(`<meta property="og:description" content="${escapeAttr(og.description)}">`);
    if (canonical)
        lines.push(`<meta property="og:url" content="${escapeAttr(canonical)}">`);
    if (og.image)
        lines.push(`<meta property="og:image" content="${escapeAttr(og.image)}">`);
    const tw = seo.twitter;
    lines.push(`<meta name="twitter:card" content="${tw.image ? "summary_large_image" : "summary"}">`);
    if (tw.title)
        lines.push(`<meta name="twitter:title" content="${escapeAttr(tw.title)}">`);
    if (tw.description)
        lines.push(`<meta name="twitter:description" content="${escapeAttr(tw.description)}">`);
    if (tw.image)
        lines.push(`<meta name="twitter:image" content="${escapeAttr(tw.image)}">`);
    if (route.dates.published) {
        lines.push(`<meta property="article:published_time" content="${escapeAttr(route.dates.published)}">`);
    }
    if (route.dates.modified) {
        lines.push(`<meta property="article:modified_time" content="${escapeAttr(route.dates.modified)}">`);
    }
    return lines.join("\n    ");
}
function navHtml(menus) {
    const primary = menus.find((menu) => menu.locations.length > 0) ?? menus[0];
    if (!primary || primary.items.length === 0)
        return "";
    const items = primary.items
        .filter((item) => item.parentId === 0)
        .sort((a, b) => a.order - b.order)
        .map((item) => {
        const href = item.type === "internal" && item.path ? item.path : item.url;
        const external = item.type === "external";
        return `<li><a href="${escapeAttr(href)}"${external ? ` target="_blank" rel="noopener noreferrer"` : ""}>${escapeHtml(item.title)}</a></li>`;
    })
        .join("");
    return `<nav class="wp-bridge-nav" aria-label="${escapeAttr(primary.name)}"><ul>${items}</ul></nav>`;
}
const DOCUMENT_CSS = `
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body {
  margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
}
.wp-bridge-shell { padding: 0 max(5vw, 1.25rem) 4rem; }
.wp-bridge-header { padding: 1.25rem 0; display: flex; flex-wrap: wrap; gap: 1rem; align-items: baseline; justify-content: space-between; border-bottom: 1px solid rgba(127,127,127,.25); margin-bottom: 2.5rem; }
.wp-bridge-header .site-name { font-weight: 700; text-decoration: none; color: inherit; font-size: 1.05rem; letter-spacing: .01em; }
.wp-bridge-nav ul { list-style: none; display: flex; flex-wrap: wrap; gap: 1.25rem; margin: 0; padding: 0; }
.wp-bridge-nav a { text-decoration: none; color: inherit; opacity: .8; }
.wp-bridge-nav a:hover { opacity: 1; text-decoration: underline; text-underline-offset: 3px; }
.wp-bridge-title { max-width: 72ch; margin: 0 auto 1.5rem; }
.wp-bridge-title h1 { font-size: clamp(1.9rem, 4.5vw, 3rem); line-height: 1.15; margin: 0; }
.wp-bridge-footer { max-width: 72ch; margin: 4rem auto 0; padding-top: 1.25rem; border-top: 1px solid rgba(127,127,127,.25); font-size: .85rem; opacity: .65; }
`;
/** Render one WordPress-backed route as a complete HTML document. */
export function renderRouteHtml(route, site, menus, options = {}) {
    const contentHtml = options.dangerouslyTrustHtml
        ? route.content.html
        : sanitizeWordPressHtml(route.content.html);
    return `<!DOCTYPE html>
<html lang="${escapeAttr(site.language || "en")}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    ${metaTags(route, options)}
    <meta name="generator" content="Portal (wordpress-portal-bridge)">
    <style>${DOCUMENT_CSS}${WP_CONTENT_CSS}${options.extraCss ?? ""}</style>
  </head>
  <body>
    <div class="wp-bridge-shell">
      <header class="wp-bridge-header">
        <a class="site-name" href="/">${escapeHtml(site.name)}</a>
        ${navHtml(menus)}
      </header>
      <main>
        <div class="wp-bridge-title"><h1>${escapeHtml(route.title)}</h1></div>
        <article class="wp-bridge-content">${contentHtml}</article>
      </main>
      <footer class="wp-bridge-footer">${escapeHtml(site.name)}${site.description ? " — " + escapeHtml(site.description) : ""}</footer>
    </div>
  </body>
</html>`;
}
/** Render sitemap entries as an XML sitemap (Portal owns the XML). */
export function renderSitemapXml(entries, publicOrigin) {
    const urls = entries
        .map((entry) => {
        const loc = rerootUrl(entry.loc, publicOrigin);
        const lastmod = entry.lastmod ? `<lastmod>${escapeHtml(entry.lastmod)}</lastmod>` : "";
        return `  <url><loc>${escapeHtml(loc)}</loc>${lastmod}</url>`;
    })
        .join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
//# sourceMappingURL=render.js.map