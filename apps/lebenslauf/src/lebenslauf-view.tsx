import { NameDialog, type NameDialogTexts } from "@pocket-apps/core/name-dialog";
import { isOneOf } from "@pocket-apps/core/one-of";
import { Button } from "@pocket-apps/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@pocket-apps/ui/components/card";
import { ToggleGroup, ToggleGroupItem } from "@pocket-apps/ui/components/toggle-group";
import { Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { flushSync } from "react-dom";
import { ContactCard } from "./contact-card.tsx";
import { CvFrame } from "./cv-frame.tsx";
import { CvDocument } from "./designs/cv-document.tsx";
import { DESIGN_INFO } from "./designs/designs.ts";
import { ADD_SECTION_ID, addEntryId, VARIANT_SELECT_ID } from "./dom-ids.ts";
import { sameTarget, type HighlightTarget } from "./highlight.ts";
import { EntryDialog, type EntryDraft } from "./entry-dialog.tsx";
import { exampleSections } from "./example.ts";
import { useDataFile, type Section } from "./schema.ts";
import { SectionCard } from "./section-card.tsx";
import { SectionDialog } from "./section-dialog.tsx";
import { PhotoCard } from "./photo-card.tsx";
import { PhotoError } from "./photo.ts";
import { moveById, moveTo, useDragSort } from "@pocket-apps/ui/drag-sort";
import { SortHint } from "@pocket-apps/ui/sort-hint";
import { usePhotoUrl } from "./use-photo-url.ts";
import { VariantBar } from "./variant-bar.tsx";
import { VariantDialog } from "./variant-dialog.tsx";
import {
  activeVariant,
  addVariant,
  dropEntry,
  duplicateVariant,
  photoFileName,
  moveEntry,
  newId,
  removeActiveVariant,
  removeById,
  removeEntry,
  setActiveVariant,
  updateActiveSections,
  updateActiveVariant,
  updateVariantById,
  updateSection,
  upsertEntry,
} from "./variants.ts";

const VARIANT_NAME_TEXTS = {
  newTitle: "Neue Variante",
  renameTitle: "Variante umbenennen",
  label: "Name der Variante",
  placeholder: "z. B. Firma X – Data Engineer",
} satisfies NameDialogTexts;

/** On narrow screens, the app shows either the editor or the preview. */
const PANES = ["edit", "preview"] as const;
type Pane = (typeof PANES)[number];

/** The draft of an entry of a section. `entryId` is `null` for a new entry. */
function entryDraft(section: Section, entryId: string | null): EntryDraft {
  switch (section.kind) {
    case "projects":
      return {
        sectionId: section.id,
        kind: "projects",
        entry: section.entries.find((entry) => entry.id === entryId) ?? null,
      };
    case "stations":
      return {
        sectionId: section.id,
        kind: "stations",
        entry: section.entries.find((entry) => entry.id === entryId) ?? null,
      };
    case "list":
      return {
        sectionId: section.id,
        kind: "list",
        entry: section.entries.find((entry) => entry.id === entryId) ?? null,
      };
  }
}

/** The editor and the preview of the active variant. Use it only inside `DataFileProvider`. */
export type LebenslaufViewProps = {
  /** Cuts and scales a picked photo. Tests give a fake: jsdom has no canvas. */
  preparePhoto: (file: Blob) => Promise<Blob>;
};

export function LebenslaufView({ preparePhoto }: LebenslaufViewProps) {
  const { data, update, files } = useDataFile();
  const variant = activeVariant(data);
  // Counts the changes of photo files. A file with the same name then loads again.
  const [photoRevision, setPhotoRevision] = useState(0);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoUrl = usePhotoUrl(files, variant.photo, photoRevision);
  const [frame, setFrame] = useState<HTMLIFrameElement | null>(null);
  const [pane, setPane] = useState<Pane>("edit");
  const [newVariantOpen, setNewVariantOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newSectionOpen, setNewSectionOpen] = useState(false);
  // The section or entry under the mouse (or with the keyboard focus), in the editor or in the
  // preview. Both show it.
  const [highlight, setHighlight] = useState<HighlightTarget | null>(null);

  /** Prepares the picked photo and saves it as the photo of the active variant. */
  async function choosePhoto(file: File) {
    if (!files) return;
    const variantId = variant.id;
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      const name = photoFileName(variantId);
      await files.write(name, await preparePhoto(file));
      update((current) =>
        updateVariantById(current, variantId, (each) => ({ ...each, photo: name })),
      );
      setPhotoRevision((count) => count + 1);
    } catch (error) {
      // Errors of the browser (for example a lost access to the folder) have English texts.
      setPhotoError(
        error instanceof PhotoError
          ? error.message
          : "Das Foto konnte nicht im Datenordner gespeichert werden.",
      );
    } finally {
      setPhotoBusy(false);
    }
  }

  async function removePhoto() {
    const name = variant.photo;
    if (!files || name === null) return;
    const variantId = variant.id;
    setPhotoError(null);
    try {
      await files.remove(name);
      update((current) =>
        updateVariantById(current, variantId, (each) => ({ ...each, photo: null })),
      );
      setPhotoRevision((count) => count + 1);
    } catch {
      setPhotoError("Das Foto konnte nicht gelöscht werden.");
    }
  }

  /** Copies the active variant. Its photo gets a file with the ID of the copy. */
  async function copyVariant() {
    const source = variant;
    const variantId = newId();
    let photo: string | null = null;
    setPhotoError(null);
    if (files && source.photo !== null) {
      setPhotoBusy(true);
      try {
        const blob = await files.read(source.photo);
        if (blob) {
          photo = photoFileName(variantId);
          await files.write(photo, blob);
        } else {
          setPhotoError("Die Kopie hat kein Foto: Die Fotodatei fehlt im Datenordner.");
        }
      } catch {
        photo = null;
        setPhotoError("Die Kopie hat kein Foto: Das Foto konnte nicht kopiert werden.");
      } finally {
        setPhotoBusy(false);
      }
    }
    update((current) => duplicateVariant(current, source.id, { variantId, newId, photo }));
  }

  function hover(target: HighlightTarget | null) {
    setHighlight((current) => (sameTarget(current, target) ? current : target));
  }

  const [draft, setDraft] = useState<EntryDraft | null>(null);
  const sectionSort = useDragSort({
    onDrop: (draggedId, targetId, position) => {
      update((current) =>
        updateActiveSections(current, (sections) =>
          moveTo(sections, draggedId, targetId, position),
        ),
      );
    },
    onStep: (id, direction) => {
      update((current) =>
        updateActiveSections(current, (sections) => moveById(sections, id, direction)),
      );
    },
  });

  function changeSection(sectionId: string, change: (section: Section) => Section) {
    update((current) =>
      updateActiveVariant(current, (active) => updateSection(active, sectionId, change)),
    );
  }

  function removeSection(section: Section) {
    if (!window.confirm(`Abschnitt „${section.title}“ mit allen Einträgen löschen?`)) return;
    flushSync(() => {
      update((current) =>
        updateActiveSections(current, (sections) => removeById(sections, section.id)),
      );
    });
    document.getElementById(ADD_SECTION_ID)?.focus();
  }

  function removeSectionEntry(section: Section, entryId: string) {
    flushSync(() => {
      changeSection(section.id, (current) => removeEntry(current, entryId));
    });
    document.getElementById(addEntryId(section.id))?.focus();
  }

  function addSection(title: string, kind: Section["kind"]) {
    setNewSectionOpen(false);
    const section: Section = { id: newId(), title, kind, entries: [] };
    update((current) => updateActiveSections(current, (sections) => [...sections, section]));
  }

  return (
    <main className="flex w-full flex-col gap-4 p-4">
      <SortHint />
      <VariantBar
        busy={photoBusy}
        variants={data.variants}
        active={variant}
        onSelect={(id) => {
          update((current) => setActiveVariant(current, id));
        }}
        onNew={() => {
          setNewVariantOpen(true);
        }}
        onDuplicate={() => {
          void copyVariant();
        }}
        onRename={() => {
          setRenaming(true);
        }}
        onRemove={() => {
          if (!window.confirm(`Variante „${variant.name}“ mit allen Abschnitten löschen?`)) return;
          const photo = variant.photo;
          flushSync(() => {
            update(removeActiveVariant);
          });
          // A photo file that stays after a failed delete does no harm. No variant uses it.
          if (files && photo !== null) void files.remove(photo).catch(() => undefined);
          document.getElementById(VARIANT_SELECT_ID)?.focus();
        }}
        onDesign={(design) => {
          update((current) => updateActiveVariant(current, (active) => ({ ...active, design })));
        }}
        onLanguage={(language) => {
          update((current) => updateActiveVariant(current, (active) => ({ ...active, language })));
        }}
        onPrint={() => {
          // In a narrow window, the preview can be hidden. Chrome prints a hidden frame empty.
          flushSync(() => {
            setPane("preview");
          });
          frame?.contentWindow?.print();
        }}
      />

      <ToggleGroup
        type="single"
        variant="outline"
        spacing={0}
        className="lg:hidden"
        aria-label="Ansicht"
        value={pane}
        onValueChange={(value) => {
          if (isOneOf(PANES, value)) setPane(value);
        }}
      >
        <ToggleGroupItem value="edit">Bearbeiten</ToggleGroupItem>
        <ToggleGroupItem value="preview">Vorschau</ToggleGroupItem>
      </ToggleGroup>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] xl:grid-cols-[minmax(0,40rem)_minmax(0,1fr)]">
        <div
          className={
            pane === "edit" ? "flex flex-col gap-4" : "hidden lg:flex lg:flex-col lg:gap-4"
          }
        >
          <ContactCard
            person={data.person}
            onChange={(change) => {
              update((current) => ({ ...current, person: change(current.person) }));
            }}
          />

          <PhotoCard
            photoUrl={photoUrl}
            hasPhoto={variant.photo !== null}
            busy={photoBusy}
            error={photoError}
            onChoose={(file) => {
              void choosePhoto(file);
            }}
            onRemove={() => {
              void removePhoto();
            }}
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Abschnitte</h2>
            <Button
              id={ADD_SECTION_ID}
              variant="outline"
              onClick={() => {
                setNewSectionOpen(true);
              }}
            >
              <Plus data-icon="inline-start" />
              Abschnitt hinzufügen
            </Button>
          </div>

          {variant.sections.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <h3>Noch keine Abschnitte</h3>
                </CardTitle>
                <CardDescription>
                  Ein Abschnitt ist zum Beispiel „Berufserfahrung“ oder „Projekte“. Das Beispiel
                  zeigt das Design „{DESIGN_INFO[variant.design].label}“ mit erfundenen Daten.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  onClick={() => {
                    update((current) =>
                      updateActiveSections(current, () => exampleSections(newId)),
                    );
                  }}
                >
                  <Sparkles data-icon="inline-start" />
                  Beispiel laden
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col gap-4" {...sectionSort.listProps()}>
            {variant.sections.map((section) => (
              <div
                key={section.id}
                {...sectionSort.rowProps(section.id)}
                className={
                  highlight?.sectionId === section.id
                    ? `${sectionSort.rowClass(section.id)} rounded-2xl ring-2 ring-primary/40`
                    : `${sectionSort.rowClass(section.id)} rounded-2xl`
                }
                data-highlighted={highlight?.sectionId === section.id || undefined}
                onMouseEnter={() => {
                  hover({ sectionId: section.id, entryId: null });
                }}
                onMouseLeave={() => {
                  hover(null);
                }}
              >
                <SectionCard
                  section={section}
                  handleProps={sectionSort.handleProps(section.id)}
                  onRename={(title) => {
                    changeSection(section.id, (current) => ({ ...current, title }));
                  }}
                  onRemove={() => {
                    removeSection(section);
                  }}
                  onAddEntry={() => {
                    setDraft(entryDraft(section, null));
                  }}
                  onEditEntry={(entryId) => {
                    setDraft(entryDraft(section, entryId));
                  }}
                  onStepEntry={(entryId, direction) => {
                    changeSection(section.id, (current) => moveEntry(current, entryId, direction));
                  }}
                  onDropEntry={(draggedId, targetId, position) => {
                    changeSection(section.id, (current) =>
                      dropEntry(current, draggedId, targetId, position),
                    );
                  }}
                  highlightedEntryId={
                    highlight?.sectionId === section.id ? highlight.entryId : null
                  }
                  onHoverEntry={(entryId) => {
                    hover({ sectionId: section.id, entryId });
                  }}
                  onRemoveEntry={(entryId) => {
                    removeSectionEntry(section, entryId);
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <section
          aria-label="Vorschau"
          className={
            pane === "preview"
              ? "block lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto"
              : "hidden lg:sticky lg:top-4 lg:block lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto"
          }
        >
          <CvFrame
            title={data.person.name.trim() === "" ? "Lebenslauf" : `Lebenslauf ${data.person.name}`}
            language={variant.language}
            css={DESIGN_INFO[variant.design].css}
            pageMargin={DESIGN_INFO[variant.design].pageMargin}
            highlight={highlight}
            onHover={hover}
            frame={frame}
            onFrame={setFrame}
          >
            <CvDocument person={data.person} variant={variant} photoUrl={photoUrl} />
          </CvFrame>
          <p className="mt-2 text-xs text-muted-foreground">
            Die Vorschau zeigt die A4-Seiten so wie der Druck. Jeder Eintrag bleibt auf einer Seite
            zusammen.
          </p>
        </section>
      </div>

      <VariantDialog
        open={newVariantOpen}
        onSave={(choice) => {
          update((current) => addVariant(current, { id: newId(), ...choice }));
          setNewVariantOpen(false);
        }}
        onClose={() => {
          setNewVariantOpen(false);
        }}
      />
      <NameDialog
        request={renaming ? { kind: "rename", name: variant.name } : null}
        texts={VARIANT_NAME_TEXTS}
        onSave={(name) => {
          update((current) => updateActiveVariant(current, (active) => ({ ...active, name })));
          setRenaming(false);
        }}
        onClose={() => {
          setRenaming(false);
        }}
      />
      <SectionDialog
        open={newSectionOpen}
        onSave={addSection}
        onClose={() => {
          setNewSectionOpen(false);
        }}
      />
      <EntryDialog
        draft={draft}
        onSave={(sectionId, saved) => {
          changeSection(sectionId, (section) => upsertEntry(section, saved));
          setDraft(null);
        }}
        onClose={() => {
          setDraft(null);
        }}
      />
    </main>
  );
}
