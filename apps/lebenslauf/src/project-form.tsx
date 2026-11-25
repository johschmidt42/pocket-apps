import { Button } from "@pocket-apps/ui/components/button";
import { Checkbox } from "@pocket-apps/ui/components/checkbox";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@pocket-apps/ui/components/dialog";
import { Input } from "@pocket-apps/ui/components/input";
import { Label } from "@pocket-apps/ui/components/label";
import { Textarea } from "@pocket-apps/ui/components/textarea";
import { useState } from "react";
import { errorId } from "./dom-ids.ts";
import { FormField } from "./form-field.tsx";
import type { Project } from "./schema.ts";
import { fromLines, isMonth, toLines, toTools } from "./text.ts";
import { newId } from "./variants.ts";

export type ProjectFormProps = {
  /** `null` for a new project. */
  project: Project | null;
  onSave: (project: Project) => void;
};

/**
 * The fields of a project: title, role, client, time range, description, tasks and tools. The
 * time range is optional: without a start, the CV shows no time range.
 */
export function ProjectForm({ project, onSave }: ProjectFormProps) {
  const [title, setTitle] = useState(project?.title ?? "");
  const [role, setRole] = useState(project?.role ?? "");
  const [client, setClient] = useState(project?.client ?? "");
  const [from, setFrom] = useState(project?.from ?? "");
  const [to, setTo] = useState(project?.to ?? "");
  const [ongoing, setOngoing] = useState(
    project !== null && project.from !== null && project.to === null,
  );
  const [description, setDescription] = useState(project?.description ?? "");
  const [tasks, setTasks] = useState(fromLines(project?.tasks ?? []));
  const [tools, setTools] = useState(fromLines(project?.tools ?? []));
  const [showErrors, setShowErrors] = useState(false);
  const titleError = title.trim() === "" ? "Bitte einen Titel eingeben." : null;
  const hasRange = from !== "" || to !== "" || ongoing;
  const fromError =
    !hasRange || isMonth(from)
      ? null
      : ongoing
        ? "Bitte einen Start eingeben, oder „bis heute“ abwählen."
        : "Bitte einen Start eingeben, oder das Ende leeren.";
  const toError =
    !isMonth(from) || ongoing
      ? null
      : !isMonth(to)
        ? "Bitte ein Ende eingeben, oder „bis heute“ wählen."
        : to < from
          ? "Das Ende darf nicht vor dem Start liegen."
          : null;

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (titleError !== null || fromError !== null || toError !== null) {
          setShowErrors(true);
          return;
        }
        onSave({
          id: project?.id ?? newId(),
          title: title.trim(),
          role: role.trim(),
          client: client.trim(),
          from: hasRange ? from : null,
          to: hasRange && !ongoing ? to : null,
          description: description.trim(),
          tasks: toLines(tasks),
          tools: toTools(tools),
        });
      }}
    >
      <DialogHeader>
        <DialogTitle>{project ? "Projekt bearbeiten" : "Projekt hinzufügen"}</DialogTitle>
        <DialogDescription>
          Leere Felder fehlen im Lebenslauf. Ohne Start zeigt er keinen Zeitraum.
        </DialogDescription>
      </DialogHeader>
      <FormField id="project-title" label="Titel" error={showErrors ? titleError : null}>
        <Input
          id="project-title"
          value={title}
          placeholder="z. B. Data Exchange Store"
          aria-invalid={showErrors && titleError !== null}
          aria-describedby={showErrors && titleError ? errorId("project-title") : undefined}
          onChange={(event) => {
            setTitle(event.target.value);
          }}
        />
      </FormField>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField id="project-role" label="Rolle">
          <Input
            id="project-role"
            value={role}
            placeholder="z. B. Lead Backend Engineer"
            onChange={(event) => {
              setRole(event.target.value);
            }}
          />
        </FormField>
        <FormField id="project-client" label="Kunde">
          <Input
            id="project-client"
            value={client}
            placeholder="z. B. Internationaler Medienkonzern"
            onChange={(event) => {
              setClient(event.target.value);
            }}
          />
        </FormField>
        <FormField id="project-from" label="Von" error={showErrors ? fromError : null}>
          <Input
            id="project-from"
            type="month"
            min="1900-01"
            max="9999-12"
            value={from}
            aria-invalid={showErrors && fromError !== null}
            aria-describedby={showErrors && fromError ? errorId("project-from") : undefined}
            onChange={(event) => {
              setFrom(event.target.value);
            }}
          />
        </FormField>
        <FormField id="project-to" label="Bis" error={showErrors ? toError : null}>
          <Input
            id="project-to"
            type="month"
            min="1900-01"
            max="9999-12"
            value={ongoing ? "" : to}
            disabled={ongoing}
            aria-invalid={showErrors && toError !== null}
            aria-describedby={showErrors && toError ? errorId("project-to") : undefined}
            onChange={(event) => {
              setTo(event.target.value);
            }}
          />
        </FormField>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="project-ongoing"
          checked={ongoing}
          onCheckedChange={(checked) => {
            setOngoing(checked === true);
          }}
        />
        <Label htmlFor="project-ongoing" className="cursor-pointer">
          Bis heute („Seit …“ im Lebenslauf)
        </Label>
      </div>
      <FormField id="project-description" label="Beschreibung">
        <Textarea
          id="project-description"
          rows={3}
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
          }}
        />
      </FormField>
      <FormField id="project-tasks" label="Aufgaben" hint="Eine Aufgabe pro Zeile.">
        <Textarea
          id="project-tasks"
          rows={5}
          value={tasks}
          onChange={(event) => {
            setTasks(event.target.value);
          }}
        />
      </FormField>
      <FormField id="project-tools" label="Tools" hint="Ein Tool pro Zeile, oder getrennt mit „|“.">
        <Textarea
          id="project-tools"
          rows={3}
          value={tools}
          onChange={(event) => {
            setTools(event.target.value);
          }}
        />
      </FormField>
      <DialogFooter>
        <Button type="submit">Speichern</Button>
      </DialogFooter>
    </form>
  );
}
