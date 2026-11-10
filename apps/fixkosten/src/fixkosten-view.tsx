import { Button } from "@pocket-apps/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@pocket-apps/ui/components/card";
import { Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { flushSync } from "react-dom";
import { summarize } from "./budget.ts";
import { ChartsPanel } from "./charts-panel.tsx";
import { EntryDialog, type EntryDraft, type SavedEntry } from "./entry-dialog.tsx";
import { addButtonId, entryButtonId } from "./dom-ids.ts";
import { EntryList } from "./entry-list.tsx";
import type { Period } from "./money.ts";
import { ProfileBar } from "./profile-bar.tsx";
import { ProfileNameDialog, type ProfileNameRequest } from "./profile-name-dialog.tsx";
import {
  activeProfile,
  addProfile,
  newId,
  removeActiveProfile,
  removeById,
  setActiveProfile,
  updateActiveProfile,
  upsert,
} from "./profiles.ts";
import { costRows, incomeRows } from "./rows.ts";
import { SAMPLE_COSTS, SAMPLE_INCOMES } from "./sample-data.ts";
import { useDataFile } from "./schema.ts";
import { SummaryTiles } from "./summary-tiles.tsx";

/** The DOM ID of the list "Fixkosten" or "Einkommen". */
const LIST_IDS = { cost: "costs", income: "incomes" } as const;

/** The running costs of the active profile: numbers, charts and lists. Use it only inside `DataFileProvider`. */
export function FixkostenView() {
  const { data, update } = useDataFile();
  const [period, setPeriod] = useState<Period>("month");
  const [draft, setDraft] = useState<EntryDraft | null>(null);
  const [nameRequest, setNameRequest] = useState<ProfileNameRequest | null>(null);
  const profile = activeProfile(data);
  const isEmpty = profile.costs.length === 0 && profile.incomes.length === 0;

  function save(saved: SavedEntry) {
    update((current) =>
      updateActiveProfile(current, (active) =>
        saved.kind === "cost"
          ? { ...active, costs: upsert(active.costs, saved.entry) }
          : { ...active, incomes: upsert(active.incomes, saved.entry) },
      ),
    );
    setDraft(null);
  }

  function remove(kind: "cost" | "income", id: string, name: string) {
    if (!window.confirm(`„${name}“ löschen?`)) return;
    const ids = (kind === "cost" ? costRows(profile.costs) : incomeRows(profile.incomes)).map(
      (row) => row.id,
    );
    const index = ids.indexOf(id);
    const neighbour = ids[index + 1] ?? ids[index - 1];
    flushSync(() => {
      update((current) =>
        updateActiveProfile(current, (active) =>
          kind === "cost"
            ? { ...active, costs: removeById(active.costs, id) }
            : { ...active, incomes: removeById(active.incomes, id) },
        ),
      );
    });
    // Keep the keyboard focus in the list.
    document
      .getElementById(neighbour ? entryButtonId(neighbour, "remove") : addButtonId(LIST_IDS[kind]))
      ?.focus();
  }

  function loadSample() {
    update((current) =>
      updateActiveProfile(current, (active) => ({
        ...active,
        incomes: SAMPLE_INCOMES.map((income) => ({ ...income, id: newId() })),
        costs: SAMPLE_COSTS.map((cost) => ({ ...cost, id: newId() })),
      })),
    );
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <ProfileBar
        profiles={data.profiles}
        activeId={profile.id}
        period={period}
        onSelect={(id) => {
          update((current) => setActiveProfile(current, id));
        }}
        onNew={() => {
          setNameRequest({ kind: "new" });
        }}
        onRename={() => {
          setNameRequest({ kind: "rename", name: profile.name });
        }}
        onRemove={() => {
          if (!window.confirm(`Profil „${profile.name}“ mit allen Einträgen löschen?`)) return;
          flushSync(() => {
            update(removeActiveProfile);
          });
          document.getElementById("profile")?.focus();
        }}
        onPeriod={setPeriod}
      />

      {isEmpty ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Noch keine Einträge</h2>
            </CardTitle>
            <CardDescription>
              Trage deine laufenden Kosten ein, zum Beispiel Miete, Strom und Versicherungen. Mit
              deinem Einkommen siehst du auch, was übrig bleibt.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                setDraft({ kind: "cost", entry: null });
              }}
            >
              <Plus data-icon="inline-start" />
              Ersten Posten hinzufügen
            </Button>
            <Button variant="outline" onClick={loadSample}>
              <Sparkles data-icon="inline-start" />
              Beispiel laden
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <SummaryTiles summary={summarize(profile, period)} period={period} />
          <ChartsPanel profile={profile} period={period} />
        </>
      )}

      <div className="flex flex-col gap-4">
        <EntryList
          id={LIST_IDS.cost}
          title="Fixkosten"
          description="Regelmäßige Ausgaben"
          rows={costRows(profile.costs)}
          emptyText="Noch keine Posten."
          addLabel="Posten"
          onAdd={() => {
            setDraft({ kind: "cost", entry: null });
          }}
          onEdit={(id) => {
            setDraft({ kind: "cost", entry: profile.costs.find((cost) => cost.id === id) ?? null });
          }}
          onRemove={(id) => {
            remove("cost", id, profile.costs.find((cost) => cost.id === id)?.name ?? "");
          }}
        />
        <EntryList
          id={LIST_IDS.income}
          title="Einkommen"
          description="Optional: dann zeigt die App, was übrig bleibt"
          rows={incomeRows(profile.incomes)}
          emptyText="Noch kein Einkommen."
          addLabel="Einkommen"
          onAdd={() => {
            setDraft({ kind: "income", entry: null });
          }}
          onEdit={(id) => {
            setDraft({
              kind: "income",
              entry: profile.incomes.find((income) => income.id === id) ?? null,
            });
          }}
          onRemove={(id) => {
            remove("income", id, profile.incomes.find((income) => income.id === id)?.name ?? "");
          }}
        />
      </div>

      <EntryDialog
        draft={draft}
        onSave={save}
        onClose={() => {
          setDraft(null);
        }}
      />
      <ProfileNameDialog
        request={nameRequest}
        onSave={(name) => {
          update((current) =>
            nameRequest?.kind === "rename"
              ? updateActiveProfile(current, (active) => ({ ...active, name }))
              : addProfile(current, newId(), name),
          );
          setNameRequest(null);
        }}
        onClose={() => {
          setNameRequest(null);
        }}
      />
    </main>
  );
}
