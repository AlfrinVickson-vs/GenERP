import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasPermission, maskSensitive } from "./index";

describe("permission matching", () => {
  it("allows explicit permissions", () => {
    assert.equal(hasPermission(["company.view"], "company.view"), true);
  });

  it("allows module wildcards", () => {
    assert.equal(hasPermission(["branch.*"], "branch.delete"), true);
  });

  it("allows global wildcard", () => {
    assert.equal(hasPermission(["*"], "security_settings.change"), true);
  });

  it("rejects unrelated permissions", () => {
    assert.equal(hasPermission(["company.view"], "company.edit"), false);
  });
});

describe("audit masking", () => {
  it("masks sensitive object keys", () => {
    assert.deepEqual(maskSensitive({ email: "a@b.test", password: "secret" }), {
      email: "a@b.test",
      password: "[MASKED]"
    });
  });
});
