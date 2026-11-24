const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const str = (v: unknown, max = 255) => (typeof v === "string" ? v.trim().slice(0, max) : "");
export const email = (v: unknown) => {
  const e = str(v).toLowerCase();
  return EMAIL.test(e) ? e : "";
};
export const passwordOk = (v: unknown): v is string => typeof v === "string" && v.length >= 8 && v.length <= 72;
export const otp = (v: unknown) => (/^\d{6}$/.test(str(v, 6)) ? str(v, 6) : "");

export async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    const j = await req.json();
    return j && typeof j === "object" ? (j as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export const fail = (error: string, status = 400) => Response.json({ error }, { status });
