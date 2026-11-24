"use client";
import { useState } from "react";
import { BRANDS, LEVELS, PRICE_RANGES, SERVICES, STATES } from "@/lib/mock";

type Values = Partial<Record<"service" | "state" | "city" | "phone" | "price" | "level", string>>;


// Order: Service → State → City → Smartphone → Price. City options depend on state.
export function SearchFilters({ action, values = {}, vertical = false, fixedService }: { action: string; values?: Values; vertical?: boolean; fixedService?: string }) {
  const [state, setState] = useState(values.state ?? "");
  const cities = STATES.find((s) => s.slug === state)?.cities ?? [];

  return (
    <form action={action} className={vertical ? "grid grid-cols-1 gap-4" : "card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[repeat(5,1fr)_auto] lg:items-end"}>
      {fixedService && <input type="hidden" name="service" value={fixedService} />}
      {!fixedService && <div>
        <label className="label" htmlFor="service">Service</label>
        <select id="service" name="service" defaultValue={values.service ?? ""} className="input">
          <option value="">All services</option>
          {SERVICES.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
        </select>
      </div>}
      <div>
        <label className="label" htmlFor="state">State</label>
        <select id="state" name="state" value={state} onChange={(e) => setState(e.target.value)} className="input">
          <option value="">All states</option>
          {STATES.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="city">City</label>
        <select id="city" name="city" key={state} defaultValue={values.city ?? ""} disabled={!state} className="input disabled:bg-surface disabled:text-muted">
          <option value="">{state ? "All cities" : "Select state first"}</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="phone">Smartphone</label>
        <select id="phone" name="phone" defaultValue={values.phone ?? ""} className="input">
          <option value="">Any smartphone</option>
          {BRANDS.map((b) => (
            <optgroup key={b.name} label={b.name}>
              {b.models.map((m) => <option key={m} value={m}>{m}</option>)}
            </optgroup>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="price">Price range</label>
        <select id="price" name="price" defaultValue={values.price ?? ""} className="input">
          <option value="">Any price</option>
          {PRICE_RANGES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      </div>
      {vertical && (
        <div>
          <label className="label" htmlFor="level">Package</label>
          <select id="level" name="level" defaultValue={values.level ?? ""} className="input">
            <option value="">All packages</option>
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      )}
      <button type="submit" className={vertical ? "btn-primary w-full" : "btn-primary sm:col-span-2 lg:col-span-1 lg:h-[42px]"}>{vertical ? "Apply filters" : "Search"}</button>
    </form>
  );
}
