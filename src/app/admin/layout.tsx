import { DocumentLang } from "@/features/lang/_components/DocumentLang";

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
  <>
    {/* 관리자는 로케일 세그먼트 밖(스토어 모드) — html lang 동기화만 여기서 담당 */}
    <DocumentLang />
    <AdminLayoutClient>{children}</AdminLayoutClient>
  </>
);

export default AdminLayout;
