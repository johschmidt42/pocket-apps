/** The text while the app loads the folder or the file. Screen readers announce it. */
export function LoadingStatus() {
  return (
    <p role="status" className="p-4 text-sm text-muted-foreground">
      Lädt …
    </p>
  );
}
