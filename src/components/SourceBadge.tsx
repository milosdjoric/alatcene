import { SOURCES } from "@/lib/constants";

export default function SourceBadge({ izvor }: { izvor: string }) {
  const source = SOURCES[izvor];
  const label = source?.label || izvor;
  const color = source?.color || "#6b7280";

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold tracking-wide uppercase"
      style={{ backgroundColor: color + "18", color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
