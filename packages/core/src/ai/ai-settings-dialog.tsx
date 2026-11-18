import { Alert, AlertDescription } from "@pocket-apps/ui/components/alert";
import { Button } from "@pocket-apps/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@pocket-apps/ui/components/dialog";
import { Input } from "@pocket-apps/ui/components/input";
import { Label } from "@pocket-apps/ui/components/label";
import { NativeSelect, NativeSelectOption } from "@pocket-apps/ui/components/native-select";
import { ToggleGroup, ToggleGroupItem } from "@pocket-apps/ui/components/toggle-group";
import { CircleCheck, CircleX, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { errorText } from "../error-text.ts";
import { isOneOf } from "../one-of.ts";
import { checkKey, checkMessage, type AiModel, type KeyCheck } from "./check-key.ts";
import {
  AI_KEY_PAGES,
  AI_KEY_PLACEHOLDERS,
  AI_PROVIDER_LABELS,
  AI_PROVIDERS,
  preferredModel,
  withAccess,
  withoutKey,
  type AiProvider,
  type AiSetup,
} from "./settings.ts";
import { useAiSettings } from "./use-ai-settings.ts";

export type AiSettingsDialogProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * The dialog to set up the AI for all apps: the provider, the API key with a check, and the
 * model. Provider and model go to `ai/ai.json` in the data folder. The key stays in this browser.
 * Use it inside a `DataFileProvider`.
 */
export function AiSettingsDialog({ open, onClose }: AiSettingsDialogProps) {
  return (
    <Dialog
      open={open}
      // The parent opens the dialog. Thus a change of the dialog can only close it.
      onOpenChange={() => {
        onClose();
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>KI einrichten</DialogTitle>
          <DialogDescription>
            Apps mit KI-Funktionen nutzen deinen eigenen API-Key. Der Anbieter rechnet die Nutzung
            mit dir ab.
          </DialogDescription>
        </DialogHeader>
        {/* The form starts when the dialog opens. Then it reads the newest settings. */}
        {open && <AiSettingsContent onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function AiSettingsContent({ onClose }: { onClose: () => void }) {
  const { state, save } = useAiSettings();
  switch (state.status) {
    case "no-folder":
      return (
        <p className="text-sm text-muted-foreground">
          Wähle zuerst deinen Datenordner. Dort speichert die App den Anbieter und das Modell.
        </p>
      );
    case "loading":
      return (
        <p role="status" className="text-sm text-muted-foreground">
          Lädt die KI-Einstellungen …
        </p>
      );
    case "error":
      return (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      );
    case "ready":
      return <AiSettingsForm setup={state.setup} save={save} onClose={onClose} />;
  }
}

/** The check of one provider in the form. */
type CheckState = { kind: "idle" } | { kind: "checking" } | KeyCheck;

type Draft = { apiKey: string; model: string | null; check: CheckState };

function draftOf(setup: AiSetup, provider: AiProvider): Draft {
  return {
    apiKey: setup.keys[provider] ?? "",
    model: setup.settings.models[provider],
    check: { kind: "idle" },
  };
}

/** The model to save, or what is missing before the app can save. */
type SaveCheck = { kind: "ready"; model: string } | { kind: "problem"; message: string };

function saveCheck(draft: Draft, keyIsKnown: boolean): SaveCheck {
  if (draft.apiKey.trim() === "")
    return { kind: "problem", message: "Bitte gib einen API-Key ein." };
  if (draft.check.kind !== "ok" && !keyIsKnown) {
    return { kind: "problem", message: "Bitte prüfe zuerst die Verbindung." };
  }
  if (draft.model === null) return { kind: "problem", message: "Bitte wähle ein Modell." };
  return { kind: "ready", model: draft.model };
}

function AiSettingsForm({
  setup,
  save,
  onClose,
}: {
  setup: AiSetup;
  save: (setup: AiSetup) => Promise<void>;
  onClose: () => void;
}) {
  const [provider, setProvider] = useState<AiProvider>(setup.settings.active ?? "anthropic");
  const [drafts, setDrafts] = useState<Record<AiProvider, Draft>>({
    anthropic: draftOf(setup, "anthropic"),
    openai: draftOf(setup, "openai"),
  });
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const draft = drafts[provider];
  const apiKey = draft.apiKey.trim();
  const savedKey = setup.keys[provider];
  const savedModel = setup.settings.models[provider];
  // A new or changed key must pass the check before the app saves it.
  const keyIsKnown = savedKey !== null && savedKey === apiKey;
  const models: AiModel[] =
    draft.check.kind === "ok"
      ? draft.check.models
      : savedModel === null
        ? []
        : [{ id: savedModel, name: savedModel }];

  function change(patch: Partial<Draft>) {
    setError(null);
    setDrafts((current) => ({ ...current, [provider]: { ...current[provider], ...patch } }));
  }

  async function runCheck() {
    const checking = provider;
    change({ check: { kind: "checking" } });
    const check = await checkKey(checking, apiKey);
    setDrafts((current) => {
      const before = current[checking];
      // The user changed the key during the check: the result belongs to the old key.
      if (before.apiKey.trim() !== apiKey) return current;
      const model =
        check.kind === "ok" && !check.models.some((item) => item.id === before.model)
          ? preferredModel(checking, check.models)
          : before.model;
      return { ...current, [checking]: { ...before, check, model } };
    });
  }

  async function store(next: AiSetup) {
    setError(null);
    try {
      await save(next);
      onClose();
    } catch (caught) {
      setError(`Die App konnte die KI-Einstellungen nicht speichern: ${errorText(caught)}`);
    }
  }

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const result = saveCheck(draft, keyIsKnown);
        if (result.kind === "problem") {
          setError(result.message);
          return;
        }
        void store(withAccess(setup, { provider, apiKey, model: result.model }));
      }}
    >
      <div className="flex flex-col gap-2">
        <span id="ai-provider-label" className="text-sm leading-none font-medium">
          Anbieter
        </span>
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={1}
          aria-labelledby="ai-provider-label"
          className="flex-wrap justify-start"
          value={provider}
          onValueChange={(value) => {
            if (!isOneOf(AI_PROVIDERS, value)) return;
            setError(null);
            setProvider(value);
          }}
        >
          {AI_PROVIDERS.map((value) => (
            <ToggleGroupItem key={value} value={value} className="px-3">
              {AI_PROVIDER_LABELS[value]}
              {setup.settings.active === value && " · aktiv"}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="ai-key">API-Key</Label>
        <div className="flex gap-2">
          <Input
            id="ai-key"
            type={showKey ? "text" : "password"}
            autoComplete="off"
            spellCheck={false}
            value={draft.apiKey}
            placeholder={AI_KEY_PLACEHOLDERS[provider]}
            onChange={(event) => {
              change({ apiKey: event.target.value, check: { kind: "idle" } });
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={showKey ? "Key verbergen" : "Key anzeigen"}
            onClick={() => {
              setShowKey((current) => !current);
            }}
          >
            {showKey ? <EyeOff /> : <Eye />}
          </Button>
        </div>
        {savedKey === null && savedModel !== null && (
          <p className="text-sm">
            Auf diesem Computer fehlt noch der Key für {AI_PROVIDER_LABELS[provider]}.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Einen Key erstellst du unter{" "}
          <a
            href={AI_KEY_PAGES[provider]}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            {AI_KEY_PAGES[provider].replace("https://", "")}
          </a>
          . Der Key bleibt in diesem Browser, nicht im Datenordner. Auf einem anderen Computer gibst
          du ihn einmal neu ein. Nutze einen eigenen Key mit Ausgabelimit und Ablaufdatum.
        </p>
      </div>

      <div className="flex flex-col items-start gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={apiKey === "" || draft.check.kind === "checking"}
          onClick={() => void runCheck()}
        >
          Verbindung prüfen
        </Button>
        <CheckLine check={draft.check} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="ai-model">Modell</Label>
        <NativeSelect
          id="ai-model"
          className="w-full"
          value={draft.model ?? ""}
          disabled={models.length === 0}
          onChange={(event) => {
            change({ model: event.target.value });
          }}
        >
          {models.length === 0 && (
            <NativeSelectOption value="">
              {draft.check.kind === "ok" ? "Keine Modelle verfügbar" : "Erst die Verbindung prüfen"}
            </NativeSelectOption>
          )}
          {models.map((model) => (
            <NativeSelectOption key={model.id} value={model.id}>
              {model.name === model.id ? model.id : `${model.name} (${model.id})`}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {draft.check.kind !== "ok" && savedModel !== null && (
          <p className="text-xs text-muted-foreground">
            Prüfe die Verbindung, um alle Modelle zu sehen.
          </p>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <DialogFooter className="gap-2">
        {savedKey !== null && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              if (
                !window.confirm(
                  `Key für ${AI_PROVIDER_LABELS[provider]} in diesem Browser entfernen?`,
                )
              ) {
                return;
              }
              void store(withoutKey(setup, provider));
            }}
          >
            Key entfernen
          </Button>
        )}
        <Button type="submit">Speichern</Button>
      </DialogFooter>
    </form>
  );
}

/** The result of the check, with an icon and a sentence. */
function CheckLine({ check }: { check: CheckState }) {
  switch (check.kind) {
    case "idle":
      return null;
    case "checking":
      return (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          Prüft den Key …
        </p>
      );
    case "ok":
      return (
        <p role="status" className="flex items-center gap-2 text-sm">
          <CircleCheck aria-hidden="true" className="size-4 text-primary" />
          Der Key funktioniert.{" "}
          {check.models.length === 1 ? "1 Modell" : `${String(check.models.length)} Modelle`}{" "}
          verfügbar.
        </p>
      );
    case "invalid-key":
    case "no-permission":
    case "offline":
    case "error":
      return (
        <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
          <CircleX aria-hidden="true" className="size-4" />
          {checkMessage(check)}
        </p>
      );
  }
}
