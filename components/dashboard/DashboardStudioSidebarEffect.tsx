"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/components/ui/sidebar";
import { isJobReviewStudioScreen } from "@/lib/dashboard/dashboard-header-controls";

/** Collapse dashboard sidebar when entering full-screen resume editors. */
export function DashboardStudioSidebarEffect() {
  const pathname = usePathname();
  const { setOpen, isMobile } = useSidebar();
  const lastStudioEdit = useRef<boolean | null>(null);

  useEffect(() => {
    if (isMobile) return;

    const fromParam =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("from")
        : null;
    const isProfileStudioEdit =
      pathname.startsWith("/dashboard/resume-profiles/") && pathname.endsWith("/edit");
    const isReviewStudio = isJobReviewStudioScreen(pathname, fromParam);
    const isStudioEdit = isProfileStudioEdit || isReviewStudio;

    if (lastStudioEdit.current === isStudioEdit) return;
    lastStudioEdit.current = isStudioEdit;

    setOpen(!isStudioEdit);
  }, [isMobile, pathname, setOpen]);

  return null;
}
