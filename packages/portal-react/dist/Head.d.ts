/**
 * <Head> — declarative document head management.
 * Sets title, description, Open Graph, and canonical URL.
 */
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
export declare function Head({ title, description, ogTitle, ogDescription, ogImage, canonical, noIndex, }: HeadProps): null;
//# sourceMappingURL=Head.d.ts.map