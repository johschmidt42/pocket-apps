import { Button } from "@pocket-apps/ui/components/button";
import { cn } from "@pocket-apps/ui/lib/utils";
import type { ReactNode } from "react";
import { ACTION_FONT } from "./action-font.ts";

/** A button of a screen on the field, in the look of the title. Its size follows the width of the field. */
export function ActionButton({
  main = false,
  onClick,
  children,
}: {
  /** The main button of a screen is larger and has the color of fire. The Enter key does the same as it. */
  main?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      variant={main ? "default" : "secondary"}
      onClick={onClick}
      className={cn(
        ACTION_FONT,
        "h-auto -skew-x-6 tracking-wider italic",
        main
          ? "bg-[linear-gradient(180deg,#ffe45c,#ff9a1f)] px-[4.5cqw] py-[1cqw] text-[2.6cqw] text-[#1a0508] hover:brightness-110"
          : "px-[2.5cqw] py-[0.6cqw] text-[1.6cqw]",
      )}
    >
      {children}
    </Button>
  );
}
