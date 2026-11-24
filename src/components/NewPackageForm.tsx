"use client";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PanelForm } from "./PanelForm";
import { IMAGE_MAX_BYTES, IMAGE_TYPES, postImage } from "./ImageUpload";
import type { Result } from "@/app/photographer/(panel)/actions";

type Action = (prev: Result, fd: FormData) => Promise<Result>;

/**
 * Create-package form with a required banner image. The image needs the new package's id, so it is uploaded right
 * after the package is created. The file input has no `name`, so the file is never sent through the server action.
 */
export function NewPackageForm({ action, children }: { action: Action; children: ReactNode }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function pick(f: File | undefined) {
    if (f && (!IMAGE_TYPES.includes(f.type) || f.size > IMAGE_MAX_BYTES)) { setError(`${f.name}: use a JPEG, PNG or WebP up to 5 MB.`); setFile(null); return; }
    setError(null);
    setFile(f ?? null);
  }

  const onSuccess = useCallback(async (r: NonNullable<Result>) => {
    if (r.id && file) {
      setBusy(true);
      const res = await postImage("package", r.id, file);
      setBusy(false);
      if (!res.ok) { setError(`Package saved, but the banner failed. Open Edit to upload it. ${res.text}`); router.refresh(); return; }
    }
    document.querySelector<HTMLDialogElement>("dialog[open]")?.close();
    router.refresh();
  }, [file, router]);

  return (
    <PanelForm action={action} submit="Create package" className="grid gap-3" onSuccess={onSuccess} busy={busy}>
      <div>
        <p className="label">Banner image (required)</p>
        <p className="-mt-1 mb-2 text-xs text-muted">The main picture on the package card. JPEG, PNG or WebP, up to 5 MB.</p>
        {preview && (
          <div className="mb-2 aspect-[16/9] w-full max-w-xs overflow-hidden border border-line bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Banner preview" className="h-full w-full object-cover" />
          </div>
        )}
        <input type="file" required accept={IMAGE_TYPES.join(",")} className="input" onChange={(e) => pick(e.target.files?.[0])} />
        {error && <p role="alert" className="mt-1 text-xs font-semibold text-danger-strong">{error}</p>}
      </div>
      {children}
    </PanelForm>
  );
}
