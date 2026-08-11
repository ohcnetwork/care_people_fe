import { Tag as TagIcon, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { MultiFilterStyleTagSelector } from "@/components/Tags/MultiFilterStyleTagSelector";

import { cn } from "@/lib/utils";
import {
  TagConfig,
  TagResource,
  getTagHierarchyDisplay,
} from "@/types/emr/tagConfig/tagConfig";

export type TagsBehavior = "any" | "all";

/**
 * The applied-tag-filter chip: `[tag] Tags | includes | ● 1 Tag | ×`.
 *
 * Visually this is care_fe's `SelectedFilterBar`, but that component only
 * works inside the `MultiFilter` state machine -- it reads its config through
 * `useMultiFilter` and renders its body through `FilterRenderer`, whose import
 * graph reaches billing, inventory, location and `useAuthUser`. Rebuilding the
 * three segments here keeps the same appearance without that subtree.
 *
 * The tag picker is attached to the label segment only, exactly as
 * `SelectedFilterBar` does it, so the operation dropdown and the clear button
 * stay independently clickable.
 */
export default function PeopleTagFilter({
  selected,
  onChange,
  behavior,
  onBehaviorChange,
  facilityId,
}: {
  selected: TagConfig[];
  onChange: (tags: TagConfig[]) => void;
  behavior: TagsBehavior;
  onBehaviorChange: (behavior: TagsBehavior) => void;
  facilityId: string;
}) {
  const { t } = useTranslation();

  const picker = (trigger: React.ReactNode) => (
    <MultiFilterStyleTagSelector
      selected={selected}
      onChange={onChange}
      resource={TagResource.PATIENT}
      facilityId={facilityId}
      align="start"
      trigger={trigger}
    />
  );

  if (selected.length === 0) {
    return picker(
      <Button variant="outline" className="h-9">
        <TagIcon className="size-4" />
        {t("tags", { count: 2 })}
      </Button>,
    );
  }

  // Mirrors `tagFilter`'s `getOperations`: a lone tag has only one meaningful
  // reading, so the host collapses the choice and labels it "includes".
  const operations =
    selected.length === 1
      ? [{ label: "includes", value: "all" as const }]
      : [
          { label: t("has_all_of"), value: "all" as const },
          { label: t("has_any_of"), value: "any" as const },
        ];
  const activeLabel =
    selected.length === 1
      ? "includes"
      : (operations.find((op) => op.value === behavior)?.label ?? behavior);

  return (
    <div className="flex w-fit items-center rounded-md border border-gray-200 bg-white">
      {picker(
        <div className="flex h-9 cursor-pointer items-center gap-2 px-3 text-sm">
          <TagIcon className="size-4" />
          <span className="truncate font-medium text-gray-950">
            {t("tags", { count: 2 })}
          </span>
        </div>,
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex h-9 cursor-pointer items-center gap-2 border-x border-gray-200 px-2.5 text-sm whitespace-nowrap text-gray-600 underline">
            {activeLabel}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-[var(--radix-dropdown-menu-trigger-width)] p-0"
          align="start"
        >
          {operations.map((op) => (
            <DropdownMenuItem
              key={op.value}
              onSelect={() => onBehaviorChange(op.value)}
            >
              {op.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div
        className="flex h-9 items-center gap-2 px-3 whitespace-nowrap"
        title={selected
          .map((tag) => getTagHierarchyDisplay(tag, " > "))
          .join("\n")}
      >
        <SelectedTagDots count={selected.length} />
        <span className="text-sm font-medium text-gray-950">
          {selected.length} {t("tags", { count: selected.length })}
        </span>
      </div>

      <Button
        variant="ghost"
        onClick={() => onChange([])}
        className="flex rounded-l-none border-l border-gray-200 hover:bg-gray-50"
        aria-label={t("clear")}
      >
        <X className="h-5 w-5 text-gray-600" />
      </Button>
    </div>
  );
}

// First two entries of the host's `COLOR_PALETTE`, inlined rather than porting
// `multi-filter/utils/Utils.tsx` for two strings.
const FIRST_COLOR = "bg-blue-100 border-blue-300";
const SECOND_COLOR = "bg-green-100 border-green-300";

function SelectedTagDots({ count }: { count: number }) {
  if (count === 1) {
    return (
      <span
        className={cn(FIRST_COLOR, "h-2 w-2 shrink-0 rounded-full border")}
      />
    );
  }

  return (
    <div className="relative h-2 w-4 shrink-0">
      <span
        className={cn(
          FIRST_COLOR,
          "absolute left-0 h-2 w-2 rounded-full border opacity-75",
        )}
      />
      <span
        className={cn(
          SECOND_COLOR,
          "absolute left-1 h-2 w-2 rounded-full border opacity-75",
        )}
      />
    </div>
  );
}
