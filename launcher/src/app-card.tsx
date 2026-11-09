import type { AppInfo } from "@pocket-apps/vite-config";
import { Badge } from "@pocket-apps/ui/components/badge";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@pocket-apps/ui/components/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@pocket-apps/ui/components/tooltip";
import { Globe, Save, SaveOff, WifiOff, type LucideIcon } from "lucide-react";

/** An icon with a tooltip. Screen readers read the label. */
function LabelIcon({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span role="img" aria-label={label} className="text-muted-foreground">
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

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
        <CardFooter className="mt-auto items-center gap-3">
          <Badge variant="secondary">
            <span className="sr-only">Version </span>
            {app.version}
          </Badge>
          <LabelIcon
            icon={app.stateful ? Save : SaveOff}
            label={
              app.stateful ? "Speichert Daten in einer eigenen Datei" : "Speichert keine Daten"
            }
          />
          <LabelIcon
            icon={app.network ? Globe : WifiOff}
            label={app.network ? "Nutzt Online-Dienste" : "Nutzt keine Online-Dienste"}
          />
        </CardFooter>
      </Card>
    </a>
  );
}
