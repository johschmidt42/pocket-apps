/** The ID of the error text of a form field. */
export function errorId(id: string): string {
  return `${id}-error`;
}

/** The ID of the button "Eintrag hinzufügen" of a section. */
export function addEntryId(sectionId: string): string {
  return `entry-add-${sectionId}`;
}

/** The ID of the select box "Variante". */
export const VARIANT_SELECT_ID = "variant";

/** The ID of the button "Abschnitt hinzufügen". */
export const ADD_SECTION_ID = "section-add";
