export function Spinner({ light = false }: { light?: boolean }) {
  return (
    <span
      className={`inline-block w-3 h-3 rounded-full border-2 animate-spin ${
        light ? "border-accent-ink/40 border-t-accent-ink" : "border-ink-faint/40 border-t-ink-faint"
      }`}
    />
  );
}
