// DOM IDs of the controls of one idea. The list uses them to keep the keyboard focus.

/** The delete button of an idea. */
export function deleteButtonId(ideaId: string): string {
  return `idea-${ideaId}-delete`;
}

/** The edit button of an idea. It gets the focus back when the edit form closes. */
export function editButtonId(ideaId: string): string {
  return `idea-${ideaId}-edit`;
}

/** The title input of the edit form. It gets the focus when the form opens. */
export function editTitleInputId(ideaId: string): string {
  return `idea-${ideaId}-edit-title`;
}

/** The description field of the edit form. */
export function editDescriptionId(ideaId: string): string {
  return `idea-${ideaId}-edit-description`;
}
