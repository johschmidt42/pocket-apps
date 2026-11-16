import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NameDialog, type NameRequest } from "./name-dialog.tsx";

const TEXTS = {
  newTitle: "Neues Profil",
  renameTitle: "Profil umbenennen",
  label: "Name des Profils",
  placeholder: "z. B. Wohnung Berlin",
};

function renderDialog(request: NameRequest | null) {
  const onSave = vi.fn<(name: string) => void>();
  const onClose = vi.fn<() => void>();
  render(<NameDialog request={request} texts={TEXTS} onSave={onSave} onClose={onClose} />);
  return { onSave, onClose, user: userEvent.setup() };
}

describe("NameDialog", () => {
  it("is closed without a request", () => {
    renderDialog(null);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("asks for a new name and saves it without spaces", async () => {
    const { onSave, user } = renderDialog({ kind: "new" });

    expect(screen.getByRole("dialog", { name: "Neues Profil" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Speichern" })).toBeDisabled();
    await user.type(screen.getByLabelText("Name des Profils"), "  Ferienhaus {Enter}");

    expect(onSave).toHaveBeenCalledWith("Ferienhaus");
  });

  it("does not save an empty name", async () => {
    const { onSave, user } = renderDialog({ kind: "new" });

    await user.type(screen.getByLabelText("Name des Profils"), "   {Enter}");

    expect(onSave).not.toHaveBeenCalled();
  });

  it("starts with the old name for a new name", async () => {
    const { onSave, user } = renderDialog({ kind: "rename", name: "Hütte" });

    expect(screen.getByRole("dialog", { name: "Profil umbenennen" })).toBeVisible();
    expect(screen.getByLabelText("Name des Profils")).toHaveValue("Hütte");
    await user.type(screen.getByLabelText("Name des Profils"), "n");
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    expect(onSave).toHaveBeenCalledWith("Hütten");
  });

  it("closes with Escape", async () => {
    const { onClose, user } = renderDialog({ kind: "new" });

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalled();
  });
});
