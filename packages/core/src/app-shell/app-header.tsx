import type { AppInfo } from "@pocket-apps/vite-config";
import { Button } from "@pocket-apps/ui/components/button";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "./theme-toggle.tsx";

/** The top bar of every app: back link, title, version and theme switch. It holds the page's only <h1>. */
export function AppHeader({ app }: { app: AppInfo }) {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-3xl items-center gap-2 p-2">
        {app.backLink && (
          <Button asChild variant="ghost" size="sm">
            <a href={app.backLink.href}>
              <ArrowLeft data-icon="inline-start" />
              {app.backLink.label}
            </a>
          </Button>
        )}
        <div className="mr-auto flex min-w-0 items-baseline gap-2">
          <h1 className="truncate text-lg font-semibold">{app.title}</h1>
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            <span className="sr-only">Version </span>
            {app.version}
          </span>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
