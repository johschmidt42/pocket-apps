import { Globe, Laptop, Link, Mail, MapPin, Phone, type LucideIcon } from "lucide-react";
import type { ContactKind } from "./schema.ts";

/** The German name of each kind of contact line, for the editor. */
export const CONTACT_LABELS: Record<ContactKind, string> = {
  email: "E-Mail",
  website: "Website",
  linkedin: "LinkedIn",
  github: "GitHub",
  phone: "Telefon",
  location: "Ort",
};

/** The icon of each kind of contact line in the CV. lucide has no brand icons. */
export const CONTACT_ICONS: Record<ContactKind, LucideIcon> = {
  email: Mail,
  website: Globe,
  linkedin: Link,
  github: Laptop,
  phone: Phone,
  location: MapPin,
};

/** An example value for each kind, for the placeholder of the field. */
export const CONTACT_PLACEHOLDERS: Record<ContactKind, string> = {
  email: "erika@example.com",
  website: "erika-mustermann.de",
  linkedin: "linkedin.com/in/erika-mustermann",
  github: "github.com/erika",
  phone: "+49 170 1234567",
  location: "Köln",
};
