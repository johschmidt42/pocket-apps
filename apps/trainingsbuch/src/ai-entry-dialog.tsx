import {
  addUsage,
  AiDataNotice,
  aiMessage,
  AiSetupNotice,
  AiUsageSummary,
  imageForAi,
  imageMessage,
  useAi,
  type AiImage,
  type AiMessage,
  type AiProvider,
  type AiUsage,
  type AskAi,
} from "@pocket-apps/core/ai";
import { CameraButton } from "@pocket-apps/core/camera-button";
import { FileButton } from "@pocket-apps/core/file-button";
import { Alert, AlertDescription } from "@pocket-apps/ui/components/alert";
import { Button } from "@pocket-apps/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@pocket-apps/ui/components/dialog";
import { Label } from "@pocket-apps/ui/components/label";
import { Textarea } from "@pocket-apps/ui/components/textarea";
import { Camera, ImageIcon, LoaderCircle, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AiDraftCard } from "./ai-draft-card.tsx";
import {
  aiAnswerSchema,
  buildInstructions,
  checkDraft,
  fixRequest,
  type AiEntry,
} from "./ai-entry.ts";
import { isoDay } from "./dates.ts";
import { useDataFile } from "./schema.ts";
import { allWorkouts, newId, type Workout } from "./workouts.ts";

/** `null`: closed. `focus`: the workout that the user opened, or `null` (from the list). */
export type AiEntryState = { focus: Workout | null } | null;

export type AiEntryDialogProps = {
  state: AiEntryState;
  /** Only for tests: a fake for the requests to the AI. */
  ask?: AskAi | undefined;
  onSave: (entry: AiEntry) => void;
  onClose: () => void;
};

/** The file types that both AI providers read. */
/** All images: the app makes a large photo or another format (for example HEIC) a smaller JPEG. */
const PHOTO_TYPES = "image/*";

/** How often the app sends a problem of a draft back to the AI before it gives up. */
const MAX_FIXES = 2;

/**
 * "Mit KI eintragen": the user describes a result in a text or a photo. The AI asks back when a
 * value is missing and then shows a draft. The app saves only after the user confirms it.
 */
export function AiEntryDialog({ state, ask, onSave, onClose }: AiEntryDialogProps) {
  const focus = state?.focus ?? null;
  return (
    <Dialog
      open={state !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
        // A click outside must not end the conversation by mistake. Escape and × still close it.
        onInteractOutside={(event) => {
          event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Mit KI eintragen</DialogTitle>
          <DialogDescription>
            {focus
              ? `${focus.name}: Schreib dein Ergebnis, oder schick ein Foto vom Whiteboard.`
              : "Beschreib dein Workout und dein Ergebnis, oder schick ein Foto vom Whiteboard."}{" "}
            Du prüfst den Eintrag, bevor die App ihn speichert.
          </DialogDescription>
        </DialogHeader>
        {/* A new conversation starts each time the dialog opens. */}
        {state && <AiEntryContent focus={focus} ask={ask} onSave={onSave} />}
      </DialogContent>
    </Dialog>
  );
}

function AiEntryContent({
  focus,
  ask,
  onSave,
}: {
  focus: Workout | null;
  ask: AskAi | undefined;
  onSave: (entry: AiEntry) => void;
}) {
  const { state, reload } = useAi(ask);
  switch (state.status) {
    case "loading":
      return (
        <p role="status" className="text-sm text-muted-foreground">
          Lädt die KI-Einstellungen …
        </p>
      );
    case "not-set-up":
      return (
        <AiSetupNotice feature="trägt dein Ergebnis aus Text oder Foto ein" onClose={reload} />
      );
    case "error":
      return (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      );
    case "ready":
      return (
        <Conversation focus={focus} ask={state.ask} provider={state.provider} onSave={onSave} />
      );
  }
}

/** One line of the chat. The messages that fix a draft are not in it. */
type Turn = { id: string; role: "user" | "assistant"; text: string; photo: string | null };

type Photo = { name: string; image: AiImage };

type Phase = { kind: "idle" } | { kind: "asking" } | { kind: "error"; message: string };

function Conversation({
  focus,
  ask,
  provider,
  onSave,
}: {
  focus: Workout | null;
  ask: AskAi;
  provider: AiProvider;
  onSave: (entry: AiEntry) => void;
}) {
  const { data } = useDataFile();
  // The instructions stay the same in the whole conversation (cache of the provider).
  const [start] = useState(() => {
    const today = isoDay(new Date());
    const instructions = buildInstructions({
      today,
      units: data.units,
      workouts: allWorkouts(data),
      focus,
    });
    return { today, instructions };
  });
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [entry, setEntry] = useState<AiEntry | null>(null);
  const [usage, setUsage] = useState<AiUsage | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);

  // Cancel a running request when the dialog closes.
  useEffect(() => {
    return () => {
      request.current?.abort();
    };
  }, []);

  async function send(userText: string, sentPhoto: Photo | null) {
    const turn: Turn = {
      id: newId(),
      role: "user",
      text: userText,
      photo: sentPhoto?.name ?? null,
    };
    const entryBefore = entry;
    setTurns((current) => [...current, turn]);
    setText("");
    setPhoto(null);
    setEntry(null);
    setPhase({ kind: "asking" });
    const controller = new AbortController();
    request.current = controller;

    let conversation: AiMessage[] = [
      ...messages,
      { role: "user", text: userText, ...(sentPhoto && { images: [sentPhoto.image] }) },
    ];
    for (let fixes = 0; ; fixes += 1) {
      const result = await ask({
        instructions: start.instructions,
        messages: conversation,
        schema: aiAnswerSchema,
        signal: controller.signal,
      });
      if (result.kind !== "ok") {
        // The message got no answer: give it back to the input, so that the user can send it again.
        setTurns((current) => current.filter((item) => item.id !== turn.id));
        // Do not overwrite a text that the user typed during the request.
        setText((current) => (current === "" ? userText : current));
        setPhoto((current) => current ?? sentPhoto);
        setEntry(entryBefore);
        setPhase(
          result.kind === "canceled"
            ? { kind: "idle" }
            : { kind: "error", message: aiMessage(result) },
        );
        return;
      }
      setUsage((current) => addUsage(current, result.usage));
      conversation = [...conversation, result.reply];
      const answer = result.data;
      const check =
        answer.status === "question"
          ? null
          : answer.draft === null
            ? { kind: "problem" as const, problem: "The status is draft, but the draft is null." }
            : checkDraft(answer.draft, { data, focus, today: start.today });
      if (check?.kind === "problem" && fixes < MAX_FIXES) {
        conversation = [...conversation, { role: "user", text: fixRequest(check.problem) }];
        continue;
      }
      setMessages(conversation);
      // The message of a draft that the app cannot use would confuse the user: it does not show it.
      if (check?.kind !== "problem") {
        setTurns((current) => [
          ...current,
          { id: newId(), role: "assistant", text: answer.message, photo: null },
        ]);
      }
      if (check?.kind === "ok") setEntry(check.entry);
      setPhase(
        check?.kind === "problem"
          ? {
              kind: "error",
              message:
                "Die KI hat keinen gültigen Eintrag geliefert. Beschreib das Ergebnis bitte genauer.",
            }
          : { kind: "idle" },
      );
      return;
    }
  }

  async function pickPhoto(file: File) {
    const check = await imageForAi(file);
    if (check.kind === "ok") {
      setPhoto({ name: file.name, image: check.image });
      setInputError(null);
    } else {
      setInputError(imageMessage(check));
    }
  }

  const asking = phase.kind === "asking";
  const label =
    turns.length === 0 ? "Was hast du trainiert?" : entry ? "Etwas ändern?" : "Deine Antwort";
  const placeholder =
    turns.length > 0
      ? ""
      : focus
        ? "z. B. 6:42, Rx, Pull-ups in 3 Sätzen"
        : "z. B. Fran in 6:42, Rx. Oder ein Foto vom Whiteboard.";

  return (
    <div className="flex flex-col gap-4">
      {turns.length > 0 && (
        <ol aria-label="Gespräch" aria-live="polite" className="flex flex-col gap-2">
          {turns.map((turn) => (
            <li
              key={turn.id}
              className={
                turn.role === "user"
                  ? "max-w-[85%] self-end rounded-lg bg-primary px-3 py-2 text-sm whitespace-pre-line text-primary-foreground"
                  : "max-w-[85%] self-start rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-line"
              }
            >
              <span className="sr-only">{turn.role === "user" ? "Du: " : "KI: "}</span>
              {turn.text}
              {turn.photo !== null && (
                <span className="mt-1 flex items-center gap-1 text-xs opacity-80">
                  <ImageIcon aria-hidden="true" className="size-3" />
                  {turn.photo}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}

      {asking && (
        <div className="flex items-center justify-between gap-2">
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            Die KI liest …
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              request.current?.abort();
            }}
          >
            Abbrechen
          </Button>
        </div>
      )}

      {phase.kind === "error" && (
        <Alert variant="destructive">
          <AlertDescription>{phase.message}</AlertDescription>
        </Alert>
      )}

      {entry && (
        <AiDraftCard
          entry={entry}
          onSave={() => {
            onSave(entry);
          }}
        />
      )}

      <form
        className="flex flex-col gap-2"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = text.trim();
          if (trimmed === "" && photo === null) {
            setInputError("Schreib etwas, oder wähle ein Foto.");
            return;
          }
          setInputError(null);
          // The API needs a text with each message, also with a photo.
          void send(trimmed === "" ? "Hier ist ein Foto." : trimmed, photo);
        }}
      >
        <Label htmlFor="ai-entry-text">{label}</Label>
        <Textarea
          id="ai-entry-text"
          value={text}
          placeholder={placeholder}
          onChange={(event) => {
            setText(event.target.value);
          }}
          onKeyDown={(event) => {
            // Enter makes a new line. Ctrl+Enter or Cmd+Enter sends, as in other chats.
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          {/* Only on phones and tablets: there, a photo of the whiteboard is one tap away. */}
          <CameraButton
            variant="outline"
            size="sm"
            inputLabel="Kamera"
            onFile={(file) => void pickPhoto(file)}
          >
            <Camera data-icon="inline-start" />
            Foto aufnehmen
          </CameraButton>
          <FileButton
            variant="outline"
            size="sm"
            accept={PHOTO_TYPES}
            inputLabel="Foto-Datei"
            onFile={(file) => void pickPhoto(file)}
          >
            <ImageIcon data-icon="inline-start" />
            Foto wählen
          </FileButton>
          {photo && (
            <span className="flex min-w-0 items-center gap-1 text-sm">
              <ImageIcon aria-hidden="true" className="size-4 shrink-0" />
              <span className="truncate">{photo.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Foto entfernen"
                onClick={() => {
                  setPhoto(null);
                }}
              >
                <X />
              </Button>
            </span>
          )}
          <Button type="submit" size="sm" className="ml-auto" disabled={asking}>
            Senden
            <Send data-icon="inline-end" />
          </Button>
        </div>
        {inputError && (
          <p role="alert" className="text-sm text-destructive">
            {inputError}
          </p>
        )}
      </form>

      <div className="flex flex-col gap-2 border-t pt-3">
        <AiDataNotice
          provider={provider}
          data={
            focus
              ? `dein Text, dein Foto, das Datum von heute, kg oder lb und das Workout „${focus.name}“`
              : "dein Text, dein Foto, das Datum von heute, kg oder lb und die Liste der Workouts"
          }
        />
        {usage && <AiUsageSummary usage={usage} label="Bisher" />}
      </div>
    </div>
  );
}
