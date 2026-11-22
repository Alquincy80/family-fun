// Drizzle schema for Tunk — Postgres.
// Accounts (email/password, salted SHA-256), saved points and level
// progress, one-time purchases, and verified Stripe Checkout sessions.
// Points are the in-game currency only: they can never be bought, sold,
// or cashed out. There is no real-money gambling in this game.

import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passSalt: text("pass_salt").notNull(),
  passHash: text("pass_hash").notNull(),
  birthYear: integer("birth_year").notNull(),
  token: text("token").notNull(),
  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow()
    .$defaultFn(() => new Date()),
});

// One row per account. `points` is lifetime points won (drives levels).
// `matchesWon` / `matchesPlayed` count finished matches; `handsPlayed` /
// `handsWon` count finished hands. Card-style unlocks are derived from
// these numbers (see unlockedStyles in client/src/tunk.ts) — nothing
// extra is stored.
export const progress = pgTable("progress", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().unique(),
  points: integer("points").notNull().default(0),
  totalWins: integer("total_wins").notNull().default(0),
  matchesWon: integer("matches_won").notNull().default(0),
  matchesPlayed: integer("matches_played").notNull().default(0),
  handsPlayed: integer("hands_played").notNull().default(0),
  handsWon: integer("hands_won").notNull().default(0),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$defaultFn(() => new Date()),
});

export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull(),
  product: text("product").notNull(),
  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow()
    .$defaultFn(() => new Date()),
});

// Verified Stripe Checkout Sessions, one row per paid session. The
// session_id is unique so a paid session can only ever unlock a product
// once, even if the player returns to the game or refreshes.
export const stripePayments = pgTable("stripe_payments", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  accountId: integer("account_id").notNull(),
  product: text("product").notNull(),
  amountCents: integer("amount_cents").notNull(),
  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow()
    .$defaultFn(() => new Date()),
});
