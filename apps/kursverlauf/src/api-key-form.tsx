import { Button } from "@pocket-apps/ui/components/button";
import { Input } from "@pocket-apps/ui/components/input";
import { Label } from "@pocket-apps/ui/components/label";
import { useState } from "react";

const KEY_URL = "https://www.alphavantage.co/support/#api-key";

export type ApiKeyFormProps = {
  initial: string;
  onSave: (apiKey: string) => void;
};

/** The form for the Alpha Vantage key, with a link to get a free key. */
export function ApiKeyForm({ initial, onSave }: ApiKeyFormProps) {
  const [apiKey, setApiKey] = useState(initial);
  const valid = /^[A-Za-z0-9]{8,}$/.test(apiKey.trim());
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) onSave(apiKey.trim());
      }}
    >
      <p className="text-sm text-muted-foreground">
        Die Kurse kommen von Alpha Vantage. Dafür brauchst du einen kostenlosen API-Key. Du bekommst
        ihn mit deiner E-Mail-Adresse auf{" "}
        <a href={KEY_URL} target="_blank" rel="noreferrer" className="text-foreground underline">
          alphavantage.co
        </a>
        . Der Key bleibt in deinem Datenordner.
      </p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="api-key">API-Key</Label>
        <Input
          id="api-key"
          value={apiKey}
          autoComplete="off"
          spellCheck={false}
          placeholder="z. B. ABCD1234EFGH5678"
          onChange={(event) => {
            setApiKey(event.target.value);
          }}
        />
      </div>
      <Button type="submit" disabled={!valid} className="self-start">
        Speichern
      </Button>
    </form>
  );
}
