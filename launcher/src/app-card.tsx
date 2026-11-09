import type { AppInfo } from "@pocket-apps/vite-config";
import { Badge } from "@pocket-apps/ui/components/badge";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@pocket-apps/ui/components/card";
import { Globe, WifiOff } from "lucide-react";

/** One app on the launcher. The whole card is a link to the app file. */
export function AppCard({ app }: { app: AppInfo }) {
  return (
    <a
      href={`./${app.name}.html`}
      aria-label={app.title}
      className="group block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Card className="h-full transition-colors group-hover:bg-muted/50">
        <CardHeader className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted text-2xl"
          >
            {app.emoji}
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle>
              <h2>{app.title}</h2>
            </CardTitle>
            <CardDescription>{app.description}</CardDescription>
          </div>
        </CardHeader>
        <CardFooter className="mt-auto flex-wrap gap-2">
          <Badge variant="secondary">Version {app.version}</Badge>
          <Badge variant="outline">{app.stateful ? "Mit Datendatei" : "Ohne Daten"}</Badge>
          <Badge variant="outline">
            {app.network ? (
              <Globe data-icon="inline-start" />
            ) : (
              <WifiOff data-icon="inline-start" />
            )}
            {app.network ? "Braucht Internet" : "Offline"}
          </Badge>
        </CardFooter>
      </Card>
    </a>
  );
}
