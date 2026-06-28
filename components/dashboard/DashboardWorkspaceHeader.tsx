"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { StudioIconButton } from "@/components/resume/StudioIconButton";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dashboardHeaderControlClassName } from "@/lib/dashboard/dashboard-header-chrome";
import { useWorkspaceSectionExpansion } from "@/lib/dashboard/use-workspace-section-expansion";

const DashboardHeaderActionsSetterContext = createContext<
  Dispatch<SetStateAction<ReactNode>> | null
>(null);
const DashboardHeaderActionsSlotContext = createContext<ReactNode>(null);
const DashboardHeaderExpandSetterContext = createContext<
  Dispatch<SetStateAction<ReactNode>> | null
>(null);
const DashboardHeaderExpandSlotContext = createContext<ReactNode>(null);

export function DashboardWorkspaceHeaderProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<ReactNode>(null);
  const [expandControl, setExpandControl] = useState<ReactNode>(null);

  return (
    <DashboardHeaderActionsSetterContext.Provider value={setActions}>
      <DashboardHeaderActionsSlotContext.Provider value={actions}>
        <DashboardHeaderExpandSetterContext.Provider value={setExpandControl}>
          <DashboardHeaderExpandSlotContext.Provider value={expandControl}>
            {children}
          </DashboardHeaderExpandSlotContext.Provider>
        </DashboardHeaderExpandSetterContext.Provider>
      </DashboardHeaderActionsSlotContext.Provider>
    </DashboardHeaderActionsSetterContext.Provider>
  );
}

export function useRegisterDashboardHeaderActions(node: ReactNode) {
  const setActions = useContext(DashboardHeaderActionsSetterContext);

  useEffect(() => {
    if (!setActions) return;
    setActions(node);
    return () => {
      setActions(null);
    };
  }, [setActions, node]);
}

export function useRegisterDashboardExpandControl(node: ReactNode) {
  const setExpandControl = useContext(DashboardHeaderExpandSetterContext);

  useEffect(() => {
    if (!setExpandControl) return;
    setExpandControl(node);
    return () => {
      setExpandControl(null);
    };
  }, [setExpandControl, node]);
}

export function DashboardHeaderActionsSlot() {
  return useContext(DashboardHeaderActionsSlotContext);
}

export function DashboardHeaderExpandSlot() {
  return useContext(DashboardHeaderExpandSlotContext);
}

/** Landing-style hero CTA for dashboard header actions (Save, Add new, …). */
export function DashboardHeaderHeroButton({
  className,
  size = "sm",
  ...props
}: ButtonProps) {
  return (
    <Button
      variant="hero"
      size={size}
      className={cn(dashboardHeaderControlClassName, className)}
      {...props}
    />
  );
}

type DashboardExpandAllButtonProps = {
  expanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
};

export function DashboardExpandAllButton({
  expanded,
  onToggle,
  disabled = false,
}: DashboardExpandAllButtonProps) {
  return (
    <StudioIconButton
      type="button"
      tone="bordered"
      onClick={onToggle}
      disabled={disabled}
      aria-label={expanded ? "Collapse all sections" : "Expand all sections"}
      title={expanded ? "Collapse all" : "Expand all"}
    >
      {expanded ? (
        <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
      )}
    </StudioIconButton>
  );
}

/** Register expand/collapse-all control in the dashboard header. */
export function useDashboardExpandAllControl(
  sectionIds: string[],
  options?: {
    defaultExpanded?: boolean;
    defaultExpandedSections?: Record<string, boolean>;
    disabled?: boolean;
  },
) {
  const expansion = useWorkspaceSectionExpansion(
    sectionIds,
    options?.defaultExpanded ?? false,
    options?.defaultExpandedSections,
  );

  const expandButton = useMemo(
    () => (
      <DashboardExpandAllButton
        expanded={expansion.allExpanded}
        onToggle={expansion.toggleAllSections}
        disabled={options?.disabled ?? sectionIds.length === 0}
      />
    ),
    [
      expansion.allExpanded,
      expansion.toggleAllSections,
      options?.disabled,
      sectionIds.length,
    ],
  );

  useRegisterDashboardExpandControl(sectionIds.length > 0 ? expandButton : null);

  return expansion;
}

/** Simpler hook when expansion state is owned elsewhere (e.g. RefineryPanel). */
export function useDashboardExpandControlFromState({
  allExpanded,
  onToggle,
  disabled = false,
}: {
  allExpanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const onToggleStable = useCallback(() => {
    onToggle();
  }, [onToggle]);

  const expandButton = useMemo(
    () => (
      <DashboardExpandAllButton
        expanded={allExpanded}
        onToggle={onToggleStable}
        disabled={disabled}
      />
    ),
    [allExpanded, disabled, onToggleStable],
  );

  useRegisterDashboardExpandControl(disabled ? null : expandButton);
}
