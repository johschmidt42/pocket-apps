import type { AppInfo } from "@pocket-apps/vite-config";
import { Badge } from "@pocket-apps/ui/components/badge";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@pocket-apps/ui/components/card";
import { Button } from "@pocket-apps/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@pocket-apps/ui/components/tooltip";
import { Globe, Save, SaveOff, Star, WifiOff, type LucideIcon } from "lucide-react";
import { favoriteButtonId } from "./favorites.ts";

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

export type AppCardProps = {
  app: AppInfo;
  /** The heading level of the app title. Use `h3` inside a section with an `h2`. */
  heading: "h2" | "h3";
  /** Shows the favorite button. Leave it out when the launcher cannot save. */
  favorite?: { active: boolean; onToggle: () => void };
};

/** The button that adds the app to the favorites or removes it. */
function FavoriteButton({
  app,
  active,
  onToggle,
}: { app: AppInfo } & NonNullable<AppCardProps["favorite"]>) {
  const label = active
    ? `${app.title} aus Favoriten entfernen`
    : `${app.title} zu Favoriten hinzufügen`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          id={favoriteButtonId(app.name)}
          size="icon-sm"
          variant="ghost"
          aria-label={label}
          className="absolute top-3 right-3"
          onClick={onToggle}
        >
          <Star className={active ? "fill-current" : undefined} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * One app on the launcher. The whole card is a link to the app file.
 * The favorite button lies on top of the card, outside the link.
 */
export function AppCard({ app, heading: Heading, favorite }: AppCardProps) {
  return (
    <div className="relative h-full">
      <a
        href={`./${app.name}.html`}
        aria-label={app.title}
        className="group block rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Card className="h-full transition-colors group-hover:bg-muted/50">
          <CardHeader
            className={favorite ? "flex items-start gap-3 pr-12" : "flex items-start gap-3"}
          >
            <span
              aria-hidden="true"
              className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted text-2xl"
            >
              {app.emoji}
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <CardTitle>
                <Heading>{app.title}</Heading>
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
      {favorite && <FavoriteButton app={app} {...favorite} />}
    </div>
  );
}
