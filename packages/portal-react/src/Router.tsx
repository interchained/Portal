/**
 * Portal client-side router.
 * Lightweight, no external dependencies.
 */

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface RouteDefinition {
  path: string;
  component: React.ComponentType;
  params: string[];
  dynamic: boolean;
}

export interface RouterContextValue {
  pathname: string;
  params: Record<string, string>;
  searchParams: URLSearchParams;
  navigate: (to: string, opts?: { replace?: boolean }) => void;
}

export const RouterContext = createContext<RouterContextValue | null>(null);

// ── Route matching ─────────────────────────────────────────────────────────────

function matchRoute(
  routes: RouteDefinition[],
  pathname: string
): { route: RouteDefinition; params: Record<string, string> } | null {
  for (const route of routes) {
    if (!route.dynamic) {
      if (route.path === pathname) return { route, params: {} };
      continue;
    }
    const paramNames = route.params;
    const pattern = route.path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, "([^/]+)");
    const regex = new RegExp("^" + pattern + "$");
    const match = pathname.match(regex);
    if (match) {
      const params: Record<string, string> = {};
      paramNames.forEach((name, i) => {
        params[name] = decodeURIComponent(match[i + 1] ?? "");
      });
      return { route, params };
    }
  }
  return null;
}

// ── Router component ──────────────────────────────────────────────────────────

export interface RouterProps {
  routes: RouteDefinition[];
  notFound?: React.ComponentType;
  children?: React.ReactNode;
}

export function Router({ routes, notFound: NotFound, children }: RouterProps): React.ReactElement {
  const [location, setLocation] = useState(() => ({
    pathname: window.location.pathname,
    search: window.location.search,
  }));

  useEffect(() => {
    const onPop = () =>
      setLocation({ pathname: window.location.pathname, search: window.location.search });
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((to: string, opts?: { replace?: boolean }) => {
    if (opts?.replace) {
      window.history.replaceState(null, "", to);
    } else {
      window.history.pushState(null, "", to);
    }
    const url = new URL(to, window.location.origin);
    setLocation({ pathname: url.pathname, search: url.search });
  }, []);

  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  const match = matchRoute(routes, location.pathname);

  const contextValue: RouterContextValue = {
    pathname: location.pathname,
    params: match?.params ?? {},
    searchParams,
    navigate,
  };

  const PageComponent = match?.route.component;

  return (
    <RouterContext.Provider value={contextValue}>
      {children}
      {PageComponent ? <PageComponent /> : NotFound ? <NotFound /> : <DefaultNotFound />}
    </RouterContext.Provider>
  );
}

function DefaultNotFound(): React.ReactElement {
  return (
    <div style={{ padding: "4rem", textAlign: "center", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: "4rem", margin: 0 }}>404</h1>
      <p style={{ color: "#666" }}>Page not found.</p>
      <a href="/" style={{ color: "inherit" }}>← Go home</a>
    </div>
  );
}
