export const SOURCES: Record<
  string,
  { label: string; color: string; url: string }
> = {
  superalati: { label: "Super Alati", color: "#f59e0b", url: "superalati.rs" },
  "gama-alati": { label: "Gama Alati", color: "#10b981", url: "gama-alati.rs" },
  shoppster: { label: "Shoppster", color: "#6366f1", url: "shoppster.rs" },
  prodavnicaalata: { label: "Prodavnica Alata", color: "#ef4444", url: "prodavnicaalata.rs" },
  najpovoljnijialati: { label: "Najpovoljniji Alati", color: "#3b82f6", url: "najpovoljnijialati.rs" },
  odigledolokomotive: { label: "Od Igle Do Lokomotive", color: "#8b5cf6", url: "odigledolokomotive.rs" },
  timkomerc: { label: "Tim Komerc", color: "#ec4899", url: "timkomerc.rs" },
  "sbt-alati": { label: "SBT Alati", color: "#14b8a6", url: "sbt-alati.rs" },
  "omni-alati": { label: "Omni Alati", color: "#f97316", url: "omni-alati.rs" },
  eplaneta: { label: "ePlaneta", color: "#22c55e", url: "eplaneta.rs" },
  kliklak: { label: "KlikLak", color: "#a855f7", url: "kliklak.rs" },
  metalflex: { label: "Metalflex", color: "#64748b", url: "metalflex.rs" },
  simns: { label: "SIM NS", color: "#0ea5e9", url: "simns.rs" },
  wobyhaus: { label: "Woby Haus", color: "#d946ef", url: "wobyhaus.co.rs" },
  amcarco: { label: "Amcarco", color: "#84cc16", url: "amcarco.co.rs" },
  axisshop: { label: "Axis Shop", color: "#06b6d4", url: "axisshop.rs" },
  bosshop: { label: "Boss Shop", color: "#eab308", url: "bosshop.rs" },
  ananas: { label: "Ananas", color: "#ff6b00", url: "ananas.rs" },
  crafter: { label: "Crafter", color: "#e53935", url: "crafter.rs" },
};

export const PAGE_SIZE = 40;

export const SORT_OPTIONS = [
  { value: "cena_asc", label: "Cena: najniža" },
  { value: "cena_desc", label: "Cena: najviša" },
  { value: "usteda_desc", label: "Najveća ušteda" },
  { value: "popust_desc", label: "Najveći popust" },
  { value: "naziv_asc", label: "Naziv: A-Ž" },
  { value: "newest", label: "Najnovije" },
] as const;
