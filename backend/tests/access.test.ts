import { describe, expect, it, vi } from "vitest";
import { requireRole } from "../src/lib/access.js";

describe("role access", () => {
  it("rejects a customer from an admin-only route", () => {
    const next = vi.fn();
    const guard = requireRole("ADMIN");

    expect(() => guard({ user: { role: "CUSTOMER" } } as never, {} as never, next)).toThrow("Forbidden");
    expect(next).not.toHaveBeenCalled();
  });

  it("allows an admin through", () => {
    const next = vi.fn();
    const guard = requireRole("ADMIN");

    guard({ user: { role: "ADMIN" } } as never, {} as never, next);

    expect(next).toHaveBeenCalledOnce();
  });
});
