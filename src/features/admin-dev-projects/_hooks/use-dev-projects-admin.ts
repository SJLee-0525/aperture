"use client";

import { useOrderedAdmin } from "@/hooks/use-ordered-admin";
import type { OrderedAdminAdapter } from "@/hooks/use-ordered-admin";
import { devProjects } from "@/lib/firebase/dev";
import type { DevProject } from "@/types/dev";

const devProjectsAdapter: OrderedAdminAdapter<DevProject> = devProjects;

const useDevProjectsAdmin = () => {
  const { items: projects, ...admin } = useOrderedAdmin(devProjectsAdapter);
  return { projects, ...admin };
};

export { useDevProjectsAdmin };
