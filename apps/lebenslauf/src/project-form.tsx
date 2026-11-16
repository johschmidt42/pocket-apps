import { Button } from "@pocket-apps/ui/components/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@pocket-apps/ui/components/dialog";
import { Input } from "@pocket-apps/ui/components/input";
import { Textarea } from "@pocket-apps/ui/components/textarea";
import { useState } from "react";
import { errorId } from "./dom-ids.ts";
import { FormField } from "./form-field.tsx";
import type { Project } from "./schema.ts";
import { fromLines, toLines, toTools } from "./text.ts";
import { newId } from "./variants.ts";

export type ProjectFormProps = {
  /** `null` for a new project. */
  project: Project | null;
  onSave: (project: Project) => void;
};

/** The fields of a project: title, description, tasks and tools. */
export function ProjectForm({ project, onSave }: ProjectFormProps) {
  const [title, setTitle] = useState(project?.title ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [tasks, setTasks] = useState(fromLines(project?.tasks ?? []));
  const [tools, setTools] = useState(fromLines(project?.tools ?? []));
  const [showErrors, setShowErrors] = useState(false);
  const titleError = title.trim() === "" ? "Bitte einen Titel eingeben." : null;

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (titleError !== null) {
          setShowErrors(true);
          return;
        }
        onSave({
          id: project?.id ?? newId(),
          title: title.trim(),
          description: description.trim(),
          tasks: toLines(tasks),
          tools: toTools(tools),
        });
      }}
    >
      <DialogHeader>
        <DialogTitle>{project ? "Projekt bearbeiten" : "Projekt hinzufügen"}</DialogTitle>
        <DialogDescription>Leere Felder fehlen im Lebenslauf.</DialogDescription>
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
