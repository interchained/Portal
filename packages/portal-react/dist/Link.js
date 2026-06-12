import { jsx as _jsx } from "react/jsx-runtime";
/**
 * <Link> — client-side navigation link.
 * Intercepts clicks, pushes to history, triggers router update.
 */
import { useCallback } from "react";
import { useNavigate, useIsActive } from "./hooks.js";
export function Link({ href, children, className, activeClassName, replace, onClick, ...rest }) {
    const navigate = useNavigate();
    const isActive = useIsActive(href);
    const handleClick = useCallback((e) => {
        // Let browser handle external links, modifier keys, download, target
        if (e.defaultPrevented ||
            e.metaKey || e.ctrlKey || e.shiftKey || e.altKey ||
            rest.target === "_blank" ||
            rest.download) {
            onClick?.(e);
            return;
        }
        // Only intercept same-origin absolute or relative paths
        if (!href.startsWith("http://") && !href.startsWith("https://")) {
            e.preventDefault();
            navigate(href, { replace });
        }
        onClick?.(e);
    }, [href, navigate, replace, onClick, rest.target, rest.download]);
    const cls = [className, isActive && activeClassName].filter(Boolean).join(" ") || undefined;
    return (_jsx("a", { href: href, className: cls, onClick: handleClick, ...rest, children: children }));
}
//# sourceMappingURL=Link.js.map