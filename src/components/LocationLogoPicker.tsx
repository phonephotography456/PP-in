"use client";
import { useState } from "react";
import { Act, AdminForm, AdminImageField } from "./AdminForm";
import { saveLocationLogo } from "@/app/admin/actions";

type State = { id: string; name: string; imageUrl: string | null };
type City = { id: string; stateId: string; name: string; imageUrl: string | null };

/**
 * State dropdown + optional city dropdown (that state's cities) + upload + Add.
 * State only → the logo belongs to the state; state and city → it belongs to the city. All saved logos are listed below.
 */
export function LocationLogoPicker({ states, cities }: { states: State[]; cities: City[] }) {
  const [stateId, setStateId] = useState("");
  const [cityId, setCityId] = useState("");
  const stateCities = cities.filter((c) => c.stateId === stateId);
  const target = cityId ? { kind: "city" as const, ...cities.find((c) => c.id === cityId)! } : stateId ? { kind: "state" as const, ...states.find((s) => s.id === stateId)! } : null;

  const saved = [
    ...states.filter((s) => s.imageUrl).map((s) => ({ kind: "state" as const, id: s.id, stateId: s.id, cityId: "", label: s.name, imageUrl: s.imageUrl! })),
    ...cities.filter((c) => c.imageUrl).map((c) => ({ kind: "city" as const, id: c.id, stateId: c.stateId, cityId: c.id, label: `${c.name}, ${states.find((s) => s.id === c.stateId)?.name ?? ""}`, imageUrl: c.imageUrl! })),
  ];

  return (
    <div className="mt-4 space-y-5">
      <div className="grid gap-3 sm:max-w-2xl sm:grid-cols-2">
        <select value={stateId} onChange={(e) => { setStateId(e.target.value); setCityId(""); }} className="input" aria-label="State">
          <option value="">Select state…</option>
          {states.map((s) => <option key={s.id} value={s.id}>{s.name}{s.imageUrl ? " ✓" : ""}</option>)}
        </select>
        <select value={cityId} onChange={(e) => setCityId(e.target.value)} disabled={!stateId} className="input disabled:bg-surface disabled:text-muted" aria-label="City">
          <option value="">{stateId ? "No city (state logo)" : "Select state first"}</option>
          {stateCities.map((c) => <option key={c.id} value={c.id}>{c.name}{c.imageUrl ? " ✓" : ""}</option>)}
        </select>
      </div>

      {target && (
        <AdminForm key={`${target.kind}:${target.id}`} action={saveLocationLogo} submit={target.imageUrl ? "Save logo" : "Add logo"} className="grid gap-3">
          <input type="hidden" name="kind" value={target.kind} />
          <input type="hidden" name="id" value={target.id} />
          <p className="text-xs text-muted">Logo for the {target.kind}: <span className="font-semibold text-ink">{target.name}</span></p>
          <AdminImageField name="imageUrl" defaultUrl={target.imageUrl ?? undefined} round />
        </AdminForm>
      )}

      <div>
        <p className="text-xs font-semibold text-muted">Added logos ({saved.length})</p>
        {saved.length === 0 && <p className="mt-2 text-sm text-muted">None yet.</p>}
        <ul className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {saved.map((l) => (
            <li key={`${l.kind}:${l.id}`} className="flex items-center gap-3 rounded-xl border border-line p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={l.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-full bg-surface object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{l.label}</p>
                <p className="text-xs text-muted">{l.kind === "state" ? "State" : "City"}</p>
              </div>
              <button type="button" onClick={() => { setStateId(l.stateId); setCityId(l.cityId); }} className="btn-outline btn-sm">Edit</button>
              <Act action={saveLocationLogo} fields={{ kind: l.kind, id: l.id, imageUrl: "" }} label="Remove" variant="danger" confirm={`Remove the logo for ${l.label}?`} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
