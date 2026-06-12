/**
 * Portal React hooks.
 * Import from "@interchained/portal-react".
 */
import { useContext } from "react";
import { RouterContext } from "./Router.js";
import { ContractContext } from "./PortalProvider.js";
// ── Router hooks ──────────────────────────────────────────────────────────────
function useRouter() {
    const ctx = useContext(RouterContext);
    if (!ctx)
        throw new Error("useRouter must be used inside <PortalProvider>");
    return ctx;
}
/** Current URL pathname */
export function usePathname() {
    return useRouter().pathname;
}
/** Dynamic route params, e.g. { slug: "hello-world" } */
export function useParams() {
    return useRouter().params;
}
/** Parsed query string params */
export function useSearchParams() {
    return useRouter().searchParams;
}
/** Programmatic navigation */
export function useNavigate() {
    const { navigate } = useRouter();
    return navigate;
}
// ── Contract hook ─────────────────────────────────────────────────────────────
/** Access the app contract at runtime */
export function useContract() {
    const contract = useContext(ContractContext);
    if (!contract)
        throw new Error("useContract must be used inside <PortalProvider>");
    return contract;
}
/** Whether the current page matches a given route path */
export function useIsActive(path) {
    const { pathname } = useRouter();
    return pathname === path || (path !== "/" && pathname.startsWith(path + "/"));
}
//# sourceMappingURL=hooks.js.map