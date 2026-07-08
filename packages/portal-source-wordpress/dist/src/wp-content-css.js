/**
 * Minimal WordPress/Gutenberg content compatibility stylesheet.
 *
 * Not a theme clone — just enough that imported WP HTML reads cleanly inside
 * Portal layouts: alignment classes, images, galleries, columns, captions,
 * quotes, tables, buttons. Scoped under .wp-bridge-content so it can never
 * bleed into the host app.
 */
export const WP_CONTENT_CSS = `
.wp-bridge-content { max-width: 72ch; margin-inline: auto; line-height: 1.65; }
.wp-bridge-content > * + * { margin-block-start: 1em; }
.wp-bridge-content h1, .wp-bridge-content h2, .wp-bridge-content h3,
.wp-bridge-content h4, .wp-bridge-content h5 { line-height: 1.25; margin-block-start: 1.6em; }
.wp-bridge-content img { max-width: 100%; height: auto; }
.wp-bridge-content a { text-underline-offset: 2px; }

/* Alignment */
.wp-bridge-content .alignwide { margin-inline: calc(50% - min(50vw, 42rem)); max-width: none; }
.wp-bridge-content .alignfull { margin-inline: calc(50% - 50vw); max-width: 100vw; }
.wp-bridge-content .alignleft { float: left; margin: 0.5em 1.5em 1em 0; max-width: 50%; }
.wp-bridge-content .alignright { float: right; margin: 0.5em 0 1em 1.5em; max-width: 50%; }
.wp-bridge-content .aligncenter { display: block; margin-inline: auto; text-align: center; }
.wp-bridge-content .has-text-align-center { text-align: center; }
.wp-bridge-content .has-text-align-right { text-align: right; }
.wp-bridge-content .has-text-align-left { text-align: left; }

/* Images, figures, captions */
.wp-bridge-content .wp-block-image, .wp-bridge-content figure { margin: 1.5em 0; }
.wp-bridge-content .wp-block-image img, .wp-bridge-content .size-full img { display: block; }
.wp-bridge-content .wp-caption, .wp-bridge-content figcaption,
.wp-bridge-content .wp-caption-text, .wp-bridge-content .wp-element-caption {
  font-size: 0.85em; opacity: 0.75; text-align: center; margin-top: 0.5em;
}

/* Galleries */
.wp-bridge-content .wp-block-gallery, .wp-bridge-content .gallery {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75em;
}
.wp-bridge-content .wp-block-gallery figure { margin: 0; }

/* Columns */
.wp-bridge-content .wp-block-columns { display: flex; flex-wrap: wrap; gap: 1.5em; }
.wp-bridge-content .wp-block-column { flex: 1 1 18rem; min-width: 0; }

/* Media & text */
.wp-bridge-content .wp-block-media-text {
  display: grid; grid-template-columns: 1fr 1fr; gap: 1.5em; align-items: center;
}
@media (max-width: 640px) {
  .wp-bridge-content .wp-block-media-text { grid-template-columns: 1fr; }
}

/* Quotes, code, tables, separators */
.wp-bridge-content blockquote, .wp-bridge-content .wp-block-quote {
  border-inline-start: 3px solid currentColor; padding-inline-start: 1em; opacity: 0.9; font-style: italic;
}
.wp-bridge-content pre, .wp-bridge-content .wp-block-code {
  overflow-x: auto; padding: 1em; border-radius: 6px; background: rgba(127, 127, 127, 0.12);
}
.wp-bridge-content table { border-collapse: collapse; width: 100%; }
.wp-bridge-content th, .wp-bridge-content td {
  border: 1px solid rgba(127, 127, 127, 0.35); padding: 0.5em 0.75em; text-align: left;
}
.wp-bridge-content hr, .wp-bridge-content .wp-block-separator {
  border: 0; border-top: 1px solid rgba(127, 127, 127, 0.35); margin: 2em auto; max-width: 8rem;
}

/* Buttons */
.wp-bridge-content .wp-block-button__link, .wp-bridge-content .wp-block-button a {
  display: inline-block; padding: 0.6em 1.4em; border-radius: 999px;
  background: currentColor; text-decoration: none;
}
.wp-bridge-content .wp-block-button__link { color: inherit; }
.wp-bridge-content .wp-block-buttons { display: flex; flex-wrap: wrap; gap: 0.75em; }

/* Lists & embeds */
.wp-bridge-content ul, .wp-bridge-content ol { padding-inline-start: 1.4em; }
.wp-bridge-content .wp-block-embed { margin: 1.5em 0; }

/* Clearfix for floated aligns */
.wp-bridge-content::after { content: ""; display: table; clear: both; }
`;
//# sourceMappingURL=wp-content-css.js.map