"use client";

import { useMemo, useState } from "react";
import NavigatorTip from "@/components/onboarding/NavigatorTip";
import OnboardingNextButton from "@/components/onboarding/OnboardingNextButton";
import { POPULAR_ROLES, filterRoles } from "@/lib/roles";
import { useOnboardingStore } from "@/stores/onboardingStore";

interface Step8RolesProps {
  onNext: () => void;
}

export default function Step8Roles({ onNext }: Step8RolesProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const selectedRole = useOnboardingStore((s) => s.selectedRole);
  const setSelectedRole = useOnboardingStore((s) => s.setSelectedRole);

  const visibleRoles = useMemo(
    () => (searchQuery.trim() ? filterRoles(searchQuery) : POPULAR_ROLES),
    [searchQuery]
  );

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="mb-6 text-2xl font-semibold leading-snug text-[#1F2937]">
        What kind of role are you interested in?
      </h1>

      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search by job title"
        className="mb-6 w-full rounded-[12px] border border-gray-200 bg-white px-4 py-3 text-sm text-[#1F2937] shadow-sm placeholder:text-gray-400 focus:border-[#12B3D1] focus:outline-none focus:ring-1 focus:ring-[#12B3D1]"
      />

      <p className="mb-3 text-sm font-semibold text-[#1F2937]">
        Popular Roles
      </p>

      <div className="flex flex-wrap gap-2">
        {visibleRoles.length === 0 ? (
          <p className="text-sm text-gray-500">No roles match your search.</p>
        ) : (
          visibleRoles.map((role) => {
            const isSelected = selectedRole === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                aria-pressed={isSelected}
                className={[
                  "rounded-[12px] px-4 py-2 text-sm font-medium transition-colors",
                  isSelected
                    ? "bg-[#12B3D1] text-white"
                    : "bg-white text-[#1F2937] shadow-sm hover:bg-gray-50",
                ].join(" ")}
              >
                {role}
              </button>
            );
          })
        )}
      </div>

      <NavigatorTip
        className="mt-8"
        message="Pick one specialization to get started — you can always add more later."
      />

      <OnboardingNextButton disabled={!selectedRole} onClick={onNext} />
    </div>
  );
}
