/**
 * <PortalProvider> — top-level app wrapper.
 * Provides the Router, app contract context, and any global integrations.
 */
import React, { type ReactNode } from "react";
import { type RouteDefinition } from "./Router.js";
import type { AppContract } from "@interchained/portal-contract";
export declare const ContractContext: React.Context<AppContract | null>;
export interface PortalProviderProps {
    routes: RouteDefinition[];
    contract?: AppContract;
    notFound?: React.ComponentType;
    children?: ReactNode;
}
export declare function PortalProvider({ routes, contract, notFound, children, }: PortalProviderProps): React.ReactElement;
//# sourceMappingURL=PortalProvider.d.ts.map