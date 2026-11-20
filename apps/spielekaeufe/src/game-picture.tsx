import { Gamepad2 } from "lucide-react";
import { useState } from "react";
import { pictureUrl } from "./purchases.ts";

/**
 * The picture of a game from the server of Steam. Only a link: the app keeps no copy. Without an
 * app ID, without internet or if Steam has no picture, a game pad shows instead.
 */
export function GamePicture({ appId }: { appId: number | null }) {
  // The ID of the picture that failed. A new ID tries again.
  const [failedId, setFailedId] = useState<number | null>(null);
  const box = "aspect-[460/215] w-24 shrink-0 overflow-hidden rounded-md bg-muted sm:w-32";
  if (appId === null || failedId === appId) {
    return (
      <span aria-hidden="true" className={`flex items-center justify-center ${box}`}>
        <Gamepad2 className="size-6 text-muted-foreground" />
      </span>
    );
  }
  return (
    <img
      src={pictureUrl(appId)}
      alt=""
      loading="lazy"
      // Steam does not need to know the address of the app.
      referrerPolicy="no-referrer"
      className={`object-cover ${box}`}
      onError={() => {
        setFailedId(appId);
      }}
    />
  );
}
