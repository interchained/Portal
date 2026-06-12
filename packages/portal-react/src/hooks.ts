/**
 * Portal React hooks.
 * Import from "@interchained/portal-react".
 */

import { useContext, useCallback } from "react";
import { RouterContext, type RouterContextValue } from "./Router.js";
import { ContractContext } from "./PortalProvider.js";
import type { AppContract } from "@interchained/portal-contract";

// ── Router hooks ──────────────────────────────────────────────────────────────

function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("useRouter must be used inside <PortalProvider>");
  return ctx;
}

/** Current URL pathname */
export function usePathname(): string {
  return useRouter().pathname;
}

/** Dynamic route params, e.g. { slug: "hello-world" } */
export function useParams<T extends Record<string, string> = Record<string, string>>(): T {
  return useRouter().params as T;
}

/** Parsed query string params */
export function useSearchParams(): URLSearchParams {
  return useRouter().searchParams;
}

/** Programmatic navigation */
export function useNavigate(): (to: string, opts?: { replace?: boolean }) => void {
  const { navigate } = useRouter();
  return navigate;
}

// ── Contract hook ─────────────────────────────────────────────────────────────

/** Access the app contract at runtime */
export function useContract(): AppContract {
  const contract = useContext(ContractContext);
  if (!contract) throw new Error("useContract must be used inside <PortalProvider>");
  return contract;
}

/** Whether the current page matches a given route path */
export function useIsActive(path: string): boolean {
  const { pathname } = useRouter();
  return pathname === path || (path !== "/" && pathname.startsWith(path + "/"));
}
