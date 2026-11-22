CREATE TABLE IF NOT EXISTS "accounts" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "name" text NOT NULL,
  "pass_salt" text NOT NULL,
  "pass_hash" text NOT NULL,
  "birth_year" integer NOT NULL,
  "token" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "accounts_email_unique" UNIQUE("email")
);
CREATE TABLE IF NOT EXISTS "progress" (
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
);
CREATE TABLE IF NOT EXISTS "purchases" (
  "id" serial PRIMARY KEY NOT NULL,
  "account_id" integer NOT NULL,
  "product" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "stripe_payments" (
  "id" serial PRIMARY KEY NOT NULL,
  "session_id" text NOT NULL,
  "account_id" integer NOT NULL,
  "product" text NOT NULL,
  "amount_cents" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "stripe_payments_session_id_unique" UNIQUE("session_id")
);
