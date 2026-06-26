import React from "react";
import { BRAND_COLORS } from "@/src/shared/brand-colors";

/** Shared ES ai mark — fill from `BRAND_COLORS.logo` (synced with extension/icons/icon.svg). */
export const LogoIcon = ({
  className = "w-10 h-10",
  ...props
}: React.SVGProps<SVGSVGElement>) => {
  const { viewBox, rx, fill } = BRAND_COLORS.logo;

  return (
    <svg
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      {...props}
    >
      <rect width="128" height="128" rx={rx} fill={fill} />
      <text
        x="50"
        y="84"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="800"
        fontSize="68"
        fill="#FFFFFF"
      >
        ES
      </text>
      <text
        x="108"
        y="104"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="700"
        fontSize="28"
        fill="#FFFFFF"
        opacity="0.95"
      >
        ai
      </text>
    </svg>
  );
};
