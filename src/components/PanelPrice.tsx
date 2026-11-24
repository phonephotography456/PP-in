const inr = (v: string | number) => `₹${Number(v).toLocaleString("en-IN")}`;

/** Offer price (the real selling price, red) with the base price struck through when it is higher. */
export function PanelPrice({ base, offer }: { base: string | number; offer: string | number }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="font-semibold text-price">{inr(offer)}</span>
      {Number(base) > Number(offer) && <s className="text-xs text-muted">{inr(base)}</s>}
    </span>
  );
}
