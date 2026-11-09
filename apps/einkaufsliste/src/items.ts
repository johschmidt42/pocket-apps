import type { ShoppingList } from "./schema.ts";

/** A random ID. Works without a secure context, also under file://. */
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function addItem(list: ShoppingList, name: string, id: string): ShoppingList {
  const trimmed = name.trim();
  if (trimmed === "") return list;
  return { ...list, items: [...list.items, { id, name: trimmed, done: false }] };
}

export function toggleItem(list: ShoppingList, id: string): ShoppingList {
  return {
    ...list,
    items: list.items.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
  };
}

export function removeItem(list: ShoppingList, id: string): ShoppingList {
  return { ...list, items: list.items.filter((item) => item.id !== id) };
}

export function clearDone(list: ShoppingList): ShoppingList {
  return { ...list, items: list.items.filter((item) => !item.done) };
}
