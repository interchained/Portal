/**
 * <Head> — declarative document head management.
 * Sets title, description, Open Graph, and canonical URL.
 */
import { useEffect } from "react";
function setMeta(name, content, property = false) {
    const attr = property ? "property" : "name";
    let el = document.querySelector(`meta[${attr}="${name}"]`);
    if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
    }
    el.setAttribute("content", content);
}
function setLink(rel, href) {
    let el = document.querySelector(`link[rel="${rel}"]`);
    if (!el) {
        el = document.createElement("link");
        el.rel = rel;
        document.head.appendChild(el);
    }
    el.href = href;
}
export function Head({ title, description, ogTitle, ogDescription, ogImage, canonical, noIndex, }) {
    useEffect(() => {
        if (title)
            document.title = title;
        if (description)
            setMeta("description", description);
        if (noIndex)
            setMeta("robots", "noindex,nofollow");
        // Open Graph
        setMeta("og:title", ogTitle ?? title ?? document.title, true);
        if (ogDescription ?? description) {
            setMeta("og:description", (ogDescription ?? description), true);
        }
        if (ogImage)
            setMeta("og:image", ogImage, true);
        // Canonical
        if (canonical)
            setLink("canonical", canonical);
    }, [title, description, ogTitle, ogDescription, ogImage, canonical, noIndex]);
    return null;
}
//# sourceMappingURL=Head.js.map