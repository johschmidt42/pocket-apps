import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";
import { DataFolderContext } from "../data-file/data-folder-context.ts";
import { createMemoryFolder } from "../data-file/testing.ts";
import { AiDataNotice } from "./ai-data-notice.tsx";
import { AiSetupNotice } from "./ai-setup-notice.tsx";

describe("AI notices", () => {
  it("opens the AI settings and reports the close", async () => {
    vi.stubGlobal("indexedDB", new IDBFactory());
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <DataFolderContext value={{ folder: createMemoryFolder(), appVersion: "1.0" }}>
        <AiSetupNotice feature="liest deine Notizen" onClose={onClose} />
      </DataFolderContext>,
    );

    expect(
      screen.getByText(
        "Die KI liest deine Notizen. Dafür brauchst du einen eigenen API-Key von Claude oder OpenAI.",
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "KI einrichten" }));
    expect(await screen.findByRole("dialog", { name: "KI einrichten" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("says which data goes to which provider", () => {
    render(<AiDataNotice provider="openai" data="deine Notizen" />);

    expect(
      screen.getByText("Diese Daten gehen an OpenAI: deine Notizen. Sonst nichts."),
    ).toBeInTheDocument();
  });
});
