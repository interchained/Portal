/**
 * <Head> — declarative document head management.
 * Sets title, description, Open Graph, and canonical URL.
 */

import { useEffect } from "react";

export interface HeadProps {
  title?: string;
  description?: string;
  /** Overrides auto-generated og:title */
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonical?: string;
  noIndex?: boolean;
}

function setMeta(name: string, content: string, property = false): void {
  const attr = property ? "property" : "name";
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(rel: string, href: string): void {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

export function Head({
  title,
  description,
  ogTitle,
  ogDescription,
  ogImage,
  canonical,
  noIndex,
}: HeadProps): null {
  useEffect(() => {
    if (title) document.title = title;
    if (description) setMeta("description", description);
    if (noIndex)     setMeta("robots", "noindex,nofollow");

    // Open Graph
    setMeta("og:title",       ogTitle ?? title ?? document.title, true);
    if (ogDescription ?? description) {
      setMeta("og:description", (ogDescription ?? description) as string, true);
    }
    if (ogImage) setMeta("og:image", ogImage, true);

    // Canonical
    if (canonical) setLink("canonical", canonical);
  }, [title, description, ogTitle, ogDescription, ogImage, canonical, noIndex]);

  return null;
}
