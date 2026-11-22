// Database connection for Tunk.
//
// Production (Render + Neon): set DATABASE_URL to the Neon Postgres URL
// (pooled connection string, e.g. postgresql://...@...neon.tech/...?sslmode=require).
// The Neon serverless HTTP driver is used — no persistent connection, which
// suits Render's free tier.
//
// Local dev / verification (no DATABASE_URL): PGlite runs an embedded
// Postgres in-process, backed by ./data/pglite. Same SQL dialect, same
// migrations — no Neon account needed to test locally.

import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;

export const isNeon = Boolean(url);

mkdirSync("./data/pglite", { recursive: true });

export const db: ReturnType<typeof drizzleNeon> | ReturnType<typeof drizzlePglite> =
  url
    ? drizzleNeon(neon(url), { schema })
    : drizzlePglite(new PGlite("./data/pglite"), { schema });

// Run the Postgres migrations (drizzle/0001) idempotently at boot.
// Render's free tier has an ephemeral filesystem, so the DB must be Neon;
// migrations are safe to re-run on every start.
export async function migrate(): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS "accounts" (
      "id" serial PRIMARY KEY NOT NULL,
      "email" text NOT NULL,
      "name" text NOT NULL,
      "pass_salt" text NOT NULL,
      "pass_hash" text NOT NULL,
      "birth_year" integer NOT NULL,
      "token" text NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      CONSTRAINT "accounts_email_unique" UNIQUE("email")
    )`,
    `CREATE TABLE IF NOT EXISTS "progress" (
      "id" serial PRIMARY KEY NOT NULL,
      "account_id" integer NOT NULL,
      "points" integer DEFAULT 0 NOT NULL,
      "total_wins" integer DEFAULT 0 NOT NULL,
      "matches_won" integer DEFAULT 0 NOT NULL,
      "matches_played" integer DEFAULT 0 NOT NULL,
      "hands_played" integer DEFAULT 0 NOT NULL,
      "hands_won" integer DEFAULT 0 NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL,
      CONSTRAINT "progress_account_id_unique" UNIQUE("account_id")
    )`,
    `CREATE TABLE IF NOT EXISTS "purchases" (
      "id" serial PRIMARY KEY NOT NULL,
      "account_id" integer NOT NULL,
      "product" text NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS "stripe_payments" (
      "id" serial PRIMARY KEY NOT NULL,
      "session_id" text NOT NULL,
      "account_id" integer NOT NULL,
      "product" text NOT NULL,
      "amount_cents" integer NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      CONSTRAINT "stripe_payments_session_id_unique" UNIQUE("session_id")
    )`,
  ];
  // Both drivers expose the same query surface through drizzle's session.
  // Use a raw SQL executor: neon-http via sql template, pglite via execute.
  for (const sql of statements) {
    await (db as unknown as { execute: (q: unknown) => Promise<unknown> }).execute(
      // drizzle's sql tag is imported lazily to keep this file driver-agnostic.
      (await import("drizzle-orm")).sql.raw(sql),
    );
  }
}
