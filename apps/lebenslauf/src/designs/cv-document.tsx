import type { Person, Variant } from "../schema.ts";
import { KlassischCv } from "./klassisch-cv.tsx";

/**
 * The CV of a variant in the design of the variant. Today "klassisch" is the only design.
 * A second design adds a `switch` on `variant.design` here.
 */
export type CvDocumentProps = {
  person: Person;
  variant: Variant;
  /** The photo of the variant as a data URL, or `null`. */
  photoUrl: string | null;
};

export function CvDocument({ person, variant, photoUrl }: CvDocumentProps) {
  return <KlassischCv person={person} variant={variant} photoUrl={photoUrl} />;
}
