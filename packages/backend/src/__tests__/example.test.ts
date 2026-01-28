import assert from "node:assert";
import { describe, it } from "node:test";

describe("example", () => {
  it("should pass a basic test", () => {
    assert.strictEqual(1 + 1, 2);
  });

  it("should handle async operations", async () => {
    const result = await Promise.resolve("hello");
    assert.strictEqual(result, "hello");
  });
});
