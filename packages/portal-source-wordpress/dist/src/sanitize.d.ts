/**
 * Conservative, dependency-free HTML sanitizer for WordPress content.
 *
 * v0 policy: preserve the markup WordPress legitimately produces (headings,
 * lists, tables, figures, embeds' noscript fallbacks, Gutenberg wrapper divs
 * with their classes) while removing active content entirely:
 *
 *   - <script>, <iframe>, <object>, <embed>, <form> and friends are dropped
 *     with their contents
 *   - every on* event attribute is dropped
 *   - javascript:/data:text URLs are neutralized
 *   - style attributes are kept only when they contain no url() or expression()
 *
 * This is containment for server-rendered public pages, not a general XSS
 * library. WordPress admins are semi-trusted authors; the sanitizer's job is
 * to stop stored markup from becoming active code inside Portal's origin.
 */
export declare function sanitizeWordPressHtml(html: string): string;
//# sourceMappingURL=sanitize.d.ts.map