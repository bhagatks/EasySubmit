"use client";

import { createContext, useContext } from "react";
import {
  DEFAULT_RESUME_FONT_ID,
  type ResumeFontId,
} from "@/lib/resume/resume-fonts";

const ResumePreviewFontContext = createContext<ResumeFontId>(DEFAULT_RESUME_FONT_ID);

export function ResumePreviewFontProvider({
  fontId,
  children,
}: {
  fontId: ResumeFontId;
  children: React.ReactNode;
}) {
  return (
    <ResumePreviewFontContext.Provider value={fontId}>
      {children}
    </ResumePreviewFontContext.Provider>
  );
}

export function useResumePreviewFont(): ResumeFontId {
  return useContext(ResumePreviewFontContext);
}
