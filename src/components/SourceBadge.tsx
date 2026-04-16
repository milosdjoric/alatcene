import { SOURCES } from "@/lib/constants";

export default function SourceBadge({ izvor }: { izvor: string }) {
  const source = SOURCES[izvor];
  const label = source?.label || izvor;
  const color = source?.color || "#6b7280";

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}
