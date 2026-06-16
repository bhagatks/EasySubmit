"use client";

import { useCallback, useRef, useState } from "react";
import NavigatorTip from "@/components/onboarding/NavigatorTip";
import OnboardingNextButton from "@/components/onboarding/OnboardingNextButton";
import { useOnboardingStore } from "@/stores/onboardingStore";

const MIN_SALARY = 30;
const MAX_SALARY = 300;
const SALARY_STEP = 5;

interface Step9SalaryProps {
  onNext: () => void;
}

export default function Step9Salary({ onNext }: Step9SalaryProps) {
  const minSalary = useOnboardingStore((s) => s.minSalary);
  const setMinSalary = useOnboardingStore((s) => s.setMinSalary);
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const percent =
    ((minSalary - MIN_SALARY) / (MAX_SALARY - MIN_SALARY)) * 100;

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;

      const rect = track.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const raw = MIN_SALARY + ratio * (MAX_SALARY - MIN_SALARY);
      const stepped =
        Math.round(raw / SALARY_STEP) * SALARY_STEP;
      setMinSalary(
        Math.min(MAX_SALARY, Math.max(MIN_SALARY, stepped))
      );
    },
    [setMinSalary]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    trackRef.current?.setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    updateFromClientX(e.clientX);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    trackRef.current?.releasePointerCapture(e.pointerId);
  };

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="mb-6 text-2xl font-semibold leading-snug text-[#1F2937]">
        What is your minimum expected salary?
      </h1>

      <NavigatorTip
        className="mb-10"
        message="Your salary expectations stay private and are only used to match you with relevant roles. We never share them without your consent."
      />

      <div className="relative px-2 pt-12">
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-[12px] bg-[#12B3D1] px-4 py-2 text-sm font-semibold text-white shadow-md"
          style={{ left: `${percent}%` }}
        >
          At least ${minSalary}k USD
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-8 border-transparent border-t-[#12B3D1]" />
        </div>

        <div
          ref={trackRef}
          className="relative h-3 cursor-pointer rounded-full bg-gray-200"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-[#12B3D1]"
            style={{ width: `${percent}%` }}
          />
          <div
            className="absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-[#12B3D1] shadow-md"
            style={{ left: `${percent}%` }}
          />
        </div>

        <div className="mt-3 flex justify-between text-xs text-gray-500">
          <span>${MIN_SALARY}k</span>
          <span>${MAX_SALARY}k</span>
        </div>
      </div>

      <OnboardingNextButton onClick={onNext} />
    </div>
  );
}
