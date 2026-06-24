import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppProviders } from "@/app/providers";
import { api } from "@/api";
import { TemplateDetailPage } from "./template-detail-page";

const mocks = vi.hoisted(() => ({
  saveBeforeNavigation: vi.fn(),
}));

vi.mock("./template-design-editor", async () => {
  const React = await import("react");

  return {
    TemplateDesignEditor: React.forwardRef((_props, ref) => {
      React.useImperativeHandle(ref, () => ({ saveBeforeNavigation: mocks.saveBeforeNavigation }));
      return React.createElement("div", null, "Design workspace");
    }),
  };
});

const renderPage = () => {
  render(
    <AppProviders>
      <MemoryRouter initialEntries={["/templates/template-1"]}>
        <Routes>
          <Route path="/templates/:templateId" element={<TemplateDetailPage />} />
        </Routes>
      </MemoryRouter>
    </AppProviders>,
  );
};

describe("template design navigation", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    mocks.saveBeforeNavigation.mockReset();
  });

  it("saves a dirty design before opening the Fields tab", async () => {
    const user = userEvent.setup();
    mocks.saveBeforeNavigation.mockResolvedValue(true);
    vi.spyOn(api.templates, "list").mockResolvedValue({
      items: [{ id: "template-1", name: "Professional Certificate", category: "Course" }],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    } as never);
    vi.spyOn(api.templates, "fields").mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText("Design workspace")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Fields" }));

    await waitFor(() => expect(mocks.saveBeforeNavigation).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("button", { name: "Add field" })).toBeInTheDocument();
  });

  it("keeps the user on Design when auto-save fails", async () => {
    const user = userEvent.setup();
    mocks.saveBeforeNavigation.mockResolvedValue(false);
    vi.spyOn(api.templates, "list").mockResolvedValue({
      items: [{ id: "template-1", name: "Professional Certificate", category: "Course" }],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    } as never);
    vi.spyOn(api.templates, "fields").mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText("Design workspace")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Fields" }));

    await waitFor(() => expect(mocks.saveBeforeNavigation).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Design workspace")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add field" })).not.toBeInTheDocument();
  });
});
