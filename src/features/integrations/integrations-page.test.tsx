import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppProviders } from "@/app/providers";
import { api } from "@/api";
import { IntegrationsPage } from "@/features/integrations/integrations-page";

const clientList = {
  items: [
    {
      id: "client-1",
      name: "Moodle Production",
      type: "LMS" as const,
      apiKeyLast4: "abcd",
      active: true,
      createdById: "user-1",
      createdAt: "2026-06-25T10:00:00.000Z",
      updatedAt: "2026-06-25T10:00:00.000Z",
    },
  ],
  pagination: {
    page: 1,
    limit: 10,
    total: 1,
    totalPages: 1,
  },
};

const mappingList = {
  items: [],
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  },
};

const logsList = {
  items: [],
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  },
};

describe("integrations page", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("does not open the Add LMS Integration Client modal by default, and renders Create Client button", async () => {
    const user = userEvent.setup();
    vi.spyOn(api.integrations.clients, "list").mockResolvedValue(clientList);
    vi.spyOn(api.integrations.mappings, "list").mockResolvedValue(mappingList);
    vi.spyOn(api.integrations.events, "list").mockResolvedValue(logsList);

    render(
      <AppProviders>
        <MemoryRouter>
          <IntegrationsPage />
        </MemoryRouter>
      </AppProviders>,
    );

    // Verify page title is rendered
    expect(await screen.findByText("Integrations")).toBeInTheDocument();
    
    // Verify client list data is rendered
    expect(await screen.findByText("Moodle Production")).toBeInTheDocument();

    // Verify modal is NOT open initially
    // The modal heading/title should not be in the document
    expect(screen.queryByText("Add LMS Integration Client")).not.toBeInTheDocument();

    // Verify header button has correct text "Create Client" (updated from "Add Client")
    const createBtn = screen.getByRole("button", { name: "Create Client" });
    expect(createBtn).toBeInTheDocument();

    // Click "Create Client" button and verify modal opens
    await user.click(createBtn);
    expect(screen.getByText("Add LMS Integration Client")).toBeInTheDocument();
  });

  it("does not open the Add Batch Mapping modal by default on the mappings tab, and renders Create Mapping button", async () => {
    const user = userEvent.setup();
    vi.spyOn(api.integrations.clients, "list").mockResolvedValue(clientList);
    vi.spyOn(api.integrations.mappings, "list").mockResolvedValue(mappingList);
    vi.spyOn(api.integrations.events, "list").mockResolvedValue(logsList);

    render(
      <AppProviders>
        <MemoryRouter>
          <IntegrationsPage />
        </MemoryRouter>
      </AppProviders>,
    );

    // Switch to "Batch Mappings" tab
    const mappingsTabButton = await screen.findByRole("button", { name: "Batch Mappings" });
    await user.click(mappingsTabButton);

    // Verify mappings view is shown
    expect(await screen.findByText("No Batch Mappings Defined")).toBeInTheDocument();

    // Verify mappings modal is NOT open initially
    expect(screen.queryByText("Add LMS Batch Mapping")).not.toBeInTheDocument();

    // Verify header button has correct text "Create Mapping" (updated from "Add Mapping")
    const createBtn = screen.getByRole("button", { name: "Create Mapping" });
    expect(createBtn).toBeInTheDocument();

    // Click "Create Mapping" button and verify modal opens
    await user.click(createBtn);
    expect(screen.getByText("Add LMS Batch Mapping")).toBeInTheDocument();
  });
});
