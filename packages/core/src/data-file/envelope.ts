import { z } from "zod";
import { DataFileError } from "./errors.ts";

/** The frame around the app data. It is the same for all apps. */
const envelopeSchema = z.object({
  app: z.string().min(1),
  schemaVersion: z.number().int().positive(),
  savedWith: z.string(),
  savedAt: z.iso.datetime(),
  data: z.unknown(),
});

export type Envelope = z.infer<typeof envelopeSchema>;

export function parseEnvelope(text: string): Envelope {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new DataFileError("invalid-json", "Die Datei ist keine gültige JSON-Datei.");
  }

  const result = envelopeSchema.safeParse(json);
  if (!result.success) {
    throw new DataFileError("invalid-envelope", "Die Datei ist keine Pocket-Apps-Datendatei.");
  }
  return result.data;
}

export type SerializeInput = {
  app: string;
  schemaVersion: number;
  appVersion: string;
  data: unknown;
  now?: Date;
};

export function serializeEnvelope(input: SerializeInput): string {
  const envelope: Envelope = {
    app: input.app,
    schemaVersion: input.schemaVersion,
    savedWith: input.appVersion,
    savedAt: (input.now ?? new Date()).toISOString(),
    data: input.data,
  };
  return `${JSON.stringify(envelope, null, 2)}\n`;
}
