import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AdminLayoutClient } from "./_components/AdminLayoutClient";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nocache: true,
  },
};

const AdminLayout = ({ children }: { children: ReactNode }) => (
  <AdminLayoutClient>{children}</AdminLayoutClient>
);

export default AdminLayout;
