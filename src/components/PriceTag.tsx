function formatPrice(price: number): string {
  return price.toLocaleString("sr-RS") + " RSD";
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
      <span className="text-lg font-bold text-zinc-900">
        {formatPrice(cena)}
      </span>
      {hasDiscount && (
        <>
          <span className="text-sm text-zinc-400 line-through">
            {formatPrice(redovna_cena)}
          </span>
          <span className="text-xs font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
            -{popust_procenat}%
          </span>
        </>
      )}
    </div>
  );
}
