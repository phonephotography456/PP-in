"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

export const IMAGE_TYPES = TYPES;
export const IMAGE_MAX_BYTES = MAX_BYTES;

/** Posts one image to the upload route. Returns the server's message; `stop` = a limit/permission error that applies to every remaining file. */
export async function postImage(kind: string, targetId: string | undefined, file: File): Promise<{ ok: boolean; text: string; stop: boolean }> {
  if (!TYPES.includes(file.type)) return { ok: false, text: `${file.name}: only JPEG, PNG or WebP.`, stop: false };
  if (file.size > MAX_BYTES) return { ok: false, text: `${file.name}: larger than 5 MB.`, stop: false };
  const body = new FormData();
  body.set("kind", kind);
  if (targetId) body.set("targetId", targetId);
  body.set("file", file);
  try {
    const res = await fetch("/api/photographer/uploads", { method: "POST", body });
    const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
    return { ok: res.ok, text: `${file.name}: ${res.ok ? data.message ?? "Uploaded." : data.error ?? "Upload failed."}`, stop: !res.ok && [409, 429, 403, 503].includes(res.status) };
  } catch {
    return { ok: false, text: `${file.name}: network error.`, stop: true };
  }
}

/** Uploads one image at a time to /api/photographer/uploads. The server re-validates everything; checks here are only for quick feedback. */
export function ImageUpload({ kind, targetId, remaining, label = "Add images", single = false }: {
  kind: "package" | "portfolio" | "profile_photo" | "logo" | "banner"; targetId?: string; remaining?: number; label?: string; single?: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState<{ ok: boolean; text: string }[]>([]);

  async function upload(files: File[]) {
    setBusy(true);
    const out: { ok: boolean; text: string }[] = [];
    const allowed = remaining ?? files.length;
    for (const file of files.slice(0, allowed)) {
      const r = await postImage(kind, targetId, file);
      out.push({ ok: r.ok, text: r.text });
      if (r.stop) break;
    }
    if (files.length > allowed) out.push({ ok: false, text: "Some files were skipped: image limit reached." });
    setNotes(out);
    setBusy(false);
    if (input.current) input.current.value = "";
    router.refresh();
  }

  return (
    <div className="mt-2">
      <label className="btn-outline inline-block cursor-pointer text-xs">
        {busy ? "Uploading…" : label}
        <input
          ref={input}
          type="file"
          multiple={!single}
          accept={TYPES.join(",")}
          disabled={busy || remaining === 0}
          className="sr-only"
          onChange={(e) => { const f = Array.from(e.target.files ?? []); if (f.length) void upload(f); }}
        />
      </label>
      <p className="mt-1 text-xs text-muted">JPEG, PNG or WebP, up to 5 MB each.</p>
      {notes.map((n, i) => (
        <p key={i} role={n.ok ? "status" : "alert"} className={`mt-1 text-xs ${n.ok ? "text-success" : "font-semibold text-danger-strong"}`}>{n.text}</p>
      ))}
    </div>
  );
}
