import type { Idea, IdeaList } from "./schema.ts";

/** A random ID. Works without a secure context, also under file://. */
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Adds an idea at the end. Ignores an empty title. */
export function addIdea(list: IdeaList, idea: Idea): IdeaList {
  const title = idea.title.trim();
  if (title === "") return list;
  return {
    ...list,
    ideas: [...list.ideas, { id: idea.id, title, description: idea.description.trim() }],
  };
}

export function removeIdea(list: IdeaList, id: string): IdeaList {
  return { ...list, ideas: list.ideas.filter((idea) => idea.id !== id) };
}
