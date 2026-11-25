import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@pocket-apps/ui/components/card";
import { Label } from "@pocket-apps/ui/components/label";
import { Textarea } from "@pocket-apps/ui/components/textarea";

export type ProfileCardProps = {
  profile: string;
  onChange: (profile: string) => void;
};

/** The profile of the active variant: a short text under the head of the CV. */
export function ProfileCard({ profile, onChange }: ProfileCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Profil</h2>
        </CardTitle>
        <CardDescription>
          Gilt nur für diese Variante. Zwei bis drei Sätze unter dem Kopf, zum Beispiel Rolle,
          Erfahrung und Schwerpunkte. Leer: Der Lebenslauf zeigt kein Profil.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Label htmlFor="variant-profile">Profiltext</Label>
        <Textarea
          id="variant-profile"
          rows={4}
          value={profile}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        />
      </CardContent>
    </Card>
  );
}
