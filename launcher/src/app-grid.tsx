import type { AppInfo } from "@pocket-apps/vite-config";
import { AppCard, type AppCardProps } from "./app-card.tsx";

export type AppGridProps = {
  apps: readonly AppInfo[];
  heading: AppCardProps["heading"];
  /** Names of the favorite apps. */
  favorites: readonly string[];
  /** Leave it out when the launcher cannot save. Then the cards have no favorite button. */
  onToggleFavorite?: (name: string) => void;
};

/** The app cards in a grid: one column in narrow windows, two columns in wide windows. */
export function AppGrid({ apps, heading, favorites, onToggleFavorite }: AppGridProps) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {apps.map((app) => (
        <li key={app.name}>
          <AppCard
            app={app}
            heading={heading}
            {...(onToggleFavorite && {
              favorite: {
                active: favorites.includes(app.name),
                onToggle: () => {
                  onToggleFavorite(app.name);
                },
              },
            })}
          />
        </li>
      ))}
    </ul>
  );
}
