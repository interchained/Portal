/**
 * <PortalProvider> — top-level app wrapper.
 * Provides the Router, app contract context, and any global integrations.
 */

import React, { createContext, type ReactNode } from "react";
import { Router, type RouteDefinition } from "./Router.js";
import type { AppContract } from "@interchained/portal-contract";

export const ContractContext = createContext<AppContract | null>(null);

export interface PortalProviderProps {
  routes: RouteDefinition[];
  contract?: AppContract;
  notFound?: React.ComponentType;
  children?: ReactNode;
}

export function PortalProvider({
  routes,
  contract,
  notFound,
  children,
}: PortalProviderProps): React.ReactElement {
  const defaultContract: AppContract = contract ?? { name: "Portal App", goals: [] };

  return (
    <ContractContext.Provider value={defaultContract}>
      <Router routes={routes} notFound={notFound}>
        {children}
      </Router>
    </ContractContext.Provider>
  );
}
