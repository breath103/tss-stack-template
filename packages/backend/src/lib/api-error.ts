import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import type { ApiErrorBody } from "../types/api-error.js";

/** An HTTP error whose body is `{ error: ApiErrorBody }` (see `app.onError`). Extends
 *  `HTTPException` so it short-circuits a handler the same way. */
export class ApiError extends HTTPException {
  constructor(
    status: ContentfulStatusCode,
    readonly body: ApiErrorBody
  ) {
    super(status, { message: body.type });
  }
}
