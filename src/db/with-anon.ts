import { sql } from "drizzle-orm";
import { db } from "./index";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Read-only transaction as the Supabase `anon` role, so the public RLS policies decide what a visitor can see
 * (approved photographers, published packages, approved portfolio images, active master data).
 * Same pattern as withUser: the DB connection never reads public pages with elevated rights.
 */
export function withAnon<T>(fn: (tx: Tx) => Promise<T>) {
  return db.transaction(
    async (tx) => {
      await tx.execute(sql`select set_config('request.jwt.claims', '', true)`);
      await tx.execute(sql`set local role anon`);
      return fn(tx);
    },
    { accessMode: "read only" },
  );
}
