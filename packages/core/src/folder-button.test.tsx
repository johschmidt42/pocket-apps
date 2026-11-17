import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FolderButton } from "./folder-button.tsx";

describe("FolderButton", () => {
  it("opens the folder dialog and gives all files of the folder to the app", async () => {
    const user = userEvent.setup();
    const onFiles = vi.fn();
    render(
      <FolderButton inputLabel="Bildordner" onFiles={onFiles}>
        Ordner wählen …
      </FolderButton>,
    );
    const input = screen.getByLabelText<HTMLInputElement>("Bildordner");
    expect(input.webkitdirectory).toBe(true);
    const click = vi.spyOn(input, "click");

    await user.click(screen.getByRole("button", { name: "Ordner wählen …" }));
    expect(click).toHaveBeenCalledOnce();

    const files = [
      new File(["a"], "a.jpg", { type: "image/jpeg" }),
      new File(["b"], "b.png", { type: "image/png" }),
    ];
    await user.upload(input, files);
    expect(onFiles).toHaveBeenCalledWith(files);
    // The field is empty again, so the same folder can be picked again.
    expect(input.value).toBe("");
  });
});
