import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@pocket-apps/ui/components/dialog";
import { ApiKeyForm } from "./api-key-form.tsx";

export type ApiKeyDialogProps = {
  open: boolean;
  apiKey: string;
  onSave: (apiKey: string) => void;
  onClose: () => void;
};

/** Changes the Alpha Vantage key. */
export function ApiKeyDialog({ open, apiKey, onSave, onClose }: ApiKeyDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>API-Key ändern</DialogTitle>
        </DialogHeader>
        {open && <ApiKeyForm initial={apiKey} onSave={onSave} />}
      </DialogContent>
    </Dialog>
  );
}
