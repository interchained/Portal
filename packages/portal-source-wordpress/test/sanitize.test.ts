/** Sanitizer policy tests: strip active content, keep WordPress markup. */

import { test } from "node:test";
import assert from "node:assert/strict";

import { sanitizeWordPressHtml } from "../src/sanitize.js";
import { renderRouteHtml } from "../src/render.js";
import type { BridgeRoute, BridgeSite } from "../src/types.js";

test("scripts are dropped with their contents", () => {
  const out = sanitizeWordPressHtml('<p>keep</p><script>alert("x")</script><p>also keep</p>');
  assert.ok(!out.includes("<script"));
  assert.ok(!out.includes("alert"));
  assert.ok(out.includes("<p>keep</p>"));
  assert.ok(out.includes("<p>also keep</p>"));
});

test("iframes, forms, and style blocks are dropped", () => {
  const out = sanitizeWordPressHtml(
    '<iframe src="https://evil.test"></iframe><form action="/x"><input></form><style>body{}</style><p>ok</p>'
  );
  assert.ok(!out.includes("<iframe"));
  assert.ok(!out.includes("<form"));
  assert.ok(!out.includes("<input"));
  assert.ok(!out.includes("<style"));
  assert.ok(out.includes("<p>ok</p>"));
});

test("on* handlers are stripped, element survives", () => {
  const out = sanitizeWordPressHtml('<img src="/a.jpg" onerror="alert(1)" alt="a"><a href="/x" onclick="p()">x</a>');
  assert.ok(!/onerror/i.test(out));
  assert.ok(!/onclick/i.test(out));
  assert.ok(out.includes('src="/a.jpg"'));
  assert.ok(out.includes('href="/x"'));
});

test("javascript: URLs are neutralized", () => {
  const out = sanitizeWordPressHtml('<a href="javascript:alert(1)">x</a><a href="JaVaScRiPt:alert(2)">y</a>');
  assert.ok(!/javascript:/i.test(out));
  assert.ok(out.includes('href="#"'));
});

test("WordPress/Gutenberg markup is preserved", () => {
  const html =
    '<figure class="wp-block-image size-full alignwide"><img src="/up/1.jpg" class="wp-image-42" alt=""><figcaption>Cap</figcaption></figure>' +
    '<div class="wp-block-columns"><div class="wp-block-column"><p class="has-text-align-center">A</p></div></div>' +
    '<blockquote class="wp-block-quote"><p>Q</p></blockquote>';
  const out = sanitizeWordPressHtml(html);
  assert.ok(out.includes("wp-block-image"));
  assert.ok(out.includes("wp-image-42"));
  assert.ok(out.includes("wp-block-columns"));
  assert.ok(out.includes("has-text-align-center"));
  assert.ok(out.includes("wp-block-quote"));
  assert.ok(out.includes("<figcaption>Cap</figcaption>"));
});

test("inert style attributes survive, url() styles are dropped", () => {
  const out = sanitizeWordPressHtml(
    '<p style="text-align:center">a</p><div style="background:url(javascript:x)">b</div>'
  );
  assert.ok(out.includes('style="text-align:center"'));
  assert.ok(!out.includes("url("));
});

test("renderRouteHtml escapes SEO fields and applies canonical + robots", () => {
  const route = {
    id: "wp:page:1",
    source: "wordpress",
    type: "page",
    path: "/about/",
    status: "publish",
    title: 'About <"us">',
    slug: "about",
    content: { html: "<p>Body</p>", text: "Body", blocks: [] },
    seo: {
      title: 'About & "Everything"',
      description: "Desc <script>",
      canonical: "http://cms.internal/about/",
      og: { title: "OG", description: "", image: "" },
      twitter: { title: "", description: "", image: "" },
      robots: ["noindex"],
      source: "fallback",
      schemaCandidates: ["WebPage"],
    },
    media: { featuredImage: {}, images: [] },
    taxonomies: [],
    author: {},
    dates: { published: "", modified: "" },
    links: { internal: [], external: [] },
    authority: { preservePath: true, score: 0, notes: [] },
  } as unknown as BridgeRoute;

  const site = {
    name: "Site",
    description: "",
    language: "en-US",
  } as unknown as BridgeSite;

  const html = renderRouteHtml(route, site, [], { publicOrigin: "https://public.example" });
  assert.ok(html.includes("<title>About &amp; &quot;Everything&quot;</title>"));
  assert.ok(html.includes('content="Desc &lt;script&gt;"'));
  // Canonical re-rooted onto the public origin, path preserved.
  assert.ok(html.includes('<link rel="canonical" href="https://public.example/about/">'));
  assert.ok(html.includes('<meta name="robots" content="noindex">'));
  assert.ok(html.includes("<p>Body</p>"));
});
