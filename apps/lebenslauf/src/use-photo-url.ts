import type { ExtraFiles } from "@pocket-apps/core/data-file";
import { useEffect, useEffectEvent, useState } from "react";
import { toDataUrl } from "./photo.ts";

/**
 * The photo file `name` of the data folder as a data URL for an `<img>`, or `null` (no photo,
 * not loaded yet, or not readable). `revision` loads the file again, for example after it was
 * replaced under the same name.
 */
export function usePhotoUrl(
  files: ExtraFiles | null,
  name: string | null,
  revision: number,
): string | null {
  const key = files && name ? `${name}#${String(revision)}` : null;
  const [loaded, setLoaded] = useState<{ key: string; url: string | null } | null>(null);
  // `files` is a new object after each change of the data. Only the name and the revision
  // decide when the file loads again.
  const read = useEffectEvent((fileName: string) => files?.read(fileName) ?? null);

  // The photo lives in the data folder (an external system).
  useEffect(() => {
    if (key === null || name === null) return;
    const run = { active: true };
    void (async () => {
      let url: string | null = null;
      try {
        const blob = await read(name);
        url = blob ? await toDataUrl(blob) : null;
      } catch {
        // A file that cannot be read shows as no photo. The photo card offers a new one.
      }
      if (run.active) setLoaded({ key, url });
    })();
    return () => {
      run.active = false;
    };
  }, [key, name]);

  return loaded?.key === key ? loaded.url : null;
}
