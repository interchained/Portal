/**
 * Portal client-side router.
 * Lightweight, no external dependencies.
 */
import React from "react";
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
    navigate: (to: string, opts?: {
        replace?: boolean;
    }) => void;
}
export declare const RouterContext: React.Context<RouterContextValue | null>;
export interface RouterProps {
    routes: RouteDefinition[];
    notFound?: React.ComponentType;
    children?: React.ReactNode;
}
export declare function Router({ routes, notFound: NotFound, children }: RouterProps): React.ReactElement;
//# sourceMappingURL=Router.d.ts.map