const decimal = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });
const day = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" });

/** The size of a file: "3,6 MB", or "240 KB" below 1 MB. */
export function formatFileSize(bytes: number): string {
  const megabytes = bytes / 1024 / 1024;
  if (megabytes >= 1) return `${decimal.format(megabytes)} MB`;
  return `${String(Math.max(1, Math.round(bytes / 1024)))} KB`;
}

/** The day of a time in milliseconds (for example `file.lastModified`): "14.12.2022". */
export function formatDate(time: number): string {
  return day.format(time);
}
