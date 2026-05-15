import assert from "node:assert/strict";

import { type Scenario } from "./_helpers.js";

const scenario: Scenario = async ({ page, request }) => {
  const helloRes = await request.get("/api/hello?name=E2E");
  assert.equal(helloRes.status(), 200);
  assert.deepEqual(await helloRes.json(), { message: "Hello, E2E!" });
  console.log("  GET /api/hello: ok");

  const echoRes = await request.post("/api/echo/abc-123", {
    data: {
      message: "hello from e2e",
      count: 7,
      complexPayload: { tuple: ["zero", 1, 2, 3] },
    },
  });
  assert.equal(echoRes.status(), 200);
  assert.deepEqual(await echoRes.json(), {
    echo: {
      id: "abc-123",
      message: "hello from e2e",
      count: 7,
      tupleFirst: "zero",
      tupleSecond: 1,
    },
  });
  console.log("  POST /api/echo/:id: ok");

  await page.goto("/");
  await page.waitForFunction(
    () => document.body.innerText.includes("\"id\": \"test-123\""),
    { timeout: 10_000 },
  );

  const text = await page.evaluate(() => document.body.innerText);
  assert.match(text, /Hello, TypeSafe!/, "frontend should render hello message");
  assert.match(text, /"tupleFirst": "String"/, "frontend should render echo result");
  console.log("  UI rendered backend responses: ok");

  await page.screenshot({ path: ".tmp/e2e-echo-home.png", fullPage: true });
};

export default scenario;
