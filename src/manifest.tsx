import { UsersIcon } from "lucide-react";

import People from "@/pages/People/People";

interface NavigationLink {
  url: string;
  name: string;
  icon?: React.ReactNode;
  children?: NavigationLink[];
}

interface Manifest {
  plugin: string;
  routes: Record<string, (...args: never[]) => React.ReactNode>;
  extends: string[];
  components: Record<string, never>;
  navItems?: NavigationLink[];
  userNavItems?: NavigationLink[];
  adminNavItems?: NavigationLink[];
}

const manifest: Manifest = {
  plugin: "care_people_fe",
  routes: {
    // Plug routes are merged at the ROOT of the host's `Routers/AppRouter.tsx`,
    // so the path has to be fully qualified rather than facility-relative.
    "/facility/:facilityId/people": ({
      facilityId,
    }: {
      facilityId: string;
    }) => <People facilityId={facilityId} />,
  },
  extends: [],
  components: {},
  navItems: [
    // The host's `facility-nav` renders this as `/facility/{facilityId}/${url}`,
    // so no leading slash here.
    {
      name: "People",
      url: "people",
      icon: <UsersIcon className="size-4" />,
    },
  ],
  userNavItems: [],
  adminNavItems: [],
};

export default manifest;
