import type { IdeaList } from "./schema.ts";

export type Direction = "up" | "down";

/** A random ID. Works without a secure context, also under file://. */
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Adds an idea at the end. Ignores an empty title. */
export function addIdea(list: IdeaList, title: string, description: string, id: string): IdeaList {
  const trimmedTitle = title.trim();
  if (trimmedTitle === "") return list;
  return {
    ...list,
    ideas: [...list.ideas, { id, title: trimmedTitle, description: description.trim() }],
  };
}

export function removeIdea(list: IdeaList, id: string): IdeaList {
  return { ...list, ideas: list.ideas.filter((idea) => idea.id !== id) };
}

/** Moves an idea one place up or down. Does nothing at the start or the end of the list. */
export function moveIdea(list: IdeaList, id: string, direction: Direction): IdeaList {
  const from = list.ideas.findIndex((idea) => idea.id === id);
  const to = direction === "up" ? from - 1 : from + 1;
  const idea = list.ideas[from];
  if (!idea || to < 0 || to >= list.ideas.length) return list;
  const ideas = list.ideas.filter((other) => other.id !== id);
  ideas.splice(to, 0, idea);
  return { ...list, ideas };
}
