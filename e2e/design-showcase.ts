import { harness } from "./_helpers.js";

// Capture the /design showcase — proves the template renders the @modules/ui
// component library, themed by the module's self-sourced tokens. Also measures
// the composer row, where an autoresize Input must sit flush with a Button.
export default harness(
  async ({ step, stepOrExit, page }) => {
    await page.goto("/design", { waitUntil: "load" });
    await page.locator("button").first().waitFor({ state: "visible", timeout: 20_000 });

    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await page.screenshot({ name: "0_design_dark", fullPage: true });

    await page.evaluate(() => document.documentElement.classList.remove("dark"));
    await page.screenshot({ name: "1_design_light", fullPage: true });

    const composer = page.locator("#composer-row");
    const field = composer.locator("textarea");
    const button = composer.locator("button");
    await composer.scrollIntoViewIfNeeded();
    await page.screenshot({ name: "2_composer_row_empty" });

    const emptyField = await field.boundingBox();
    const buttonBox = await button.boundingBox();
    stepOrExit("composer row measurable", Boolean(emptyField && buttonBox));
    if (!emptyField || !buttonBox) throw new Error("composer row not measurable");

    step(
      "empty autoresize Input matches Button size=m height",
      Math.abs(emptyField.height - buttonBox.height) < 1,
      `input=${emptyField.height} button=${buttonBox.height}`
    );
    step("tops align", Math.abs(emptyField.y - buttonBox.y) < 1, `input=${emptyField.y} button=${buttonBox.y}`);

    // One line of typed text must not grow the field past the button.
    await field.fill("hello");
    const oneLine = await field.boundingBox();
    step(
      "one line of text keeps the Input at the Button height",
      Boolean(oneLine && Math.abs(oneLine.height - buttonBox.height) < 1),
      `input=${oneLine?.height} button=${buttonBox.height}`
    );

    // Wrapping past one line is where the field is *supposed* to grow.
    await field.fill("wrap ".repeat(60));
    const wrapped = await field.boundingBox();
    await page.screenshot({ name: "3_composer_row_wrapped" });
    step(
      "multi-line content grows the Input past the Button",
      Boolean(wrapped && wrapped.height > buttonBox.height),
      `input=${wrapped?.height} button=${buttonBox.height}`
    );

    // A Selector near the viewport bottom has more room above it, yet must still open below and fit.
    const trigger = page.getByRole("combobox").first();
    const viewportHeight = page.viewportSize()?.height ?? 0;
    await page.evaluate(
      ([y, vh]) => window.scrollBy(0, y - (vh - 120)),
      [(await trigger.boundingBox())?.y ?? 0, viewportHeight]
    );
    // Measure before opening: the open Select aria-hides everything outside it, trigger included.
    const triggerBox = await trigger.boundingBox();
    await trigger.click();
    const list = page.getByRole("listbox");
    await list.waitFor({ state: "visible" });
    await page.screenshot({ name: "4_selector_open_near_bottom" });
    const listBox = await list.boundingBox();
    step(
      "Selector list opens below its trigger",
      Boolean(triggerBox && listBox && listBox.y >= triggerBox.y + triggerBox.height),
      `trigger.bottom=${triggerBox && triggerBox.y + triggerBox.height} list.top=${listBox?.y}`
    );
    step(
      "Selector list fits in the viewport",
      Boolean(listBox && listBox.y + listBox.height <= viewportHeight + 0.5),
      `list.bottom=${listBox && listBox.y + listBox.height} viewport=${viewportHeight}`
    );
  },
  // Bounded by the 20s first-paint wait above, plus slack for two fullPage captures.
  { timeoutMs: 25_000 }
);
