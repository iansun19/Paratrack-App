/**
 * ParatrackLogo — Timeline Path Logo
 *
 * A curved path with milestone dots that forms the visual identity of Paratrack.
 * The path sweeps from bottom-left to top-right in a gentle S-curve, representing
 * the journey of childhood growth. Four milestone dots sit on the path at key
 * intervals. The overall silhouette subtly echoes a "P".
 *
 * Usage:
 *   <ParatrackLogo size={32} />                  — icon only
 *   <ParatrackLogo size={32} showWordmark />      — icon + "Paratrack" wordmark
 *   <ParatrackLogo size={24} variant="white" />   — white version (dark backgrounds)
 */

export type ParatrackLogoVariant = "default" | "white" | "muted";

interface ParatrackLogoProps {
  size?: number;
  showWordmark?: boolean;
  variant?: ParatrackLogoVariant;
  className?: string;
}

const COLORS: Record<ParatrackLogoVariant, { path: string; dots: string[]; text: string }> = {
  default: {
    path: "#C96A4B",
    dots: ["#C96A4B", "#8A7BA7", "#508D76", "#5B9BD5"],
    text: "#1C1A17",
  },
  white: {
    path: "#FFFFFF",
    dots: ["#FFFFFF", "rgba(255,255,255,0.85)", "rgba(255,255,255,0.7)", "rgba(255,255,255,0.55)"],
    text: "#FFFFFF",
  },
  muted: {
    path: "#A8A29E",
    dots: ["#A8A29E", "#A8A29E", "#A8A29E", "#A8A29E"],
    text: "#57534E",
  },
};

export function ParatrackLogo({
  size = 32,
  showWordmark = false,
  variant = "default",
  className = "",
}: ParatrackLogoProps) {
  const colors = COLORS[variant];

  // The SVG viewport is 32×32.
  // Path: starts bottom-left, curves up through two gentle inflections to top-right.
  // The curve uses cubic beziers to produce a graceful S-shape.
  // Milestone dots are placed at t≈0.15, t≈0.4, t≈0.65, t≈0.88 along the path.
  //
  // Dot positions (pre-calculated from the bezier parametric values):
  //   Dot 1 (t=0.15): near start — small, bottom region
  //   Dot 2 (t=0.40): mid-lower — medium
  //   Dot 3 (t=0.65): mid-upper — medium
  //   Dot 4 (t=0.88): near end — large, top region (the "arrival" milestone)

  const scale = size / 32;
  const id = `ptlogo-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      style={{ lineHeight: 1 }}
      aria-label="Paratrack"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Background square with rounded corners */}
        <rect width="32" height="32" rx="8" fill={variant === "white" ? "rgba(255,255,255,0.12)" : "#FDF7F3"} />

        {/* Timeline path — an S-curve from (5,26) sweeping up to (27,6) */}
        {/* Uses a stroke with round linecap and a gentle opacity so it feels organic */}
        <path
          d="M 5,26 C 5,18 10,20 14,14 C 18,8 22,10 27,6"
          stroke={colors.path}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.9"
        />

        {/* Milestone dot 1 — start of journey (small, bottom) */}
        <circle cx="6.5" cy="24" r="1.5" fill={colors.dots[0]} opacity="0.7" />

        {/* Milestone dot 2 — mid-lower inflection */}
        <circle cx="11.5" cy="18" r="2" fill={colors.dots[1]} opacity="0.85" />

        {/* Milestone dot 3 — mid-upper inflection */}
        <circle cx="18.5" cy="11.5" r="2" fill={colors.dots[2]} opacity="0.9" />

        {/* Milestone dot 4 — arrival / latest milestone (largest, brightest) */}
        <circle cx="26" cy="7" r="2.5" fill={colors.dots[3]} />

        {/* Subtle glow ring around the final milestone dot */}
        <circle cx="26" cy="7" r="4" stroke={colors.dots[3]} strokeWidth="1" fill="none" opacity="0.2" />
      </svg>

      {showWordmark && (
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            fontWeight: 600,
            fontSize: size * 0.44,
            color: colors.text,
            letterSpacing: "-0.01em",
            lineHeight: 1,
          }}
        >
          Paratrack
        </span>
      )}
    </div>
  );
}
