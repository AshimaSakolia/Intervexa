export function SideRail({ side }: { side: "left" | "right" }) {
  const flip = side === "right";
  return (
    <div
      aria-hidden="true"
      className={`hidden 2xl:block fixed top-0 ${side === "left" ? "left-0" : "right-0"} w-[calc((100%-1024px)/2)] max-w-[220px] h-full pointer-events-none overflow-hidden`}
    >
      <svg
        viewBox="0 0 220 900"
        className={`absolute top-24 ${side === "left" ? "left-4" : "right-4"} w-40 opacity-[0.35] dark:opacity-[0.45]`}
        style={flip ? { transform: "scaleX(-1)" } : undefined}
      >
        <defs>
          <linearGradient id={`rail-grad-${side}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect
          className="rail-shape"
          style={{ animationDuration: "6.5s", animationDelay: "0s" }}
          x="18" y="40" width="34" height="34" rx="8" fill="none" stroke="var(--accent)" strokeWidth="1.4"
        />
        <circle
          className="rail-shape"
          style={{ animationDuration: "8s", animationDelay: "0.6s" }}
          cx="120" cy="140" r="20" fill="none" stroke="var(--accent)" strokeWidth="1.4"
        />
        <rect
          className="rail-shape"
          style={{ animationDuration: "7.2s", animationDelay: "1.2s" }}
          x="70" y="220" width="24" height="24" rx="6" fill="var(--accent)" fillOpacity="0.12" stroke="var(--accent)" strokeWidth="1.2" transform="rotate(20 82 232)"
        />
        <line x1="30" y1="320" x2="30" y2="620" stroke={`url(#rail-grad-${side})`} strokeWidth="1.4" />
        <circle
          className="rail-shape"
          style={{ animationDuration: "5.5s", animationDelay: "0.3s" }}
          cx="30" cy="320" r="3.5" fill="var(--accent)"
        />
        <rect
          className="rail-shape"
          style={{ animationDuration: "9s", animationDelay: "1.8s" }}
          x="100" y="380" width="44" height="44" rx="10" fill="none" stroke="var(--accent)" strokeWidth="1.2" transform="rotate(-12 122 402)"
        />
        <circle
          className="rail-shape"
          style={{ animationDuration: "6s", animationDelay: "2.4s" }}
          cx="50" cy="500" r="6" fill="var(--accent)" fillOpacity="0.5"
        />
        <circle
          className="rail-shape"
          style={{ animationDuration: "7.8s", animationDelay: "0.9s" }}
          cx="140" cy="560" r="10" fill="none" stroke="var(--accent)" strokeWidth="1.2"
        />
        <rect
          className="rail-shape"
          style={{ animationDuration: "8.5s", animationDelay: "1.5s" }}
          x="20" y="640" width="28" height="28" rx="7" fill="none" stroke="var(--accent)" strokeWidth="1.4" transform="rotate(35 34 654)"
        />
      </svg>
    </div>
  );
}
