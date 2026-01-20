import { describe, expect, it } from "vitest";

import { isRedirect, validateSubdomainMap } from "./subdomain-validation.js";

describe("isRedirect", () => {
  it("returns true for redirect objects", () => {
    expect(isRedirect({ redirect: "www" })).toBe(true);
  });

  it("returns false for string values", () => {
    expect(isRedirect("main")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isRedirect(null)).toBe(false);
  });
});

describe("validateSubdomainMap", () => {
  describe("valid configurations", () => {
    it("accepts simple deployment mapping", () => {
      const result = validateSubdomainMap({
        www: "main",
        staging: "staging",
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("accepts root domain redirect to www", () => {
      const result = validateSubdomainMap({
        "": { redirect: "www" },
        www: "main",
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("accepts redirect chain that resolves to deployment", () => {
      const result = validateSubdomainMap({
        old: { redirect: "new" },
        new: "main",
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("accepts redirect to undefined subdomain (pass-through)", () => {
      // Redirecting to a subdomain not in the map uses it as deployment name
      const result = validateSubdomainMap({
        old: { redirect: "feature-branch" },
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("accepts blocked subdomains", () => {
      const result = validateSubdomainMap({
        blocked: null,
        www: "main",
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe("invalid configurations", () => {
    it("rejects direct cycle (a -> b -> a)", () => {
      const result = validateSubdomainMap({
        a: { redirect: "b" },
        b: { redirect: "a" },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("Cycle detected");
    });

    it("rejects indirect cycle (a -> b -> c -> a)", () => {
      const result = validateSubdomainMap({
        a: { redirect: "b" },
        b: { redirect: "c" },
        c: { redirect: "a" },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Cycle detected"))).toBe(
        true
      );
    });

    it("rejects redirect to blocked subdomain", () => {
      const result = validateSubdomainMap({
        old: { redirect: "blocked" },
        blocked: null,
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("resolves to blocked");
    });

    it("rejects redirect chain ending in blocked", () => {
      const result = validateSubdomainMap({
        a: { redirect: "b" },
        b: { redirect: "c" },
        c: null,
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("resolves to blocked");
    });
  });
});
