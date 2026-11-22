// Actions for Tunk.
//
// Accounts (email/password, salted SHA-256), saved points and level
// progress, Stripe test-mode purchases, and the account-deletion safeguard.
//
// POINTS ARE NEVER FOR SALE: no action here sells points, chips, or any
// in-game currency. Points are earned by playing only — recordMatchResult
// is the only way points move, and it only ever ADDS points a player won
// at the table. Real money only ever buys the two Store products
// (All-Access Pass, Remove Ads), which are cosmetic/perk purchases.

import { defineAction, z, type ActionsModule, type Ctx, type Db } from "./sdk";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import {
  PRODUCTS,
  createCheckoutSession,
  isAllowedOrigin,
  isLiveStripe,
  verifyPaidSession,
  type ProductId,
} from "./stripe";

const CURRENT_YEAR = 2026;

const UNDER13_NO_BUY =
  "Players under 13 can't buy things — ask a parent or guardian.";

function isUnder13(birthYear: number): boolean {
  return CURRENT_YEAR - birthYear < 13;
}

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(salt: string, password: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

function newToken(): string {
  return randomHex(24);
}

const profileResponse = z.object({
  ok: z.boolean(),
  error: z.string().nullable(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  under13: z.boolean(),
  points: z.number(),
  totalWins: z.number(),
  matchesWon: z.number(),
  matchesPlayed: z.number(),
  handsPlayed: z.number(),
  handsWon: z.number(),
  hasTunkPass: z.boolean(),
  hasRemoveAds: z.boolean(),
});

type Profile = z.infer<typeof profileResponse>;

const emptyProfile = (error: string | null): Profile => ({
  ok: false,
  error,
  name: null,
  email: null,
  under13: false,
  points: 0,
  totalWins: 0,
  matchesWon: 0,
  matchesPlayed: 0,
  handsPlayed: 0,
  handsWon: 0,
  hasTunkPass: false,
  hasRemoveAds: false,
});

async function loadProfile(ctx: Ctx, token: string): Promise<Profile> {
  const db = ctx.db();
  const rows = await db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.token, token))
    .limit(1);
  const acct = rows[0];
  if (!acct) return emptyProfile("Session not found. Please sign in again.");
  const progRows = await db
    .select()
    .from(schema.progress)
    .where(eq(schema.progress.accountId, acct.id))
    .limit(1);
  const prog = progRows[0];
  const buys = await db
    .select()
    .from(schema.purchases)
    .where(eq(schema.purchases.accountId, acct.id));
  return {
    ok: true,
    error: null,
    name: acct.name,
    email: acct.email,
    under13: CURRENT_YEAR - acct.birthYear < 13,
    points: prog?.points ?? 0,
    totalWins: prog?.totalWins ?? 0,
    matchesWon: prog?.matchesWon ?? 0,
    matchesPlayed: prog?.matchesPlayed ?? 0,
    handsPlayed: prog?.handsPlayed ?? 0,
    handsWon: prog?.handsWon ?? 0,
    hasTunkPass: buys.some((b) => b.product === "tunk_pass"),
    hasRemoveAds:
      buys.some((b) => b.product === "remove_ads") ||
      buys.some((b) => b.product === "tunk_pass"),
  };
}

async function accountByToken(ctx: Ctx, token: string) {
  const db = ctx.db();
  const rows = await db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.token, token))
    .limit(1);
  return rows[0] ?? null;
}

// Deletes one player's own rows only: their account, progress, purchases,
// and Stripe payment records. Other players' data is untouched.
async function deleteAccountRows(
  exec: Pick<Db, "delete">,
  accountId: number,
): Promise<void> {
  await exec
    .delete(schema.progress)
    .where(eq(schema.progress.accountId, accountId));
  await exec
    .delete(schema.purchases)
    .where(eq(schema.purchases.accountId, accountId));
  await exec
    .delete(schema.stripePayments)
    .where(eq(schema.stripePayments.accountId, accountId));
  await exec.delete(schema.accounts).where(eq(schema.accounts.id, accountId));
}

export const Actions = {
  signUp: defineAction({
    description:
      "Creates a player account with email and password and returns a session token plus the starting profile.",
    request: z.object({
      name: z.string().min(1).max(40),
      email: z.string().email().max(120),
      password: z.string().min(6).max(100),
      birthYear: z.number().int().min(1926).max(2026),
    }),
    response: z.object({
      token: z.string().nullable(),
      profile: profileResponse,
    }),
    async handler(ctx, args) {
      const db = ctx.db();
      const email = args.email.trim().toLowerCase();
      const existing = await db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.email, email))
        .limit(1);
      if (existing[0]) {
        return {
          token: null,
          profile: emptyProfile(
            "That email already has an account. Try signing in.",
          ),
        };
      }
      const salt = randomHex(12);
      const token = newToken();
      await db.insert(schema.accounts).values({
        email,
        name: args.name.trim(),
        passSalt: salt,
        passHash: await hashPassword(salt, args.password),
        birthYear: args.birthYear,
        token,
      });
      const inserted = await db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.token, token))
        .limit(1);
      const acct = inserted[0];
      if (!acct) {
        return {
          token: null,
          profile: emptyProfile("Sign-up failed. Please try again."),
        };
      }
      await db.insert(schema.progress).values({ accountId: acct.id });
      ctx.invalidateQueries();
      return { token, profile: await loadProfile(ctx, token) };
    },
  }),

  signIn: defineAction({
    description:
      "Signs a player in with email and password and returns a fresh session token plus their saved profile.",
    request: z.object({
      email: z.string().email().max(120),
      password: z.string().min(1).max(100),
    }),
    response: z.object({
      token: z.string().nullable(),
      profile: profileResponse,
    }),
    async handler(ctx, args) {
      const db = ctx.db();
      const email = args.email.trim().toLowerCase();
      const rows = await db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.email, email))
        .limit(1);
      const acct = rows[0];
      if (
        !acct ||
        acct.passHash !== (await hashPassword(acct.passSalt, args.password))
      ) {
        return {
          token: null,
          profile: emptyProfile("Email or password doesn't match our records."),
        };
      }
      const token = newToken();
      await db
        .update(schema.accounts)
        .set({ token })
        .where(eq(schema.accounts.id, acct.id));
      ctx.invalidateQueries();
      return { token, profile: await loadProfile(ctx, token) };
    },
  }),

  getProfile: defineAction({
    description:
      "Loads the signed-in player's profile: lifetime points, wins, matches and hands played, and purchases.",
    request: z.object({ token: z.string().min(1) }),
    response: profileResponse,
    async handler(ctx, args) {
      return loadProfile(ctx, args.token);
    },
  }),

  deleteAccount: defineAction({
    description:
      "Permanently deletes the signed-in player's account and their own data: progress, purchases, and Stripe payment records. Other players' data is untouched. Requires the account password and an explicit confirmation.",
    request: z.object({
      token: z.string().min(1),
      password: z.string().min(1).max(100),
      confirm: z.literal(true),
    }),
    response: z.object({ ok: z.boolean(), error: z.string().nullable() }),
    async handler(ctx, args) {
      const db = ctx.db();
      const acct = await accountByToken(ctx, args.token);
      if (!acct) {
        return {
          ok: false,
          error: "Please sign in again — that session isn't valid.",
        };
      }
      if (
        acct.passHash !== (await hashPassword(acct.passSalt, args.password))
      ) {
        return {
          ok: false,
          error: "That password doesn't match this account.",
        };
      }
      // One transaction when the driver supports it (PGlite does); the
      // Neon HTTP driver has no transaction support, so fall back to
      // sequential deletes of the same rows — each delete is idempotent,
      // so a re-run deletes nothing twice.
      try {
        await db.transaction(async (tx) => {
          await deleteAccountRows(tx, acct.id);
        });
      } catch {
        await deleteAccountRows(db, acct.id);
      }
      ctx.invalidateQueries();
      return { ok: true, error: null };
    },
  }),

  recordMatchResult: defineAction({
    description:
      "Saves a finished match to the player's account: lifetime points won, match win, and hands played/won. Points only ever move up here — they are earned at the table, never bought.",
    request: z.object({
      token: z.string().min(1),
      pointsWon: z.number().int().min(0).max(10000),
      matchWon: z.boolean(),
      handsWon: z.number().int().min(0).max(100),
      handsPlayed: z.number().int().min(1).max(100),
    }),
    response: z.object({ ok: z.boolean() }),
    async handler(ctx, args) {
      const db = ctx.db();
      const acct = await accountByToken(ctx, args.token);
      if (!acct) return { ok: false };
      const rows = await db
        .select()
        .from(schema.progress)
        .where(eq(schema.progress.accountId, acct.id))
        .limit(1);
      const prog = rows[0];
      const values = {
        points: (prog?.points ?? 0) + args.pointsWon,
        totalWins: (prog?.totalWins ?? 0) + (args.matchWon ? 1 : 0),
        matchesWon: (prog?.matchesWon ?? 0) + (args.matchWon ? 1 : 0),
        matchesPlayed: (prog?.matchesPlayed ?? 0) + 1,
        handsPlayed: (prog?.handsPlayed ?? 0) + args.handsPlayed,
        handsWon: (prog?.handsWon ?? 0) + args.handsWon,
        updatedAt: new Date(),
      };
      if (prog) {
        await db
          .update(schema.progress)
          .set(values)
          .where(eq(schema.progress.id, prog.id));
      } else {
        await db
          .insert(schema.progress)
          .values({ accountId: acct.id, ...values });
      }
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  buyProduct: defineAction({
    description:
      "Completes a store purchase in Stripe test mode (test card 4242 only, no real charge) and unlocks the product on the player's account. When live Stripe is configured, test buys are refused — real payments go through Stripe Checkout instead. Points are never sold here.",
    request: z.object({
      token: z.string().min(1),
      product: z.enum(["tunk_pass", "remove_ads"]),
      cardNumber: z.string().min(12).max(23),
    }),
    response: z.object({ ok: z.boolean(), error: z.string().nullable() }),
    async handler(ctx, args) {
      const db = ctx.db();
      const acct = await accountByToken(ctx, args.token);
      if (!acct) {
        return { ok: false, error: "Please sign in before buying." };
      }
      if (isUnder13(acct.birthYear)) {
        return { ok: false, error: UNDER13_NO_BUY };
      }
      if (isLiveStripe()) {
        return {
          ok: false,
          error:
            "Live payments are on now — pay through Stripe Checkout. No card details are typed in the game.",
        };
      }
      const digits = args.cardNumber.replace(/\D/g, "");
      if (digits !== "4242424242424242") {
        return {
          ok: false,
          error:
            "Test mode only accepts the Stripe test card 4242 4242 4242 4242. No real card is charged.",
        };
      }
      const existing = await db
        .select()
        .from(schema.purchases)
        .where(eq(schema.purchases.accountId, acct.id));
      if (!existing.some((p) => p.product === args.product)) {
        await db
          .insert(schema.purchases)
          .values({ accountId: acct.id, product: args.product });
      }
      ctx.invalidateQueries();
      return { ok: true, error: null };
    },
  }),

  getStoreStatus: defineAction({
    description:
      "Says whether the Store is taking live Stripe payments (STRIPE_SECRET_KEY is set) or is still in test mode with the 4242 test card.",
    request: z.object({}),
    response: z.object({ live: z.boolean() }),
    async handler() {
      return { live: isLiveStripe() };
    },
  }),

  createCheckoutSession: defineAction({
    description:
      "Starts a real Stripe Checkout Session for a store product and returns Stripe's hosted checkout URL. Only works when live Stripe is configured; otherwise it reports that live payments are not set up yet and nothing is unlocked.",
    request: z.object({
      token: z.string().min(1),
      product: z.enum(["tunk_pass", "remove_ads"]),
      origin: z.string().min(1).max(200),
    }),
    response: z.object({
      ok: z.boolean(),
      checkoutUrl: z.string().nullable(),
      error: z.string().nullable(),
      live: z.boolean(),
    }),
    async handler(ctx, args) {
      const db = ctx.db();
      const acct = await accountByToken(ctx, args.token);
      if (!acct) {
        return {
          ok: false,
          checkoutUrl: null,
          error: "Please sign in before buying.",
          live: isLiveStripe(),
        };
      }
      if (isUnder13(acct.birthYear)) {
        return {
          ok: false,
          checkoutUrl: null,
          error: UNDER13_NO_BUY,
          live: isLiveStripe(),
        };
      }
      if (!isLiveStripe()) {
        return {
          ok: false,
          checkoutUrl: null,
          error:
            "Live payments aren't set up yet — the Store is still in test mode.",
          live: false,
        };
      }
      if (!isAllowedOrigin(args.origin)) {
        return {
          ok: false,
          checkoutUrl: null,
          error: "That return address isn't one the game serves.",
          live: true,
        };
      }
      const existing = await db
        .select()
        .from(schema.purchases)
        .where(eq(schema.purchases.accountId, acct.id));
      if (existing.some((p) => p.product === args.product)) {
        return {
          ok: false,
          checkoutUrl: null,
          error: "You already own that — it's on your account.",
          live: true,
        };
      }
      try {
        const url = await createCheckoutSession({
          accountId: acct.id,
          email: acct.email,
          product: args.product,
          origin: args.origin,
        });
        return { ok: true, checkoutUrl: url, error: null, live: true };
      } catch (err) {
        console.error(
          "Stripe Checkout Session failed",
          err instanceof Error ? err.message : String(err),
        );
        return {
          ok: false,
          checkoutUrl: null,
          error:
            "Stripe couldn't start checkout just now. Try again in a second — no charge was made.",
          live: true,
        };
      }
    },
  }),

  confirmCheckout: defineAction({
    description:
      "After Stripe redirects a player back to the game, verifies the Checkout Session with Stripe (paid, right product, right amount, tied to this player's account) and only then unlocks the product. A client claim alone never unlocks anything.",
    request: z.object({
      token: z.string().min(1),
      sessionId: z.string().min(1).max(200),
    }),
    response: z.object({
      ok: z.boolean(),
      error: z.string().nullable(),
      product: z.enum(["tunk_pass", "remove_ads"]).nullable(),
    }),
    async handler(ctx, args) {
      if (!isLiveStripe()) {
        return {
          ok: false,
          error: "Live payments aren't set up yet.",
          product: null,
        };
      }
      const db = ctx.db();
      const acct = await accountByToken(ctx, args.token);
      if (!acct) {
        return {
          ok: false,
          error: "Please sign in before finishing checkout.",
          product: null,
        };
      }
      // Idempotent: a session that was already recorded unlocks nothing twice.
      const recorded = await db
        .select()
        .from(schema.stripePayments)
        .where(eq(schema.stripePayments.sessionId, args.sessionId))
        .limit(1);
      if (recorded[0]) {
        if (recorded[0].accountId !== acct.id) {
          return {
            ok: false,
            error: "That payment belongs to a different account.",
            product: null,
          };
        }
        return {
          ok: true,
          error: null,
          product: recorded[0].product as ProductId,
        };
      }
      let verified;
      try {
        verified = await verifyPaidSession(args.sessionId);
      } catch (err) {
        console.error(
          "Stripe session verification failed",
          err instanceof Error ? err.message : String(err),
        );
        return {
          ok: false,
          error:
            "Stripe couldn't confirm that payment yet. If you paid, try again in a moment — nothing was unlocked.",
          product: null,
        };
      }
      if (verified.accountId !== acct.id) {
        return {
          ok: false,
          error: "That payment belongs to a different account.",
          product: null,
        };
      }
      if (verified.amountCents !== PRODUCTS[verified.product].amountCents) {
        return {
          ok: false,
          error: "That payment amount does not match the product.",
          product: null,
        };
      }
      await db.insert(schema.stripePayments).values({
        sessionId: args.sessionId,
        accountId: acct.id,
        product: verified.product,
        amountCents: verified.amountCents,
      });
      const existing = await db
        .select()
        .from(schema.purchases)
        .where(eq(schema.purchases.accountId, acct.id));
      if (!existing.some((p) => p.product === verified.product)) {
        await db
          .insert(schema.purchases)
          .values({ accountId: acct.id, product: verified.product });
      }
      ctx.invalidateQueries();
      return { ok: true, error: null, product: verified.product };
    },
  }),
} satisfies ActionsModule;
