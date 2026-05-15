import { type APIRequestContext, type Page } from "playwright";

export type Scenario = (ctx: {
  /** Playwright Page. The BrowserContext has `baseURL` preset to the edge
   *  proxy, so `page.goto("/foo")` works without a prefix. Each scenario
   *  gets a fresh BrowserContext — no shared cookies/storage between runs. */
  page: Page;
  /** HTTP client bound to the SAME BrowserContext as `page`. It shares the
   *  cookie jar with the browser, so anything a scenario logs into via the
   *  UI carries through to these calls (and vice versa). Use this instead of
   *  global `fetch` whenever the request needs the session. */
  request: APIRequestContext;
}) => Promise<void>;
