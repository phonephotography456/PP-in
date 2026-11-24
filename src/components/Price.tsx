import { discount, inr } from "@/lib/mock";

// Offer price (red) + struck-through base price + % off.
export function Price({ base, offer, size = "text-xl" }: { base: number; offer: number; size?: string }) {
  return (
    <span className="flex items-baseline gap-2">
      <span className={`${size} font-extrabold text-price`}>{inr(offer)}</span>
      <s className="text-sm text-muted">{inr(base)}</s>
      <span className="text-xs font-bold text-price">{discount(base, offer)}% off</span>
    </span>
  );
}
