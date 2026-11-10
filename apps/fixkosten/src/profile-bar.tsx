import { Button } from "@pocket-apps/ui/components/button";
import { Label } from "@pocket-apps/ui/components/label";
import { NativeSelect, NativeSelectOption } from "@pocket-apps/ui/components/native-select";
import { ToggleGroup, ToggleGroupItem } from "@pocket-apps/ui/components/toggle-group";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PERIODS, type Period } from "./money.ts";
import { isOneOf } from "./one-of.ts";
import type { Profile } from "./schema.ts";

export type ProfileBarProps = {
  profiles: readonly Profile[];
  activeId: string;
  period: Period;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: () => void;
  onRemove: () => void;
  onPeriod: (period: Period) => void;
};

/** Picks the profile and the period (month or year) of the amounts. */
export function ProfileBar(props: ProfileBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex min-w-48 flex-1 flex-col gap-2">
        <Label htmlFor="profile">Profil</Label>
        <div className="flex gap-1">
          <NativeSelect
            id="profile"
            className="w-full"
            value={props.activeId}
            onChange={(event) => {
              props.onSelect(event.target.value);
            }}
          >
            {props.profiles.map((profile) => (
              <NativeSelectOption key={profile.id} value={profile.id}>
                {profile.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Profil umbenennen"
            onClick={props.onRename}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Profil löschen"
            disabled={props.profiles.length < 2}
            onClick={props.onRemove}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
      <Button variant="outline" onClick={props.onNew}>
        <Plus data-icon="inline-start" />
        Neues Profil
      </Button>
      <ToggleGroup
        type="single"
        variant="outline"
        spacing={0}
        aria-label="Beträge pro Monat oder pro Jahr"
        value={props.period}
        onValueChange={(value) => {
          if (isOneOf(PERIODS, value)) props.onPeriod(value);
        }}
      >
        <ToggleGroupItem value="month">pro Monat</ToggleGroupItem>
        <ToggleGroupItem value="year">pro Jahr</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
