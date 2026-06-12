import { jsx as _jsx } from "react/jsx-runtime";
/**
 * <PortalProvider> — top-level app wrapper.
 * Provides the Router, app contract context, and any global integrations.
 */
import { createContext } from "react";
import { Router } from "./Router.js";
export const ContractContext = createContext(null);
export function PortalProvider({ routes, contract, notFound, children, }) {
    const defaultContract = contract ?? { name: "Portal App", goals: [] };
    return (_jsx(ContractContext.Provider, { value: defaultContract, children: _jsx(Router, { routes: routes, notFound: notFound, children: children }) }));
}
//# sourceMappingURL=PortalProvider.js.map