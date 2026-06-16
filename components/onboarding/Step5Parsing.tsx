"use client";

import { useEffect, useState } from "react";
import { useOnboardingStore } from "@/stores/onboardingStore";

const PARSE_DURATION_MS = 6000;
const COMPLETE_DELAY_MS = 1000;

interface Step5ParsingProps {
  onNext: () => void;
}

export default function Step5Parsing({ onNext }: Step5ParsingProps) {
  const resumeFile = useOnboardingStore((s) => s.resumeFile);
  const [parsingProgress, setParsingProgress] = useState(0);

  useEffect(() => {
    const start = Date.now();
    let completeTimeout: ReturnType<typeof setTimeout> | undefined;

    const tick = setInterval(() => {
      const elapsed = Date.now() - start;
      const next = Math.min(
        100,
        Math.round((elapsed / PARSE_DURATION_MS) * 100)
      );
      setParsingProgress(next);

      if (next >= 100) {
        clearInterval(tick);
        completeTimeout = setTimeout(onNext, COMPLETE_DELAY_MS);
      }
    }, 50);

    return () => {
      clearInterval(tick);
      if (completeTimeout) clearTimeout(completeTimeout);
    };
  }, [onNext]);

  return (
    <div className="flex flex-1 flex-col justify-center">
      <h1 className="text-2xl font-semibold text-[#1F2937]">
        Parsing your resume…
      </h1>
      {resumeFile && (
        <p className="mt-2 truncate text-sm text-gray-500">{resumeFile.name}</p>
      )}
      <p className="mt-6 text-5xl font-bold tabular-nums text-[#12B3D1]">
        {parsingProgress}%
      </p>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full bg-[#12B3D1] transition-all duration-100 ease-linear"
          style={{ width: `${parsingProgress}%` }}
        />
      </div>
      <p className="mt-4 text-sm text-gray-500">
        Extracting skills, experience, and contact details for your profile.
      </p>
    </div>
  );
}
