function formatPrice(price: number): string {
  return new Intl.NumberFormat("sr-RS").format(price);
}

export default function PriceTag({
  cena,
  redovna_cena,
  popust_procenat,
}: {
  cena: number;
  redovna_cena: number | null;
  popust_procenat: number | null;
}) {
  const hasDiscount = popust_procenat && popust_procenat > 0 && redovna_cena && redovna_cena > cena;

  return (
    <div className="flex items-baseline gap-2 flex-wrap">
      <span className="text-xl font-bold text-[#e0e2e7] tracking-tight">
        {formatPrice(cena)}
        <span className="text-xs font-normal text-[#555963] ml-1">RSD</span>
      </span>
      {hasDiscount && (
        <span className="text-xs text-[#555963] line-through">
          {formatPrice(redovna_cena)}
        </span>
      )}
    </div>
  );
}
