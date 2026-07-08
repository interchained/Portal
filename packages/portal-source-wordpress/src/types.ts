/**
 * portal.wp.source.v1 — the WordPress content contract types.
 *
 * Mirrors the payloads produced by the wp-portal-bridge plugin. WordPress
 * owns content editing; these shapes are what crosses the signed tunnel.
 */

export interface BridgeSeoImageSet {
  title: string;
  description: string;
  image: string;
}

export interface BridgeSeo {
  title: string;
  description: string;
  canonical: string;
  og: BridgeSeoImageSet;
  twitter: BridgeSeoImageSet;
  robots: string[];
  source: "yoast" | "rank-math" | "aioseo" | "fallback" | string;
  schemaCandidates: string[];
}

export interface BridgeAsset {
  id: number;
  url: string;
  path: string;
  mime: string;
  width: number | null;
  height: number | null;
  alt: string;
  title: string;
  caption: string;
}

export interface BridgeRouteTaxonomy {
  taxonomy: string;
  id: number;
  slug: string;
  name: string;
  path: string;
}

export interface BridgeAuthor {
  id?: number;
  name?: string;
  slug?: string;
  path?: string;
  avatar?: string;
}

export interface BridgeRoute {
  id: string;
  source: "wordpress";
  type: string;
  path: string;
  status: "publish";
  title: string;
  slug: string;
  content: {
    html: string;
    text: string;
    blocks: unknown[];
  };
  seo: BridgeSeo;
  media: {
    featuredImage: BridgeAsset | Record<string, never>;
    images: BridgeAsset[];
  };
  taxonomies: BridgeRouteTaxonomy[];
  author: BridgeAuthor;
  dates: {
    published: string;
    modified: string;
  };
  links: {
    internal: string[];
    external: string[];
  };
  authority: {
    preservePath: boolean;
    score: number;
    notes: string[];
  };
}

export interface BridgeMenuItem {
  id: number;
  title: string;
  url: string;
  path: string;
  type: "internal" | "external";
  objectType: string;
  objectId: number;
  parentId: number;
  order: number;
  target: string;
  classes: string;
}

export interface BridgeMenu {
  id: number;
  slug: string;
  name: string;
  locations: string[];
  items: BridgeMenuItem[];
}

export interface BridgeTaxonomyTerm {
  id: number;
  slug: string;
  name: string;
  description: string;
  parentId: number;
  count: number;
  path: string;
}

export interface BridgeTaxonomy {
  taxonomy: string;
  label: string;
  hierarchical: boolean;
  postTypes: string[];
  terms: BridgeTaxonomyTerm[];
}

export interface BridgeSitemapEntry {
  loc: string;
  path: string;
  lastmod: string;
  type: string;
}

export interface BridgeSite {
  schemaVersion: string;
  name: string;
  description: string;
  homeUrl: string;
  siteUrl: string;
  restUrl: string;
  language: string;
  timezone: string;
  permalinks: { structure: string; pretty: boolean };
  frontPage: {
    mode: "static_page" | "latest_posts";
    pageId: number | null;
    blogId: number | null;
  };
  source: {
    type: "wordpress";
    wpVersion: string;
    phpVersion: string;
    seoPlugins: Array<{ id: string; name: string; version: string }>;
  };
  generator: { name: string; version: string };
  content: { version: number; lastChangedAt: string; dirty: boolean };
}

export interface BridgeHealth {
  ok: boolean;
  plugin: string;
  version: string;
  schemaVersion: string;
  signingVersion: string;
  wpVersion: string;
  phpVersion: string;
  time: number;
  security: {
    signedOnly: boolean;
    devMode: boolean;
    signResponses: boolean;
    skewSeconds: number;
    keys: {
      currentId: string | null;
      previousId: string | null;
      graceUntil: number | null;
    };
  };
  content: { version: number; lastChangedAt: string; dirty: boolean };
  lastConnection: { time: number; keyId: string } | null;
}

export interface BridgeSnapshot {
  schemaVersion: string;
  snapshotId: string;
  contentHash: string;
  routeCount: number;
  generatedAt: string;
  generator: { name: string; version: string };
  site: BridgeSite;
  source: {
    type: "wordpress";
    homeUrl: string;
    wpVersion: string;
    seoPlugins: string[];
  };
  routes: BridgeRoute[];
  menus: BridgeMenu[];
  taxonomies: BridgeTaxonomy[];
  assets: BridgeAsset[];
  redirects: unknown[];
  chunk?: { page: number; perPage: number; totalPages: number };
}

export interface PagedMeta {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface BridgeRoutesPage {
  routes: BridgeRoute[];
  meta: PagedMeta;
}

export interface BridgeAssetsPage {
  assets: BridgeAsset[];
  meta: PagedMeta;
}

export interface BridgeSitemap {
  entries: BridgeSitemapEntry[];
  meta: { total: number; generatedAt: string };
}

export type BridgeMode = "live" | "snapshot-first";

export interface StoredSnapshot {
  snapshot: BridgeSnapshot;
  fetchedAt: number;
}

/** Pluggable last-good snapshot persistence. File-backed by default; the
 *  NEDB-backed store is the first-class choice wherever nedbd runs. */
export interface SnapshotStore {
  load(): Promise<StoredSnapshot | null>;
  save(stored: StoredSnapshot): Promise<void>;
}
