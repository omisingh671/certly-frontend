import { describe, expect, it, vi } from "vitest";
import { createSingleFlight } from "@/api/single-flight";

describe("createSingleFlight", () => {
  it("shares one in-flight refresh across concurrent callers", async () => {
    let resolveRefresh!: (value: string) => void;
    const refresh = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    const runSingleFlight = createSingleFlight<string>();

    const first = runSingleFlight(refresh);
    const second = runSingleFlight(refresh);

    expect(refresh).toHaveBeenCalledTimes(1);
    resolveRefresh("new-access-token");

    await expect(Promise.all([first, second])).resolves.toEqual([
      "new-access-token",
      "new-access-token",
    ]);
  });

  it("allows a new refresh after the previous attempt settles", async () => {
    const refresh = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("expired"))
      .mockResolvedValueOnce("new-access-token");
    const runSingleFlight = createSingleFlight<string>();

    await expect(runSingleFlight(refresh)).rejects.toThrow("expired");
    await expect(runSingleFlight(refresh)).resolves.toBe("new-access-token");
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
