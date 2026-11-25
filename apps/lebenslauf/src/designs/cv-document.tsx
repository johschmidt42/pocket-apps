import type { Person, Variant } from "../schema.ts";
import { KlassischCv } from "./klassisch-cv.tsx";
import { ModernCv } from "./modern-cv.tsx";
import { ProjektprofilCv } from "./projektprofil-cv.tsx";

export type CvDocumentProps = {
  person: Person;
  variant: Variant;
  /** The photo of the variant as a data URL, or `null`. */
  photoUrl: string | null;
};

/** The CV of a variant in the design of the variant. */
export function CvDocument({ person, variant, photoUrl }: CvDocumentProps) {
  switch (variant.design) {
    case "klassisch":
      return <KlassischCv person={person} variant={variant} photoUrl={photoUrl} />;
    case "modern":
      return <ModernCv person={person} variant={variant} photoUrl={photoUrl} />;
    case "projektprofil":
      return <ProjektprofilCv person={person} variant={variant} photoUrl={photoUrl} />;
  }
}
