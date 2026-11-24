"use client";
import { useState } from "react";
import { Field } from "@/components/PanelUI";

type Opt = { id: string; name: string; active: boolean };
type City = Opt & { stateId: string };

/** State + dependent city selects. Inactive options appear only when already selected (history kept). */
export function StateCity({ states, cities, stateId, cityId }: { states: Opt[]; cities: City[]; stateId: string | null; cityId: string | null }) {
  const [state, setState] = useState(stateId ?? "");
  const [city, setCity] = useState(cityId ?? "");
  const stateOpts = states.filter((s) => s.active || s.id === stateId);
  const cityOpts = cities.filter((c) => c.stateId === state && (c.active || c.id === cityId));
  return (
    <>
      <Field label="State">
        <select name="stateId" className="input" value={state} onChange={(e) => { setState(e.target.value); setCity(""); }}>
          <option value="">Select state</option>
          {stateOpts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </Field>
      <Field label="City">
        <select name="cityId" className="input" value={city} onChange={(e) => setCity(e.target.value)} disabled={!state}>
          <option value="">Select city</option>
          {cityOpts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
    </>
  );
}
