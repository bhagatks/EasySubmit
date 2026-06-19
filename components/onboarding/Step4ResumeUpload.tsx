"use client";

import { CloudUpload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import NavigatorTip from "@/components/onboarding/NavigatorTip";
import { useOnboardingStore } from "@/stores/onboardingStore";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPTED_EXTENSIONS = ".pdf,.doc,.docx";

interface Step4ResumeUploadProps {
  onAdvance?: () => void | Promise<void>;
  isAdvancing?: boolean;
  /** When true, file upload / skip only update state; wizard nav handles advance. */
  manualAdvance?: boolean;
}

export default function Step4ResumeUpload({
  onAdvance,
  isAdvancing = false,
  manualAdvance = false,
}: Step4ResumeUploadProps) {
  const router = useRouter();
  const setResumeFile = useOnboardingStore((s) => s.setResumeFile);
  const setResumeSkipped = useOnboardingStore((s) => s.setResumeSkipped);
  const completeResumeMapping = useOnboardingStore((s) => s.completeResumeMapping);

  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      const valid =
        ACCEPTED_TYPES.includes(file.type) ||
        /\.(pdf|doc|docx)$/i.test(file.name);

      if (!valid) return;

      setResumeFile(file);
      if (manualAdvance) return;
      if (onAdvance) {
        void onAdvance();
      } else {
        router.push("/onboarding/step-4");
      }
    },
    [setResumeFile, router, onAdvance, manualAdvance]
  );

  const handleSkip = () => {
    setResumeSkipped(true);
    if (manualAdvance) return;
    if (onAdvance) {
      void onAdvance();
    } else {
      completeResumeMapping();
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="mb-6 font-display text-2xl font-semibold leading-snug text-foreground">
        Upload your resume to accelerate your profile
      </h1>

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
          "flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-16 transition-all duration-200",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-white/15 bg-white/[0.03] hover:border-primary/60 hover:bg-primary/5",
        ].join(" ")}
      >
        <CloudUpload size={48} strokeWidth={1.5} className="text-primary" />
        <p className="mt-4 text-base font-semibold text-foreground">Upload a file</p>
        <p className="mt-1 text-sm text-muted-foreground">PDF, DOC, or DOCX</p>
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
        className="mt-4 text-left text-sm font-medium text-primary transition-opacity hover:opacity-80"
      >
        I&apos;ll fill my experience manually →
      </button>

      <NavigatorTip
        className="mt-8"
        message="We'll scan your resume and match you with roles that fit your background."
      />
    </div>
  );
}
