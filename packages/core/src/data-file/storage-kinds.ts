// The texts of each storage kind: in the choice "Wo sollen deine Daten liegen?" and on the screen
// of an expired login. A new storage kind adds its texts here.
import { Cloud, FolderOpen, HardDrive, LogIn, type LucideIcon } from "lucide-react";
import type { CloudKind, StorageKind } from "./folder.ts";

export type StorageTexts = {
  icon: LucideIcon;
  /** The name in the choice, and in "Bei … anmelden". */
  title: string;
  /** The texts in the choice. A cloud storage says that all devices see the same data. */
  texts: string[];
  button: string;
  buttonIcon: LucideIcon;
};

export const STORAGE_TEXTS: Record<StorageKind, StorageTexts> = {
  local: {
    icon: HardDrive,
    title: "Ordner auf diesem Computer",
    texts: [
      "Deine Daten liegen in einem Ordner auf diesem Computer, zum Beispiel „Pocket Apps Daten“. Nur dieser Computer hat die Daten. Für ein Backup lege den Ordner gern in deinen OneDrive- oder Google-Drive-Ordner.",
      "Chrome fragt danach, ob die Seite den Ordner bearbeiten darf. Erlaube es.",
    ],
    button: "Ordner wählen …",
    buttonIcon: FolderOpen,
  },
  onedrive: {
    icon: Cloud,
    title: "OneDrive",
    texts: [
      "Deine Daten liegen in deinem OneDrive im Ordner „Apps/Pocket Apps“. Du siehst dieselben Daten auf all deinen Geräten, auch auf dem Handy.",
      "Du meldest dich mit deinem Microsoft-Konto an.",
    ],
    button: "Mit OneDrive verbinden",
    buttonIcon: LogIn,
  },
  dropbox: {
    icon: Cloud,
    title: "Dropbox",
    texts: [
      "Deine Daten liegen in deiner Dropbox im Ordner „Apps/Pocket Apps“. Du siehst dieselben Daten auf all deinen Geräten, auch auf dem Handy.",
      "Du meldest dich einmal mit deinem Dropbox-Konto an.",
    ],
    button: "Mit Dropbox verbinden",
    buttonIcon: LogIn,
  },
};

/** The texts on the screen "Bei … anmelden" when the login of a cloud storage ended. */
export const EXPIRED_LOGIN_TEXTS: Record<CloudKind, string> = {
  onedrive:
    "Deine Anmeldung bei OneDrive gilt nicht mehr. Microsoft erlaubt eine Anmeldung für 24 Stunden. Melde dich wieder an.",
  dropbox: "Deine Anmeldung bei Dropbox gilt nicht mehr. Melde dich wieder an.",
};
