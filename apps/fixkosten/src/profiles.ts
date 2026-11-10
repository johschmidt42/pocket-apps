import type { FixkostenData, Profile } from "./schema.ts";

export function newId(): string {
  return crypto.randomUUID();
}

/** The active profile. */
export function activeProfile(data: FixkostenData): Profile {
  return data.profiles.find((profile) => profile.id === data.activeProfileId) ?? firstProfile(data);
}

function firstProfile(data: FixkostenData): Profile {
  const [first] = data.profiles;
  if (!first) throw new Error("The data has no profile.");
  return first;
}

/** Adds an empty profile at the end and makes it active. */
export function addProfile(data: FixkostenData, id: string, name: string): FixkostenData {
  return {
    profiles: [...data.profiles, { id, name, incomes: [], costs: [] }],
    activeProfileId: id,
  };
}

export function setActiveProfile(data: FixkostenData, id: string): FixkostenData {
  return data.profiles.some((profile) => profile.id === id)
    ? { ...data, activeProfileId: id }
    : data;
}

/** Changes the active profile with `change`. */
export function updateActiveProfile(
  data: FixkostenData,
  change: (profile: Profile) => Profile,
): FixkostenData {
  const active = activeProfile(data);
  return {
    ...data,
    profiles: data.profiles.map((profile) =>
      profile.id === active.id ? change(profile) : profile,
    ),
  };
}

/** Removes the active profile and activates the first other profile. Keeps the last profile. */
export function removeActiveProfile(data: FixkostenData): FixkostenData {
  const active = activeProfile(data);
  const profiles = data.profiles.filter((profile) => profile.id !== active.id);
  const [next] = profiles;
  return next ? { profiles, activeProfileId: next.id } : data;
}

/** Replaces the item with the same ID, or adds the item at the end. */
export function upsert<T extends { id: string }>(list: readonly T[], item: T): T[] {
  return list.some((entry) => entry.id === item.id)
    ? list.map((entry) => (entry.id === item.id ? item : entry))
    : [...list, item];
}

export function removeById<T extends { id: string }>(list: readonly T[], id: string): T[] {
  return list.filter((entry) => entry.id !== id);
}
