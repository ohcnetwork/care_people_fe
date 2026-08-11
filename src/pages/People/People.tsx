import PeopleList from "./PeopleList";
// Search is parked for now. `PeopleSearch` and `VerifyPatientDialog` are left
// in place; restore this import and the render below to bring it back.
// import PeopleSearch from "./PeopleSearch";

/**
 * Route entry for `/facility/:facilityId/people`.
 *
 * The host has no locale-merging mechanism for plugs, so user-facing text
 * here is either a literal or a key that already exists in the host bundle.
 */
export default function People({ facilityId }: { facilityId: string }) {
  return (
    <div className="container mx-auto max-w-6xl space-y-8 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">People</h1>
      </header>

      {/* <PeopleSearch facilityId={facilityId} /> */}
      <PeopleList facilityId={facilityId} />
    </div>
  );
}
