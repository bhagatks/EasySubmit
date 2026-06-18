import React from 'react';

export const LogoIcon = ({ className = "w-10 h-10", ...props }: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      {...props}
    >
      {/* Outer Ring */}
      <circle 
        cx="45" cy="55" r="38" 
        stroke="currentColor" 
        strokeWidth="8" 
        className="text-primary"
      />
      
      {/* The Thick Checkmark */}
      <path 
        d="M25 55L40 70L75 35" 
        stroke="currentColor" 
        strokeWidth="12" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className="text-primary"
      />

      {/* The Sparkles (Stars) in Mint Accent */}
      <path 
        d="M80 20L82 25L87 27L82 29L80 34L78 29L73 27L78 25L80 20Z" 
        fill="currentColor" 
        className="text-mint"
      />
      <path 
        d="M92 35L93 38L96 39L93 40L92 43L91 40L88 39L91 38L92 35Z" 
        fill="currentColor" 
        className="text-mint opacity-80"
      />
      <path 
        d="M75 8L76 10L78 11L76 12L75 14L74 12L72 11L74 10L75 8Z" 
        fill="currentColor" 
        className="text-mint opacity-60"
      />
    </svg>
  );
};