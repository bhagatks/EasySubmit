import React from 'react';

export const LogoIcon = ({ className = "w-10 h-10", ...props }: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      viewBox="0 0 240 240"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="es-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <rect x="10" y="10" width="220" height="220" rx="40" fill="url(#es-logo-grad)" />
      <text x="95" y="142" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="98" fill="#FFFFFF">ES</text>
      <text x="186" y="180" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="30" fill="#FFFFFF" opacity="0.9">ai</text>
    </svg>
  );
};
