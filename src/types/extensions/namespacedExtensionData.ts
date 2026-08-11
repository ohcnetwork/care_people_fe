/**
 * Extension payload shape, keyed by extension namespace.
 *
 * care_fe declares this in `src/hooks/useExtensions.tsx`, but that module
 * pulls in the whole extension *rendering* stack — including
 * `ShortcutContext`, whose `useShortcuts()` throws when no
 * `ShortcutProvider` is mounted. `ShortcutProvider` is not shared through
 * module federation, so a plug always gets its own unprovided context
 * instance and would crash at render time.
 *
 * This plug never renders extension fields (the host's
 * `PatientRegistration` already does that for `primary_facility`), so the
 * one type it actually needs is re-declared here instead.
 */
export type NamespacedExtensionData = Record<string, Record<string, unknown>>;
