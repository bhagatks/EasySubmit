"use client";

import { CloudUpload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import NavigatorTip from "@/components/onboarding/NavigatorTip";
import {
  MAPPING_COMPLETE_DELAY_MS,
  MAPPING_DURATION_MS,
} from "@/lib/onboarding/mapping";
import { useOnboardingStore } from "@/stores/onboardingStore";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPTED_EXTENSIONS = ".pdf,.doc,.docx";

export default function Step4ResumeUpload() {
  const setResumeFile = useOnboardingStore((s) => s.setResumeFile);
  const setResumeSkipped = useOnboardingStore((s) => s.setResumeSkipped);
  const setIsMapping = useOnboardingStore((s) => s.setIsMapping);
  const completeResumeMapping = useOnboardingStore((s) => s.completeResumeMapping);
  const isMapping = useOnboardingStore((s) => s.isMapping);
  const resumeFile = useOnboardingStore((s) => s.resumeFile);
  const resumeFileName = useOnboardingStore((s) => s.resumeFileName);

  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mappingProgress, setMappingProgress] = useState(0);

  const handleFile = useCallback(
    (file: File) => {
      const valid =
        ACCEPTED_TYPES.includes(file.type) ||
        /\.(pdf|doc|docx)$/i.test(file.name);

      if (!valid) return;

      setResumeFile(file);
      setIsMapping(true);
      setMappingProgress(0);
    },
    [setResumeFile, setIsMapping]
  );

  const handleSkip = () => {
    setResumeSkipped(true);
    completeResumeMapping();
  };

  useEffect(() => {
    if (!isMapping) return;

    const start = Date.now();
    let completeTimeout: ReturnType<typeof setTimeout> | undefined;

    const tick = setInterval(() => {
      const elapsed = Date.now() - start;
      const next = Math.min(
        100,
        Math.round((elapsed / MAPPING_DURATION_MS) * 100)
      );
      setMappingProgress(next);

      if (next >= 100) {
        clearInterval(tick);
        completeTimeout = setTimeout(
          () => completeResumeMapping(),
          MAPPING_COMPLETE_DELAY_MS
        );
      }
    }, 50);

    return () => {
      clearInterval(tick);
      if (completeTimeout) clearTimeout(completeTimeout);
    };
  }, [isMapping, completeResumeMapping]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const displayName = resumeFile?.name ?? resumeFileName;

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="mb-6 text-2xl font-semibold leading-snug text-[#1F2937]">
        Upload your resume to accelerate your profile
      </h1>

      {isMapping ? (
        <div className="flex flex-1 flex-col">
          <p className="text-base leading-relaxed text-[#1F2937]">
            Mapping your professional history to the EasySubmit engine…
          </p>
          {displayName && (
            <p className="mt-2 truncate text-sm text-gray-500">{displayName}</p>
          )}
          <p className="mt-8 text-5xl font-bold tabular-nums text-[#12B3D1]">
            {mappingProgress}%
          </p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-[12px] bg-gray-200">
            <div
              className="h-full rounded-[12px] bg-[#12B3D1] transition-all duration-100 ease-linear"
              style={{ width: `${mappingProgress}%` }}
            />
          </div>
        </div>
      ) : (
        <>
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={[
              "flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-[12px] border-2 border-dashed px-6 py-16 transition-all duration-200 ease-in-out",
              isDragging
                ? "border-[#12B3D1] bg-[#12B3D1]/5"
                : "border-[#E5E7EB] bg-white hover:border-[#12B3D1] hover:bg-[#12B3D1]/5",
            ].join(" ")}
          >
            <CloudUpload size={48} strokeWidth={1.5} className="text-[#12B3D1]" />
            <p className="mt-4 text-base font-semibold text-[#1F2937]">
              Upload a file
            </p>
            <p className="mt-1 text-sm text-gray-500">PDF, DOC, or DOCX</p>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="mt-4 text-left text-sm font-medium text-[#12B3D1] transition-all duration-200 ease-in-out hover:opacity-80"
          >
            I&apos;ll fill my experience manually →
          </button>

          <NavigatorTip
            className="mt-8"
            message="We'll scan your resume and match you with roles that fit your background."
          />
        </>
      )}
    </div>
  );
}
