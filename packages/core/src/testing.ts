import type { AppInfo } from "@pocket-apps/vite-config";

/** App info for tests. Override single fields as necessary. */
export function testAppInfo(overrides: Partial<AppInfo> = {}): AppInfo {
  return {
    name: "demo",
    title: "Demo",
    version: "1.0",
    description: "Eine Demo-App.",
    emoji: "🧪",
    stateful: false,
    network: false,
    backLink: { href: "./index.html", label: "Alle Apps" },
    ...overrides,
  };
}
