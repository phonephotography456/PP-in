import { discount, inr } from "@/lib/format";

// offer_price is the selling price; base_price is struck through only when it is higher.
export function Price({ base, offer, size = "text-xl" }: { base: number; offer: number; size?: string }) {
  const off = discount(base, offer);
  return (
    <span className="flex items-baseline gap-2">
      <span className={`${size} font-extrabold text-price`}>{inr(offer)}</span>
      {off > 0 && (
        <>
          <s className="text-sm text-muted">{inr(base)}</s>
          <span className="text-xs font-bold text-price">{off}% off</span>
        </>
      )}
    </span>
  );
}
