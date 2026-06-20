"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/components/ui/sidebar";

/** A1 — collapse dashboard sidebar to icon rail when entering resume profile edit. */
export function DashboardStudioSidebarEffect() {
  const pathname = usePathname();
  const { setOpen, isMobile } = useSidebar();
  const lastStudioEdit = useRef<boolean | null>(null);

  const isStudioEdit =
    pathname.startsWith("/dashboard/resume-profiles/") &&
    pathname.endsWith("/edit");

  useEffect(() => {
    if (isMobile) return;

    // Only react to route transitions — not manual SidebarTrigger toggles.
    if (lastStudioEdit.current === isStudioEdit) return;
    lastStudioEdit.current = isStudioEdit;

    setOpen(!isStudioEdit);
    // setOpen intentionally omitted: its identity changes when the user toggles.
  }, [isStudioEdit, isMobile]);

  return null;
}
