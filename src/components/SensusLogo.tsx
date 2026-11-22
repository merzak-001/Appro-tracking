import React, { useState, useEffect } from 'react';

interface SensusLogoProps {
  className?: string;
  logoUrl?: string;
  height?: number;
}

export const SensusLogo: React.FC<SensusLogoProps> = ({ className = '', logoUrl, height = 48 }) => {
  const [hasError, setHasError] = useState(false);

  const activeSrc = (logoUrl && logoUrl.trim() !== '') ? logoUrl : '/logo.jpg';

  useEffect(() => {
    setHasError(false);
  }, [logoUrl, activeSrc]);

  if (!hasError) {
    return (
      <img
        src={activeSrc}
        alt="Logo Société"
        className={`object-contain ${className}`}
        style={{ height: `${height}px` }}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div className={`inline-flex items-center ${className}`}>
      <svg
        viewBox="0 0 400 120"
        className="w-auto"
        style={{ height: `${height}px` }}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Top 3 Green Stacked Bars above 'E' */}
        <rect x="110" y="8" width="48" height="10" rx="1.5" fill="#72BF44" />
        <rect x="110" y="24" width="48" height="10" rx="1.5" fill="#72BF44" />
        <rect x="110" y="40" width="48" height="10" rx="1.5" fill="#72BF44" />

        {/* Text 'SENSUS' stylized */}
        <text
          x="10"
          y="102"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="68"
          letterSpacing="2"
          fill="#1E40AF"
        >
          sēnsus
        </text>
      </svg>
    </div>
  );
};
