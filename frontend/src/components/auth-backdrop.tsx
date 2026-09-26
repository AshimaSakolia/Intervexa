export function AuthBackdrop() {
  return (
    <div className="auth-backdrop" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          opacity: 0.35,
          maskImage: "radial-gradient(circle at 50% 35%, black 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
