import { type Scenario } from "./_helpers.js";

const scenario: Scenario = async ({ page }) => {
  await page.goto("/");
  console.log(`  title: ${await page.title()}`);
  await page.screenshot({ path: ".tmp/e2e-example-home.png", fullPage: true });
};

export default scenario;
