/**
 * <Link> — client-side navigation link.
 * Intercepts clicks, pushes to history, triggers router update.
 */
import React, { type AnchorHTMLAttributes } from "react";
export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
    href: string;
    /** Extra class names applied when this link is the active route */
    activeClassName?: string;
    /** Replace history entry instead of pushing */
    replace?: boolean;
}
export declare function Link({ href, children, className, activeClassName, replace, onClick, ...rest }: LinkProps): React.ReactElement;
//# sourceMappingURL=Link.d.ts.map