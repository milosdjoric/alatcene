import { SOURCES } from "@/lib/constants";

export default function SourceBadge({ izvor }: { izvor: string }) {
  const source = SOURCES[izvor];
  const label = source?.label || izvor;
  const color = source?.color || "#6b7280";

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase"
      style={{ backgroundColor: color + "20", color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
