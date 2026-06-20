"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/components/ui/sidebar";

/** A1 — collapse dashboard sidebar to icon rail while editing a resume profile. */
export function DashboardStudioSidebarEffect() {
  const pathname = usePathname();
  const { setOpen, isMobile } = useSidebar();

  const isStudioEdit =
    pathname.startsWith("/dashboard/resume-profiles/") &&
    pathname.endsWith("/edit");

  useEffect(() => {
    if (isMobile) return;

    if (isStudioEdit) {
      setOpen(false);
      return;
    }

    setOpen(true);
  }, [isStudioEdit, isMobile, setOpen]);

  return null;
}
