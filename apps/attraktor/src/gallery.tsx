import { AttractorCard } from "./attractor-card.tsx";
import { ATTRACTORS, type Attractor } from "./attractors.ts";

export function Gallery({ onSelect }: { onSelect: (attractor: Attractor) => void }) {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-lg font-semibold">Ausgangszustand wählen</h2>
        <p className="text-sm text-muted-foreground">
          Jedes Bild ist ein seltsamer Attraktor. Punkte folgen einer Formel und zeichnen leuchtende
          Bahnen. Mit der Maus ziehst du an ihnen.
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ATTRACTORS.map((attractor) => (
          <li key={attractor.id}>
            <AttractorCard attractor={attractor} onSelect={onSelect} />
          </li>
        ))}
      </ul>
    </main>
  );
}
