"use client";
import { useState } from "react";
import { PRICE_RANGES } from "@/lib/format";
import type { FilterOptions } from "@/lib/public";

type Values = Partial<Record<"service" | "state" | "city" | "phone" | "price" | "level", string>>;

// Order: Service → State → City → Smartphone brand/model → Price. City options depend on state.
// `phone` is a model id, or "b:<brand-slug>" for any model of a brand.
export function SearchFilters({ action, options, values = {}, vertical = false, fixedService }: { action: string; options: FilterOptions; values?: Values; vertical?: boolean; fixedService?: string }) {
  const [state, setState] = useState(values.state ?? "");
  const cities = options.cities.filter((c) => c.stateSlug === state);
  const gi = vertical ? "" : " glass-input"; // glossy controls in the horizontal (hero) variant

  return (
    <form action={action} className={vertical ? "grid grid-cols-1 gap-4" : "glass grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[repeat(5,1fr)_auto] lg:items-end"}>
      {fixedService ? <input type="hidden" name="service" value={fixedService} /> : (
        <div>
          <label className="label" htmlFor="service">Photography service</label>
          <select id="service" name="service" defaultValue={values.service ?? ""} className={`input${gi}`}>
            <option value="">All services</option>
            {options.services.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className="label" htmlFor="state">State</label>
        <select id="state" name="state" value={state} onChange={(e) => setState(e.target.value)} className={`input${gi}`}>
          <option value="">All states</option>
          {options.states.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="city">City</label>
        <select id="city" name="city" key={state} defaultValue={values.city ?? ""} disabled={!state} className={`input disabled:bg-surface/60 disabled:text-muted${gi}`}>
          <option value="">{state ? "All cities" : "Select state first"}</option>
          {cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="phone">Smartphone brand / model</label>
        <select id="phone" name="phone" defaultValue={values.phone ?? ""} className={`input${gi}`}>
          <option value="">Any smartphone</option>
          {options.brands.map((b) => (
            <optgroup key={b.slug} label={b.name}>
              <option value={`b:${b.slug}`}>Any {b.name}</option>
              {b.models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </optgroup>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="price">Price range</label>
        <select id="price" name="price" defaultValue={values.price ?? ""} className={`input${gi}`}>
          <option value="">Any price</option>
          {PRICE_RANGES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      </div>
      {vertical && (
        <div>
          <label className="label" htmlFor="level">Package</label>
          <select id="level" name="level" defaultValue={values.level ?? ""} className={`input${gi}`}>
            <option value="">All packages</option>
            <option value="basic">Basic</option>
            <option value="standard">Standard</option>
            <option value="premium">Premium</option>
          </select>
        </div>
      )}
      <button type="submit" className={vertical ? "btn-primary w-full" : "btn-primary sm:col-span-2 lg:col-span-1 lg:h-[42px]"}>{vertical ? "Apply filters" : "Search"}</button>
    </form>
  );
}
