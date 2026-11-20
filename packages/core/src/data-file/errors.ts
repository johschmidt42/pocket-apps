export type DataFileErrorCode =
  | "invalid-json"
  | "invalid-envelope"
  | "wrong-app"
  | "too-new"
  | "missing-migration"
  | "invalid-data"
  | "invalid-file-name"
  | "move-failed"
  | "cloud-login"
  | "cloud-failed";

/** An error that the user can understand. The message is in German. */
export class DataFileError extends Error {
  readonly code: DataFileErrorCode;

  constructor(code: DataFileErrorCode, message: string) {
    super(message);
    this.name = "DataFileError";
    this.code = code;
  }
}
