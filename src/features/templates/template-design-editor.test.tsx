import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, RouterProvider, createMemoryRouter } from "react-router-dom";
import { AppProviders } from "@/app/providers";
import { api } from "@/api";
import type { DesignDto } from "@/api/types";
import { defaultTemplateLayout } from "./template-layout";
import { TemplateDesignEditor } from "./template-design-editor";

type MockCanvasLayout = {
  blocks: unknown[];
  page: { width: number };
};

vi.mock("./design-canvas", () => ({
  DesignCanvas: ({ layout, onChangeLayout }: {
    layout: MockCanvasLayout;
    onChangeLayout?: (nextLayout: MockCanvasLayout) => void;
  }) => (
    <button
      type="button"
      onClick={() => onChangeLayout?.({ ...layout, page: { ...layout.page, width: layout.page.width + 1 } })}
    >
      Make design change
    </button>
  ),
}));

const design = (): DesignDto => ({
  id: "design-1",
  templateId: "template-1",
  layoutJson: defaultTemplateLayout,
});

const prepareEditor = () => {
  vi.spyOn(api.templates, "fields").mockResolvedValue([]);
  vi.spyOn(api.templates, "getDesign").mockResolvedValue(design());
};

const renderEditor = () => {
  const router = createMemoryRouter([
    {
      path: "/templates/template-1",
      element: (
        <>
          <Link to="/other">Leave editor</Link>
          <TemplateDesignEditor templateId="template-1" />
        </>
      ),
    },
    { path: "/other", element: <p>Other page</p> },
  ], { initialEntries: ["/templates/template-1"] });

  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
};

describe("template design navigation saving", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows an overlay while a dirty design is saved before route navigation", async () => {
    const user = userEvent.setup();
    prepareEditor();
    let resolveSave: (result: DesignDto) => void;
    const pendingSave = new Promise<DesignDto>((resolve) => {
      resolveSave = resolve;
    });
    vi.spyOn(api.templates, "saveDesign").mockReturnValue(pendingSave);
    renderEditor();

    await user.click(await screen.findByRole("button", { name: "Make design change" }));
    await user.click(screen.getByRole("link", { name: "Leave editor" }));

    expect(await screen.findByText("Saving template design")).toBeInTheDocument();

    await act(async () => resolveSave!(design()));
    expect(await screen.findByText("Other page")).toBeInTheDocument();
  });

  it("does not show the navigation overlay for a manual save", async () => {
    const user = userEvent.setup();
    prepareEditor();
    let resolveSave: (result: DesignDto) => void;
    const pendingSave = new Promise<DesignDto>((resolve) => {
      resolveSave = resolve;
    });
    vi.spyOn(api.templates, "saveDesign").mockReturnValue(pendingSave);
    renderEditor();

    await user.click(await screen.findByRole("button", { name: "Make design change" }));
    await user.click(screen.getByRole("button", { name: "Save Design" }));

    expect(screen.queryByText("Saving template design")).not.toBeInTheDocument();
    await act(async () => resolveSave!(design()));
  });
});
