import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Portal client-side router.
 * Lightweight, no external dependencies.
 */
import { createContext, useCallback, useEffect, useMemo, useState, } from "react";
export const RouterContext = createContext(null);
// ── Route matching ─────────────────────────────────────────────────────────────
function matchRoute(routes, pathname) {
    for (const route of routes) {
        if (!route.dynamic) {
            if (route.path === pathname)
                return { route, params: {} };
            continue;
        }
        const paramNames = route.params;
        const pattern = route.path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, "([^/]+)");
        const regex = new RegExp("^" + pattern + "$");
        const match = pathname.match(regex);
        if (match) {
            const params = {};
            paramNames.forEach((name, i) => {
                params[name] = decodeURIComponent(match[i + 1] ?? "");
            });
            return { route, params };
        }
    }
    return null;
}
export function Router({ routes, notFound: NotFound, children }) {
    const [location, setLocation] = useState(() => ({
        pathname: window.location.pathname,
        search: window.location.search,
    }));
    useEffect(() => {
        const onPop = () => setLocation({ pathname: window.location.pathname, search: window.location.search });
        window.addEventListener("popstate", onPop);
        return () => window.removeEventListener("popstate", onPop);
    }, []);
    const navigate = useCallback((to, opts) => {
        if (opts?.replace) {
            window.history.replaceState(null, "", to);
        }
        else {
            window.history.pushState(null, "", to);
        }
        const url = new URL(to, window.location.origin);
        setLocation({ pathname: url.pathname, search: url.search });
    }, []);
    const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const match = matchRoute(routes, location.pathname);
    const contextValue = {
        pathname: location.pathname,
        params: match?.params ?? {},
        searchParams,
        navigate,
    };
    const PageComponent = match?.route.component;
    return (_jsxs(RouterContext.Provider, { value: contextValue, children: [children, PageComponent ? _jsx(PageComponent, {}) : NotFound ? _jsx(NotFound, {}) : _jsx(DefaultNotFound, {})] }));
}
function DefaultNotFound() {
    return (_jsxs("div", { style: { padding: "4rem", textAlign: "center", fontFamily: "system-ui" }, children: [_jsx("h1", { style: { fontSize: "4rem", margin: 0 }, children: "404" }), _jsx("p", { style: { color: "#666" }, children: "Page not found." }), _jsx("a", { href: "/", style: { color: "inherit" }, children: "\u2190 Go home" })] }));
}
//# sourceMappingURL=Router.js.map