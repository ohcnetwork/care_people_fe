# care_people_fe

A CARE frontend plug that adds a facility-scoped **People** directory and
documents the `primary_facility` patient extension contract.

> **Status: local development plug.** This lives inside `care_fe/apps/` for
> local development and review only. It is *not* meant to be merged into the
> `care_fe` repository — extract it into its own repo before shipping.

## What it does

### 1. People directory — `/facility/:facilityId/people`

A new **People** entry in the facility left-nav opens a paginated, responsive
grid of patient cards (`src/pages/People/PeopleList.tsx`) — avatar, name, phone,
gender, tags and last-modified — each linking to the patient profile **within
the facility** (`/facility/:facilityId/patient/:id`, not the bare
`/patient/:id`, so the profile fetches facility-scoped and its tabs and
back-navigation stay inside the facility).

The list is filterable by patient tag. The filter chip
(`src/components/Tags/PeopleTagFilter.tsx`) reproduces care_fe's
`SelectedFilterBar` — `Tags │ includes │ ● 1 Tag │ ×` — with a switchable
`tags_behavior`.

**Identifier search is currently commented out.** `PeopleSearch.tsx` and
`VerifyPatientDialog.tsx` remain on disk and working; only the render and
import in `People.tsx` are commented. See [Search](#search-parked) below.

### 2. `primary_facility` patient extension

No plug code required — see [the contract](#the-primary_facility-extension-contract)
below. care_fe already renders extension fields on patient create *and*
update; the plug only documents the schema the backend must register.

## Backend contract

The backend half of this plug is owned separately, and lives in
`care_people_be`. Plugs are mounted at `/api/<plug_name>/` by core's
`config/urls.py` and **cannot register into core's facility router**, so the
facility travels as a query param rather than a path segment.

| Route                   | Method | Query params                                       | Response                                |
| ----------------------- | ------ | -------------------------------------------------- | --------------------------------------- |
| `/api/care_people_be/`  | `GET`  | `facility`, `limit`, `offset`, `tags`, `tags_behavior` | `{ count, results: CarePeopleRead[] }` |

- **`facility`** — facility external id. Was `facility_id` until the backend's
  `feat:tag support` renamed it; django-filter silently ignores unknown params,
  so sending the old name returns *every* CarePeople row in the instance rather
  than erroring. If the list ever shows patients from other facilities, check
  this first.
- **`tags`** — comma-separated tag **external UUIDs**, omitted entirely when
  nothing is selected.
- **`tags_behavior`** — `any` (overlap) or `all` (contains). Sent only
  alongside `tags`.

`CarePeopleRead` is `{ id, patient: PatientListRead, facility: FacilityBase }` —
the patient is nested, not flat. See `src/types/people/peopleApi.ts`.

### Two backend gaps this frontend is already written for

1. **The tag filter 500s.** Core's `SingleFacilityTagFilter` ends in
   `queryset.filter(tags__overlap=…)`, but `CarePeople` has no `tags` field —
   `FieldError: Cannot resolve keyword 'tags' into field`. It passes only while
   `tags` is empty. Closing it either means traversing
   `patient__instance_tags` or adding a `tags` ArrayField + migration; **the
   frontend is identical either way**, since the wire contract above doesn't
   change.
2. **`facility_tags` is always empty on the list.** `CarePeopleListSpec` calls
   `PatientListSpec.serialize(obj.patient)` without a `facility=` kwarg, and
   that kwarg is what gates `facility_tags` (`patient/spec.py:228`).
   `CarePeopleRetrieveSpec` does pass it. Cards therefore show instance tags
   only; the card code already concatenates both arrays, so it needs no change
   when the backend starts passing it.

### Search (parked)

`PeopleSearch` calls core's own `POST /api/v1/patient/search/` — the plug has
no search endpoint, and duplicating one would only drift from the host.

When that search returns `partial: true`, the caller is not yet authorised to
see the full record. Selecting a row opens a dialog asking for the patient's
year of birth, then navigates to care_fe's **existing** route
`/facility/{facilityId}/patients/home` with `config`, `value`, `phone_number`,
`year_of_birth` and `partial_id` query params. care_fe's `PatientHome` resolves
the real record via `POST /api/v1/patient/search_retrieve/`.

**The plug never resolves a partial record itself.** That flow is deliberately
delegated to the host so the second-factor check stays in one place.

Note that partial results carry `id = uuid4()` generated per response
(`PatientPartialSpec.perform_extra_serialization`), so they can never be
cross-referenced against the roster — any future attempt to merge search into
the list has to exclude partial mode.

## The `primary_facility` extension contract

Register this schema on the backend as a patient extension with
`context: registration`. Once registered, care_fe renders a facility
autocomplete in the *Additional Details* accordion on patient create **and**
update, with **no frontend changes**:

```json
"primary_facility": {
  "type": "string",
  "title": "Primary Facility",
  "x-ui": {
    "control": "autocomplete",
    "metadata": {
      "url": "/api/v1/facility/",
      "searchParam": "name",
      "valueField": "id",
      "labelField": "name"
    }
  }
}
```

### Why `searchParam` must be `name`

`FacilityViewSet` uses `DjangoFilterBackend` only, and `FacilityFilters`
exposes `name` (an `icontains` filter). There is **no** `search` filter on that
viewset — using `"searchParam": "search"` (as the
`payment_reconciliation_credit_extension` example does) would silently return
unfiltered results.

### How this works with zero plug code

`src/components/Patient/PatientRegistration.tsx` already calls:

```ts
useEntityExtensions({
  entityType: ExtensionEntityType.patient,
  schemaType: "write",
  context: ExtensionContexts.registration,
})
```

and renders `{extensions.fields}` in the *Additional Details* accordion for
both create and update. `SchemaField` dispatches `x-ui.control: "autocomplete"`
to `src/components/Extensions/AutocompleteField.tsx`, which fetches its options
from `x-ui.metadata.url`. So the selector appears as soon as the backend
registers the schema — building a custom form component for it would be
duplicated work.

### Known host gap: the label renders empty on edit

`src/components/ui/autocomplete.tsx` (line 91) resolves its display label with:

```ts
const selectedOption = options.find((option) => option.value === value);
```

On patient **edit**, the stored value is a facility UUID while `options` holds
only the first, unsearched page of facilities. When the saved facility is not
in that page, no option matches and the control shows its **placeholder**
instead of the facility name.

The value is **not lost** and re-saving is safe — it only looks empty.

Fixing this means teaching `AutocompleteField` to resolve the selected value
(e.g. fetching the single record by ID and merging it into `options`). That is
a change to the **host**, so it is deliberately **out of scope** for this plug.

## Layout

```
src/
├── manifest.tsx                       # plugin name, route, nav item
├── pages/People/
│   ├── People.tsx                     # route shell (search render commented out)
│   ├── PeopleSearch.tsx               # identifier search + results table (parked)
│   ├── PeopleList.tsx                 # paginated card grid + tag filter
│   └── VerifyPatientDialog.tsx        # year-of-birth second factor (parked)
├── types/people/peopleApi.ts          # the plug's list route + core's search
├── hooks/usePagination.ts             # minimal page/limit/offset on raviger
├── components/Tags/
│   ├── PeopleTagFilter.tsx            # the applied-filter chip (authored here)
│   ├── MultiFilterStyleTagSelector.tsx  # cloned: the tag picker
│   └── TagBadge.tsx                   # cloned: card badges
├── components/Common/
│   ├── SearchInput.tsx                # port of care_fe's, shortcut hint removed
│   └── Pagination.tsx                 # minimal pagination footer
├── components/ui/                     # cloned care_fe primitives
├── types/                             # cloned care_fe types
└── Utils/request/                     # cloned care_fe request layer
```

Everything outside `pages/People/`, `types/people/`, `hooks/usePagination.ts`,
`components/Tags/PeopleTagFilter.tsx` and `components/Common/Pagination.tsx` is
cloned from care_fe.

## Porting notes

A plug cannot import from the host at runtime — module federation shares only
`react`, `react-dom`, `react-i18next`, `@tanstack/react-query` and `raviger`.
Everything else is copied in. Two consequences worth knowing:

**1. No keyboard shortcuts.** care_fe's `SearchInput` renders a `ShortcutBadge`
that calls `useShortcuts()`, and that hook **throws** when no
`ShortcutProvider` is mounted. `ShortcutProvider` is not shared through module
federation, so a plug always gets its own unprovided context instance and would
crash on first render. The badge is stripped from the plug's copy; Cmd/Ctrl+K
and Escape still work. For the same reason the extension-rendering stack
(`SchemaField`, `useExtensions`, …) is deliberately **not** vendored — see
`src/types/extensions/namespacedExtensionData.ts`.

**2. No i18n keys.** The host has no locale-merging mechanism for plugs
(`public/locale/*.json` inside a plug is unused). All user-facing text here is
either a literal or a key that already exists in the host bundle. Do not add
new keys and expect them to resolve.

**3. Singletons rely on the host's `dedupe`, not federation.** Toasts
(`sonner`), translations (`i18next`) and `decimal.js` are singletons that only
work if the plug and the host share one instance. They are *not* in the
federation `shared` list — instead care_fe's `vite.config.mts` lists them under
`resolve.dedupe`, which applies only to **locally-served plug source**
(`apps/*`). That is the mode this plug targets. If it is ever loaded as a
**remote** federated bundle over HTTP, it would carry its own `sonner` store
and its toasts would silently never render; `sonner`, `i18next` and
`decimal.js` would need adding to the federation `shared` config first.

**4. Take the standalone component, not the descriptor.** The tag filter looks
like care_fe's encounter filter, but it is not the same component. The
encounter one is `tagFilter("tags", TagResource.ENCOUNTER, …)` — a
`FilterConfig` *descriptor* that only renders inside `MultiFilter` →
`filterRenderer`, driven by `useMultiFilterState`. Vendoring that reaches
billing, inventory, `activityDefinition`, `location`, `LocationMultiSelect` and
`useAuthUser`; it is the same over-porting that forced the extension stack out
above.

`components/Tags/MultiFilterStyleTagSelector.tsx` is the identical UI as a
standalone component — props `{ selected, onChange, resource, facilityId }`,
imports only ui primitives and `tagConfigApi`, touches **no host context**.
That is what is vendored here, along with `TagBadge.tsx`, `ui/checkbox.tsx`,
`ui/drawer.tsx` and `hooks/use-mobile.tsx`.

The applied-filter chip (`SelectedFilterBar`) is on the wrong side of that line
too — it reads config via `useMultiFilter` and renders its body through
`FilterRenderer`. `PeopleTagFilter.tsx` rebuilds its three segments instead,
attaching the picker to the label segment only (as the host does) so the
operation dropdown and clear button stay independently clickable. It hangs off
`MultiFilterStyleTagSelector`'s `trigger` prop, which that component honours
for both its mobile Drawer and desktop Dropdown.

Two deliberate shortcuts inside it, both to avoid new dependencies: the tag
list on hover is a `title` attribute rather than a `Tooltip` (the plug has no
`ui/tooltip.tsx` and no `@radix-ui/react-tooltip`), and the two dot colours are
inlined rather than vendoring `multi-filter/utils/Utils.tsx` for two strings.

One quirk worth not "fixing": the single-tag operation label **`includes` is not
an i18n key**. It is missing from the host bundle, so i18next falls through to
the literal — which is why it renders lowercase while neighbouring labels are
title-case. The host has exactly the same behaviour.

## Getting started

```bash
npm install
npm run build         # tsc -b && vite build
npm run dev           # vite preview + vite build --watch on :4173
```

Clone this folder into care_fe's `apps/` directory; care_fe's vite config picks
it up automatically.
