import "@pocket-apps/ui/globals.css";
import { StrictMode, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { listenForInstall } from "./install.ts";
import { initTheme } from "./theme.ts";

/**
 * Starts an app: loads the styles, applies the saved theme, listens for the install events of the
 * browser and renders the app into #root. Call it once in the app's main.tsx.
 */
export function mountApp(App: ComponentType): void {
  const root = document.getElementById("root");
  if (!root) throw new Error("Element #root is missing in index.html.");

  initTheme();
  listenForInstall();
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
