/**
 * <Link> — client-side navigation link.
 * Intercepts clicks, pushes to history, triggers router update.
 */

import React, { useCallback, type AnchorHTMLAttributes } from "react";
import { useNavigate, useIsActive } from "./hooks.js";

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  /** Extra class names applied when this link is the active route */
  activeClassName?: string;
  /** Replace history entry instead of pushing */
  replace?: boolean;
}

export function Link({
  href,
  children,
  className,
  activeClassName,
  replace,
  onClick,
  ...rest
}: LinkProps): React.ReactElement {
  const navigate = useNavigate();
  const isActive  = useIsActive(href);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      // Let browser handle external links, modifier keys, download, target
      if (
        e.defaultPrevented ||
        e.metaKey || e.ctrlKey || e.shiftKey || e.altKey ||
        rest.target === "_blank" ||
        rest.download
      ) {
        onClick?.(e);
        return;
      }

      // Only intercept same-origin absolute or relative paths
      if (!href.startsWith("http://") && !href.startsWith("https://")) {
        e.preventDefault();
        navigate(href, { replace });
      }

      onClick?.(e);
    },
    [href, navigate, replace, onClick, rest.target, rest.download]
  );

  const cls = [className, isActive && activeClassName].filter(Boolean).join(" ") || undefined;

  return (
    <a href={href} className={cls} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
