import { Button } from "@pocket-apps/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@pocket-apps/ui/components/dialog";

/**
 * Asks before the back gesture ends a running timer. The timer keeps running while the dialog
 * shows. Closing the dialog (Esc, the X, a tap outside) keeps the timer.
 */
export function LeaveDialog({
  open,
  onKeep,
  onFinish,
}: {
  open: boolean;
  onKeep: () => void;
  onFinish: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onKeep();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Timer läuft noch</DialogTitle>
          <DialogDescription>Wenn du die App verlässt, endet der Timer.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onFinish}>
            Timer beenden
          </Button>
          <Button type="button" onClick={onKeep}>
            Weiter trainieren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
