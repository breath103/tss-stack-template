import { type Scenario } from "./_helpers.js";

// Capture the /design showcase — proves the template renders the @modules/ui
// component library, themed by the module's self-sourced tokens.
const scenario: Scenario = async ({ page }) => {
  await page.goto("/design", { waitUntil: "load" });
  await page.locator("button").first().waitFor({ state: "visible", timeout: 20_000 });

  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.screenshot({ name: "0_design_dark", fullPage: true });

  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  await page.screenshot({ name: "1_design_light", fullPage: true });
};

export default scenario;
