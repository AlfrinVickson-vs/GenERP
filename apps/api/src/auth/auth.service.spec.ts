import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AuthService } from "./auth.service";

describe("AuthService password hashing", () => {
  it("hashes passwords with a non-reversible hash and verifies them", async () => {
    const config = {
      get: (key: string, fallback?: unknown) => (key === "COOKIE_SECURE" ? false : fallback),
      getOrThrow: () => "a-development-secret-that-is-long-enough"
    };
    const service = new AuthService({} as never, config as never, {} as never);
    const hash = await service.hashPassword("Admin123!");

    assert.equal(hash.includes("Admin123!"), false);
    assert.equal(await service.verifyPassword(hash, "Admin123!"), true);
    assert.equal(await service.verifyPassword(hash, "Wrong123!"), false);
  });
});
