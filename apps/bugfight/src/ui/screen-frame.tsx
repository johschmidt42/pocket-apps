import { cn } from "@pocket-apps/ui/lib/utils";
import type { ReactNode } from "react";
import { ACTION_FONT } from "./action-font.ts";

/**
 * The frame of a screen that lies on the field: a short line, a big title and the buttons.
 * All sizes use the width of the field as their unit (`cqw`). Thus the screen fits a small field too.
 * The look is that of an action film of the 1980s: heavy, slanted letters in the colors of fire.
 * The colors are fixed, as the colors of the picture are: they do not follow the theme.
 */
export function ScreenFrame({
  line,
  title,
  large = false,
  dim = false,
  children,
}: {
  /** The short line over the title. */
  line?: string;
  title: string;
  /** The title of the game is larger than the titles of the other screens. */
  large?: boolean;
  /** Makes the picture behind the screen darker. */
  dim?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        // The content stays above Seven, who waits at the bottom center.
        "absolute inset-0 flex flex-col items-center justify-center gap-[2cqw] pb-[9cqw] text-center",
        dim && "bg-[rgb(4_12_6/0.6)]",
      )}
    >
      {line !== undefined && (
        <p className="text-[1.5cqw] font-bold tracking-[0.45em] uppercase [text-shadow:0_2px_8px_rgb(0_0_0/0.8)]">
          {line}
        </p>
      )}
      <h2
        className={cn(
          ACTION_FONT,
          // The color of the text is a background. Without room at the sides, it cuts the slanted last letter.
          "-skew-x-6 bg-[linear-gradient(180deg,#fff9c9_0%,#ffd83a_32%,#ff7a1a_58%,#d0122a_78%,#5a0717_100%)] bg-clip-text px-[0.2em] leading-none tracking-wide text-transparent italic drop-shadow-[0_0.05em_0_#1a0508]",
          large ? "text-[13cqw]" : "text-[8cqw]",
        )}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
