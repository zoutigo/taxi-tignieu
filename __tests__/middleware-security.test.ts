/**
 * @jest-environment node
 */
import { isBlockedPath } from "@/lib/security-paths";

describe("middleware suspicious path blocking", () => {
  it("blocks known attack paths", () => {
    expect(isBlockedPath("/.env")).toBe(true);
    expect(isBlockedPath("/.env.production")).toBe(true);
    expect(isBlockedPath("/bin")).toBe(true);
    expect(isBlockedPath("/bin/sh")).toBe(true);
    expect(isBlockedPath("/api/live/ws")).toBe(true);
    expect(isBlockedPath("/.git/config")).toBe(true);
    expect(isBlockedPath("/wp-login.php")).toBe(true);
  });

  it("does not block normal application routes", () => {
    expect(isBlockedPath("/")).toBe(false);
    expect(isBlockedPath("/services")).toBe(false);
    expect(isBlockedPath("/reserver")).toBe(false);
    expect(isBlockedPath("/api/tarifs/config")).toBe(false);
  });
});
