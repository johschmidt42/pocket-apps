import { createAppConfig } from "@pocket-apps/vite-config";

// The launcher is not installable: its scope would hold all apps. Each app installs on its own.
export default createAppConfig(import.meta.url, { withAppList: true, installable: false });
