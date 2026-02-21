/** 편하루 로고 컴포넌트
 *  - <PyeonharuLogo />          → 아이콘 + 텍스트 (기본)
 *  - <PyeonharuLogo iconOnly /> → 아이콘만
 *  - size="sm" | "md" | "lg"   → 크기 조절
 */

const sizes = {
  sm: { icon: 28, text: "text-base", gap: "gap-1.5" },
  md: { icon: 36, text: "text-xl", gap: "gap-2" },
  lg: { icon: 56, text: "text-2xl", gap: "gap-2.5" },
} as const;

interface PyeonharuLogoProps {
  size?: "sm" | "md" | "lg";
  iconOnly?: boolean;
  className?: string;
}

function LogoIcon({ size }: { size: number }) {
  const r = Math.round(size * 0.22); // border-radius 비율

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className="shrink-0"
    >
      <defs>
        <linearGradient id="pyeonharu-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#pyeonharu-bg)" />
      {/* 그릇 */}
      <path
        d="M128 260 C128 260 128 380 256 380 C384 380 384 260 384 260"
        fill="none"
        stroke="white"
        strokeWidth="22"
        strokeLinecap="round"
      />
      {/* 눈 */}
      <circle cx="208" cy="290" r="12" fill="white" />
      <circle cx="304" cy="290" r="12" fill="white" />
      {/* 미소 */}
      <path
        d="M220 325 Q256 352 292 325"
        fill="none"
        stroke="white"
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* 숟가락 */}
      <g transform="rotate(-25, 148, 200)">
        <ellipse cx="148" cy="152" rx="18" ry="26" fill="white" opacity="0.9" />
        <line x1="148" y1="178" x2="148" y2="252" stroke="white" strokeWidth="10" strokeLinecap="round" opacity="0.9" />
      </g>
      {/* 포크 */}
      <g transform="rotate(25, 364, 200)">
        <line x1="364" y1="130" x2="364" y2="252" stroke="white" strokeWidth="10" strokeLinecap="round" opacity="0.9" />
        <line x1="350" y1="130" x2="350" y2="178" stroke="white" strokeWidth="6" strokeLinecap="round" opacity="0.9" />
        <line x1="364" y1="130" x2="364" y2="178" stroke="white" strokeWidth="6" strokeLinecap="round" opacity="0.9" />
        <line x1="378" y1="130" x2="378" y2="178" stroke="white" strokeWidth="6" strokeLinecap="round" opacity="0.9" />
      </g>
      {/* 하트 */}
      <path
        d="M390 100 C390 88 376 82 368 92 C360 82 346 88 346 100 C346 116 368 130 368 130 C368 130 390 116 390 100Z"
        fill="white"
        opacity="0.7"
      />
    </svg>
  );
}

export function PyeonharuLogo({
  size = "md",
  iconOnly = false,
  className = "",
}: PyeonharuLogoProps) {
  const s = sizes[size];

  if (iconOnly) {
    return (
      <div className={className}>
        <LogoIcon size={s.icon} />
      </div>
    );
  }

  return (
    <div className={`flex items-center ${s.gap} ${className}`}>
      <LogoIcon size={s.icon} />
      <span className={`${s.text} font-bold text-foreground`}>편하루</span>
    </div>
  );
}
