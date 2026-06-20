"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_STUDIO_ZOOM,
  readStoredStudioZoom,
  writeStoredStudioZoom,
} from "@/lib/resume/studio-preview-zoom";

export function useStudioPreviewZoom() {
  const [zoom, setZoomState] = useState(DEFAULT_STUDIO_ZOOM);

  useEffect(() => {
    setZoomState(readStoredStudioZoom());
  }, []);

  const setZoom = (value: number) => {
    writeStoredStudioZoom(value);
    setZoomState(value);
  };

  return [zoom, setZoom] as const;
}
