import { CATEGORY_INFO } from "./categories.ts";
import type { Category } from "./schema.ts";

/** The colors of the categories, as a list of swatches with names. */
export function CategoryLegend({ categories }: { categories: readonly Category[] }) {
  return (
    <ul aria-label="Legende" className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {categories.map((category) => (
        <li key={category} className="flex items-center gap-1.5 whitespace-nowrap">
          <span
            aria-hidden="true"
            className={`size-2.5 rounded-xs ${CATEGORY_INFO[category].swatchClass}`}
          />
          {CATEGORY_INFO[category].label}
        </li>
      ))}
    </ul>
  );
}
