import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CameraButton } from "./camera-button.tsx";
import { hasTouchScreen } from "./touch-screen.ts";

function touchScreen(matches: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: matches && query === "(pointer: coarse)",
  }));
}

describe("CameraButton", () => {
  it("opens the camera on the back on a device with a touch screen", async () => {
    touchScreen(true);
    const onFile = vi.fn();
    const user = userEvent.setup();
    render(
      <CameraButton inputLabel="Kamera" onFile={onFile}>
        Foto aufnehmen
      </CameraButton>,
    );

    expect(screen.getByRole("button", { name: "Foto aufnehmen" })).toBeInTheDocument();
    const input = screen.getByLabelText("Kamera");
    expect(input).toHaveAttribute("capture", "environment");
    expect(input).toHaveAttribute("accept", "image/*");

    const photo = new File(["jpeg"], "foto.jpg", { type: "image/jpeg" });
    await user.upload(input, photo);
    expect(onFile).toHaveBeenCalledWith(photo);
  });

  it("does not show on a computer", () => {
    touchScreen(false);
    render(
      <CameraButton inputLabel="Kamera" onFile={vi.fn()}>
        Foto aufnehmen
      </CameraButton>,
    );

    expect(screen.queryByRole("button", { name: "Foto aufnehmen" })).not.toBeInTheDocument();
  });

  it("finds no touch screen without matchMedia", () => {
    // jsdom has no matchMedia.
    expect(hasTouchScreen()).toBe(false);
  });
});
