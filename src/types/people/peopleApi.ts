import { HttpMethod, PaginatedResponse, Type } from "@/Utils/request/types";
import {
  PatientListRead,
  PatientSearchRequest,
  PatientSearchResponse,
} from "@/types/emr/patient/patient";
import { FacilityBase } from "@/types/facility/facility";

/**
 * A patient registered against a facility as their primary facility.
 *
 * Shape comes from `CarePeopleListSpec` in the backend plug -- the patient is
 * nested rather than flat, and is serialized with `PatientListSpec` (so no
 * `geo_organization`, which only `PatientRetrieveSpec` carries).
 */
export interface CarePeopleRead {
  id: string;
  patient: PatientListRead;
  facility: FacilityBase;
}

/**
 * "People" endpoints.
 *
 * `list` is the `care_people_be` plug's own CarePeople resource. Plugs are
 * mounted at `/api/<plug_name>/` by `config/urls.py` and cannot register into
 * core's facility router, so the facility is passed as the viewset's
 * `facility` filter rather than as a path segment.
 *
 * Tag filtering rides on the backend's `SingleFacilityTagFilter`:
 * `?tags=<comma separated ids>&tags_behavior=any|all`.
 *
 * `search` is core's own patient search -- the plug has no search endpoint of
 * its own, and duplicating one would only drift from the host's behaviour.
 */
export default {
  list: {
    path: "/api/care_people_be/",
    method: HttpMethod.GET,
    TRes: Type<PaginatedResponse<CarePeopleRead>>(),
  },
  search: {
    path: "/api/v1/patient/search/",
    method: HttpMethod.POST,
    TBody: Type<PatientSearchRequest>(),
    TRes: Type<PatientSearchResponse>(),
  },
} as const;
