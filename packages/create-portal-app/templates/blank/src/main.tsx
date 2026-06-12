import React from "react";
import { createRoot } from "react-dom/client";
import { PortalProvider } from "@interchained/portal-react";
import { routes } from "@portal/routes";
import contract from "../app.contract";
import "./index.css";

const root = document.getElementById("root")!;
createRoot(root).render(
  <React.StrictMode>
    <PortalProvider routes={routes} contract={contract} />
  </React.StrictMode>
);
