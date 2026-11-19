import { FileButton, type FileButtonProps } from "./file-button.tsx";
import { hasTouchScreen } from "./touch-screen.ts";

export type CameraButtonProps = Omit<FileButtonProps, "accept" | "capture">;

/**
 * A button that opens the camera on the back of a phone or a tablet. The app gets the photo like
 * from `FileButton`. On a computer, the button does not show: there, the browser would open only
 * the file dialog. Show a `FileButton` next to it for photos that are already on the device.
 */
export function CameraButton(props: CameraButtonProps) {
  if (!hasTouchScreen()) return null;
  return <FileButton accept="image/*" capture="environment" {...props} />;
}
