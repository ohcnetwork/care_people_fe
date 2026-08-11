import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

import CareIcon from "@/CAREUI/icons/CareIcon";

import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  limit: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * Minimal pagination footer for the plug. Renders nothing when everything
 * fits on a single page.
 */
export default function Pagination({
  page,
  limit,
  totalCount,
  onPageChange,
  className,
}: PaginationProps) {
  const { t } = useTranslation();
  const totalPages = Math.ceil(totalCount / limit);

  if (!totalCount || totalPages <= 1) {
    return null;
  }

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, totalCount);

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-center gap-4 py-2", className)}
    >
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label={t("previous")}
      >
        <CareIcon icon="l-angle-left" className="size-4" />
      </Button>

      <span aria-live="polite" className="text-sm text-gray-600">
        {from}&ndash;{to} / {totalCount}
      </span>

      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label={t("next")}
      >
        <CareIcon icon="l-angle-right" className="size-4" />
      </Button>
    </nav>
  );
}
