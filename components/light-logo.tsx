type LightLogoProps = {
  size?: "sm" | "md" | "lg"
  /**
   * Color variant.
   *  - "light" renders the wordmark in white (use on dark backgrounds, e.g. our auth screens)
   *  - "dark"  renders the wordmark in black (use on white backgrounds)
   */
  variant?: "light" | "dark"
  className?: string
  showSub?: boolean
}

/**
 * Light TV brand logo: the wordmark "Light" with the dot of the lowercase "i"
 * replaced by a stylized lightbulb. Built from text + an inline SVG so it scales
 * cleanly without a raster asset.
 *
 * Layout: "L" + bulb (i) + "ght"
 */
export function LightLogo({
  size = "md",
  variant = "light",
  className = "",
  showSub = true,
}: LightLogoProps) {
  const sizes = {
    sm: { text: "text-3xl", bulb: 18, gap: "gap-0.5", sub: "text-[10px]" },
    md: { text: "text-5xl", bulb: 28, gap: "gap-1", sub: "text-xs" },
    lg: { text: "text-6xl md:text-7xl", bulb: 36, gap: "gap-1.5", sub: "text-sm" },
  }
  const s = sizes[size]

  const stroke = variant === "light" ? "#ffffff" : "#0a0a0a"
  const textColor = variant === "light" ? "text-white" : "text-zinc-900"
  const subColor = variant === "light" ? "text-zinc-400" : "text-zinc-600"

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <div className={`flex items-end ${s.gap} font-sans font-light tracking-tight ${s.text} ${textColor}`}>
        <span className="leading-none">L</span>
        <span
          className="inline-flex items-end justify-center -mb-1"
          style={{ width: s.bulb, height: s.bulb * 1.25 }}
          aria-hidden="true"
        >
          <Bulb stroke={stroke} size={s.bulb} />
        </span>
        <span className="leading-none">ght</span>
      </div>
      {showSub && (
        <span className={`mt-2 ${s.sub} font-medium uppercase tracking-[0.4em] ${subColor}`}>
          TV
        </span>
      )}
    </div>
  )
}

function Bulb({ stroke, size }: { stroke: string; size: number }) {
  return (
    <svg
      width={size}
      height={size * 1.25}
      viewBox="0 0 32 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Light rays */}
      <g stroke={stroke} strokeWidth="1.4" strokeLinecap="round" opacity="0.7">
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="6" y1="6" x2="8.5" y2="9" />
        <line x1="26" y1="6" x2="23.5" y2="9" />
        <line x1="2" y1="14" x2="5.5" y2="14" />
        <line x1="30" y1="14" x2="26.5" y2="14" />
      </g>
      {/* Bulb glass */}
      <path
        d="M16 8c-5.5 0-9 4-9 9 0 3.2 1.7 5.6 3.5 7.2.9.8 1.5 1.7 1.5 2.8v1H20v-1c0-1.1.6-2 1.5-2.8C23.3 22.6 25 20.2 25 17c0-5-3.5-9-9-9z"
        stroke={stroke}
        strokeWidth="1.6"
        fill="none"
      />
      {/* Filament */}
      <path
        d="M13 19c.8-1 1.8-1.5 3-1.5s2.2.5 3 1.5"
        stroke={stroke}
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Base ridges */}
      <line x1="12" y1="30" x2="20" y2="30" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="13" y1="33" x2="19" y2="33" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="14" y1="36" x2="18" y2="36" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export default LightLogo
