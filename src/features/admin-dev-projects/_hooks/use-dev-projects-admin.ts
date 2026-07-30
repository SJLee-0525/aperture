"use client";

import { useOrderedAdmin } from "@/hooks/use-ordered-admin";
import type { OrderedAdminAdapter } from "@/hooks/use-ordered-admin";
import { devProjects } from "@/lib/firebase/dev";
import { listDevProjectItemsAdmin } from "@/lib/firebase/admin-list-rest";
import type { AdminDevProjectListItem } from "@/types/admin";

const devProjectsAdapter: OrderedAdminAdapter<AdminDevProjectListItem> = {
  ...devProjects,
  list: listDevProjectItemsAdmin,
};

const useDevProjectsAdmin = () => {
  const { items: projects, ...admin } = useOrderedAdmin(devProjectsAdapter);
  return { projects, ...admin };
};

export { useDevProjectsAdmin };
