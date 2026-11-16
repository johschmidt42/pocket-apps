import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FileButton } from "./file-button.tsx";

describe("FileButton", () => {
  it("opens the file dialog and gives the picked file to the app", async () => {
    const user = userEvent.setup();
    const onFile = vi.fn();
    render(
      <FileButton accept="image/*" inputLabel="Foto-Datei" onFile={onFile}>
        Foto wählen …
      </FileButton>,
    );
    const input = screen.getByLabelText<HTMLInputElement>("Foto-Datei");
    const click = vi.spyOn(input, "click");

    await user.click(screen.getByRole("button", { name: "Foto wählen …" }));
    expect(click).toHaveBeenCalledOnce();

    const file = new File(["x"], "foto.jpg", { type: "image/jpeg" });
    await user.upload(input, file);
    expect(onFile).toHaveBeenCalledWith(file);
    // The field is empty again, so the same file can be picked again.
    expect(input.value).toBe("");
    expect(input).toHaveAttribute("accept", "image/*");
  });
});
