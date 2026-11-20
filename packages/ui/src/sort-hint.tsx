import { SORT_HINT_ID } from "./drag-sort.ts";

/** The hint for screen readers that each drag handle points to. Render it once per page. */
export function SortHint() {
  return (
    <p id={SORT_HINT_ID} className="sr-only">
      Ziehen zum Verschieben, mit der Maus oder dem Finger. Mit der Tastatur: Pfeiltaste nach oben
      oder unten.
    </p>
  );
}
