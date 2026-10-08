import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export function Logo({ className = '', size = 32, showText = false }: LogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-[0_0_12px_rgba(245,158,11,0.35)]"
      >
        <defs>
          <linearGradient id="admingen-spark" x1="15" y1="15" x2="105" y2="105" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
          <linearGradient id="admingen-base" x1="30" y1="60" x2="90" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#312e81" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </linearGradient>
        </defs>

        {/* Schema Base Bracket / Pedestal */}
        <polygon points="60,68 90,82 60,98 30,82" fill="url(#admingen-base)" stroke="#6366f1" strokeWidth="2" />
        <polygon points="30,82 60,98 60,108 30,92" fill="#1e1b4b" stroke="#4f46e5" strokeWidth="1.5" />
        <polygon points="60,98 90,82 90,92 60,108" fill="#0f172a" stroke="#4f46e5" strokeWidth="1.5" />

        {/* Generative Star Spark (A-Silhouette) */}
        <path d="M 60 12 Q 60 48 96 48 Q 60 48 60 84 Q 60 48 24 48 Q 60 48 60 12 Z" fill="url(#admingen-spark)" />
        <circle cx="60" cy="48" r="6" fill="#ffffff" />
        <circle cx="60" cy="48" r="11" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.6" />

        {/* Accent Sparks */}
        <circle cx="84" cy="24" r="2.5" fill="#fbbf24" />
        <circle cx="36" cy="24" r="2.5" fill="#f59e0b" />
      </svg>

      {showText && (
        <span className="font-extrabold tracking-tight text-white text-lg">
          Admin<span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">Gen</span>
        </span>
      )}
    </div>
  );
}
