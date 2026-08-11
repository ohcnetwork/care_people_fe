import { useQueryParams } from "raviger";
import { useCallback, useMemo } from "react";

interface UsePaginationOptions {
  /** Rows per page. Defaults to 15. */
  limit?: number;
  /** Query param name holding the 1-based page number. Defaults to "page". */
  paramName?: string;
}

/**
 * Minimal, self-contained replacement for care_fe's `useFilters`.
 *
 * A plug cannot import the host's hook (module federation only shares
 * `react`, `react-dom`, `react-i18next`, `@tanstack/react-query` and
 * `raviger`), and `useFilters` pulls in far more than pagination.
 * This keeps only the page/limit/offset arithmetic, backed by the URL so
 * the page survives a reload and back/forward navigation.
 */
export default function usePagination({
  limit = 15,
  paramName = "page",
}: UsePaginationOptions = {}) {
  const [qParams, setQueryParams] = useQueryParams<Record<string, string>>();

  const page = useMemo(() => {
    const parsed = Number(qParams[paramName]);
    return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
  }, [qParams, paramName]);

  const setPage = useCallback(
    (nextPage: number) => {
      setQueryParams(
        { ...qParams, [paramName]: String(Math.max(1, nextPage)) },
        { replace: false },
      );
    },
    [qParams, setQueryParams, paramName],
  );

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    setPage,
  };
}
