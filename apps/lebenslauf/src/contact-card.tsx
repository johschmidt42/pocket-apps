import { isOneOf } from "@pocket-apps/core/one-of";
import { Button } from "@pocket-apps/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@pocket-apps/ui/components/card";
import { Input } from "@pocket-apps/ui/components/input";
import { Label } from "@pocket-apps/ui/components/label";
import { NativeSelect, NativeSelectOption } from "@pocket-apps/ui/components/native-select";
import { Plus, Trash2 } from "lucide-react";
import { flushSync } from "react-dom";
import { useDragSort } from "./use-drag-sort.ts";
import { CONTACT_LABELS, CONTACT_PLACEHOLDERS } from "./contact-kinds.ts";
import { DragHandle } from "./drag-handle.tsx";
import { CONTACT_KINDS, type Person } from "./schema.ts";
import {
  addContact,
  dropContact,
  moveContact,
  newId,
  removeContact,
  setName,
  updateContact,
} from "./variants.ts";

const ADD_ID = "contact-add";

function valueId(contactId: string): string {
  return `contact-value-${contactId}`;
}

export type ContactCardProps = {
  person: Person;
  /** Changes the person. The change applies to all variants. */
  onChange: (change: (person: Person) => Person) => void;
};

/** The name and the contact lines. All variants share them. */
export function ContactCard({ person, onChange }: ContactCardProps) {
  const contacts = person.contacts;
  const sort = useDragSort({
    onDrop: (draggedId, targetId, position) => {
      onChange((current) => dropContact(current, draggedId, targetId, position));
    },
    onStep: (id, direction) => {
      onChange((current) => moveContact(current, id, direction));
    },
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Name und Kontakt</h2>
        </CardTitle>
        <CardDescription>Gilt für alle Varianten.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="person-name">Name</Label>
          <Input
            id="person-name"
            value={person.name}
            placeholder="z. B. Erika Mustermann"
            onChange={(event) => {
              const name = event.target.value;
              onChange((current) => setName(current, name));
            }}
          />
        </div>
        {contacts.length > 0 && (
          <ul className="flex flex-col gap-2" aria-label="Kontaktzeilen" {...sort.listProps()}>
            {contacts.map((contact) => {
              const kindId = `contact-kind-${contact.id}`;
              const label = CONTACT_LABELS[contact.kind];
              return (
                <li
                  key={contact.id}
                  {...sort.rowProps(contact.id)}
                  className={`${sort.rowClass(contact.id)} flex flex-wrap items-center gap-1`}
                >
                  <DragHandle name={label} {...sort.handleProps(contact.id)} />
                  <Label htmlFor={kindId} className="sr-only">
                    Art der Kontaktzeile
                  </Label>
                  <NativeSelect
                    id={kindId}
                    value={contact.kind}
                    onChange={(event) => {
                      const kind = event.target.value;
                      if (!isOneOf(CONTACT_KINDS, kind)) return;
                      onChange((current) => updateContact(current, { ...contact, kind }));
                    }}
                  >
                    {CONTACT_KINDS.map((kind) => (
                      <NativeSelectOption key={kind} value={kind}>
                        {CONTACT_LABELS[kind]}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <Label htmlFor={valueId(contact.id)} className="sr-only">
                    {label}
                  </Label>
                  <Input
                    id={valueId(contact.id)}
                    className="min-w-40 flex-1"
                    value={contact.value}
                    placeholder={CONTACT_PLACEHOLDERS[contact.kind]}
                    onChange={(event) => {
                      const value = event.target.value;
                      onChange((current) => updateContact(current, { ...contact, value }));
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${label} löschen`}
                    onClick={() => {
                      flushSync(() => {
                        onChange((current) => removeContact(current, contact.id));
                      });
                      document.getElementById(ADD_ID)?.focus();
                    }}
                  >
                    <Trash2 />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        <div>
          <Button
            id={ADD_ID}
            variant="outline"
            size="sm"
            onClick={() => {
              const id = newId();
              flushSync(() => {
                onChange((current) => addContact(current, id));
              });
              document.getElementById(valueId(id))?.focus();
            }}
          >
            <Plus data-icon="inline-start" />
            Kontaktzeile hinzufügen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
