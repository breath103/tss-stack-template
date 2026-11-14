import type { ApiErrorBody } from "@backend/types/api-error";
import { useI18n } from "@ui/i18n/I18nContext";

import { ApiRequestError } from "./api-client";
import dict from "./api-error-message.i18n.json";

/** `(error) => text` for a caught API error. An `ApiRequestError` reads its `type`'s catalog
 *  entry with the body's fields substituted for `{field}`; anything else keeps its own message. */
export function useApiErrorMessage(): (error: unknown) => string {
  const i18n = useI18n(dict);
  const messages: Record<ApiErrorBody["type"], string> = i18n;
  return error => {
    if (error instanceof ApiRequestError)
      return Object.entries(error.body).reduce(
        (text, [field, value]) => text.replaceAll(`{${field}}`, String(value)),
        messages[error.body.type]
      );
    return error instanceof Error ? error.message : i18n.unknown;
  };
}
