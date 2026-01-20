import type { SubdomainMapValue, TssConfig } from "./config.js";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Type guard for redirect entries */
export function isRedirect(
  value: SubdomainMapValue
): value is { redirect: string } {
  return typeof value === "object" && value !== null && "redirect" in value;
}

/**
 * Validates subdomain map for cycles and invalid redirect chains.
 * Errors:
 * - Cycle detected (e.g., a -> b -> a)
 * - Redirect chain ends in blocked (null) subdomain
 */
export function validateSubdomainMap(
  subdomainMap: TssConfig["subdomainMap"]
): ValidationResult {
  const errors: string[] = [];

  /**
   * Resolves a subdomain following redirect chains.
   * Returns the final deployment name, null if blocked, or undefined if cycle detected.
   */
  function resolve(
    subdomain: string,
    visited: Set<string>,
    path: string[]
  ): string | null | undefined {
    // Cycle detection
    if (visited.has(subdomain)) {
      errors.push(`Cycle detected: ${[...path, subdomain].join(" -> ")}`);
      return undefined;
    }

    const value = subdomainMap[subdomain];

    // Undefined = pass-through (use subdomain as deployment name)
    if (value === undefined) {
      return subdomain;
    }

    // Null = blocked
    if (value === null) {
      return null;
    }

    // String = direct deployment mapping
    if (typeof value === "string") {
      return value;
    }

    // Redirect - follow the chain
    if (isRedirect(value)) {
      visited.add(subdomain);
      return resolve(value.redirect, visited, [...path, subdomain]);
    }

    return undefined;
  }

  // Validate each subdomain with redirect entries
  for (const subdomain of Object.keys(subdomainMap)) {
    const value = subdomainMap[subdomain];

    if (isRedirect(value)) {
      const target = value.redirect;
      const finalResult = resolve(target, new Set([subdomain]), [subdomain]);

      // Redirect to blocked is an error
      if (finalResult === null) {
        errors.push(
          `Redirect from "${subdomain}" ultimately resolves to blocked subdomain`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
