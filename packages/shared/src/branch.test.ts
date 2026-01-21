import { describe, expect, it } from "vitest";

import { sanitizeBranchName } from "./branch.js";

describe("sanitizeBranchName", () => {
  it("converts to lowercase", () => {
    expect(sanitizeBranchName("MAIN")).toBe("main");
    expect(sanitizeBranchName("Feature-Branch")).toBe("feature-branch");
  });

  it("replaces / with --", () => {
    expect(sanitizeBranchName("feature/test")).toBe("feature--test");
    expect(sanitizeBranchName("feat/branch-cleanup")).toBe("feat--branch-cleanup");
  });

  it("replaces non-alphanumeric with -", () => {
    expect(sanitizeBranchName("feature_test")).toBe("feature-test");
    expect(sanitizeBranchName("feature.test")).toBe("feature-test");
    expect(sanitizeBranchName("feature@test")).toBe("feature-test");
  });

  it("collapses 3+ hyphens to --", () => {
    expect(sanitizeBranchName("a---b")).toBe("a--b");
    expect(sanitizeBranchName("a----b")).toBe("a--b");
  });

  it("trims leading and trailing hyphens", () => {
    expect(sanitizeBranchName("-main-")).toBe("main");
    expect(sanitizeBranchName("--main--")).toBe("main");
  });

  it("truncates to 63 characters", () => {
    const longName = "a".repeat(100);
    expect(sanitizeBranchName(longName).length).toBeLessThanOrEqual(63);
  });

  it("handles complex branch names", () => {
    expect(sanitizeBranchName("feature/my-branch")).toBe("feature--my-branch");
    expect(sanitizeBranchName("Feature/My-Branch")).toBe("feature--my-branch");
    expect(sanitizeBranchName("fix/bug_123")).toBe("fix--bug-123");
  });

  it("returns empty string for invalid input", () => {
    expect(sanitizeBranchName("---")).toBe("");
    expect(sanitizeBranchName("___")).toBe("");
  });
});
