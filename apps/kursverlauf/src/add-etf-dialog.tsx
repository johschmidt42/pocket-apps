import { Button } from "@pocket-apps/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@pocket-apps/ui/components/dialog";
import { Input } from "@pocket-apps/ui/components/input";
import { Label } from "@pocket-apps/ui/components/label";
import { NativeSelect, NativeSelectOption } from "@pocket-apps/ui/components/native-select";
import { Search } from "lucide-react";
import { useState } from "react";
import type { FetchJson } from "@pocket-apps/core/fetch-json";
import type { Etf } from "./schema.ts";
import { isIsin, parseSearch, searchUrl, type SearchHit } from "./twelve-data.ts";

export type NewEtf = Omit<Etf, "id">;

export type AddEtfDialogProps = {
  open: boolean;
  /** The symbols that the list has already. */
  existing: readonly string[];
  fetchJson: FetchJson;
  onAdd: (etf: NewEtf) => void;
  onClose: () => void;
};

/** Finds an ETF by ISIN or ticker and adds it. */
export function AddEtfDialog({ open, existing, fetchJson, onAdd, onClose }: AddEtfDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ETF hinzufügen</DialogTitle>
          <DialogDescription>
            Suche nach der ISIN (z. B. IE00B3RBWM25) oder nach dem Xetra-Kürzel (z. B. VGWL). Die
            Suche läuft über Twelve Data. Sie bekommt nur deinen Suchtext.
          </DialogDescription>
        </DialogHeader>
        {open && <AddEtfForm existing={existing} fetchJson={fetchJson} onAdd={onAdd} />}
      </DialogContent>
    </Dialog>
  );
}

type SearchState =
  | { kind: "idle" }
  | { kind: "searching" }
  | { kind: "error"; message: string }
  | { kind: "found"; query: string; hits: SearchHit[] };

function AddEtfForm({ existing, fetchJson, onAdd }: Omit<AddEtfDialogProps, "open" | "onClose">) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState>({ kind: "idle" });
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");

  async function find() {
    setSearch({ kind: "searching" });
    const response = await fetchJson(searchUrl(query));
    if (response.kind !== "ok") {
      setSearch({
        kind: "error",
        message:
          response.kind === "offline"
            ? "Die Suche geht gerade nicht. Prüfe deine Verbindung."
            : "Die Suche gibt eine unerwartete Antwort.",
      });
      return;
    }
    const hits = parseSearch(response.json);
    if (hits === null) {
      setSearch({ kind: "error", message: "Die Suche gibt eine unerwartete Antwort." });
    } else if (hits.length === 0) {
      setSearch({
        kind: "error",
        message: "Kein Treffer an der Börse Xetra. Die App kennt nur Kurse von Xetra.",
      });
    } else {
      setSearch({ kind: "found", query: query.trim().toUpperCase(), hits });
      setSymbol(hits[0]?.symbol ?? "");
      setName(hits[0]?.name ?? "");
    }
  }

  const duplicate = existing.includes(symbol);

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (query.trim() !== "") void find();
        }}
      >
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="etf-query">ISIN oder Kürzel</Label>
          <Input
            id="etf-query"
            value={query}
            autoComplete="off"
            onChange={(event) => {
              setQuery(event.target.value);
            }}
          />
        </div>
        <Button
          type="submit"
          variant="outline"
          disabled={search.kind === "searching" || query.trim() === ""}
        >
          <Search data-icon="inline-start" />
          Suchen
        </Button>
      </form>

      {search.kind === "searching" && <p className="text-sm text-muted-foreground">Sucht …</p>}
      {search.kind === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {search.message}
        </p>
      )}
      {search.kind === "found" && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim() === "" || duplicate) return;
            onAdd({ isin: isIsin(search.query) ? search.query : "", symbol, name: name.trim() });
          }}
        >
          {search.hits.length > 1 && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="etf-symbol">Treffer</Label>
              <NativeSelect
                id="etf-symbol"
                value={symbol}
                onChange={(event) => {
                  const hit = search.hits.find(
                    (candidate) => candidate.symbol === event.target.value,
                  );
                  setSymbol(event.target.value);
                  if (hit) setName(hit.name);
                }}
              >
                {search.hits.map((hit) => (
                  <NativeSelectOption key={hit.symbol} value={hit.symbol}>
                    {`${hit.symbol} – ${hit.name}`}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          )}
          <p className="text-sm">
            Gefunden: <span className="font-medium">{symbol}</span>
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="etf-name">Name in der App</Label>
            <Input
              id="etf-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Der Name aus der Suche ist nicht immer richtig. Du kannst ihn hier ändern.
            </p>
          </div>
          {duplicate && (
            <p role="alert" className="text-sm text-destructive">
              Diesen ETF hast du schon.
            </p>
          )}
          <Button type="submit" className="self-start" disabled={name.trim() === "" || duplicate}>
            Hinzufügen
          </Button>
        </form>
      )}
    </div>
  );
}
