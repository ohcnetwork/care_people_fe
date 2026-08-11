import { useQuery } from "@tanstack/react-query";
import { Link } from "raviger";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formatPhoneNumberIntl } from "react-phone-number-input";

import CareIcon from "@/CAREUI/icons/CareIcon";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { Avatar } from "@/components/Common/Avatar";
import Pagination from "@/components/Common/Pagination";
import { CardGridSkeleton } from "@/components/Common/SkeletonLoading";
import PeopleTagFilter, {
  TagsBehavior,
} from "@/components/Tags/PeopleTagFilter";
import TagBadge from "@/components/Tags/TagBadge";

import usePagination from "@/hooks/usePagination";

import { GENDER_TYPES } from "@/common/constants";
import { relativeTime } from "@/Utils/utils";
import query from "@/Utils/request/query";
import { TagConfig } from "@/types/emr/tagConfig/tagConfig";
import peopleApi from "@/types/people/peopleApi";

const PAGE_SIZE = 15;
const VISIBLE_TAGS = 2;

/**
 * Browse every patient attached to a facility.
 *
 * Visually modelled on care_fe's `OrganizationPatients` — a responsive grid
 * of patient cards, each linking to the core patient profile.
 */
export default function PeopleList({ facilityId }: { facilityId: string }) {
  const { t } = useTranslation();
  const { page, limit, offset, setPage } = usePagination({ limit: PAGE_SIZE });
  const [selectedTags, setSelectedTags] = useState<TagConfig[]>([]);
  const [tagsBehavior, setTagsBehavior] = useState<TagsBehavior>("any");

  // Matches core's `SingleFacilityTagFilter`: comma separated tag ids, omitted
  // entirely when nothing is picked so the backend leaves the queryset alone.
  const tags = selectedTags.length
    ? selectedTags.map((tag) => tag.id).join(",")
    : undefined;

  const { data: people, isFetching } = useQuery({
    queryKey: [
      "facility-people",
      facilityId,
      limit,
      offset,
      tags,
      tagsBehavior,
    ],
    queryFn: query(peopleApi.list, {
      queryParams: {
        facility: facilityId,
        limit,
        offset,
        tags,
        tags_behavior: tags ? tagsBehavior : undefined,
      },
    }),
    enabled: !!facilityId,
  });

  const handleTagsChange = (updated: TagConfig[]) => {
    setSelectedTags(updated);
    setPage(1);
  };

  const handleBehaviorChange = (updated: TagsBehavior) => {
    setTagsBehavior(updated);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-gray-900">{t("patients")}</h2>
        {!isFetching && people && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            {people.count}
          </span>
        )}
        <div className="ml-auto">
          <PeopleTagFilter
            selected={selectedTags}
            onChange={handleTagsChange}
            behavior={tagsBehavior}
            onBehaviorChange={handleBehaviorChange}
            facilityId={facilityId}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {isFetching ? (
          <CardGridSkeleton count={6} />
        ) : !people?.results?.length ? (
          <Card className="col-span-full">
            <CardContent className="p-6 text-center text-gray-500">
              {t("no_patients_found")}
            </CardContent>
          </Card>
        ) : (
          people.results.map(({ id, patient }) => {
            // The list endpoint serializes the patient without a `facility`
            // kwarg, so `facility_tags` is empty today. Reading both keeps this
            // correct once the backend passes it.
            const patientTags = [
              ...(patient.instance_tags ?? []),
              ...(patient.facility_tags ?? []),
            ];
            const visibleTags = patientTags.slice(0, VISIBLE_TAGS);
            const remainingCount = patientTags.length - VISIBLE_TAGS;

            return (
              <Link
                key={id}
                href={`/facility/${facilityId}/patient/${patient.id}`}
                className="block"
              >
                <Card className="hover:border-primary/50 h-full transition-colors">
                  <CardContent className="p-6">
                    <div className="flex h-full flex-col">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <Avatar
                            name={patient.name || ""}
                            className="size-10"
                          />
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">
                              {patient.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {formatPhoneNumberIntl(patient.phone_number)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          asChild
                        >
                          <div>
                            <CareIcon
                              icon="l-arrow-up-right"
                              className="size-4"
                            />
                          </div>
                        </Button>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
                        <div className="text-sm">
                          <div className="text-gray-500">{t("phone")}</div>
                          <div className="font-medium">
                            {formatPhoneNumberIntl(patient.phone_number)}
                          </div>
                        </div>
                        <div className="text-sm">
                          <div className="text-gray-500">{t("gender")}</div>
                          <div className="font-medium">
                            {GENDER_TYPES.find((g) => g.id === patient.gender)
                              ?.text ?? patient.gender}
                          </div>
                        </div>
                      </div>
                      {patientTags.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-1">
                          {visibleTags.map((tag) => (
                            <TagBadge
                              key={tag.id}
                              tag={tag}
                              hierarchyDisplay
                              variant="outline"
                              className="border-gray-200 bg-gray-100 px-2 py-1 text-xs text-gray-700"
                            />
                          ))}
                          {remainingCount > 0 && (
                            <Badge className="border-gray-200 bg-gray-100 px-2 py-1 text-xs text-gray-700">
                              +{remainingCount}
                              {t("more")}
                            </Badge>
                          )}
                        </div>
                      )}
                      <div className="mt-4 border-t border-gray-200 pt-4">
                        <div className="text-sm text-gray-500">
                          {t("last_modified")}{" "}
                          <time dateTime={patient.modified_date}>
                            {relativeTime(patient.modified_date)}
                          </time>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>

      <Pagination
        page={page}
        limit={limit}
        totalCount={people?.count ?? 0}
        onPageChange={setPage}
      />
    </div>
  );
}
