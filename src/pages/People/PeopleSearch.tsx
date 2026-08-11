import { useQuery } from "@tanstack/react-query";
import { navigate } from "raviger";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatPhoneNumberIntl } from "react-phone-number-input";
import type { TFunction } from "i18next";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import SearchInput, { type SearchOption } from "@/components/Common/SearchInput";
import { TableSkeleton } from "@/components/Common/SkeletonLoading";

import { GENDER_TYPES } from "@/common/constants";
import careConfig from "@/care.config";
import query from "@/Utils/request/query";
import useCurrentFacility from "@/pages/Facility/utils/useCurrentFacility";
import {
  getPartialId,
  type PartialPatientModel,
  type PatientRead,
} from "@/types/emr/patient/patient";
import type { PatientIdentifierConfig } from "@/types/patient/patientIdentifierConfig/patientIdentifierConfig";
import peopleApi from "@/types/people/peopleApi";

import VerifyPatientDialog from "./VerifyPatientDialog";

const PAGE_SIZE = 20;

interface IdentifierSearch {
  config?: string;
  value?: string;
}

/**
 * Identifier-based search over a facility's people.
 *
 * Mirrors care_fe's `PatientIndex` identifier search: the facility's
 * identifier configs become the search options, and a hit navigates to the
 * core patient home route. When the backend flags the response as
 * `partial`, the year of birth is collected first — care_fe's `PatientHome`
 * then resolves the real record via `POST /api/v1/patient/search_retrieve/`.
 * The plug never resolves a partial record itself.
 */
export default function PeopleSearch({ facilityId }: { facilityId: string }) {
  const { t } = useTranslation();
  const { facility } = useCurrentFacility();

  const [identifierSearch, setIdentifierSearch] = useState<IdentifierSearch>(
    {},
  );
  const [selectedPatient, setSelectedPatient] = useState<
    PartialPatientModel | PatientRead | null
  >(null);
  const [verificationOpen, setVerificationOpen] = useState(false);

  // Instance-level configs apply everywhere; facility-level ones are extra.
  const allIdentifierConfigs = useMemo(
    () => [
      ...(facility?.patient_instance_identifier_configs || []),
      ...(facility?.patient_facility_identifier_configs || []),
    ],
    [
      facility?.patient_instance_identifier_configs,
      facility?.patient_facility_identifier_configs,
    ],
  );

  const searchOptions = useMemo(
    () => getSearchOptions(t, identifierSearch, allIdentifierConfigs),
    [t, identifierSearch, allIdentifierConfigs],
  );

  const handleSearch = useCallback((key: string, value: string) => {
    setIdentifierSearch({ config: key, value });
  }, []);

  const { data: patientList, isFetching } = useQuery({
    queryKey: ["facility-people-search", facilityId, identifierSearch],
    queryFn: query.debounced(peopleApi.search, {
      body: {
        config: identifierSearch.config,
        value: identifierSearch.value,
        page_size: PAGE_SIZE,
      },
    }),
    enabled: !!(facilityId && identifierSearch.config && identifierSearch.value),
  });

  const navigateToPatient = (
    patient: PartialPatientModel | PatientRead,
    yearOfBirth?: string,
  ) => {
    navigate(`/facility/${facilityId}/patients/home`, {
      query: {
        config: identifierSearch.config,
        value: identifierSearch.value,
        phone_number: patient.phone_number,
        year_of_birth:
          yearOfBirth || (patient as PatientRead).year_of_birth?.toString() || "",
        partial_id: getPartialId(patient),
      },
    });
  };

  const handlePatientSelect = (index: number) => {
    const patient = patientList?.results[index];
    if (!patient) {
      return;
    }
    if (patientList?.partial) {
      setSelectedPatient(patient);
      setVerificationOpen(true);
    } else {
      navigateToPatient(patient);
    }
  };

  const hasQuery = !!(identifierSearch.config && identifierSearch.value);

  return (
    <div className="space-y-4">
      <SearchInput
        options={searchOptions}
        onSearch={handleSearch}
        className="w-full"
        hideSearchButton
      />

      {hasQuery && (
        <div className="min-h-[120px]">
          {isFetching || !patientList ? (
            <TableSkeleton count={5} />
          ) : !patientList.results.length ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <h3 className="text-lg font-semibold">
                {t("no_patient_record_found")}
              </h3>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">
                      {t("patient_name")}
                    </TableHead>
                    <TableHead>{t("phone_number")}</TableHead>
                    <TableHead>{t("gender")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patientList.results.map((patient, index) => (
                    <TableRow
                      key={patient.id}
                      className="cursor-pointer"
                      tabIndex={0}
                      onClick={() => handlePatientSelect(index)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handlePatientSelect(index);
                        }
                      }}
                    >
                      <TableCell className="font-medium">
                        {patient.name}
                      </TableCell>
                      <TableCell>
                        {formatPhoneNumberIntl(patient.phone_number)}
                      </TableCell>
                      <TableCell>
                        {GENDER_TYPES.find((g) => g.id === patient.gender)
                          ?.text ?? patient.gender}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      <VerifyPatientDialog
        open={verificationOpen}
        onOpenChange={setVerificationOpen}
        onVerify={(yearOfBirth) => {
          if (selectedPatient) {
            navigateToPatient(selectedPatient, yearOfBirth);
          }
        }}
      />
    </div>
  );
}

/**
 * Identical ordering to care_fe's `getSearchOptions`: the phone-number
 * config first, then other auto-maintained configs, then the rest.
 */
const getSearchOptions = (
  t: TFunction,
  searchIdentifier: IdentifierSearch,
  configs: PatientIdentifierConfig[],
): SearchOption[] =>
  [
    ...configs.filter(
      ({ config }) =>
        config.auto_maintained &&
        config.system === careConfig.phoneNumberConfigSystem,
    ),
    ...configs.filter(
      ({ config }) =>
        config.auto_maintained &&
        config.system !== careConfig.phoneNumberConfigSystem,
    ),
    ...configs.filter((c) => !c.config.auto_maintained),
  ].map((c) => ({
    key: c.id,
    type:
      c.config.system === careConfig.phoneNumberConfigSystem
        ? ("phone" as const)
        : ("text" as const),
    placeholder: t("search_by_identifier", { name: c.config.display }),
    value:
      searchIdentifier.config === c.id ? (searchIdentifier.value ?? "") : "",
    display: c.config.display,
  }));
