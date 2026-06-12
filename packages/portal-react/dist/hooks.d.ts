/**
 * Portal React hooks.
 * Import from "@interchained/portal-react".
 */
import type { AppContract } from "@interchained/portal-contract";
/** Current URL pathname */
export declare function usePathname(): string;
/** Dynamic route params, e.g. { slug: "hello-world" } */
export declare function useParams<T extends Record<string, string> = Record<string, string>>(): T;
/** Parsed query string params */
export declare function useSearchParams(): URLSearchParams;
/** Programmatic navigation */
export declare function useNavigate(): (to: string, opts?: {
    replace?: boolean;
}) => void;
/** Access the app contract at runtime */
export declare function useContract(): AppContract;
/** Whether the current page matches a given route path */
export declare function useIsActive(path: string): boolean;
//# sourceMappingURL=hooks.d.ts.map