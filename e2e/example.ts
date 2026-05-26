import { type Scenario } from "./_helpers.js";

const scenario: Scenario = async ({ page }) => {
  await page.goto("/");
  console.log(`  title: ${await page.title()}`);
  await page.screenshot({ name: "0_home", fullPage: true });
};

export default scenario;
