import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@pocket-apps/ui/components/accordion";
import type { Attractor } from "./attractors.ts";
import { PRESSED_STRENGTH } from "./mouse-effects.ts";
import { LINE_COUNT } from "./simulation.ts";

const strengthFormat = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });

/** Folded texts under the picture: how the app works, and the formulas of the attractor. */
export function Explanation({ attractor }: { attractor: Attractor }) {
  return (
    <Accordion type="multiple">
      <AccordionItem value="how">
        <AccordionTrigger>Wie funktioniert das?</AccordionTrigger>
        <AccordionContent>
          <p>
            Ein seltsamer Attraktor ist ein System aus drei Formeln. Für jeden Punkt im Raum sagen
            sie, in welche Richtung und wie schnell er sich bewegt.
          </p>
          <p>
            Die App startet {LINE_COUNT} Punkte. Jeder Punkt folgt den Formeln und zieht eine
            leuchtende Spur hinter sich her. Das sind die Linien.
          </p>
          <p>
            Die Bahnen wiederholen sich nie genau, aber sie bleiben immer in derselben Form. Diese
            Form ist der Attraktor. Zwei Punkte, die fast am selben Ort starten, laufen nach kurzer
            Zeit weit auseinander. Das ist Chaos.
          </p>
          <p>Die Maus wirkt auf drei Arten:</p>
          <ul className="mb-4 list-disc pl-5">
            <li>
              <strong>Linse:</strong> Die Maus zieht die Linien im Bild zu sich hin. Die Punkte
              selbst laufen weiter auf ihren Bahnen.
            </li>
            <li>
              <strong>Schwerkraft:</strong> Die Maus zieht an den Punkten selbst. Ihre Bahnen ändern
              sich. Die Form findet langsam zurück. „Zurücksetzen“ startet alle Punkte neu.
            </li>
            <li>
              <strong>Gummi:</strong> Die Linien hängen an Federn. Die Maus zieht sie weg, dann
              federn sie zurück.
            </li>
          </ul>
          <p>
            „Kraft“ unter dem Bild zeigt, wie stark die Maus zieht: 0 ohne Maus, 1 mit der Maus über
            dem Bild, {strengthFormat.format(PRESSED_STRENGTH)} mit gedrückter Maustaste.
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="formulas">
        <AccordionTrigger>Formeln und Parameter von {attractor.name}</AccordionTrigger>
        <AccordionContent>
          <p>{attractor.about}</p>
          <p>
            Die Formeln geben für einen Punkt (x, y, z) an, wie schnell sich jede Koordinate ändert:
          </p>
          <ul className="mb-4 font-mono text-xs">
            {attractor.equations.map((equation) => (
              <li key={equation}>{equation}</li>
            ))}
          </ul>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            {attractor.symbols.map(({ key, symbol, meaning }) => (
              <div key={key} className="contents">
                <dt className="font-mono">{symbol}</dt>
                <dd>{meaning}</dd>
              </div>
            ))}
          </dl>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
