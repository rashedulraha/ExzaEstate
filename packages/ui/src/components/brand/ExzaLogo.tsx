import React from 'react';

export interface ExzaLogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  variant?: 'gold' | 'white' | 'dark';
  showText?: boolean;
  className?: string;
}

/**
 * Official ExzaEstate Architectural Cadastre Monogram & Logo Mark.
 * Combines the letter 'E' with multistoried structural pillars,
 * golden precision beams, and cadastral land parcel subdivision geometry.
 */
export function ExzaLogoIcon({
  size = 36,
  variant = 'gold',
  className = '',
  ...props
}: Omit<ExzaLogoProps, 'showText'>) {
  const strokeColors: Record<'gold' | 'white' | 'dark', string> = {
    gold: '#C8A951',
    white: '#FFFFFF',
    dark: '#1A1A2E',
  };
  const strokeColor = strokeColors[variant] ?? '#C8A951';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="ExzaEstate Logo Icon"
      {...props}
    >
      {/* Outer structural bounds & E monogram */}
      {/* Top roof line / cantilever */}
      <path
        d="M36 22L46 16V30L36 36V22Z"
        stroke={strokeColor}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Top horizontal wing */}
      <path
        d="M46 22H78L72 32H46V22Z"
        stroke={strokeColor}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Vertical architectural tower spine */}
      <rect
        x="36"
        y="22"
        width="14"
        height="44"
        stroke={strokeColor}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Spine architectural window marks */}
      <rect x="41" y="27" width="4" height="4" fill={strokeColor} />
      <rect x="41" y="36" width="4" height="4" fill={strokeColor} />
      <rect x="41" y="45" width="4" height="4" fill={strokeColor} />

      {/* Mid horizontal wing / transaction beam */}
      <path
        d="M46 44H72L67 54H46V44Z"
        stroke={strokeColor}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />

      {/* Stepped development wings */}
      <path d="M24 44H36V66H24V44Z" stroke={strokeColor} strokeWidth="3.5" strokeLinejoin="round" />
      <line x1="30" y1="44" x2="30" y2="66" stroke={strokeColor} strokeWidth="2.5" />

      {/* Cadastral land plot base (Subdivision parcel geometry) */}
      <rect
        x="24"
        y="66"
        width="54"
        height="18"
        stroke={strokeColor}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Parcel boundary lines inside the base */}
      <line x1="36" y1="66" x2="48" y2="84" stroke={strokeColor} strokeWidth="3" />
      <line x1="58" y1="66" x2="48" y2="84" stroke={strokeColor} strokeWidth="2.5" />
      <line x1="58" y1="66" x2="72" y2="84" stroke={strokeColor} strokeWidth="3" />
      <line
        x1="42"
        y1="75"
        x2="78"
        y2="75"
        stroke={strokeColor}
        strokeWidth="2"
        strokeDasharray="3 3"
      />
    </svg>
  );
}

/**
 * Full ExzaEstate Logo with Monogram + Premium Typography
 */
export function ExzaLogo({
  size = 40,
  variant = 'gold',
  showText = true,
  className = '',
}: ExzaLogoProps) {
  const textColor = variant === 'dark' ? 'text-primary' : 'text-white';
  const subtitleColor = variant === 'dark' ? 'text-text-muted' : 'text-white/60';

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <ExzaLogoIcon size={size} variant={variant} />
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={`text-h2 font-bold tracking-tight ${textColor}`}>
              Exza<span className="text-accent">Estate</span>
            </span>
          </div>
          <span className={`text-[10px] font-medium tracking-widest uppercase ${subtitleColor}`}>
            Real Estate ERP
          </span>
        </div>
      )}
    </div>
  );
}
