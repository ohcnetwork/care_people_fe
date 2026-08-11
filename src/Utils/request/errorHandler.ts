/**
 * Plug-local HTTP error handler.
 *
 * Why this exists: when the plug's `query.ts` throws `HTTPError`, the host's
 * `mutationCache.onError = handleHttpError` runs against an `HTTPError` class
 * from a *different* module instance (federated plug bundles its own copy of
 * `Utils/request/types.ts`). The host's `error instanceof HTTPError` check
 * therefore returns `false`, so it falls back to `toast.error(error.message)`
 * — which is the hardcoded "Request Failed" string.
 *
 * To get useful messages we run the same logic the host does, but inside the
 * plug, against the plug's own `HTTPError`. The thrown error is then marked
 * `silent: true` so the host's handler skips it and we don't double-toast.
 */
import { t } from "i18next";
import { toast } from "sonner";

import { HTTPError, StructuredError } from "@/Utils/request/types";

export function handleHttpError(error: Error) {
  if (("silent" in error && error.silent) || error.name === "AbortError") {
    return;
  }

  if (!(error instanceof HTTPError)) {
    toast.error(error.message || t("something_went_wrong"));
    return;
  }

  const cause = error.cause;

  if (isNotFound(error)) {
    toast.error((cause?.detail as string) || t("not_found"));
    return;
  }

  if (contentTooLarge(error)) {
    toast.error(t("file_too_large"));
    return;
  }

  if (isBadRequest(error)) {
    if (Array.isArray(cause)) {
      let handled = false;
      for (const obj of cause) {
        const errs = obj.errors;
        if (isPydanticError(errs)) {
          handled = true;
          handlePydanticErrors(errs);
          continue;
        }
      }
      if (handled) return;
    }

    const errs = cause?.errors;
    if (isPydanticError(errs)) {
      handlePydanticErrors(errs);
      return;
    }

    if (isStructuredError(cause)) {
      handleStructuredErrors(cause);
      return;
    }

    toast.error(t("something_went_wrong"));
    return;
  }

  toast.error((cause?.detail as string) || t("something_went_wrong"));
}

function isBadRequest(error: HTTPError) {
  return error.status === 400 || error.status === 406;
}

function isNotFound(error: HTTPError) {
  return error.status === 404;
}

function contentTooLarge(error: HTTPError) {
  return error.status === 413;
}

type PydanticError = {
  type: string;
  loc?: string[];
  msg: string | Record<string, string>;
  input?: unknown;
  url?: string;
};

function isStructuredError(err: HTTPError["cause"]): err is StructuredError {
  return typeof err === "object" && !Array.isArray(err);
}

function handleStructuredErrors(cause: StructuredError) {
  for (const value of Object.values(cause)) {
    if (Array.isArray(value)) {
      value.forEach((err) => {
        if (typeof err === "string") {
          toast.error(err);
        } else if (err && typeof err === "object") {
          const errorFields = ["detail", "msg", "error", "message"] as const;
          const e = err as Record<string, unknown>;
          const field = errorFields.find(
            (f) => typeof e[f] === "string" && (e[f] as string).length > 0,
          );
          toast.error(
            field ? (e[field] as string) : t("something_went_wrong"),
          );
        }
      });
      return;
    }
    if (typeof value === "string") {
      toast.error(value);
      return;
    }
  }
}

function isPydanticError(errors: unknown): errors is PydanticError[] {
  return (
    Array.isArray(errors) &&
    errors.every(
      (error) => typeof error === "object" && error !== null && "type" in error,
    )
  );
}

function handlePydanticErrors(errors: PydanticError[]) {
  errors.forEach(({ type, loc, msg }) => {
    const message = typeof msg === "string" ? msg : Object.values(msg)[0];
    if (!loc) {
      toast.error(message);
      return;
    }
    const label = type
      .replace("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
    toast.error(message, {
      description: `${label}: '${loc.join(".")}'`,
      duration: 8000,
    });
  });
}
