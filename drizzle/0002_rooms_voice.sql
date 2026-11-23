-- Family Rooms + in-game voice chat (0002).
-- Same DDL as the statements migrate() runs at boot in server/src/db.ts.
-- Idempotent: safe to re-run against the live Neon database, whose
-- accounts table already exists without the two moderation columns.
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "strikes" integer DEFAULT 0 NOT NULL;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "muted_until" bigint;
CREATE TABLE IF NOT EXISTS "rooms" (
  "id" serial PRIMARY KEY NOT NULL,
  "code" text NOT NULL,
  "host_name" text NOT NULL,
  "seats" text DEFAULT '[]' NOT NULL,
  "player_count" integer DEFAULT 4 NOT NULL,
  "status" text DEFAULT 'open' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "rooms_code_unique" UNIQUE("code")
);
CREATE TABLE IF NOT EXISTS "messages" (
  "id" serial PRIMARY KEY NOT NULL,
  "scope" text NOT NULL,
  "room_code" text,
  "author_name" text NOT NULL,
  "author_email" text,
  "body" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "voice_signals" (
  "id" serial PRIMARY KEY NOT NULL,
  "room_code" text NOT NULL,
  "from_client" text NOT NULL,
  "to_client" text NOT NULL,
  "kind" text NOT NULL,
  "payload" text DEFAULT '' NOT NULL,
  "created_at" bigint NOT NULL
);
CREATE TABLE IF NOT EXISTS "reports" (
  "id" serial PRIMARY KEY NOT NULL,
  "reporter_name" text NOT NULL,
  "target_name" text NOT NULL,
  "reason" text NOT NULL,
  "scope" text DEFAULT 'room' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
