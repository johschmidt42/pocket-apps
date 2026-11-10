import { Button } from "@pocket-apps/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@pocket-apps/ui/components/tooltip";
import type { LucideIcon } from "lucide-react";

/** A round icon button on the picture. Its label shows as a tooltip and for screen readers. */
export function PictureButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="secondary" size="icon" aria-label={label} onClick={onClick}>
          <Icon aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}
